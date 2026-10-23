const request = require('supertest');
const Subscriber = require('../api/models/subscriberModel');
const { useTestApp, signedInAgent } = require('./helpers/setup');

const ctx = useTestApp();

describe('newsletter', () => {
  it('stores a subscriber once and answers the same way on repeat sign-ups', async () => {
    const first = await request(ctx.app).post('/api/newsletter').send({ email: 'Fan@Example.com ' });
    const again = await request(ctx.app).post('/api/newsletter').send({ email: 'fan@example.com' });
    expect(first.status).toBe(200);
    expect(again.body.message).toBe(first.body.message);
    expect(await Subscriber.countDocuments({ email: 'fan@example.com' })).toBe(1);
  });

  it('rejects invalid addresses', async () => {
    expect((await request(ctx.app).post('/api/newsletter').send({ email: 'nope' })).status).toBe(400);
  });

  it('lets only admins export the list', async () => {
    await request(ctx.app).post('/api/newsletter').send({ email: 'a@example.com' });
    expect((await request(ctx.app).get('/api/newsletter')).status).toBe(401);
    const customer = await signedInAgent(ctx.app);
    expect((await customer.agent.get('/api/newsletter')).status).toBe(403);
    const admin = await signedInAgent(ctx.app, { roles: ['admin'] });
    const res = await admin.agent.get('/api/newsletter');
    expect(res.body).toMatchObject({ total: 1, subscribers: [{ email: 'a@example.com' }] });
  });
});
