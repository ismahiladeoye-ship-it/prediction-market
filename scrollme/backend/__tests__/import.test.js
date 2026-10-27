const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const sharp = require('sharp');
const Product = require('../api/models/productModel');
const { useTestApp, signedInAgent } = require('./helpers/setup');

const ctx = useTestApp();

afterAll(() => fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true }));

// A 3000x2000 JPEG carrying GPS coordinates, like a phone photo.
const phonePhoto = () =>
  sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#222' } })
    .withExif({ IFD0: { Copyright: 'Owner' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '51/1 30/1 0/1' } })
    .jpeg()
    .toBuffer();

const admin = () => signedInAgent(ctx.app, { roles: ['user', 'admin'] });

const upload = async (agent, name = 'front.jpg') =>
  (await agent.post('/api/admin/uploads').attach('image', await phonePhoto(), { filename: name, contentType: 'image/jpeg' })).body.url;

const CSV = [
  'SKU,Name,Brand,Gender,Category,Price,Stock,Sizes,Colour,Description,Images,Active',
  "ESS-TRK-BLK,Essentials Relaxed Tracksuit,Fear of God Essentials,Men's,Tracksuits,£185.00,6,S|M|L|XL,Black,Heavyweight fleece tracksuit,front.jpg|back.jpg,yes",
  'ESS-HOOD-OAT,Essentials Hoodie,Fear of God Essentials,Unisex,Hoodies,95,3,M|L,Oatmeal,,front.jpg,yes',
].join('\n');

