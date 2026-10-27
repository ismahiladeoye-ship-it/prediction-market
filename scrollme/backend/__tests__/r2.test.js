const sharp = require('sharp');
const Product = require('../api/models/productModel');
const { resetConfig } = require('../api/config/env');
const { useTestApp, signedInAgent } = require('./helpers/setup');

// Stand in for aws4fetch's signed client so no real network call is made.
jest.mock('aws4fetch', () => {
  const state = { calls: [], ok: true, status: 200 };
  class AwsClient {
    constructor(opts) {
      this.opts = opts;
    }
    async fetch(url, init) {
      state.calls.push({ url, init, opts: this.opts });
      return { ok: state.ok, status: state.status, text: async () => (state.ok ? '' : 'AccessDenied') };
    }
  }
  return { AwsClient, __state: state };
});
const r2mock = require('aws4fetch').__state;

const ctx = useTestApp();

const R2_ENV = {
  R2_BUCKET: 'gis-photos',
  R2_ENDPOINT: 'https://acc123.r2.cloudflarestorage.com',
  R2_ACCESS_KEY_ID: 'AKIAEXAMPLE',
  R2_SECRET_ACCESS_KEY: 'secret-key-value',
  R2_PUBLIC_URL: 'https://pub-abc.r2.dev',
};

const withEnv = async (vars, fn) => {
  const before = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  Object.assign(process.env, vars);
  resetConfig();
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(before)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    resetConfig();
  }
};

const photo = () =>
  sharp({ create: { width: 500, height: 500, channels: 3, background: '#333' } })
    .jpeg()
    .toBuffer();

beforeEach(() => {
  r2mock.calls.length = 0;
  r2mock.ok = true;
  r2mock.status = 200;
});

describe('photos in an S3 bucket (Cloudflare R2)', () => {
  it('uploads to the bucket and returns its public URL, and imports accept it', async () => {
    const { agent } = await signedInAgent(ctx.app, { roles: ['user', 'admin'] });
    await withEnv(R2_ENV, async () => {
      const res = await agent.post('/api/admin/uploads').attach('image', await photo(), 'front.jpg');
      expect(res.status).toBe(201);
      expect(res.body.url).toMatch(/^https:\/\/pub-abc\.r2\.dev\/products\/[a-f0-9]{32}\.webp$/);

      const call = r2mock.calls.at(-1);
      expect(call.init.method).toBe('PUT');
      expect(call.url).toMatch(/^https:\/\/acc123\.r2\.cloudflarestorage\.com\/gis-photos\/products\/[a-f0-9]{32}\.webp$/);
      expect(call.init.headers['content-type']).toBe('image/webp');
      expect(Buffer.isBuffer(call.init.body)).toBe(true);
      expect(call.opts).toMatchObject({ accessKeyId: 'AKIAEXAMPLE', service: 's3', region: 'auto' });

      const csv = 'sku,name,department,category,price,stock,images\nR2-1,R2 Tee,men,tshirts,20,3,front.jpg';
      const imported = await agent.post('/api/admin/products/import').send({ csv, dryRun: false, photos: { 'front.jpg': res.body.url } });
      expect(imported.status).toBe(200);
      expect((await Product.findOne({ sku: 'R2-1' }).lean()).images).toEqual([res.body.url]);
    });
  });

  it('reports a clear error when the bucket rejects the upload', async () => {
    const { agent } = await signedInAgent(ctx.app, { roles: ['user', 'admin'] });
    await withEnv(R2_ENV, async () => {
      r2mock.ok = false;
      r2mock.status = 403;
      const res = await agent.post('/api/admin/uploads').attach('image', await photo(), 'front.jpg');
      expect(res.status).toBe(502);
      expect(res.body.message).toMatch(/could not be saved/i);
    });
  });

  it('counts R2 as photo storage on the dashboard', async () => {
    const { agent } = await signedInAgent(ctx.app, { roles: ['user', 'admin'] });
    await withEnv({ ...R2_ENV, VERCEL: '1' }, async () => {
      expect((await agent.get('/api/admin/stats')).body.setup.photoStorage).toBe(true);
    });
  });

  it('does not treat a stranger URL on another host as a stored photo', async () => {
    const { isStoredPhoto } = require('../api/services/images');
    await withEnv(R2_ENV, async () => {
      expect(isStoredPhoto('https://pub-abc.r2.dev/products/' + 'a'.repeat(32) + '.webp')).toBe(true);
      expect(isStoredPhoto('https://evil.example/products/' + 'a'.repeat(32) + '.webp')).toBe(false);
      expect(isStoredPhoto('https://pub-abc.r2.dev/products/not-a-photo.webp')).toBe(false);
    });
  });
});
