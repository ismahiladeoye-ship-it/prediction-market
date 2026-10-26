const Product = require('../models/productModel');
const Order = require('../models/orderModel');
const User = require('../models/userModel');
const { buildFilter, paginate } = require('./productController');
const { serializeOrder } = require('./orderController');
const { changeStatus } = require('../services/orders');
const { importProducts } = require('../services/productImport');
const { monthlyOrderBook } = require('../services/orderBook');
const ContactMessage = require('../models/contactMessageModel');
const { getShopDetails } = require('../services/shopDetails');
const { getConfig } = require('../config/env');
const { fromCents } = require('../utils/money');
const { notFound, conflict } = require('../utils/httpError');
const logger = require('../utils/logger');

const audit = (req, action, fields) => logger.info('admin_action', { action, adminId: String(req.user._id), ...fields });

// ---- Products ----
exports.listProducts = async (req, res) => {
  const query = req.validatedQuery;
  const filter = buildFilter(query, { includeInactive: true });
  if (query.active === 'true') filter.isActive = true;
  if (query.active === 'false') filter.isActive = false;
  if (query.lowStock === 'true') filter.stock = { $lte: 5 };
  res.json(await paginate(filter, query));
};

exports.getProduct = async (req, res) => {
  const product = await Product.findById(req.params.productId).lean();
  if (!product) throw notFound('Product not found');
  res.json(product);
};

// The first photo is the main image; a single imageUrl becomes the gallery.
const withPhotos = (body) => {
  if (body.images?.length) return { ...body, imageUrl: body.images[0] };
  if (body.images && !body.images.length) return { ...body, imageUrl: '' };
  if (body.imageUrl) return { ...body, images: [body.imageUrl] };
  return body;
};

exports.createProduct = async (req, res) => {
  const product = await Product.create(withPhotos(req.body));
  audit(req, 'product_create', { productId: String(product._id) });
  res.status(201).json({ message: 'Product added successfully', product });
};

exports.updateProduct = async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.productId, { $set: withPhotos(req.body) }, { new: true, runValidators: true });
  if (!product) throw notFound('Product not found');
  audit(req, 'product_update', { productId: String(product._id), fields: Object.keys(req.body) });
  res.json({ message: 'Product updated successfully', product });
};

// Products are deactivated rather than deleted so existing orders and carts keep resolving.
exports.deleteProduct = async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.productId, { $set: { isActive: false } }, { new: true });
  if (!product) throw notFound('Product not found');
  audit(req, 'product_deactivate', { productId: String(product._id) });
  res.json({ message: 'Product deleted successfully', product });
};

// Bulk create/update from a spreadsheet (see services/productImport.js).
exports.importProducts = async (req, res) => {
  const result = await importProducts(req.body);
  if (!req.body.dryRun && result.ok) audit(req, 'product_import', { created: result.summary.create, updated: result.summary.update });
  res.status(result.ok ? 200 : 400).json(result);
};

exports.adjustStock = async (req, res) => {
  const { delta } = req.body;
  const filter = { _id: req.params.productId };
  if (delta < 0) filter.stock = { $gte: -delta };
  const product = await Product.findOneAndUpdate(filter, { $inc: { stock: delta } }, { new: true });
  if (!product) {
    if (!(await Product.exists({ _id: req.params.productId }))) throw notFound('Product not found');
    throw conflict('Stock cannot go below zero');
  }
  audit(req, 'stock_adjust', { productId: String(product._id), delta, stock: product.stock });
  res.json({ message: 'Stock updated', product });
};

// ---- Orders ----
exports.listOrders = async (req, res) => {
  const { page, limit, status, q } = req.validatedQuery;
  const filter = {};
  if (status) filter.status = status;
  if (q) {
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ orderNumber: re }, { email: re }, { 'shippingAddress.fullName': re }];
  }
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(filter),
  ]);
  res.json({ page, limit, total, totalPages: Math.ceil(total / limit), orders: orders.map((o) => serializeOrder(o, { admin: true })) });
};

exports.getOrder = async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) throw notFound('Order not found');
  res.json({ order: serializeOrder(order, { admin: true }), allowedTransitions: Order.TRANSITIONS[order.status] });
};

exports.updateOrderStatus = async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) throw notFound('Order not found');
  const from = order.status;
  await changeStatus(order, req.body.status, { by: req.user._id, note: req.body.note, trackingNumber: req.body.trackingNumber });
  audit(req, 'order_status', { orderId: String(order._id), from, to: order.status });
  res.json({ order: serializeOrder(order, { admin: true }), allowedTransitions: Order.TRANSITIONS[order.status] });
};

// Monthly sales by product, with stock on hand.
exports.orderBook = async (req, res) => {
  res.json(await monthlyOrderBook(req.validatedQuery.month));
};

// ---- Dashboard ----
exports.stats = async (req, res) => {
  const [byStatus, revenue, lowStock, products, customers, attention, newMessages, shop] = await Promise.all([
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { 'payment.status': 'paid', status: { $nin: ['refunded'] } } },
      { $group: { _id: null, cents: { $sum: '$amounts.totalCents' } } },
    ]),
    Product.countDocuments({ isActive: true, stock: { $lte: 5 } }),
    Product.countDocuments({ isActive: true }),
    User.countDocuments({}),
    Order.countDocuments({ attention: { $nin: [null, ''] } }),
    ContactMessage.countDocuments({ status: 'new' }),
    getShopDetails(),
  ]);
  const config = getConfig();
  res.json({
    ordersByStatus: Object.fromEntries(byStatus.map((r) => [r._id, r.count])),
    revenue: fromCents(revenue[0]?.cents || 0),
    lowStockProducts: lowStock,
    activeProducts: products,
    customers,
    ordersNeedingAttention: attention,
    newMessages,
    // What is still needed before taking real orders (Admin → Dashboard checklist).
    setup: {
      shopAddress: Boolean(shop.address),
      shopEmail: Boolean(shop.email),
      emailSending: Boolean(config.SMTP_URL),
      // On Vercel, photos need a connected Blob store.
      photoStorage: Boolean(config.r2) || Boolean(config.BLOB_READ_WRITE_TOKEN) || !config.onVercel,
      payments: config.PAYMENT_PROVIDER === 'mock' ? 'mock' : String(config.STRIPE_SECRET_KEY || '').startsWith('sk_live_') ? 'live' : 'test',
    },
  });
};
