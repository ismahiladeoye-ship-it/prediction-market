const request = require('supertest');
const Cart = require('../api/models/cartModel');
const { resetConfig } = require('../api/config/env');
const { useTestApp, signedInAgent, createProduct } = require('./helpers/setup');

const ctx = useTestApp();

describe('cart', () => {
  it('requires authentication', async () => {
    expect((await request(ctx.app).get('/api/cart')).status).toBe(401);
    expect((await request(ctx.app).post('/api/cart/add').send({})).status).toBe(401);
  });

  it('returns an empty cart instead of 404', async () => {
    const { agent } = await signedInAgent(ctx.app);
    const res = await agent.get('/api/cart/view');
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.summary).toMatchObject({ subtotal: 0, tax: 0, shipping: 0, total: 0 });
  });

  it('ignores a client-supplied price and computes totals on the server', async () => {
    const product = await createProduct({ price: 49.99 });
    const { agent } = await signedInAgent(ctx.app);
    const res = await agent.post('/api/cart/add').send({ productId: product.id, quantity: 2, size: 'M', price: 0.01 });
    expect(res.status).toBe(200);
    expect(res.body.items[0]).toMatchObject({ price: 49.99, quantity: 2, lineTotal: 99.98, size: 'M' });
    // TAX_RATE=0.1, SHIPPING_STANDARD=20 in the test environment
    expect(res.body.summary).toEqual({ subtotal: 99.98, tax: 10, shipping: 20, total: 129.98, currency: 'gbp' });
    const stored = await Cart.findOne({}).lean();
    expect(stored.items[0].price).toBeUndefined();
  });

  it('reflects price changes made after the item was added', async () => {
    const product = await createProduct({ price: 10, sizes: [] });
    const { agent } = await signedInAgent(ctx.app);
    await agent.post('/api/cart/add').send({ productId: product.id, quantity: 1 });
    product.price = 12.5;
    await product.save();
    const res = await agent.get('/api/cart');
    expect(res.body.items[0].price).toBe(12.5);
  });

  it('offers express delivery pricing', async () => {
    const product = await createProduct({ price: 10, sizes: [] });
    const { agent } = await signedInAgent(ctx.app);
    await agent.post('/api/cart/add').send({ productId: product.id });
    const res = await agent.get('/api/cart?delivery=express');
    expect(res.body.summary.shipping).toBe(40);
    expect(res.body.deliveryOptions.map((o) => o.method)).toEqual(['standard', 'express']);
  });

  it('uses the store defaults: £4.99 standard delivery, free from £100, no express', async () => {
    const keys = ['SHIPPING_STANDARD', 'SHIPPING_EXPRESS', 'FREE_SHIPPING_THRESHOLD', 'TAX_RATE'];
    const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
    keys.forEach((k) => delete process.env[k]);
    resetConfig();
    try {
      const product = await createProduct({ price: 49.99, sizes: [] });
      const { agent } = await signedInAgent(ctx.app);
      await agent.post('/api/cart/add').send({ productId: product.id });
      const res = await agent.get('/api/cart?delivery=express');
      expect(res.body.deliveryMethod).toBe('standard');
      expect(res.body.summary).toEqual({ subtotal: 49.99, tax: 0, shipping: 4.99, total: 54.98, currency: 'gbp' });
      expect(res.body.deliveryOptions).toEqual([{ method: 'standard', label: 'Standard delivery (3-5 working days)', price: 4.99 }]);
      expect(res.body.freeShippingThreshold).toBe(100);
      expect(res.body.shipToCountries).toEqual(['GB']);

      // £99.98 still pays for delivery; £149.97 (and anything from £100) does not.
      const two = await agent.put('/api/cart/update').send({ productId: product.id, quantity: 2 });
      expect(two.body.summary.shipping).toBe(4.99);
      const three = await agent.put('/api/cart/update').send({ productId: product.id, quantity: 3 });
      expect(three.body.summary).toEqual({ subtotal: 149.97, tax: 0, shipping: 0, total: 149.97, currency: 'gbp' });
      expect(three.body.deliveryOptions[0].price).toBe(0);
    } finally {
      keys.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k])));
      resetConfig();
    }
  });

  it('makes delivery free from exactly the threshold', async () => {
    process.env.FREE_SHIPPING_THRESHOLD = '100';
    resetConfig();
    try {
      const product = await createProduct({ price: 50, sizes: [] });
      const { agent } = await signedInAgent(ctx.app);
      await agent.post('/api/cart/add').send({ productId: product.id, quantity: 2 });
      expect((await agent.get('/api/cart')).body.summary.shipping).toBe(0);
      // Express is never covered by free delivery.
      expect((await agent.get('/api/cart?delivery=express')).body.summary.shipping).toBe(40);
    } finally {
      process.env.FREE_SHIPPING_THRESHOLD = '0';
      resetConfig();
    }
  });

  it('validates size, quantity and stock', async () => {
    const product = await createProduct({ stock: 3 });
    const { agent } = await signedInAgent(ctx.app);
    expect((await agent.post('/api/cart/add').send({ productId: product.id, quantity: 1 })).body.message).toMatch(/choose a size/);
    expect((await agent.post('/api/cart/add').send({ productId: product.id, quantity: 1, size: 'XXL' })).status).toBe(400);
    expect((await agent.post('/api/cart/add').send({ productId: product.id, quantity: 0, size: 'S' })).status).toBe(400);
    expect((await agent.post('/api/cart/add').send({ productId: product.id, quantity: 1.5, size: 'S' })).status).toBe(400);
    expect((await agent.post('/api/cart/add').send({ productId: product.id, quantity: 4, size: 'S' })).status).toBe(409);
    expect((await agent.post('/api/cart/add').send({ productId: product.id, quantity: 3, size: 'S' })).status).toBe(200);
    expect((await agent.post('/api/cart/add').send({ productId: product.id, quantity: 1, size: 'S' })).status).toBe(409);
  });

  it('rejects unknown and inactive products', async () => {
    const inactive = await createProduct({ isActive: false, sizes: [] });
    const { agent } = await signedInAgent(ctx.app);
    expect((await agent.post('/api/cart/add').send({ productId: inactive.id })).status).toBe(404);
    expect((await agent.post('/api/cart/add').send({ productId: 'nope' })).status).toBe(400);
  });

  it('keeps separate lines per size and merges repeated adds', async () => {
    const product = await createProduct();
    const { agent } = await signedInAgent(ctx.app);
    await agent.post('/api/cart/add').send({ productId: product.id, size: 'S' });
    await agent.post('/api/cart/add').send({ productId: product.id, size: 'S' });
    const res = await agent.post('/api/cart/add').send({ productId: product.id, size: 'L' });
    expect(res.body.items.map((i) => [i.size, i.quantity])).toEqual([
      ['S', 2],
      ['L', 1],
    ]);
    expect(res.body.totalQuantity).toBe(3);
  });

  it('updates quantities, removes lines and clears the cart', async () => {
    const product = await createProduct({ sizes: [] });
    const { agent } = await signedInAgent(ctx.app);
    await agent.post('/api/cart/add').send({ productId: product.id });
    const updated = await agent.put('/api/cart/update').send({ productId: product.id, quantity: 4 });
    expect(updated.body.items[0].quantity).toBe(4);
    expect((await agent.put('/api/cart/update').send({ productId: product.id, quantity: 11 })).status).toBe(409);
    const removed = await agent.delete(`/api/cart/items/${product.id}`);
    expect(removed.body.items).toEqual([]);
    await agent.post('/api/cart/add').send({ productId: product.id });
    expect((await agent.delete('/api/cart/delete').send({ productId: product.id })).body.items).toEqual([]);
    await agent.post('/api/cart/add').send({ productId: product.id });
    expect((await agent.delete('/api/cart/clear')).body.items).toEqual([]);
  });

  it('flags items that went out of stock or were withdrawn', async () => {
    const product = await createProduct({ sizes: [], stock: 5 });
    const { agent } = await signedInAgent(ctx.app);
    await agent.post('/api/cart/add').send({ productId: product.id, quantity: 3 });
    await product.updateOne({ stock: 1 });
    const res = await agent.get('/api/cart');
    expect(res.body.issues[0].message).toMatch(/Only 1/);
    await product.updateOne({ isActive: false });
    const gone = await agent.get('/api/cart');
    expect(gone.body.items).toEqual([]);
    expect(gone.body.issues[0].message).toMatch(/no longer available/);
  });

  it('keeps carts separate between users', async () => {
    const product = await createProduct({ sizes: [] });
    const a = await signedInAgent(ctx.app);
    const b = await signedInAgent(ctx.app);
    await a.agent.post('/api/cart/add').send({ productId: product.id });
    expect((await b.agent.get('/api/cart')).body.items).toEqual([]);
  });
});
