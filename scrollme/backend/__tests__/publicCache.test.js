const request = require('supertest');
const { useTestApp, createProduct, signedInAgent } = require('./helpers/setup');

const ctx = useTestApp();
const SHARED = /public, max-age=0, s-maxage=60, stale-while-revalidate=300/;

describe('CDN caching of public catalogue answers', () => {
  it('lets the CDN share product lists, product pages, Specials and shop details briefly', async () => {
    const product = await createProduct({ name: 'Shared Tee', price: 20 });
    for (const path of [
      '/api/product/list',
      '/api/product/categories',
      '/api/product/brands',
      '/api/product/highlights',
      `/api/product/${product.id}`,
      '/api/site/home',
      '/api/site/business',
      '/api/payments/methods',
    ]) {
      const res = await request(ctx.app).get(path);
      expect([path, res.status]).toEqual([path, 200]);
      expect([path, res.get('cache-control')]).toEqual([path, expect.stringMatching(SHARED)]);
    }
  });

  it('never shares errors, accounts, bags or admin answers', async () => {
    const missing = await request(ctx.app).get('/api/product/0123456789abcdef01234567');
    expect(missing.status).toBe(404);
    expect(missing.get('cache-control')).toBe('no-store');
    const { agent } = await signedInAgent(ctx.app);
    expect((await agent.get('/api/cart/view')).get('cache-control')).toBe('no-store');
    expect((await agent.get('/api/auth/me')).get('cache-control')).toBe('no-store');
    const { agent: admin } = await signedInAgent(ctx.app, { roles: ['user', 'admin'] });
    expect((await admin.get('/api/admin/products')).get('cache-control')).toBe('no-store');
  });
});
