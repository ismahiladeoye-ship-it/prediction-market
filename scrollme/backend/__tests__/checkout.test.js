const request = require('supertest');
const Stripe = require('stripe');
const Product = require('../api/models/productModel');
const Order = require('../api/models/orderModel');
const Cart = require('../api/models/cartModel');
const { resetConfig } = require('../api/config/env');
const { stripeProvider } = require('../api/services/payments');
const { releaseExpiredOrders, markOrderPaid } = require('../api/services/orders');
const { useTestApp, signedInAgent, createProduct } = require('./helpers/setup');

const ctx = useTestApp();

const address = {
  fullName: 'Ada Lovelace',
  line1: '12 Analytical Street',
  city: 'London',
  postalCode: 'n1  9gu',
  country: 'gb',
  phone: '+44 20 7946 0958',
};

const fillCart = async (agent, product, quantity = 2) => {
  const res = await agent.post('/api/cart/add').send({ productId: product.id, quantity, size: product.sizes[0] || '' });
  expect(res.status).toBe(200);
};

describe('checkout (mock provider)', () => {
  it('validates the delivery address', async () => {
    const product = await createProduct();
    const { agent } = await signedInAgent(ctx.app);
    await fillCart(agent, product);
    const res = await agent.post('/api/orders').send({ shippingAddress: { ...address, postalCode: '' }, deliveryMethod: 'standard' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Postal code/);
    const badCountry = await agent.post('/api/orders').send({ shippingAddress: { ...address, country: 'Britain' } });
    expect(badCountry.status).toBe(400);
    const badPostcode = await agent.post('/api/orders').send({ shippingAddress: { ...address, postalCode: '12345' } });
    expect(badPostcode.status).toBe(400);
    expect(badPostcode.body.details).toEqual([{ field: 'shippingAddress.postalCode', message: 'Enter a valid UK postcode' }]);
    expect((await Product.findById(product.id)).stock).toBe(10);
  });

  it('delivers to UK addresses only and rejects unavailable delivery methods', async () => {
    const product = await createProduct();
    const { agent } = await signedInAgent(ctx.app);
    await fillCart(agent, product);
    const abroad = { ...address, city: 'Arlington', postalCode: '22202', country: 'US', phone: '+1 555 0100' };
    const res = await agent.post('/api/orders').send({ shippingAddress: abroad });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('We deliver to UK addresses only');
    expect(res.body.details).toEqual([{ field: 'shippingAddress.country', message: 'We deliver to UK addresses only' }]);

    const saved = process.env.SHIPPING_EXPRESS;
    delete process.env.SHIPPING_EXPRESS;
    resetConfig();
    try {
      const express = await agent.post('/api/orders').send({ shippingAddress: address, deliveryMethod: 'express' });
      expect(express.status).toBe(400);
      expect(express.body.message).toMatch(/delivery method is not available/);
    } finally {
      process.env.SHIPPING_EXPRESS = saved;
      resetConfig();
    }
    expect((await Product.findById(product.id)).stock).toBe(10);
  });

  it('lists the enabled payment methods and rejects disabled ones', async () => {
    const methods = await request(ctx.app).get('/api/payments/methods');
    expect(methods.body).toEqual({ provider: 'mock', testMode: true, methods: ['apple_pay', 'card', 'paypal', 'klarna', 'google_pay'] });

    process.env.PAYMENT_METHODS = 'card,paypal';
    resetConfig();
    try {
      expect((await request(ctx.app).get('/api/payments/methods')).body.methods).toEqual(['card', 'paypal']);
      const product = await createProduct({ sizes: [] });
      const { agent } = await signedInAgent(ctx.app);
      await fillCart(agent, product, 1);
      const res = await agent.post('/api/orders').send({ shippingAddress: address, paymentMethod: 'klarna' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/not available/);
      expect((await agent.post('/api/orders').send({ shippingAddress: address, paymentMethod: 'skrill' })).status).toBe(400);
      expect((await Product.findById(product.id)).stock).toBe(10);
    } finally {
      delete process.env.PAYMENT_METHODS;
      resetConfig();
    }
  });

  it('refuses to check out an empty cart', async () => {
    const { agent } = await signedInAgent(ctx.app);
    const res = await agent.post('/api/orders').send({ shippingAddress: address });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/empty/);
  });

  it('creates an order with server-side totals, reserves stock and completes payment', async () => {
    const product = await createProduct({ price: 25, stock: 5 });
    const { agent, user } = await signedInAgent(ctx.app);
    await fillCart(agent, product, 2);

    const res = await agent.post('/api/orders').send({ shippingAddress: address, deliveryMethod: 'express', amount: 1 });
    expect(res.status).toBe(201);
    expect(res.body.checkoutUrl).toMatch(/\/checkout\/mock\?order=/);
    const order = res.body.order;
    expect(order.status).toBe('pending_payment');
    // subtotal 50, tax 10% = 5, express 40
    expect(order.summary).toEqual({ subtotal: 50, tax: 5, shipping: 40, total: 95, currency: 'gbp' });
    expect(order.shippingAddress.country).toBe('GB');
    expect(order.shippingAddress.postalCode).toBe('N1 9GU');
    expect((await Product.findById(product.id)).stock).toBe(3);

    // The cart is kept until payment succeeds.
    expect((await Cart.findOne({ userId: user._id })).items).toHaveLength(1);

    const paid = await agent.post(`/api/payments/mock/${order.id}/complete`);
    expect(paid.status).toBe(200);
    expect(paid.body.order.status).toBe('paid');
    expect(paid.body.order.payment.status).toBe('paid');
    expect((await Cart.findOne({ userId: user._id })).items).toHaveLength(0);

    // Paying twice is harmless.
    expect((await agent.post(`/api/payments/mock/${order.id}/complete`)).body.order.status).toBe('paid');
    expect((await Product.findById(product.id)).stock).toBe(3);

    const history = await agent.get('/api/orders');
    expect(history.body.orders).toHaveLength(1);
    expect(history.body.orders[0].orderNumber).toMatch(/^GIS-[A-Z0-9]+-[A-F0-9]{6}$/);
  });

  it('rejects checkout when stock ran out and leaves no partial reservation', async () => {
    const a = await createProduct({ name: 'A', sizes: [], stock: 5 });
    const b = await createProduct({ name: 'B', sizes: [], stock: 5 });
    const { agent } = await signedInAgent(ctx.app);
    await fillCart(agent, a, 2);
    await fillCart(agent, b, 2);
    await Product.updateOne({ _id: b.id }, { stock: 1 });

    const res = await agent.post('/api/orders').send({ shippingAddress: address });
    expect(res.status).toBe(409);
    expect((await Product.findById(a.id)).stock).toBe(5);
    expect(await Order.countDocuments()).toBe(0);
  });

  it('never sells the last unit twice under concurrent checkouts', async () => {
    const product = await createProduct({ sizes: [], stock: 1 });
    const shoppers = await Promise.all([signedInAgent(ctx.app), signedInAgent(ctx.app), signedInAgent(ctx.app)]);
    for (const s of shoppers) await fillCart(s.agent, product, 1);
    const results = await Promise.all(shoppers.map((s) => s.agent.post('/api/orders').send({ shippingAddress: address })));
    expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409]);
    expect((await Product.findById(product.id)).stock).toBe(0);
  });

  it('lets the customer cancel an unpaid order and returns the stock', async () => {
    const product = await createProduct({ sizes: [], stock: 4 });
    const { agent } = await signedInAgent(ctx.app);
    await fillCart(agent, product, 3);
    const { body } = await agent.post('/api/orders').send({ shippingAddress: address });
    expect((await Product.findById(product.id)).stock).toBe(1);
    const res = await agent.post(`/api/orders/${body.order.id}/cancel`);
    expect(res.body.order.status).toBe('cancelled');
    expect((await Product.findById(product.id)).stock).toBe(4);
    expect((await agent.post(`/api/orders/${body.order.id}/cancel`)).status).toBe(409);
  });

  it('releases stock from abandoned checkouts after the reservation expires', async () => {
    const product = await createProduct({ sizes: [], stock: 4 });
    const { agent } = await signedInAgent(ctx.app);
    await fillCart(agent, product, 2);
    const { body } = await agent.post('/api/orders').send({ shippingAddress: address });
    expect(await releaseExpiredOrders(new Date())).toBe(0);
    expect(await releaseExpiredOrders(new Date(Date.now() + 36 * 60 * 1000))).toBe(1);
    expect((await Product.findById(product.id)).stock).toBe(4);
    expect((await agent.get(`/api/orders/${body.order.id}`)).body.order.status).toBe('cancelled');
  });

  it('hides orders from other customers', async () => {
    const product = await createProduct({ sizes: [] });
    const owner = await signedInAgent(ctx.app);
    const other = await signedInAgent(ctx.app);
    await fillCart(owner.agent, product, 1);
    const { body } = await owner.agent.post('/api/orders').send({ shippingAddress: address });
    expect((await other.agent.get(`/api/orders/${body.order.id}`)).status).toBe(404);
    expect((await other.agent.post(`/api/orders/${body.order.id}/cancel`)).status).toBe(404);
    expect((await other.agent.post(`/api/payments/mock/${body.order.id}/complete`)).status).toBe(403);
    expect((await other.agent.get('/api/orders')).body.orders).toHaveLength(0);
    expect((await request(ctx.app).get(`/api/orders/${body.order.id}`)).status).toBe(401);
  });

  it('limits how many unpaid orders (and so reserved stock) one account can hold', async () => {
    const product = await createProduct({ sizes: [], stock: 20 });
    const { agent } = await signedInAgent(ctx.app);
    await fillCart(agent, product, 2);
    for (let i = 0; i < 3; i += 1) expect((await agent.post('/api/orders').send({ shippingAddress: address })).status).toBe(201);
    const fourth = await agent.post('/api/orders').send({ shippingAddress: address });
    expect(fourth.status).toBe(409);
    expect(fourth.body.message).toMatch(/unpaid orders/);
    expect((await Product.findById(product.id)).stock).toBe(14);
  });

  it('lets only the customer open a payment for their order', async () => {
    const product = await createProduct({ sizes: [] });
    const owner = await signedInAgent(ctx.app);
    const admin = await signedInAgent(ctx.app, { roles: ['user', 'admin'] });
    await fillCart(owner.agent, product, 1);
    const { body } = await owner.agent.post('/api/orders').send({ shippingAddress: address });
    expect((await admin.agent.get(`/api/orders/${body.order.id}`)).status).toBe(200);
    expect((await admin.agent.post(`/api/orders/${body.order.id}/pay`).send({})).status).toBe(403);
    expect((await owner.agent.post(`/api/orders/${body.order.id}/pay`).send({})).status).toBe(200);
  });

  it('flags a second payment for refund and keeps internal notes from the customer', async () => {
    const product = await createProduct({ sizes: [] });
    const { agent } = await signedInAgent(ctx.app);
    const admin = await signedInAgent(ctx.app, { roles: ['user', 'admin'] });
    await fillCart(agent, product, 1);
    const { body } = await agent.post('/api/orders').send({ shippingAddress: address });
    await markOrderPaid(body.order.id, { reference: 'pi_first' });
    await markOrderPaid(body.order.id, { reference: 'pi_first' });
    expect((await Order.findById(body.order.id)).attention).toBeUndefined();
    await markOrderPaid(body.order.id, { reference: 'pi_second' });
    expect((await Order.findById(body.order.id)).attention).toMatch(/second payment \(pi_second\)/);

    const mine = (await agent.get(`/api/orders/${body.order.id}`)).body.order;
    expect(mine.needsAttention).toBe(true);
    expect(mine.attention).toBeUndefined();
    const adminView = (await admin.agent.get(`/api/admin/orders/${body.order.id}`)).body.order;
    expect(adminView.attention).toMatch(/needs refunding/);
  });
});

