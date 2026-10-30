const request = require('supertest');
const { useTestApp, createProduct } = require('./helpers/setup');

const ctx = useTestApp();

const seed = async () => {
  await createProduct({
    name: 'Blue Denim Jeans',
    subcategory: 'jeans',
    brand: 'levis',
    price: 60,
    createdAt: new Date('2024-01-01'),
    ratings: { averageRating: 4.5 },
  });
  await createProduct({ name: 'Red Cotton Tshirt', subcategory: 't-shirts', brand: 'freesoul', price: 15, createdAt: new Date('2024-03-01'), color: 'Red' });
  await createProduct({ name: 'White Linen Shirt', subcategory: 'shirts', brand: 'greenfibre', price: 35, createdAt: new Date('2024-02-01'), stock: 0 });
  await createProduct({ name: 'Hidden Shirt', subcategory: 'shirts', price: 5, isActive: false });
};

describe('product catalogue', () => {
  beforeEach(seed);

  it('lists active products only, newest first, with pagination metadata', async () => {
    const res = await request(ctx.app).get('/api/product/list?limit=2');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 1, limit: 2, totalProducts: 3, totalPages: 2 });
    expect(res.body.products.map((p) => p.name)).toEqual(['Red Cotton Tshirt', 'White Linen Shirt']);
    const page2 = await request(ctx.app).get('/api/product/list?limit=2&page=2');
    expect(page2.body.products.map((p) => p.name)).toEqual(['Blue Denim Jeans']);
  });

  it('caps the page size and how deep pages go', async () => {
    expect((await request(ctx.app).get('/api/product/list?limit=100000')).status).toBe(400);
    expect((await request(ctx.app).get('/api/product/list?page=1001')).status).toBe(400);
    expect((await request(ctx.app).get('/api/product/list?page=1000')).status).toBe(200);
  });

  it('searches across name, brand and category (case-insensitive, all words)', async () => {
    const byName = await request(ctx.app).get('/api/product/list?q=denim');
    expect(byName.body.products.map((p) => p.name)).toEqual(['Blue Denim Jeans']);
    const byBrand = await request(ctx.app).get('/api/product/list?q=FREESOUL');
    expect(byBrand.body.totalProducts).toBe(1);
    const multi = await request(ctx.app).get('/api/product/list?q=linen%20shirt');
    expect(multi.body.products.map((p) => p.name)).toEqual(['White Linen Shirt']);
    const regexChars = await request(ctx.app).get('/api/product/list?q=.*');
    expect(regexChars.status).toBe(200);
    expect(regexChars.body.totalProducts).toBe(0);
  });

  it('filters by category, brand, price range and stock', async () => {
    expect((await request(ctx.app).get('/api/product/list?category=clothing')).body.totalProducts).toBe(3);
    expect((await request(ctx.app).get('/api/product/list?category=clothing&subcategory=shirts')).body.totalProducts).toBe(1);
    expect((await request(ctx.app).get('/api/product/list?brand=levis')).body.totalProducts).toBe(1);
    const range = await request(ctx.app).get('/api/product/list?minPrice=20&maxPrice=50');
    expect(range.body.products.map((p) => p.name)).toEqual(['White Linen Shirt']);
    expect((await request(ctx.app).get('/api/product/list?inStock=true')).body.totalProducts).toBe(2);
  });

  it('sorts by price and rating', async () => {
    const asc = await request(ctx.app).get('/api/product/list?sort=price_asc');
    expect(asc.body.products.map((p) => p.price)).toEqual([15, 35, 60]);
    const desc = await request(ctx.app).get('/api/product/list?sort=price_desc');
    expect(desc.body.products.map((p) => p.price)).toEqual([60, 35, 15]);
    const rating = await request(ctx.app).get('/api/product/list?sort=rating');
    expect(rating.body.products[0].name).toBe('Blue Denim Jeans');
    expect((await request(ctx.app).get('/api/product/list?sort=bogus')).status).toBe(400);
  });

  it('rejects operator injection in query strings', async () => {
    expect((await request(ctx.app).get('/api/product/list?category[$ne]=x')).status).toBe(400);
    expect((await request(ctx.app).get('/api/product/list?minPrice[$gt]=0')).status).toBe(400);
  });

  it('returns an empty page (not an error) when nothing matches', async () => {
    const res = await request(ctx.app).get('/api/product/list?q=nothing-matches-this');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ totalProducts: 0, totalPages: 0, products: [] });
  });

  it('counts active products by department, category and subcategory', async () => {
    const res = await request(ctx.app).get('/api/product/categories');
    expect(res.body.counts).toHaveLength(3);
    expect(res.body.counts).toEqual(
      expect.arrayContaining([
        { department: 'men', category: 'clothing', subcategory: 'jeans', count: 1 },
        { department: 'men', category: 'clothing', subcategory: 'shirts', count: 1 },
        { department: 'men', category: 'clothing', subcategory: 't-shirts', count: 1 },
      ])
    );
  });

  it('lists the other colours of the same item on its product page', async () => {
    const headphones = { name: 'Studio Headphones', brand: 'apple', department: 'electronics', category: 'audio', subcategory: 'headphones', sizes: [] };
    const midnight = await createProduct({ ...headphones, color: 'Midnight', createdAt: new Date('2025-01-01') });
    const blue = await createProduct({ ...headphones, color: 'Blue', stock: 0, createdAt: new Date('2025-01-02') });
    await createProduct({ ...headphones, color: 'Orange', isActive: false });
    await createProduct({ ...headphones, brand: 'sony', color: 'Black' });

    const res = await request(ctx.app).get(`/api/product/${blue.id}`);
    expect(res.body.colours).toEqual([
      { _id: midnight.id, color: 'Midnight', category: 'audio', inStock: true },
      { _id: blue.id, color: 'Blue', category: 'audio', inStock: false },
    ]);
    // An item that comes in one colour has no colour choices.
    const single = await createProduct({ name: 'Plain Tee', color: 'White' });
    expect((await request(ctx.app).get(`/api/product/${single.id}`)).body.colours).toEqual([]);
  });

  it('returns product details, 404 for unknown/inactive/malformed ids', async () => {
    const list = await request(ctx.app).get('/api/product/list');
    const id = list.body.products[0]._id;
    expect((await request(ctx.app).get(`/api/product/${id}`)).body.name).toBe('Red Cotton Tshirt');
    expect((await request(ctx.app).get('/api/product/507f1f77bcf86cd799439011')).status).toBe(404);
    expect((await request(ctx.app).get('/api/product/notanid')).status).toBe(400);
    const hidden = await request(ctx.app).get('/api/product/list?q=hidden');
    expect(hidden.body.totalProducts).toBe(0);
  });
});

