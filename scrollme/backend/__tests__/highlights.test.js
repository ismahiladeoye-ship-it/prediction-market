const request = require('supertest');
const Order = require('../api/models/orderModel');
const { useTestApp, createUser, createProduct } = require('./helpers/setup');

const ctx = useTestApp();

const order = async (user, product, quantity) =>
  Order.create({
    orderNumber: `GIS-HL-${product._id}`,
    userId: user._id,
    email: user.email,
    items: [{ productId: product._id, name: product.name, quantity, unitPriceCents: 1000, lineTotalCents: 1000 * quantity }],
    shippingAddress: { fullName: 'Ada Lovelace', line1: '16 Benton Street', city: 'Manchester', postalCode: 'M9 4NG', country: 'GB', phone: '+447366982207' },
    deliveryMethod: 'standard',
    currency: 'gbp',
    amounts: { subtotalCents: 1000 * quantity, taxCents: 0, shippingCents: 0, totalCents: 1000 * quantity },
    status: 'processing',
    payment: { provider: 'mock', status: 'paid', paidAt: new Date() },
  });

describe('home page highlights', () => {
  it('lists the biggest savings as specials, one per brand, in stock only', async () => {
    await createProduct({ name: 'UGG Tasman II – Black', brand: 'UGG', subcategory: 'slippers', price: 45, retailPrice: 115 });
    await createProduct({ name: 'UGG Tasman II – Chestnut', brand: 'UGG', subcategory: 'slippers', price: 100, retailPrice: 115 });
    await createProduct({ name: 'Nike Hoodie', brand: 'Nike', subcategory: 'hoodies-sweatshirts', price: 40, retailPrice: 60 });
    await createProduct({ name: 'Second Shirt Deal', brand: 'Lacoste', price: 20, retailPrice: 60 });
    await createProduct({ name: 'Sold Out Deal', brand: 'Puma', price: 10, retailPrice: 100, stock: 0 });
    await createProduct({ name: 'Full Price', brand: 'BOSS', price: 50, retailPrice: 50 });
    const res = await request(ctx.app).get('/api/product/highlights');
    expect(res.status).toBe(200);
    expect(res.body.specials.map((p) => p.name)).toEqual(['Second Shirt Deal', 'UGG Tasman II – Black', 'Nike Hoodie']);
    expect(res.body.specials[0]).not.toHaveProperty('stock');
    expect(res.body.specials[0]).not.toHaveProperty('sku');
  });

  it('leads specials with products tagged "special", then fills with the biggest savings', async () => {
    await createProduct({ name: 'Sony PlayStation 5 Console', brand: 'Sony', subcategory: 'consoles', price: 380, retailPrice: 569, tags: ['special'] });
    await createProduct({ name: 'Alo Tracksuit Set – Black', brand: 'Alo Yoga', subcategory: 'tracksuits', price: 120, tags: ['Special'] });
    await createProduct({ name: 'Tagged But Sold Out', brand: 'Puma', price: 10, retailPrice: 100, stock: 0, tags: ['special'] });
    await createProduct({ name: 'Big Saving', brand: 'Lacoste', price: 20, retailPrice: 60 });
    await createProduct({ name: 'Other Sony Deal', brand: 'Sony', subcategory: 'headphones', price: 10, retailPrice: 100 });
    const res = await request(ctx.app).get('/api/product/highlights');
    expect(res.status).toBe(200);
    const names = res.body.specials.map((p) => p.name);
    expect(names.slice(0, 2).sort()).toEqual(['Alo Tracksuit Set – Black', 'Sony PlayStation 5 Console']);
    expect(names.slice(2)).toEqual(['Big Saving']);
    expect(res.body.trending.map((p) => p.name)).not.toContain('Sony PlayStation 5 Console');
  });

  it('puts the most bought items first in hot & trending, then the newest, without repeating specials', async () => {
    const user = await createUser();
    const popular = await createProduct({
      name: 'Popular Leggings',
      brand: 'Sweaty Betty',
      subcategory: 'leggings',
      price: 50,
      createdAt: new Date('2026-01-01'),
    });
    const bestseller = await createProduct({
      name: 'Best Seller Tee',
      brand: 'Gymshark',
      subcategory: 't-shirts',
      price: 20,
      createdAt: new Date('2026-01-02'),
    });
    await createProduct({ name: 'Newest Hoodie', brand: 'Vuori', subcategory: 'hoodies-sweatshirts', price: 80, createdAt: new Date('2026-11-01') });
    await createProduct({ name: 'Newer Jeans', brand: 'Levis', subcategory: 'jeans', price: 60, createdAt: new Date('2026-10-30') });
    await createProduct({ name: 'Newest Jeans', brand: 'Diesel', subcategory: 'jeans', price: 60, createdAt: new Date('2026-10-31') });
    await createProduct({ name: 'Big Saving', brand: 'UGG', price: 45, retailPrice: 115, createdAt: new Date('2026-11-02') });
    await order(user, bestseller, 5);
    await order(user, popular, 2);
    const res = await request(ctx.app).get('/api/product/highlights');
    // Newest after the best sellers, but only one pair of jeans.
    expect(res.body.trending.map((p) => p.name)).toEqual(['Best Seller Tee', 'Popular Leggings', 'Newest Hoodie', 'Newest Jeans']);
    expect(res.body.specials.map((p) => p.name)).toEqual(['Big Saving']);
  });

  it('shows at most 7 in each row', async () => {
    for (let i = 0; i < 9; i += 1) await createProduct({ name: `Item ${i}`, brand: `Brand ${i}`, subcategory: `kind-${i}`, price: 10, retailPrice: 20 + i });
    const res = await request(ctx.app).get('/api/product/highlights');
    expect(res.body.specials).toHaveLength(7);
    expect(res.body.trending).toHaveLength(2);
  });
});
