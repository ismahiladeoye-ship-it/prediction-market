const request = require('supertest');
const Product = require('../api/models/productModel');
const { useTestApp, signedInAgent, createProduct } = require('./helpers/setup');

const ctx = useTestApp();

const address = { fullName: 'Grace Hopper', line1: '1 Navy Way', city: 'Leeds', postalCode: 'LS1 4DY', country: 'GB', phone: '+44 113 496 0000' };

const newProduct = { name: 'Admin Jacket', price: 80, category: 'jackets', stock: 7, brand: 'scrollme', sizes: ['M', 'L'] };

const placePaidOrder = async (product) => {
  const customer = await signedInAgent(ctx.app);
  await customer.agent.post('/api/cart/add').send({ productId: product.id, quantity: 1, size: product.sizes[0] || '' });
  const { body } = await customer.agent.post('/api/orders').send({ shippingAddress: address });
  await customer.agent.post(`/api/payments/mock/${body.order.id}/complete`);
  return { customer, orderId: body.order.id };
};

describe('admin permissions', () => {
  const adminEndpoints = [
    ['get', '/api/admin/stats'],
    ['get', '/api/admin/products'],
    ['post', '/api/admin/products'],
    ['get', '/api/admin/orders'],
    ['patch', '/api/admin/orders/507f1f77bcf86cd799439011/status'],
  ];

  it.each(adminEndpoints)('%s %s → 401 anonymous, 403 customer', async (method, url) => {
    expect((await request(ctx.app)[method](url).send({})).status).toBe(401);
    const { agent } = await signedInAgent(ctx.app);
    expect((await agent[method](url).send({})).status).toBe(403);
  });

  it('blocks customers from the legacy product write endpoints', async () => {
    const product = await createProduct();
    const { agent } = await signedInAgent(ctx.app);
    expect((await agent.post('/api/product/add').send(newProduct)).status).toBe(403);
    expect((await agent.put(`/api/product/update/${product.id}`).send({ price: 1 })).status).toBe(403);
    expect((await agent.delete(`/api/product/delete/${product.id}`)).status).toBe(403);
    expect((await Product.findById(product.id)).price).toBe(49.99);
  });

  it('allows admin and super_admin roles', async () => {
    for (const roles of [['admin'], ['super_admin']]) {
      const { agent } = await signedInAgent(ctx.app, { roles });
      expect((await agent.get('/api/admin/stats')).status).toBe(200);
    }
  });
});

describe('admin product management', () => {
  it('creates, updates, deactivates products with validation', async () => {
    const { agent } = await signedInAgent(ctx.app, { roles: ['admin'] });
    const created = await agent.post('/api/admin/products').send(newProduct);
    expect(created.status).toBe(201);
    const id = created.body.product._id;

    expect((await agent.post('/api/admin/products').send({ ...newProduct, price: -1 })).status).toBe(400);
    expect((await agent.post('/api/admin/products').send({ ...newProduct, ratings: { averageRating: 5 } })).status).toBe(400);
    expect((await agent.patch(`/api/admin/products/${id}`).send({ _id: '507f1f77bcf86cd799439011' })).status).toBe(400);
    for (const imageUrl of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'ftp://example.com/a.jpg']) {
      expect((await agent.patch(`/api/admin/products/${id}`).send({ imageUrl })).status).toBe(400);
    }

    const updated = await agent.patch(`/api/admin/products/${id}`).send({ price: 75.5, stock: 3 });
    expect(updated.body.product).toMatchObject({ price: 75.5, stock: 3 });

    await agent.delete(`/api/admin/products/${id}`);
    expect((await request(ctx.app).get(`/api/product/${id}`)).status).toBe(404);
    const adminList = await agent.get('/api/admin/products?active=false');
    expect(adminList.body.products.map((p) => p._id)).toContain(id);
  });

  it('adjusts stock but never below zero', async () => {
    const product = await createProduct({ stock: 2 });
    const { agent } = await signedInAgent(ctx.app, { roles: ['admin'] });
    expect((await agent.post(`/api/admin/products/${product.id}/stock`).send({ delta: 5 })).body.product.stock).toBe(7);
    expect((await agent.post(`/api/admin/products/${product.id}/stock`).send({ delta: -8 })).status).toBe(409);
    expect((await Product.findById(product.id)).stock).toBe(7);
    expect((await agent.get('/api/admin/products?lowStock=true')).body.totalProducts).toBe(0);
  });
});

describe('admin order management', () => {
  it('lists orders, filters by status and walks the status lifecycle', async () => {
    const product = await createProduct({ stock: 5 });
    const { orderId } = await placePaidOrder(product);
    const { agent } = await signedInAgent(ctx.app, { roles: ['admin'] });

    expect((await agent.get('/api/admin/orders?status=paid')).body.total).toBe(1);
    expect((await agent.get('/api/admin/orders?status=shipped')).body.total).toBe(0);

    const detail = await agent.get(`/api/admin/orders/${orderId}`);
    expect(detail.body.allowedTransitions).toEqual(['processing', 'shipped', 'cancelled', 'refunded']);

    expect((await agent.patch(`/api/admin/orders/${orderId}/status`).send({ status: 'delivered' })).status).toBe(409);
    expect((await agent.patch(`/api/admin/orders/${orderId}/status`).send({ status: 'processing' })).body.order.status).toBe('processing');
    const shipped = await agent.patch(`/api/admin/orders/${orderId}/status`).send({ status: 'shipped', trackingNumber: '1Z999' });
    expect(shipped.body.order).toMatchObject({ status: 'shipped', trackingNumber: '1Z999' });
    expect((await agent.patch(`/api/admin/orders/${orderId}/status`).send({ status: 'cancelled' })).status).toBe(409);
    const delivered = await agent.patch(`/api/admin/orders/${orderId}/status`).send({ status: 'delivered' });
    expect(delivered.body.order.statusHistory.map((h) => h.status)).toEqual(['pending_payment', 'paid', 'processing', 'shipped', 'delivered']);

    const stats = await agent.get('/api/admin/stats');
    expect(stats.body.ordersByStatus.delivered).toBe(1);
    expect(stats.body.revenue).toBeGreaterThan(0);
  });

  it('returns stock when an admin cancels a paid order', async () => {
    const product = await createProduct({ stock: 5 });
    const { orderId, customer } = await placePaidOrder(product);
    expect((await Product.findById(product.id)).stock).toBe(4);
    const { agent } = await signedInAgent(ctx.app, { roles: ['admin'] });
    await agent.patch(`/api/admin/orders/${orderId}/status`).send({ status: 'cancelled', note: 'Customer request' });
    expect((await Product.findById(product.id)).stock).toBe(5);
    // Customers see the change but cannot make it themselves.
    expect((await customer.agent.get(`/api/orders/${orderId}`)).body.order.status).toBe('cancelled');
    expect((await customer.agent.patch(`/api/admin/orders/${orderId}/status`).send({ status: 'paid' })).status).toBe(403);
  });
});
