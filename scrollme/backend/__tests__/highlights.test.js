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
    await createProduct({ name: 'UGG Tasman II – Black', brand: 'UGG', price: 45, retailPrice: 115 });
    await createProduct({ name: 'UGG Tasman II – Chestnut', brand: 'UGG', price: 100, retailPrice: 115 });
    await createProduct({ name: 'Nike Hoodie', brand: 'Nike', price: 40, retailPrice: 60 });
    await createProduct({ name: 'Sold Out Deal', brand: 'Puma', price: 10, retailPrice: 100, stock: 0 });
    await createProduct({ name: 'Full Price', brand: 'BOSS', price: 50, retailPrice: 50 });
    const res = await request(ctx.app).get('/api/product/highlights');
    expect(res.status).toBe(200);
    expect(res.body.specials.map((p) => p.name)).toEqual(['UGG Tasman II – Black', 'Nike Hoodie']);
    expect(res.body.specials[0]).not.toHaveProperty('stock');
    expect(res.body.specials[0]).not.toHaveProperty('sku');
  });

  it('puts the most bought items first in hot & trending, then the newest, without repeating specials', async () => {
    const user = await createUser();
    const popular = await createProduct({ name: 'Popular Leggings', brand: 'Sweaty Betty', price: 50, createdAt: new Date('2026-01-01') });
    const bestseller = await createProduct({ name: 'Best Seller Tee', brand: 'Gymshark', price: 20, createdAt: new Date('2026-01-02') });
    await createProduct({ name: 'Newest Hoodie', brand: 'Vuori', price: 80, createdAt: new Date('2026-11-01') });
    await createProduct({ name: 'Big Saving', brand: 'UGG', price: 45, retailPrice: 115, createdAt: new Date('2026-11-02') });
    await order(user, bestseller, 5);
    await order(user, popular, 2);
    const res = await request(ctx.app).get('/api/product/highlights');
    expect(res.body.trending.map((p) => p.name)).toEqual(['Best Seller Tee', 'Popular Leggings', 'Newest Hoodie']);
    expect(res.body.specials.map((p) => p.name)).toEqual(['Big Saving']);
  });

  it('shows at most 7 in each row', async () => {
    for (let i = 0; i < 9; i += 1) await createProduct({ name: `Item ${i}`, brand: `Brand ${i}`, price: 10, retailPrice: 20 + i });
    const res = await request(ctx.app).get('/api/product/highlights');
    expect(res.body.specials).toHaveLength(7);
    expect(res.body.trending).toHaveLength(2);
  });
});
