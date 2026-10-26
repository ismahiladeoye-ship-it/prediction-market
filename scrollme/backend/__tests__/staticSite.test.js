const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../api/app');
const { resetConfig } = require('../api/config/env');
const { useTestApp } = require('./helpers/setup');

// Single-service hosting (Railway/Render/Fly/VPS): the Node process serves the
// built storefront as well as the API. useTestApp gives us a connected DB.
useTestApp();

let app;
let dir;
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gis-build-'));
  fs.mkdirSync(path.join(dir, 'static', 'js'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>Get It Sourced</title><div id="root"></div>');
  fs.writeFileSync(path.join(dir, 'static', 'js', 'main.abc123.js'), 'console.log("app")');
  fs.writeFileSync(path.join(dir, 'robots.txt'), 'User-agent: *');
  process.env.SERVE_STATIC = 'true';
  process.env.STATIC_DIR = dir;
  resetConfig();
  app = createApp();
});
afterAll(() => {
  delete process.env.SERVE_STATIC;
  delete process.env.STATIC_DIR;
  resetConfig();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('single-service hosting', () => {
  it('serves the storefront index with page security headers', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Get It Sourced');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['content-security-policy']).not.toContain("default-src 'none'");
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it('serves a client-side route (e.g. /checkout) as the SPA shell', async () => {
    const res = await request(app).get('/checkout');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<div id="root">');
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it('caches fingerprinted assets for a year', async () => {
    const res = await request(app).get('/static/js/main.abc123.js');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toContain('immutable');
  });

  it('keeps the API locked down and separate from the pages', async () => {
    const health = await request(app).get('/api/health');
    expect(health.body).toEqual({ status: 'ok' });
    // The API keeps its strict CSP and no-store; it does not get the page CSP.
    expect(health.headers['content-security-policy']).toContain("default-src 'none'");
    expect(health.headers['cache-control']).toBe('no-store');
  });

  it('returns JSON (not the SPA shell) for an unknown API path', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.text).not.toContain('<div id="root">');
  });

  it('does not serve the shell for a non-GET to a page path', async () => {
    const res = await request(app).post('/').set('Content-Type', 'application/json').send({});
    expect(res.status).toBe(404);
    expect(res.text).not.toContain('<div id="root">');
  });
});
