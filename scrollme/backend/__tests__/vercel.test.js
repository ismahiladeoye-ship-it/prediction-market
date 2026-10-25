const request = require('supertest');
const sharp = require('sharp');
const Order = require('../api/models/orderModel');
const Product = require('../api/models/productModel');
const { loadConfig, resetConfig } = require('../api/config/env');
const { useTestApp, createUser, signedInAgent } = require('./helpers/setup');

jest.mock('@vercel/blob', () => ({
  put: jest.fn(async (pathname) => ({ url: `https://abc123.public.blob.vercel-storage.com/${pathname}` })),
}));
const { put } = require('@vercel/blob');

const ctx = useTestApp();

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
  sharp({ create: { width: 800, height: 600, channels: 3, background: '#222' } })
    .jpeg()
    .toBuffer();

const expiredOrder = async () => {
  const user = await createUser();
  return Order.create({
    orderNumber: `GIS-EXP-${Date.now()}`,
    userId: user._id,
    email: user.email,
    items: [{ productId: user._id, name: 'Cap', quantity: 1, unitPriceCents: 2000, lineTotalCents: 2000 }],
    shippingAddress: { fullName: 'Ada Lovelace', line1: '1 St', city: 'Leeds', postalCode: 'LS1 1AA', country: 'GB', phone: '+447700900000' },
    deliveryMethod: 'standard',
    currency: 'gbp',
    amounts: { subtotalCents: 2000, taxCents: 0, shippingCents: 0, totalCents: 2000 },
    status: 'pending_payment',
    reservationExpiresAt: new Date(Date.now() - 60000),
    payment: { provider: 'mock', status: 'pending' },
  });
};

describe('settings on Vercel', () => {
  const base = { MONGODB_URI: 'mongodb://db', JWT_SECRET: 'a', REFRESH_TOKEN_SECRET: 'b' };

  it("uses the project's address and allows its preview addresses", () => {
    const config = loadConfig({ ...base, VERCEL: '1', VERCEL_PROJECT_PRODUCTION_URL: 'getitsourced.vercel.app', VERCEL_URL: 'gis-abc.vercel.app' });
    expect(config.APP_URL).toBe('https://getitsourced.vercel.app');
    expect(config.clientOrigins).toEqual(['https://getitsourced.vercel.app', 'https://gis-abc.vercel.app']);
    expect(config.trustProxy).toBe(1);
    expect(config.onVercel).toBe(true);
  });

  it('keeps an explicit address, e.g. a custom domain', () => {
    const config = loadConfig({ ...base, VERCEL: '1', APP_URL: 'https://getitsourced.co.uk', VERCEL_PROJECT_PRODUCTION_URL: 'x.vercel.app' });
    expect(config.APP_URL).toBe('https://getitsourced.co.uk');
    expect(config.clientOrigins[0]).toBe('https://getitsourced.co.uk');
  });

  it('changes nothing elsewhere', () => {
    const config = loadConfig(base);
    expect(config).toMatchObject({ APP_URL: 'http://localhost:3000', clientOrigins: ['http://localhost:3000'], trustProxy: 'loopback', onVercel: false });
  });
});

describe('daily cron backstop', () => {
  it('is hidden unless called with the cron secret, then releases expired stock', async () => {
    expect((await request(ctx.app).get('/api/cron/release-expired')).status).toBe(404);
    await withEnv({ CRON_SECRET: 'cron-secret-value-1234567890' }, async () => {
      const app = require('../api/app').createApp();
      const order = await expiredOrder();
      expect((await request(app).get('/api/cron/release-expired').set('Authorization', 'Bearer wrong')).status).toBe(404);
      const res = await request(app).get('/api/cron/release-expired').set('Authorization', 'Bearer cron-secret-value-1234567890');
      expect(res.status).toBe(200);
      expect((await Order.findById(order._id)).status).toBe('cancelled');
    });
  });
});

describe('photos on Vercel', () => {
  it('are stored in the Blob store when one is connected', async () => {
    const { agent } = await signedInAgent(ctx.app, { roles: ['user', 'admin'] });
    await withEnv({ VERCEL: '1', BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_test' }, async () => {
      const res = await agent.post('/api/admin/uploads').attach('image', await photo(), 'front.jpg');
      expect(res.status).toBe(201);
      expect(res.body.url).toMatch(/^https:\/\/abc123\.public\.blob\.vercel-storage\.com\/products\/[a-f0-9]{32}\.webp$/);
      const [pathname, data, options] = put.mock.calls.at(-1);
      expect(pathname).toMatch(/^products\/[a-f0-9]{32}\.webp$/);
      expect(Buffer.isBuffer(data)).toBe(true);
      expect(options).toMatchObject({ access: 'public', contentType: 'image/webp', addRandomSuffix: false, token: 'vercel_blob_rw_test' });

      // Bulk upload accepts photos stored there.
      const csv = 'sku,name,category,price,stock,images\nBLOB-1,Blob Tee,tshirts,20,3,front.jpg';
      const imported = await agent.post('/api/admin/products/import').send({ csv, dryRun: false, photos: { 'front.jpg': res.body.url } });
      expect(imported.status).toBe(200);
      expect((await Product.findOne({ sku: 'BLOB-1' }).lean()).images).toEqual([res.body.url]);
    });
  });

  it('explain what to do when no Blob store is connected yet', async () => {
    const { agent } = await signedInAgent(ctx.app, { roles: ['user', 'admin'] });
    await withEnv({ VERCEL: '1' }, async () => {
      const res = await agent.post('/api/admin/uploads').attach('image', await photo(), 'front.jpg');
      expect(res.status).toBe(503);
      expect(res.body.message).toMatch(/connect a Vercel Blob store/);
      expect((await agent.get('/api/admin/stats')).body.setup.photoStorage).toBe(false);
    });
  });
});

describe('serverless entry point', () => {
  it('serves the API and returns stock from expired orders as requests arrive', async () => {
    const order = await expiredOrder();
    const handler = require('../api/serverless');
    const health = await request(handler).get('/api/health');
    expect(health.body).toEqual({ status: 'ok' });
    expect(health.headers['cache-control']).toBe('no-store');
    expect((await Order.findById(order._id)).status).toBe('cancelled');
    expect((await request(handler).get('/api/product/list?limit=1')).status).toBe(200);
  });

  it("refuses to run with Vercel's request helpers on, which would break every form", async () => {
    const handler = require('../api/serverless');
    // What Vercel adds to the response when NODEJS_HELPERS is not 0.
    const withHelpers = (req, res) => handler(req, Object.assign(res, { json: () => res }));
    const res = await request(withHelpers).post('/api/auth/login').send({ email: 'a@example.com', password: 'x' });
    expect(res.status).toBe(503);
    expect(res.body.message).toMatch(/NODEJS_HELPERS=0/);
  });
});
