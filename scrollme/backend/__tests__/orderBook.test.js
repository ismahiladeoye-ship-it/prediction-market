const Order = require('../api/models/orderModel');
const { monthStart } = require('../api/services/orderBook');
const { useTestApp, createUser, signedInAgent, createProduct } = require('./helpers/setup');

const ctx = useTestApp();

let counter = 0;
// An order as checkout would store it; lines are { product, size, quantity }.
const makeOrder = async (user, { status = 'paid', paidAt, lines, shippingCents = 0 }) => {
  counter += 1;
  const items = lines.map(({ product, size = '', quantity }) => {
    const unitPriceCents = Math.round(product.price * 100);
    return {
      productId: product._id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      imageUrl: product.imageUrl,
      size,
      quantity,
      unitPriceCents,
      lineTotalCents: unitPriceCents * quantity,
    };
  });
  const subtotalCents = items.reduce((n, i) => n + i.lineTotalCents, 0);
  return Order.create({
    orderNumber: `GIS-TEST-${counter}`,
    userId: user._id,
    email: user.email,
    items,
    shippingAddress: { fullName: 'Ada Lovelace', line1: '16 Benton Street', city: 'Manchester', postalCode: 'M9 4NG', country: 'GB', phone: '+447366982207' },
    deliveryMethod: 'standard',
    currency: 'gbp',
    amounts: { subtotalCents, taxCents: 0, shippingCents, totalCents: subtotalCents + shippingCents },
    status,
    payment: { provider: 'mock', status: paidAt ? 'paid' : 'pending', ...(paidAt ? { paidAt: new Date(paidAt) } : {}) },
  });
};

describe('order book', () => {
  it('breaks a month down by product and size, with takings and stock on hand', async () => {
    const { agent } = await signedInAgent(ctx.app, { roles: ['user', 'admin'] });
    const customer = await createUser();
    const tracksuit = await createProduct({ name: 'Relaxed Tracksuit', sku: 'TRK-BLK', price: 100, stock: 4, sizes: ['S', 'M', 'L'] });
    const cap = await createProduct({ name: 'Logo Cap', sku: 'CAP-01', price: 20, stock: 0, sizes: [] });
    await createProduct({ name: 'Hoodie', price: 60, stock: 3 });

    await makeOrder(customer, { paidAt: '2026-10-05T12:00:00Z', lines: [{ product: tracksuit, size: 'M', quantity: 2 }], shippingCents: 399 });
    await makeOrder(customer, {
      status: 'shipped',
      paidAt: '2026-10-20T09:00:00Z',
      lines: [
        { product: tracksuit, size: 'S', quantity: 1 },
        { product: cap, quantity: 1 },
      ],
    });
    // 00:30 on 1 October in the UK (BST), though still September in UTC.
    await makeOrder(customer, { status: 'delivered', paidAt: '2026-09-30T23:30:00Z', lines: [{ product: tracksuit, size: 'L', quantity: 1 }] });
    // 00:30 on 1 September in the UK: not October.
    await makeOrder(customer, { paidAt: '2026-08-31T23:30:00Z', lines: [{ product: cap, quantity: 3 }] });
    // Paid then refunded: reported separately, not counted as sold.
    await makeOrder(customer, { status: 'refunded', paidAt: '2026-10-10T10:00:00Z', lines: [{ product: tracksuit, size: 'M', quantity: 1 }] });
    // Never paid: ignored.
    await makeOrder(customer, { status: 'pending_payment', lines: [{ product: tracksuit, size: 'S', quantity: 5 }] });

    // Renamed since it was sold: the book shows the current name.
    await tracksuit.updateOne({ name: 'Relaxed Tracksuit - Black' });

    const res = await agent.get('/api/admin/order-book?month=2026-10');
    expect(res.status).toBe(200);
    const book = res.body;
    expect(book.month).toBe('2026-10');
    expect(book.summary).toEqual({
      orders: 3,
      itemsSold: 5,
      productSales: 420,
      delivery: 3.99,
      tax: 0,
      total: 423.99,
      averageOrder: 141.33,
      cancelledOrRefunded: { orders: 1, total: 100 },
    });
    expect(book.products).toEqual([
      expect.objectContaining({
        productId: String(tracksuit._id),
        name: 'Relaxed Tracksuit - Black',
        sku: 'TRK-BLK',
        quantity: 4,
        sales: 400,
        stock: 4,
        isActive: true,
        sizes: [
          { size: 'S', quantity: 1 },
          { size: 'M', quantity: 2 },
          { size: 'L', quantity: 1 },
        ],
      }),
      expect.objectContaining({ productId: String(cap._id), name: 'Logo Cap', quantity: 1, sales: 20, stock: 0, sizes: [] }),
    ]);
    expect(book.stock).toEqual({ products: 3, units: 7, outOfStock: 1, lowStock: 2, lowStockThreshold: 5 });

    expect(book.months).toHaveLength(12);
    expect(book.months[0]).toEqual({ month: '2026-10', orders: 3, itemsSold: 5, total: 423.99 });
    expect(book.months[1]).toEqual({ month: '2026-09', orders: 1, itemsSold: 3, total: 60 });
    expect(book.months[11].month).toBe('2025-11');

    const september = (await agent.get('/api/admin/order-book?month=2026-09')).body;
    expect(september.products).toEqual([expect.objectContaining({ name: 'Logo Cap', quantity: 3, sales: 60 })]);
  });

  it('defaults to the current month and shows an empty month cleanly', async () => {
    const { agent } = await signedInAgent(ctx.app, { roles: ['user', 'admin'] });
    const res = await agent.get('/api/admin/order-book');
    expect(res.status).toBe(200);
    expect(res.body.month).toBe(res.body.currentMonth);
    expect(res.body.month).toMatch(/^\d{4}-\d{2}$/);
    expect(res.body.products).toEqual([]);
    expect(res.body.summary.orders).toBe(0);
    expect(res.body.summary.averageOrder).toBe(0);
  });

  it('works out month boundaries in UK time', () => {
    expect(monthStart(2026, 1).toISOString()).toBe('2026-01-01T00:00:00.000Z'); // GMT
    expect(monthStart(2026, 7).toISOString()).toBe('2026-06-30T23:00:00.000Z'); // BST
    expect(monthStart(2026, 11).toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });

  it('is for admins only and checks the month', async () => {
    const { agent: shopper } = await signedInAgent(ctx.app);
    expect((await shopper.get('/api/admin/order-book')).status).toBe(403);
    const { agent } = await signedInAgent(ctx.app, { roles: ['user', 'admin'] });
    expect((await agent.get('/api/admin/order-book?month=2026-13')).status).toBe(400);
    expect((await agent.get('/api/admin/order-book?month=October')).status).toBe(400);
  });
});
