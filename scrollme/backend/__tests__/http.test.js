const request = require('supertest');
const { useTestApp } = require('./helpers/setup');

const ctx = useTestApp();

describe('HTTP hardening', () => {
  it('sets security headers and hides the framework', async () => {
    const res = await request(ctx.app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('reports database readiness', async () => {
    expect((await request(ctx.app).get('/api/ready')).body).toEqual({ status: 'ok', db: 'connected' });
  });

  it('allows credentials only for configured origins', async () => {
    const ok = await request(ctx.app).get('/api/health').set('Origin', 'http://localhost:3000');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(ok.headers['access-control-allow-credentials']).toBe('true');
    const evil = await request(ctx.app).get('/api/health').set('Origin', 'https://evil.example');
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rejects cross-site form posts (non-JSON bodies)', async () => {
    const res = await request(ctx.app).post('/api/auth/login').type('form').send('username=a&password=b');
    expect(res.status).toBe(415);
  });

  it('returns JSON errors for malformed bodies and unknown routes', async () => {
    const bad = await request(ctx.app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"username":');
    expect(bad.status).toBe(400);
    expect(bad.body.message).toMatch(/Malformed/);
    const missing = await request(ctx.app).get('/api/nope');
    expect(missing.status).toBe(404);
    expect(missing.body.message).toMatch(/not found/);
  });

  it('rate limits repeated failed logins when enabled', async () => {
    process.env.RATE_LIMIT_ENABLED = 'true';
    require('../api/config/env').resetConfig();
    let last;
    for (let i = 0; i < 21; i += 1) {
      last = await request(ctx.app).post('/api/auth/login').send({ username: 'nobody', password: 'x' });
    }
    expect(last.status).toBe(429);
    process.env.RATE_LIMIT_ENABLED = 'false';
    require('../api/config/env').resetConfig();
  });
});
