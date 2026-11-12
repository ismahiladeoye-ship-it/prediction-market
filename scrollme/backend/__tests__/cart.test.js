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

  it('refuses price-on-request items, and blocks checkout if one is already in the bag', async () => {
    const product = await createProduct({ price: 0, priceOnRequest: true });
    const { agent } = await signedInAgent(ctx.app);
    const res = await agent.post('/api/cart/add').send({ productId: product.id, quantity: 1, size: 'M' });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/price on request/);
    // Switched to price on request after it was added.
    const other = await createProduct({ price: 30 });
    await agent.post('/api/cart/add').send({ productId: other.id, quantity: 1, size: 'M' });
    other.priceOnRequest = true;
    await other.save();
    const view = await agent.get('/api/cart/view');
    expect(view.body.items).toEqual([]);
    expect(view.body.issues[0].message).toMatch(/price on request/);
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

  it('uses the store defaults: £3.99 standard delivery, free from £100, no express', async () => {
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
      expect(res.body.summary).toEqual({ subtotal: 49.99, tax: 0, shipping: 3.99, total: 53.98, currency: 'gbp' });
      expect(res.body.deliveryOptions).toEqual([{ method: 'standard', label: 'Standard delivery (3-5 working days)', price: 3.99 }]);
      expect(res.body.freeShippingThreshold).toBe(100);
      expect(res.body.shipToCountries).toEqual(['GB']);

      // £99.98 still pays for delivery; £149.97 (and anything from £100) does not.
      const two = await agent.put('/api/cart/update').send({ productId: product.id, quantity: 2 });
      expect(two.body.summary.shipping).toBe(3.99);
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

  it('caps the number of different items in a bag', async () => {
    const products = await Promise.all(Array.from({ length: 51 }, (_, i) => createProduct({ name: `Tee ${i}`, sizes: [] })));
    const { agent } = await signedInAgent(ctx.app);
    for (const p of products.slice(0, 50)) expect((await agent.post('/api/cart/add').send({ productId: p.id })).status).toBe(200);
    const res = await agent.post('/api/cart/add').send({ productId: products[50].id });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/up to 50 different items/);
    // More of an item already in the bag is still fine.
    expect((await agent.post('/api/cart/add').send({ productId: products[0].id })).status).toBe(200);
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
    // At most 5 of one item; within that, never more than are in stock.
    const tooMany = await agent.put('/api/cart/update').send({ productId: product.id, quantity: 6 });
    expect(tooMany.status).toBe(400);
    expect(tooMany.body.message).toMatch(/at most 5 of one item/);
    await product.updateOne({ stock: 3 });
    expect((await agent.put('/api/cart/update').send({ productId: product.id, quantity: 5 })).status).toBe(409);
    await product.updateOne({ stock: 10 });
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
    expect(res.body.issues[0].message).toMatch(/don't have 3 of/);
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

describe('quantity limit', () => {
  it('keeps each item to 5 a bag, also when added in steps', async () => {
    const product = await createProduct({ sizes: [] });
    const { agent } = await signedInAgent(ctx.app);
    expect((await agent.post('/api/cart/add').send({ productId: product.id, quantity: 6 })).status).toBe(400);
    expect((await agent.post('/api/cart/add').send({ productId: product.id, quantity: 3 })).status).toBe(200);
    const more = await agent.post('/api/cart/add').send({ productId: product.id, quantity: 3 });
    expect(more.status).toBe(400);
    expect(more.body.message).toBe('You can buy at most 5 of one item');
    expect((await agent.post('/api/cart/add').send({ productId: product.id, quantity: 2 })).status).toBe(200);
  });

  it('flags bags saved with more than 5 of an item, so they cannot be checked out', async () => {
    const product = await createProduct({ name: 'Old Bag Item', sizes: [], stock: 20 });
    const { agent, user } = await signedInAgent(ctx.app);
    await agent.post('/api/cart/add').send({ productId: product.id, quantity: 1 });
    await Cart.updateOne({ userId: user._id }, { $set: { 'items.0.quantity': 8 } });
    const res = await agent.get('/api/cart');
    expect(res.body.issues.map((i) => i.message)).toEqual(['You can buy at most 5 of Old Bag Item. Please choose fewer.']);
  });
});