describe('checkout (Stripe provider, test mode)', () => {
  const WEBHOOK_SECRET = 'whsec_test_secret';
  let created;

  beforeAll(() => {
    Object.assign(process.env, { PAYMENT_PROVIDER: 'stripe', STRIPE_SECRET_KEY: 'sk_test_dummy', STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET });
    resetConfig();
  });
  afterAll(() => {
    Object.assign(process.env, { PAYMENT_PROVIDER: 'mock', STRIPE_SECRET_KEY: '', STRIPE_WEBHOOK_SECRET: '' });
    resetConfig();
  });
  beforeEach(() => {
    created = [];
    stripeProvider.setClient({
      checkout: {
        sessions: {
          create: jest.fn(async (params) => {
            created.push(params);
            return { id: `cs_test_${created.length}`, url: `https://checkout.stripe.com/c/pay/cs_test_${created.length}` };
          }),
          retrieve: jest.fn(async (id) => ({ id, payment_status: 'unpaid', status: 'open' })),
          expire: jest.fn(async () => ({})),
        },
      },
    });
  });

  const signed = (event) => {
    const payload = JSON.stringify(event);
    return { payload, header: Stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET }) };
  };

  const placeOrder = async () => {
    const product = await createProduct({ price: 19.99, sizes: [], stock: 10 });
    const { agent } = await signedInAgent(ctx.app);
    await fillCart(agent, product, 3);
    const res = await agent.post('/api/orders').send({ shippingAddress: address });
    expect(res.status).toBe(201);
    return { agent, order: res.body.order, res };
  };

  it('opens a Stripe Checkout session whose amounts come from the order', async () => {
    const { order, res } = await placeOrder();
    expect(res.body.checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    const params = created[0];
    expect(params.mode).toBe('payment');
    expect(params.metadata.orderId).toBe(order.id);
    const total = params.line_items.reduce((s, li) => s + li.price_data.unit_amount * li.quantity, 0);
    // 3 x 19.99 = 59.97, tax 6.00 (rounded), shipping 20
    expect(total).toBe(Math.round(order.summary.total * 100));
    expect(order.summary.total).toBe(85.97);
    expect(params.success_url).toContain(`/orders/${order.id}`);
  });

  it('marks the order paid only for a correctly signed webhook', async () => {
    const { order, agent } = await placeOrder();
    const event = {
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_1', payment_status: 'paid', payment_intent: 'pi_123', amount_total: 8597, metadata: { orderId: order.id } } },
    };

    const forged = await request(ctx.app)
      .post('/api/payments/stripe/webhook')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', 't=1,v1=bad')
      .send(JSON.stringify(event));
    expect(forged.status).toBe(400);
    expect((await Order.findById(order.id)).status).toBe('pending_payment');

    const { payload, header } = signed(event);
    const ok = await request(ctx.app)
      .post('/api/payments/stripe/webhook')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', header)
      .send(payload);
    expect(ok.status).toBe(200);
    const stored = await Order.findById(order.id);
    expect(stored.status).toBe('paid');
    expect(stored.payment.reference).toBe('pi_123');
    expect(stored.attention).toBeUndefined();

    // Replayed delivery is idempotent.
    const again = signed(event);
    expect(
      (
        await request(ctx.app)
          .post('/api/payments/stripe/webhook')
          .set('Content-Type', 'application/json')
          .set('Stripe-Signature', again.header)
          .send(again.payload)
      ).status
    ).toBe(200);
    expect((await agent.get(`/api/orders/${order.id}`)).body.order.status).toBe('paid');
  });

  it('flags a payment whose amount does not match the order', async () => {
    const { order } = await placeOrder();
    const { payload, header } = signed({
      id: 'evt_2',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_1', payment_status: 'paid', payment_intent: 'pi_9', amount_total: 100, metadata: { orderId: order.id } } },
    });
    await request(ctx.app).post('/api/payments/stripe/webhook').set('Content-Type', 'application/json').set('Stripe-Signature', header).send(payload);
    expect((await Order.findById(order.id)).attention).toMatch(/differs/);
  });

  it('confirms payment on the return page when the webhook has not arrived', async () => {
    const { order, agent } = await placeOrder();
    stripeProvider.setClient({
      checkout: {
        sessions: {
          retrieve: jest.fn(async () => ({ payment_status: 'paid', payment_intent: 'pi_ret', amount_total: 8597, metadata: { orderId: order.id } })),
        },
      },
    });
    const res = await agent.get(`/api/orders/${order.id}`);
    expect(res.body.order.status).toBe('paid');
  });

  it('cancels the order and releases stock when Stripe is unreachable', async () => {
    stripeProvider.setClient({
      checkout: {
        sessions: {
          create: jest.fn(async () => {
            throw new Error('network down');
          }),
        },
      },
    });
    const product = await createProduct({ sizes: [], stock: 3 });
    const { agent } = await signedInAgent(ctx.app);
    await fillCart(agent, product, 2);
    const res = await agent.post('/api/orders').send({ shippingAddress: address });
    expect(res.status).toBe(502);
    expect((await Product.findById(product.id)).stock).toBe(3);
    expect((await Order.findOne()).status).toBe('cancelled');
  });

  it.each([
    ['paypal', ['paypal']],
    ['klarna', ['klarna']],
    ['apple_pay', ['card']],
    ['google_pay', ['card']],
    ['card', ['card']],
  ])('opens Checkout restricted to the chosen method (%s)', async (method, types) => {
    const product = await createProduct({ sizes: [], stock: 5 });
    const { agent } = await signedInAgent(ctx.app);
    await fillCart(agent, product, 1);
    const res = await agent.post('/api/orders').send({ shippingAddress: address, paymentMethod: method });
    expect(res.status).toBe(201);
    expect(res.body.order.payment.method).toBe(method);
    expect(created[0].payment_method_types).toEqual(types);
  });

  it('renews the reservation and closes the old session when resuming payment', async () => {
    const { order, agent } = await placeOrder();
    const expire = jest.fn(async () => ({}));
    const client = {
      checkout: {
        sessions: {
          create: jest.fn(async (p) => (created.push(p), { id: 'cs_test_new', url: 'https://checkout.stripe.com/c/pay/new' })),
          retrieve: jest.fn(async () => ({ payment_status: 'unpaid' })),
          expire,
        },
      },
    };
    stripeProvider.setClient(client);
    // Only 5 minutes of the reservation left.
    await Order.updateOne({ _id: order.id }, { reservationExpiresAt: new Date(Date.now() + 5 * 60 * 1000) });

    const res = await agent.post(`/api/orders/${order.id}/pay`).send({});
    expect(res.status).toBe(200);
    expect(expire).toHaveBeenCalledWith('cs_test_1');
    const params = created[created.length - 1];
    // Stripe requires at least 30 minutes.
    expect(params.expires_at - Math.floor(Date.now() / 1000)).toBeGreaterThanOrEqual(30 * 60);
    expect((await Order.findById(order.id)).payment.sessionId).toBe('cs_test_new');
  });

  it('lets the shopper switch method when resuming payment', async () => {
    const { order, agent } = await placeOrder();
    const res = await agent.post(`/api/orders/${order.id}/pay`).send({ paymentMethod: 'paypal' });
    expect(res.status).toBe(200);
    expect(res.body.order.payment.method).toBe('paypal');
    expect(created[1].payment_method_types).toEqual(['paypal']);
    expect((await agent.post(`/api/orders/${order.id}/pay`).send({ paymentMethod: 'bitcoin' })).status).toBe(400);
  });

  it('disables the mock payment endpoint', async () => {
    const { order, agent } = await placeOrder();
    expect((await agent.post(`/api/payments/mock/${order.id}/complete`)).status).toBe(404);
  });
});
