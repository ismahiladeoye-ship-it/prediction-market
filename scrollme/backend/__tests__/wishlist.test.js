const request = require('supertest');
const { useTestApp, signedInAgent, createProduct } = require('./helpers/setup');

const ctx = useTestApp();

describe('wishlist', () => {
  it('requires authentication', async () => {
    expect((await request(ctx.app).get('/api/wishlist')).status).toBe(401);
  });

  it('adds, de-duplicates, removes and persists per user', async () => {
    const p1 = await createProduct({ name: 'One' });
    const p2 = await createProduct({ name: 'Two' });
    const a = await signedInAgent(ctx.app);
    const b = await signedInAgent(ctx.app);

    await a.agent.post('/api/wishlist').send({ productId: p1.id });
    await a.agent.post('/api/wishlist').send({ productId: p1.id });
    const res = await a.agent.post('/api/wishlist').send({ productId: p2.id });
    expect(res.body.items.map((i) => i.name)).toEqual(['One', 'Two']);

    expect((await b.agent.get('/api/wishlist')).body.items).toEqual([]);

    const removed = await a.agent.delete(`/api/wishlist/${p1.id}`);
    expect(removed.body.items.map((i) => i.name)).toEqual(['Two']);
    // Persisted server-side: a fresh session sees the same list.
    const again = await request.agent(ctx.app);
    await again.post('/api/auth/login').send({ username: a.user.username, password: 'Str0ng!Passw0rd' });
    expect((await again.get('/api/wishlist')).body.items.map((i) => i.name)).toEqual(['Two']);
  });

  it('merges a guest wishlist on sign-in, skipping unknown products', async () => {
    const p1 = await createProduct({ name: 'One' });
    const p2 = await createProduct({ name: 'Two', isActive: false });
    const { agent } = await signedInAgent(ctx.app);
    const res = await agent.post('/api/wishlist/merge').send({ productIds: [p1.id, p2.id, '507f1f77bcf86cd799439011'] });
    expect(res.body.items.map((i) => i.name)).toEqual(['One']);
    expect((await agent.post('/api/wishlist/merge').send({ productIds: ['bad'] })).status).toBe(400);
  });

  it('rejects unknown products', async () => {
    const { agent } = await signedInAgent(ctx.app);
    expect((await agent.post('/api/wishlist').send({ productId: '507f1f77bcf86cd799439011' })).status).toBe(404);
  });
});
