const request = require('supertest');
const Order = require('../api/models/orderModel');
const ContactMessage = require('../api/models/contactMessageModel');
const mailer = require('../api/services/mailer');
const { markOrderPaid, releaseExpiredOrders } = require('../api/services/orders');
const { resetConfig } = require('../api/config/env');
const { useTestApp, createUser, signedInAgent, createProduct } = require('./helpers/setup');

const ctx = useTestApp();

// Emails are sent in the background, so wait for them.
const waitFor = async (check, ms = 3000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (check()) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error('timed out waiting');
};

const SHOP = {
  name: 'Get It Sourced',
  legalName: 'Get It Sourced Ltd',
  address: '16 Benton Street\nManchester\nM9 4NG',
  email: 'hello@getitsourced.example',
  phone: '+44 7700 900000',
  companyNumber: '12345678',
  vatNumber: 'GB123456789',
  deliveryEstimate: '2–4 working days',
  returnPostage: 'free',
  socials: { instagram: 'https://www.instagram.com/getitsourced', tiktok: '', whatsapp: 'https://wa.me/447700900000' },
};

const adminAgent = async () => (await signedInAgent(ctx.app, { roles: ['user', 'admin'] })).agent;

let mailSpy;
beforeEach(() => {
  mailSpy = jest.spyOn(mailer, 'sendMail').mockResolvedValue({ delivered: true });
});
afterEach(() => mailSpy.mockRestore());

describe('shop details', () => {
  it('has sensible defaults and the real delivery terms', async () => {
    const res = await request(ctx.app).get('/api/site/business');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Get It Sourced', address: '', email: '', configured: false, returnPostage: 'customer' });
    // From the API settings (the test environment uses £20/£40 and no free threshold).
    expect(res.body.delivery).toEqual({ currency: 'gbp', standard: 20, express: 40, freeOver: null, countries: ['GB'] });
  });

  it('is saved by admins and checked', async () => {
    const agent = await adminAgent();
    const saved = await agent.put('/api/admin/business').send(SHOP);
    expect(saved.status).toBe(200);
    const res = (await request(ctx.app).get('/api/site/business')).body;
    expect(res).toMatchObject({ ...SHOP, configured: true });

    expect((await agent.put('/api/admin/business').send({ ...SHOP, email: 'not-an-email' })).status).toBe(400);
    expect((await agent.put('/api/admin/business').send({ ...SHOP, socials: { instagram: 'https://evil.example/instagram.com' } })).status).toBe(400);
    expect((await agent.put('/api/admin/business').send({ ...SHOP, socials: { instagram: 'javascript://instagram.com/%0aalert(1)' } })).status).toBe(400);
    expect((await agent.put('/api/admin/business').send({ ...SHOP, name: '' })).status).toBe(400);

    const { agent: shopper } = await signedInAgent(ctx.app);
    expect((await shopper.put('/api/admin/business').send(SHOP)).status).toBe(403);
  });
});

describe('contact form', () => {
  const question = { name: 'Ada Lovelace', email: 'ada@example.com', message: 'Do you have the black tracksuit in medium?' };

  it('saves the message and emails the shop, with replies going to the sender', async () => {
    await (await adminAgent()).put('/api/admin/business').send(SHOP);
    const res = await request(ctx.app)
      .post('/api/contact')
      .send({ ...question, orderNumber: 'gis-abc-123' });
    expect(res.status).toBe(201);
    const [saved] = await ContactMessage.find().lean();
    expect(saved).toMatchObject({ kind: 'general', name: 'Ada Lovelace', email: 'ada@example.com', orderNumber: 'GIS-ABC-123', status: 'new' });

    await waitFor(() => mailSpy.mock.calls.length === 1);
    const mail = mailSpy.mock.calls[0][0];
    expect(mail).toMatchObject({ to: SHOP.email, replyTo: 'ada@example.com', subject: 'New message from Ada Lovelace' });
    expect(mail.text).toContain('Do you have the black tracksuit in medium?');
    expect(mail.text).toContain('GIS-ABC-123');
  });

  it('takes sourcing requests, which must name the item', async () => {
    const sourcing = { ...question, kind: 'sourcing', message: 'Looking for these for my birthday please' };
    expect((await request(ctx.app).post('/api/contact').send(sourcing)).status).toBe(400);
    const res = await request(ctx.app)
      .post('/api/contact')
      .send({ ...sourcing, item: 'Essentials hoodie in black', size: 'L', budget: '£120' });
    expect(res.status).toBe(201);
    expect(await ContactMessage.findOne({ kind: 'sourcing' }).lean()).toMatchObject({ item: 'Essentials hoodie in black', size: 'L', budget: '£120' });
  });

  it('quietly drops bots that fill in the hidden field', async () => {
    const res = await request(ctx.app)
      .post('/api/contact')
      .send({ ...question, website: 'http://spam.example' });
    expect(res.status).toBe(201);
    expect(await ContactMessage.countDocuments()).toBe(0);
    await new Promise((r) => setTimeout(r, 100));
    expect(mailSpy).not.toHaveBeenCalled();
  });

  it('limits each address to 5 messages an hour', async () => {
    process.env.RATE_LIMIT_ENABLED = 'true';
    resetConfig();
    try {
      for (let i = 0; i < 5; i += 1) expect((await request(ctx.app).post('/api/contact').send(question)).status).toBe(201);
      expect((await request(ctx.app).post('/api/contact').send(question)).status).toBe(429);
    } finally {
      process.env.RATE_LIMIT_ENABLED = 'false';
      resetConfig();
    }
  });

  it('lets admins read messages and mark them replied', async () => {
    await request(ctx.app).post('/api/contact').send(question);
    const agent = await adminAgent();
    const list = (await agent.get('/api/admin/messages')).body;
    expect(list.counts).toEqual({ new: 1, replied: 0, closed: 0 });
    expect(list.messages[0]).toMatchObject({ name: 'Ada Lovelace', status: 'new' });

    const updated = await agent.patch(`/api/admin/messages/${list.messages[0].id}`).send({ status: 'replied' });
    expect(updated.body.item.status).toBe('replied');
    expect((await agent.get('/api/admin/messages')).body.messages).toHaveLength(0);
    expect((await agent.get('/api/admin/messages?status=all')).body.counts).toEqual({ new: 0, replied: 1, closed: 0 });

    const { agent: shopper } = await signedInAgent(ctx.app);
    expect((await shopper.get('/api/admin/messages')).status).toBe(403);
  });
});

