const Order = require('../models/orderModel');
const { createOrderFromCart, markOrderPaid, changeStatus } = require('../services/orders');
const { getProvider } = require('../services/payments');
const { fromCents } = require('../utils/money');
const { notFound, forbidden, conflict } = require('../utils/httpError');
const logger = require('../utils/logger');

const serializeOrder = (order) => {
  const o = order.toObject ? order.toObject() : order;
  return {
    id: o._id,
    orderNumber: o.orderNumber,
    status: o.status,
    statusHistory: o.statusHistory,
    email: o.email,
    userId: o.userId,
    items: o.items.map((i) => ({
      productId: i.productId,
      name: i.name,
      brand: i.brand,
      category: i.category,
      imageUrl: i.imageUrl,
      size: i.size,
      quantity: i.quantity,
      unitPrice: fromCents(i.unitPriceCents),
      lineTotal: fromCents(i.lineTotalCents),
    })),
    shippingAddress: o.shippingAddress,
    deliveryMethod: o.deliveryMethod,
    currency: o.currency,
    summary: {
      subtotal: fromCents(o.amounts.subtotalCents),
      tax: fromCents(o.amounts.taxCents),
      shipping: fromCents(o.amounts.shippingCents),
      total: fromCents(o.amounts.totalCents),
      currency: o.currency,
    },
    payment: { provider: o.payment?.provider, status: o.payment?.status, paidAt: o.payment?.paidAt },
    reservationExpiresAt: o.reservationExpiresAt,
    trackingNumber: o.trackingNumber,
    attention: o.attention,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
};

const loadOwnOrder = async (req) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) throw notFound('Order not found');
  const isOwner = order.userId.equals(req.user._id);
  if (!isOwner && !req.user.isAdmin()) throw notFound('Order not found');
  return order;
};

exports.checkout = async (req, res) => {
  const { order, checkoutUrl } = await createOrderFromCart(req.user, req.body);
  res.status(201).json({ order: serializeOrder(order), checkoutUrl });
};

exports.listMyOrders = async (req, res) => {
  const { page, limit } = req.validatedQuery;
  const filter = { userId: req.user._id };
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(filter),
  ]);
  res.json({ page, limit, total, totalPages: Math.ceil(total / limit), orders: orders.map(serializeOrder) });
};

exports.getOrder = async (req, res) => {
  let order = await loadOwnOrder(req);
  // On return from the payment page, confirm with the provider directly in
  // case the webhook has not arrived (or is not configured locally).
  if (order.status === 'pending_payment' && order.payment.provider === 'stripe' && order.payment.sessionId) {
    try {
      const status = await getProvider().getSessionStatus(order.payment.sessionId);
      if (status.paid) order = (await markOrderPaid(order._id, status)) || order;
    } catch (err) {
      logger.warn('payment_status_check_failed', { orderId: String(order._id), err });
    }
  }
  res.json({ order: serializeOrder(order) });
};

exports.cancelOrder = async (req, res) => {
  const order = await loadOwnOrder(req);
  if (!order.userId.equals(req.user._id)) throw forbidden();
  if (order.status !== 'pending_payment') throw conflict('Only unpaid orders can be cancelled online. Please contact us.');
  await changeStatus(order, 'cancelled', { by: req.user._id, note: 'Cancelled by customer' });
  res.json({ order: serializeOrder(order) });
};

// Resume payment for an unpaid order whose session may have been closed.
exports.resumePayment = async (req, res) => {
  const order = await loadOwnOrder(req);
  if (order.status !== 'pending_payment') throw conflict('This order is not awaiting payment');
  if (order.reservationExpiresAt && order.reservationExpiresAt <= new Date()) throw conflict('This order has expired. Please check out again.');
  const provider = getProvider();
  if (order.payment.provider === 'stripe' && order.payment.sessionId) {
    const status = await provider.getSessionStatus(order.payment.sessionId).catch(() => null);
    if (status?.paid) {
      const paid = await markOrderPaid(order._id, status);
      return res.json({ order: serializeOrder(paid), checkoutUrl: null });
    }
  }
  const session = await provider.createCheckout(order);
  order.payment.sessionId = session.sessionId;
  await order.save();
  res.json({ order: serializeOrder(order), checkoutUrl: session.url });
};

exports.serializeOrder = serializeOrder;
