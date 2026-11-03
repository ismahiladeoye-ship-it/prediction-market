const request = require('supertest');
const { useTestApp, signedInAgent, createProduct } = require('./helpers/setup');

const ctx = useTestApp();

// Stock counts are for the shop's admins only: shoppers see "in stock" or
// "out of stock", never how many are left.
describe('stock counts are private to admins', () => {
  it('product listings and pages say whether an item is in stock, not how many', async () => {
    const few = await createProduct({ name: 'Last Few', sizes: [], stock: 3 });
    const none = await createProduct({ name: 'Sold Out', sizes: [], stock: 0 });

    const list = await request(ctx.app).get('/api/product/list');
    expect(list.status).toBe(200);
    for (const p of list.body.products) expect(p).not.toHaveProperty('stock');
    const byName = Object.fromEntries(list.body.products.map((p) => [p.name, p.inStock]));
    expect(byName).toEqual({ 'Last Few': true, 'Sold Out': false });

    // The "in stock only" filter still works.
    const inStock = await request(ctx.app).get('/api/product/list?inStock=true');
    expect(inStock.body.products.map((p) => p.name)).toEqual(['Last Few']);

    const page = await request(ctx.app).get(`/api/product/${few.id}`);
    expect(page.body).not.toHaveProperty('stock');
    expect(page.body.inStock).toBe(true);
    expect((await request(ctx.app).get(`/api/product/${none.id}`)).body.inStock).toBe(false);
  });

  it('product responses leave out internal fields', async () => {
    const product = await createProduct({ name: 'Boxed', sizes: [], sku: 'INT-001', weight: 1.2, dimensions: { length: 30, width: 20, height: 10 } });
    const page = (await request(ctx.app).get(`/api/product/${product.id}`)).body;
    const listed = (await request(ctx.app).get('/api/product/list')).body.products[0];
    for (const p of [page, listed]) {
      for (const field of ['sku', 'weight', 'dimensions', '__v', 'stock']) expect(p).not.toHaveProperty(field);
    }
    expect(page.name).toBe('Boxed');
  });

  it('the bag and wishlist never reveal how many are left', async () => {
    const product = await createProduct({ name: 'Last Few', sizes: [], stock: 3 });
    const { agent } = await signedInAgent(ctx.app);

    const added = await agent.post('/api/cart/add').send({ productId: product.id, quantity: 3 });
    expect(added.status).toBe(200);
    expect(added.body.items[0]).not.toHaveProperty('stock');
    expect(added.body.items[0].inStock).toBe(true);

    const tooMany = await agent.post('/api/cart/add').send({ productId: product.id, quantity: 1 });
    expect(tooMany.status).toBe(409);
    expect(tooMany.body.message).toMatch(/don't have that many/);
    expect(tooMany.body.message).not.toMatch(/\d/);
    const update = await agent.put('/api/cart/update').send({ productId: product.id, quantity: 5 });
    expect(update.status).toBe(409);
    expect(update.body.message).not.toMatch(/\d/);

    // Stock drops below what is in the bag: the warning names the shopper's own quantity only.
    await product.updateOne({ stock: 1 });
    const bag = await agent.get('/api/cart');
    expect(bag.body.issues[0].message).toBe("We don't have 3 of Last Few right now. Please choose fewer.");

    await agent.post('/api/wishlist').send({ productId: product.id });
    const wishlist = await agent.get('/api/wishlist');
    expect(wishlist.body.items[0]).not.toHaveProperty('stock');
    expect(wishlist.body.items[0].inStock).toBe(true);
  });

  it('admins still see the exact stock', async () => {
    const product = await createProduct({ name: 'Last Few', sizes: [], stock: 3 });
    const { agent } = await signedInAgent(ctx.app, { roles: ['admin'] });
    expect((await agent.get(`/api/admin/products/${product.id}`)).body.stock).toBe(3);
    expect((await agent.get('/api/admin/products')).body.products[0].stock).toBe(3);
  });
});