describe('order emails', () => {
  const makeOrder = async (overrides = {}) => {
    const user = await createUser();
    const product = await createProduct({ name: 'Relaxed <b>Tracksuit</b>', price: 100 });
    return Order.create({
      orderNumber: `GIS-TEST-${Date.now()}`,
      userId: user._id,
      email: user.email,
      items: [{ productId: product._id, name: product.name, size: 'M', quantity: 2, unitPriceCents: 10000, lineTotalCents: 20000 }],
      shippingAddress: { fullName: 'Ada Lovelace', line1: '16 Benton Street', city: 'Manchester', postalCode: 'M9 4NG', country: 'GB', phone: '+447700900000' },
      deliveryMethod: 'standard',
      currency: 'gbp',
      amounts: { subtotalCents: 20000, taxCents: 0, shippingCents: 0, totalCents: 20000 },
      status: 'pending_payment',
      reservationExpiresAt: new Date(Date.now() + 60000),
      payment: { provider: 'mock', status: 'pending' },
      ...overrides,
    });
  };
  const sentTo = (to) => mailSpy.mock.calls.map(([m]) => m).filter((m) => m.to === to);

  it('confirms payment to the customer once and alerts the shop', async () => {
    await (await adminAgent()).put('/api/admin/business').send(SHOP);
    const order = await makeOrder();
    await markOrderPaid(order._id, { reference: 'pi_1' });
    await markOrderPaid(order._id, { reference: 'pi_1' }); // webhook and return page
    await waitFor(() => mailSpy.mock.calls.length >= 2);
    await new Promise((r) => setTimeout(r, 100));

    const [confirmation, ...more] = sentTo(order.email);
    expect(more).toHaveLength(0);
    expect(confirmation.subject).toBe(`Order confirmed: ${order.orderNumber}`);
    expect(confirmation.replyTo).toBe(SHOP.email);
    for (const text of [
      order.orderNumber,
      'Relaxed <b>Tracksuit</b> (size M) × 2',
      '£200.00',
      'Delivery  Free',
      'Manchester M9 4NG',
      'United Kingdom',
      '2–4 working days',
      'cancel within 14 days',
      '/returns',
      `/orders/${order._id}`,
      'Get It Sourced is a trading name of Get It Sourced Ltd',
      'Company number 12345678 · VAT number GB123456789',
    ]) {
      expect(confirmation.text).toContain(text);
    }
    // Product names are escaped in the HTML version.
    expect(confirmation.html).toContain('Relaxed &lt;b&gt;Tracksuit&lt;/b&gt;');
    expect(confirmation.html).not.toContain('<b>Tracksuit</b>');

    const [alert] = sentTo(SHOP.email);
    expect(alert.subject).toBe(`New order ${order.orderNumber}`);
    expect(alert.text).toContain(order.email);
  });

  it('tells the customer when the order ships (with tracking) and when it is refunded', async () => {
    const order = await makeOrder();
    await markOrderPaid(order._id, { reference: 'pi_2' });
    const agent = await adminAgent();
    await agent.patch(`/api/admin/orders/${order._id}/status`).send({ status: 'shipped', trackingNumber: '1Z999AA10123456784' });
    await waitFor(() => sentTo(order.email).some((m) => m.subject.startsWith('Your order is on its way')));
    const shipped = sentTo(order.email).find((m) => m.subject.startsWith('Your order is on its way'));
    expect(shipped.text).toContain('Tracking number: 1Z999AA10123456784');

    await agent.patch(`/api/admin/orders/${order._id}/status`).send({ status: 'refunded' });
    await waitFor(() => sentTo(order.email).some((m) => m.subject.startsWith('Refund issued')));
    expect(sentTo(order.email).find((m) => m.subject.startsWith('Refund issued')).text).toContain('£200.00');
  });

  it('sends nothing for orders that were never paid', async () => {
    await makeOrder({ reservationExpiresAt: new Date(Date.now() - 1000) });
    await releaseExpiredOrders();
    await new Promise((r) => setTimeout(r, 150));
    expect(mailSpy).not.toHaveBeenCalled();
  });

  it('never fails a payment because email is down', async () => {
    mailSpy.mockRejectedValue(new Error('SMTP down'));
    const order = await makeOrder();
    const paid = await markOrderPaid(order._id, { reference: 'pi_3' });
    expect(paid.status).toBe('paid');
    await waitFor(() => mailSpy.mock.calls.length >= 1);
  });
});
