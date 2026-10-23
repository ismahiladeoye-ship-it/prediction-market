const crypto = require('node:crypto');
const Order = require('../models/orderModel');
const Cart = require('../models/cartModel');
const { getConfig } = require('../config/env');
const { buildCartView } = require('../controllers/cartController');
const { computeTotals } = require('./pricing');
const { reserveStock, releaseStock } = require('./inventory');
const { getProvider } = require('./payments');
const { badRequest, conflict, HttpError } = require('../utils/httpError');
const logger = require('../utils/logger');

const newOrderNumber = () => `SM-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

// Creates an order from the shopper's server-side cart, reserves its stock and
// opens a payment session. Nothing the client sends is used for prices.
const createOrderFromCart = async (user, { shippingAddress, deliveryMethod }) => {
  const config = getConfig();
  const cart = await Cart.findOne({ userId: user._id });
  const view = await buildCartView(cart, deliveryMethod);
  if (!view.lines.length) throw badRequest('Your cart is empty');
  if (view.issues.length) throw conflict(view.issues[0].message, view.issues);

  const items = view.lines.map((l) => ({
    productId: l.productId,
    name: l.name,
    brand: l.brand,
    category: l.category,
    imageUrl: l.imageUrl,
    size: l.size,
    quantity: l.quantity,
    unitPriceCents: l.unitPriceCents,
    lineTotalCents: l.unitPriceCents * l.quantity,
  }));
  const amounts = computeTotals(items, deliveryMethod);

  await reserveStock(items);
  const provider = getProvider();
  let order;
  try {
    order = await Order.create({
      orderNumber: newOrderNumber(),
      userId: user._id,
      email: user.email,
      items,
      shippingAddress,
      deliveryMethod,
      currency: config.CURRENCY,
      amounts,
      status: 'pending_payment',
      statusHistory: [{ status: 'pending_payment', by: user._id }],
      stockReserved: true,
      reservationExpiresAt: new Date(Date.now() + config.RESERVATION_MINUTES * 60 * 1000),
      payment: { provider: provider.name, status: 'pending' },
    });
    const session = await provider.createCheckout(order);
    order.payment.sessionId = session.sessionId;
    await order.save();
    return { order, checkoutUrl: session.url };
  } catch (err) {
    // Payment session could not be opened: give the stock back and void the order.
    await releaseStock(items);
    if (order) {
      await Order.updateOne(
        { _id: order._id },
        {
          $set: { status: 'cancelled', stockReserved: false, 'payment.status': 'failed' },
          $push: { statusHistory: { status: 'cancelled', note: 'Payment session failed' } },
        }
      );
    }
    logger.error('checkout_failed', { err, userId: String(user._id) });
    if (err instanceof HttpError) throw err;
    throw new HttpError(502, 'We could not start the payment. Please try again.');
  }
};

const removePurchasedFromCart = async (order) => {
  const cart = await Cart.findOne({ userId: order.userId });
  if (!cart) return;
  cart.items = cart.items.filter((i) => !order.items.some((o) => o.productId.equals(i.productId) && (o.size || '') === (i.size || '')));
  await cart.save();
};

// Idempotent: safe to call from the webhook, the return page and tests.
const markOrderPaid = async (orderId, { reference, amountTotal } = {}) => {
  const order = await Order.findById(orderId);
  if (!order) return null;
  if (order.payment.status === 'paid') return order;

  if (amountTotal !== undefined && amountTotal !== null && amountTotal !== order.amounts.totalCents) {
    order.attention = `Amount paid (${amountTotal}) differs from order total (${order.amounts.totalCents})`;
    logger.error('payment_amount_mismatch', { orderId: String(order._id), amountTotal, expected: order.amounts.totalCents });
  }

  if (order.status === 'pending_payment') {
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, status: 'pending_payment' },
      {
        $set: { status: 'paid', 'payment.status': 'paid', 'payment.reference': reference, 'payment.paidAt': new Date(), attention: order.attention },
        $push: { statusHistory: { status: 'paid', note: 'Payment confirmed' } },
      },
      { new: true }
    );
    if (updated) {
      await removePurchasedFromCart(updated);
      logger.info('order_paid', { orderId: String(updated._id), orderNumber: updated.orderNumber });
      return updated;
    }
    return Order.findById(order._id);
  }

  // Paid after the reservation expired and the order was cancelled: try to take the stock again.
  if (order.status === 'cancelled') {
    try {
      await reserveStock(order.items);
      order.status = 'paid';
      order.stockReserved = true;
      order.statusHistory.push({ status: 'paid', note: 'Payment arrived after reservation expired; stock re-reserved' });
    } catch {
      order.attention = 'Payment received after the reservation expired and stock is no longer available — refund required';
    }
    order.payment.status = 'paid';
    order.payment.reference = reference;
    order.payment.paidAt = new Date();
    await order.save();
    if (order.status === 'paid') await removePurchasedFromCart(order);
    logger.warn('late_payment', { orderId: String(order._id), status: order.status });
    return order;
  }
  return order;
};

// Moves an order to a new status if the transition is allowed.
const changeStatus = async (order, status, { by, note, trackingNumber } = {}) => {
  if (order.status === status) return order;
  const allowed = Order.TRANSITIONS[order.status] || [];
  if (!allowed.includes(status)) throw conflict(`Cannot change an order from ${order.status} to ${status}`);
  if ((status === 'cancelled' || status === 'refunded') && order.stockReserved && !['shipped', 'delivered'].includes(order.status)) {
    await releaseStock(order.items);
    order.stockReserved = false;
  }
  if (status === 'paid') {
    order.payment.status = 'paid';
    order.payment.paidAt = order.payment.paidAt || new Date();
  }
  if (status === 'refunded') order.payment.status = 'refunded';
  if (trackingNumber) order.trackingNumber = trackingNumber;
  order.status = status;
  order.statusHistory.push({ status, by, note });
  await order.save();
  return order;
};

// Releases stock held by unpaid orders whose reservation has run out.
const releaseExpiredOrders = async (now = new Date()) => {
  const expired = await Order.find({ status: 'pending_payment', reservationExpiresAt: { $lte: now } }).limit(500);
  let released = 0;
  for (const order of expired) {
    // Last check with the provider in case the webhook was missed.
    if (order.payment.provider === 'stripe' && order.payment.sessionId) {
      try {
        const status = await getProvider().getSessionStatus(order.payment.sessionId);
        if (status.paid) {
          await markOrderPaid(order._id, status);
          continue;
        }
      } catch (err) {
        logger.warn('expiry_status_check_failed', { orderId: String(order._id), err });
      }
    }
    const claimed = await Order.findOneAndUpdate(
      { _id: order._id, status: 'pending_payment' },
      { $set: { status: 'cancelled', stockReserved: false }, $push: { statusHistory: { status: 'cancelled', note: 'Payment not completed in time' } } }
    );
    if (claimed?.stockReserved) {
      await releaseStock(claimed.items);
      released += 1;
    }
  }
  if (released) logger.info('reservations_released', { count: released });
  return released;
};

module.exports = { createOrderFromCart, markOrderPaid, changeStatus, releaseExpiredOrders };
