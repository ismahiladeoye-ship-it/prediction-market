const request = require('supertest');
const { useTestApp, createProduct } = require('./helpers/setup');

const ctx = useTestApp();

const seed = async () => {
  await createProduct({
    name: 'Blue Denim Jeans',
    category: 'jeans',
    brand: 'levis',
    price: 60,
    createdAt: new Date('2024-01-01'),
    ratings: { averageRating: 4.5 },
  });
  await createProduct({ name: 'Red Cotton Tshirt', category: 'tshirts', brand: 'freesoul', price: 15, createdAt: new Date('2024-03-01'), color: 'Red' });
  await createProduct({ name: 'White Linen Shirt', category: 'shirts', brand: 'greenfibre', price: 35, createdAt: new Date('2024-02-01'), stock: 0 });
  await createProduct({ name: 'Hidden Shirt', category: 'shirts', price: 5, isActive: false });
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

  it('caps the page size', async () => {
    expect((await request(ctx.app).get('/api/product/list?limit=100000')).status).toBe(400);
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
    expect((await request(ctx.app).get('/api/product/list?category=shirts')).body.totalProducts).toBe(1);
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

  it('lists categories with counts', async () => {
    const res = await request(ctx.app).get('/api/product/categories');
    expect(res.body.categories).toEqual(
      expect.arrayContaining([
        { slug: 'jeans', count: 1 },
        { slug: 'shirts', count: 1 },
        { slug: 'tshirts', count: 1 },
      ])
    );
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
