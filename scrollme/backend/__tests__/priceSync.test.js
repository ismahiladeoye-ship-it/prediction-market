const request = require('supertest');
const mailer = require('../api/services/mailer');
const Product = require('../api/models/productModel');
const { resetConfig } = require('../api/config/env');
const { shopPriceFor } = require('../api/services/priceSync');
const { useTestApp, createProduct } = require('./helpers/setup');

const KEY = 'price-sync-key-for-tests-0123456789';
const ctx = useTestApp();
let app;
beforeAll(() => {
  process.env.PRICE_SYNC_KEY = KEY;
  resetConfig();
  app = require('../api/app').createApp();
});
afterAll(() => {
  delete process.env.PRICE_SYNC_KEY;
  resetConfig();
});
const sync = (method, path) => request(app)[method](`/api/price-sync${path}`).set('X-Price-Sync-Key', KEY);

describe('price rules', () => {
  it('takes £5 off up to £40, £10 up to £65, £20 up to £100, £15 up to £200, £45 up to £300, and sells nothing outside', () => {
    expect(shopPriceFor(30)).toBeNull();
    expect(shopPriceFor(31.5)).toBe(26.5);
    expect(shopPriceFor(40)).toBe(35);
    expect(shopPriceFor(40.01)).toBe(30.01);
    expect(shopPriceFor(65)).toBe(55);
    expect(shopPriceFor(65.01)).toBe(45.01);
    expect(shopPriceFor(100)).toBe(80);
    expect(shopPriceFor(150)).toBe(135);
    expect(shopPriceFor(300)).toBe(255);
    expect(shopPriceFor(300.01)).toBeNull();
    expect(shopPriceFor(null)).toBeNull();
  });
});

describe('daily price check endpoints', () => {
  it('do not exist without the key, or without PRICE_SYNC_KEY set', async () => {
    expect((await request(app).get('/api/price-sync/products')).status).toBe(404);
    expect((await request(app).get('/api/price-sync/products').set('X-Price-Sync-Key', 'wrong')).status).toBe(404);
    delete process.env.PRICE_SYNC_KEY;
    resetConfig();
    expect((await request(ctx.app).get('/api/price-sync/products').set('X-Price-Sync-Key', KEY)).status).toBe(404);
    process.env.PRICE_SYNC_KEY = KEY;
    resetConfig();
  });

  it('link products to supplier pages and list them with their sourcing details', async () => {
    await createProduct({ sku: 'GIS-1', name: 'Nike Hoodie – Black', price: 40, sizes: ['S', 'M'] });
    const res = await sync('post', '/sources').send({
      items: [
        { sku: 'GIS-1', sourceUrl: '/brand/nike/nike-hoodie-123456', sourceCode: '12345601' },
        { sku: 'GIS-404', sourceUrl: '/brand/x/y-1' },
      ],
    });
    expect(res.body).toMatchObject({ matched: 1 });
    expect((await sync('post', '/sources').send({ items: [{ sku: 'GIS-1', sourceUrl: 'https://evil.example/x' }] })).status).toBe(400);
    const list = await sync('get', '/products');
    expect(list.body.products[0]).toMatchObject({ sku: 'GIS-1', sourceUrl: '/brand/nike/nike-hoodie-123456', sourceCode: '12345601', priceLocked: false });
    // Shoppers never see where items come from.
    const pub = await request(app).get('/api/product/list');
    expect(pub.body.products[0]).not.toHaveProperty('sourceUrl');
    expect((await request(app).get(`/api/product/${pub.body.products[0]._id}`)).body).not.toHaveProperty('sourceCode');
  });

  it('reprices by the rules, hides sold-out items, brings them back and keeps hand-set prices', async () => {
    await createProduct({ sku: 'A', name: 'Tee – White', price: 25, retailPrice: 45, sizes: ['S', 'M', 'L'] });
    await createProduct({ sku: 'B', name: 'Hoodie – Black', price: 60, retailPrice: 80, sizes: ['M'] });
    await createProduct({ sku: 'C', name: 'Slippers – Black', price: 100, retailPrice: 115, sizes: ['5'] });
    await createProduct({ sku: 'D', name: 'Owner Hidden', price: 50, isActive: false });
    await createProduct({ sku: 'E', name: 'Perfume 50ml', price: 70, retailPrice: 90, sizes: [] });
    await sync('post', '/sources').send({ items: [{ sku: 'C', price: 75 }] }); // set by hand

    const first = await sync('post', '/apply').send({
      results: [
        { sku: 'A', supplierPrice: 45, sizes: ['S', 'L'] }, // new £10-off band: 35
        { sku: 'B', supplierPrice: null }, // sold out
        { sku: 'C', supplierPrice: 110, sizes: ['5', '6'] }, // hand-set price stays
        { sku: 'D', supplierPrice: 60 }, // the owner hid it: left alone
        { sku: 'E', supplierPrice: 28 }, // now £30 or under: hidden
      ],
    });
    expect(first.status).toBe(200);
    const types = first.body.changes.map((c) => `${c.sku}:${c.type}`);
    expect(types).toEqual(expect.arrayContaining(['A:price', 'A:sizes', 'B:hidden', 'C:sizes', 'E:hidden']));
    expect(types).not.toContain('C:price');
    expect(types.some((t) => t.startsWith('D:'))).toBe(false);

    const get = (sku) => Product.findOne({ sku }).select('+priceLocked +hiddenBySync').lean();
    expect(await get('A')).toMatchObject({ price: 35, retailPrice: 45, sizes: ['S', 'L'], isActive: true });
    expect(await get('B')).toMatchObject({ isActive: false, hiddenBySync: true });
    expect(await get('C')).toMatchObject({ price: 75, retailPrice: 110, priceLocked: true });
    expect(await get('D')).toMatchObject({ isActive: false, price: 50 });

    const second = await sync('post', '/apply').send({ results: [{ sku: 'B', supplierPrice: 70, sizes: ['M', 'L'] }] });
    expect(second.body.changes.map((c) => c.type)).toEqual(expect.arrayContaining(['back', 'price']));
    expect(await get('B')).toMatchObject({ isActive: true, hiddenBySync: false, price: 50 });
  });

  it('emails the owner a summary of the run', async () => {
    const spy = jest.spyOn(mailer, 'sendMail').mockResolvedValue({ delivered: true });
    process.env.NOTIFY_EMAIL = 'owner@example.com';
    resetConfig();
    const res = await sync('post', '/report').send({
      checked: 3,
      pagesChecked: 2,
      changes: [
        { sku: 'A', name: 'Tee – White', type: 'price', from: 25, to: 35 },
        { sku: 'B', name: 'Hoodie – Black', type: 'hidden', reason: 'sold out' },
      ],
    });
    delete process.env.NOTIFY_EMAIL;
    resetConfig();
    expect(res.status).toBe(202);
    const mail = spy.mock.calls[0][0];
    expect(mail.to).toBe('owner@example.com');
    expect(mail.subject).toBe('Daily price check: 1 prices changed, 1 hidden, 0 back');
    expect(mail.text).toContain('Tee – White');
    expect(mail.text).toContain('Hidden (sold out)');
    spy.mockRestore();
  });
});