describe('men and women', () => {
  beforeEach(async () => {
    await createProduct({ name: 'Runner Sneaker', department: 'men', category: 'shoes-boots', subcategory: 'trainers' });
    await createProduct({ name: 'Heeled Boot', department: 'women', category: 'shoes-boots', subcategory: 'ankle-boots' });
    await createProduct({ name: 'Logo Tee', department: 'unisex', category: 'clothing', subcategory: 't-shirts' });
    await createProduct({ name: 'Silk Dress', department: 'women', category: 'dresses', subcategory: 'midi-dresses' });
    await createProduct({ name: 'Wireless Earbuds', department: 'electronics', category: 'audio', subcategory: 'earbuds' });
  });

  it('lists a department with unisex products, narrowed by category and subcategory', async () => {
    const names = async (query) => (await request(ctx.app).get(`/api/product/list?sort=name&${query}`)).body.products.map((p) => p.name);
    expect(await names('department=men')).toEqual(['Logo Tee', 'Runner Sneaker']);
    expect(await names('department=women')).toEqual(['Heeled Boot', 'Logo Tee', 'Silk Dress']);
    expect(await names('department=women&category=shoes-boots')).toEqual(['Heeled Boot']);
    expect(await names('department=women&category=shoes-boots&subcategory=trainers')).toEqual([]);
    expect(await names('category=shoes-boots')).toEqual(['Heeled Boot', 'Runner Sneaker']);
    // Electronics is its own section: unisex clothing does not appear there.
    expect(await names('department=electronics')).toEqual(['Wireless Earbuds']);
    expect(await names('department=electronics&category=audio&subcategory=earbuds')).toEqual(['Wireless Earbuds']);
    expect(await names('q=ankle')).toEqual(['Heeled Boot']);
    expect((await request(ctx.app).get('/api/product/list?department=kids')).status).toBe(400);
  });

  it('counts unisex products under their own department', async () => {
    const res = await request(ctx.app).get('/api/product/categories');
    expect(res.body.counts).toEqual(expect.arrayContaining([{ department: 'unisex', category: 'clothing', subcategory: 't-shirts', count: 1 }]));
  });
});

describe('taxonomy', () => {
  const backend = require('../api/config/taxonomy.json');
  const storefront = require('../../src/taxonomy.json');

  it('is the same for the API and the storefront menus', () => {
    expect(storefront).toEqual(backend);
  });

  it('has Men, Women and Electronics with at most ten categories and ten subcategories each', () => {
    expect(backend.departments.map((d) => [d.slug, d.unisex])).toEqual([
      ['men', true],
      ['women', true],
      ['electronics', false],
    ]);
    for (const dept of backend.departments) {
      expect(dept.categories.length).toBeGreaterThan(0);
      expect(dept.categories.length).toBeLessThanOrEqual(10);
      expect(new Set(dept.categories.map((c) => c.slug)).size).toBe(dept.categories.length);
      for (const cat of dept.categories) {
        expect(cat.subcategories.length).toBeGreaterThan(0);
        expect(cat.subcategories.length).toBeLessThanOrEqual(10);
        expect(new Set(cat.subcategories.map((s) => s.slug)).size).toBe(cat.subcategories.length);
        for (const slug of [cat.slug, ...cat.subcategories.map((s) => s.slug)]) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      }
    }
  });
});