describe('product photos', () => {
  it('re-encodes uploads as WebP, removes location data and serves them cacheably', async () => {
    const { agent } = await admin();
    const res = await agent.post('/api/admin/uploads').attach('image', await phonePhoto(), { filename: 'IMG_0001.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/^\/api\/uploads\/[a-f0-9]{32}\.webp$/);
    expect([res.body.width, res.body.height]).toEqual([1600, 1067]);

    const stored = fs.readFileSync(path.join(process.env.UPLOAD_DIR, path.basename(res.body.url)));
    const meta = await sharp(stored).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.exif).toBeUndefined();

    const served = await request(ctx.app).get(res.body.url);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toBe('image/webp');
    expect(served.headers['cache-control']).toMatch(/immutable/);
    expect((await request(ctx.app).get('/api/uploads/missing.webp')).status).toBe(404);
  });

  it('rejects files that are not images, and anyone who is not an admin', async () => {
    const { agent } = await admin();
    const fake = await agent
      .post('/api/admin/uploads')
      .attach('image', Buffer.from('<script>alert(1)</script>'), { filename: 'x.jpg', contentType: 'image/jpeg' });
    expect(fake.status).toBe(400);
    expect((await agent.post('/api/admin/uploads').field('note', 'x')).status).toBe(400);

    const customer = await signedInAgent(ctx.app);
    const photo = await phonePhoto();
    expect((await customer.agent.post('/api/admin/uploads').attach('image', photo, 'a.jpg')).status).toBe(403);
    expect((await request(ctx.app).post('/api/admin/uploads').attach('image', photo, 'a.jpg')).status).toBe(401);
    expect((await agent.post('/api/admin/uploads').set('Origin', 'https://evil.example').attach('image', photo, 'a.jpg')).status).toBe(403);
  });
});

describe('spreadsheet import', () => {
  it('previews without writing, then creates products with photos, sizes and Men/Women categories', async () => {
    const { agent } = await admin();
    const preview = await agent.post('/api/admin/products/import').send({ csv: CSV, dryRun: true, photos: { 'front.jpg': null, 'back.jpg': null } });
    expect(preview.status).toBe(200);
    expect(preview.body.summary).toEqual({ create: 2, update: 0, errors: 0 });
    // Photos are only uploaded on import; the preview must not call them missing.
    expect(preview.body.rows.flatMap((r) => r.warnings)).toEqual([]);
    expect(await Product.countDocuments({ sku: /^ESS-/ })).toBe(0);

    const photos = { 'front.jpg': await upload(agent, 'front.jpg'), 'back.jpg': await upload(agent, 'back.jpg') };
    const done = await agent.post('/api/admin/products/import').send({ csv: CSV, dryRun: false, photos });
    expect(done.status).toBe(200);
    expect(done.body.message).toMatch(/Imported 2 new/);

    const tracksuit = await Product.findOne({ sku: 'ESS-TRK-BLK' }).lean();
    expect(tracksuit).toMatchObject({
      name: 'Essentials Relaxed Tracksuit',
      brand: 'Fear of God Essentials',
      department: 'men',
      category: 'clothing',
      subcategory: 'tracksuits',
      price: 185,
      stock: 6,
      sizes: ['S', 'M', 'L', 'XL'],
      color: 'Black',
      isActive: true,
      images: [photos['front.jpg'], photos['back.jpg']],
      imageUrl: photos['front.jpg'],
    });
    expect(tracksuit.createdAt).toBeInstanceOf(Date);
    expect(await Product.findOne({ sku: 'ESS-HOOD-OAT' }).lean()).toMatchObject({
      department: 'unisex',
      category: 'clothing',
      subcategory: 'hoodies-sweatshirts',
    });

    // Live under Men's and Women's Clothing straight away (the hoodie is unisex).
    const skus = async (dept) =>
      (await request(ctx.app).get(`/api/product/list?department=${dept}&category=clothing&q=Essentials`)).body.products.map((p) => p.sku).sort();
    expect(await skus('men')).toEqual(['ESS-HOOD-OAT', 'ESS-TRK-BLK']);
    expect(await skus('women')).toEqual(['ESS-HOOD-OAT']);
  });

  it('updates existing SKUs with only the columns in the sheet', async () => {
    const { agent } = await admin();
    await agent
      .post('/api/admin/products/import')
      .send({ csv: CSV, dryRun: false, photos: { 'front.jpg': await upload(agent), 'back.jpg': await upload(agent) } });
    const before = await Product.findOne({ sku: 'ESS-TRK-BLK' }).lean();

    const restock = await agent.post('/api/admin/products/import').send({ csv: 'sku,stock,price\nESS-TRK-BLK,12,175', dryRun: false });
    expect(restock.status).toBe(200);
    expect(restock.body.summary).toEqual({ create: 0, update: 1, errors: 0 });
    const after = await Product.findOne({ sku: 'ESS-TRK-BLK' }).lean();
    expect(after).toMatchObject({ stock: 12, price: 175, sizes: before.sizes, images: before.images, name: before.name });
  });

  it('reports every problem by row and imports nothing until they are fixed', async () => {
    const { agent } = await admin();
    const csv = [
      'sku,name,department,category,price,stock,images,active',
      'A-1,Good Tee,men,T-shirts,20,5,,yes',
      'A-1,Duplicate,men,tees,20,5,,yes',
      'B-1,Bad Price,men,tees,twenty,5,,yes',
      'C-1,Missing Photo,men,tees,20,5,nowhere.jpg,yes',
      'D-1,Bad Flag,men,tees,20,5,,maybe',
      'bad sku!,Bad Sku,men,tees,20,5,,yes',
      'E-1,No Department,,tees,20,5,,yes',
      'F-1,Wrong Category,women,Suits,20,5,,yes',
    ].join('\n');
    const res = await agent.post('/api/admin/products/import').send({ csv, dryRun: false });
    expect(res.status).toBe(400);
    expect(res.body.summary).toEqual({ create: 1, update: 0, errors: 7 });
    const errors = Object.fromEntries(res.body.rows.map((r) => [r.row, r.errors.join(' ')]));
    expect(errors[3]).toMatch(/also used on row 2/);
    expect(errors[4]).toMatch(/"twenty" is not a number/);
    expect(errors[5]).toMatch(/nowhere\.jpg/);
    expect(errors[6]).toMatch(/use yes or no/);
    expect(errors[7]).toMatch(/SKU may contain only/);
    expect(errors[8]).toBe('department: add Men, Women or Unisex');
    expect(errors[9]).toMatch(/"suits" is not a women category/);
    expect(res.body.rows[0]).toMatchObject({ action: 'create', warnings: [expect.stringMatching(/No photos/)] });
    expect(await Product.countDocuments({ sku: { $in: ['A-1', 'B-1', 'C-1', 'D-1'] } })).toBe(0);

    expect((await agent.post('/api/admin/products/import').send({ csv: 'name,price\nTee,5', dryRun: true })).body.message).toMatch(/"sku" column/);
    expect(
      (await agent.post('/api/admin/products/import').send({ csv: 'sku,name,category,price,stock\nN-1,New,tees,5', dryRun: true })).body.rows[0].errors.join(
        ' '
      )
    ).toMatch(/stock/);
  });

  it('accepts the downloadable template as it is', async () => {
    const { agent } = await admin();
    const csv = require('node:fs').readFileSync(require('node:path').join(__dirname, '../../public/templates/product-upload-template.csv'), 'utf8');
    // The photos named in the template, chosen but not yet uploaded (as in the preview).
    const photos = Object.fromEntries(
      ['trk-black-front.jpg', 'trk-black-back.jpg', 'hoodie-oat-front.jpg', 'gelnyc-black-side.jpg', 'wh1000xm5-black.jpg'].map((n) => [n, null])
    );
    const res = await agent.post('/api/admin/products/import').send({ csv, dryRun: true, photos });
    expect(res.body.rows.flatMap((r) => r.errors)).toEqual([]);
    expect(res.body.summary).toEqual({ create: 4, update: 0, errors: 0 });
  });

  it('is admin-only', async () => {
    const customer = await signedInAgent(ctx.app);
    expect((await customer.agent.post('/api/admin/products/import').send({ csv: CSV })).status).toBe(403);
  });
});
