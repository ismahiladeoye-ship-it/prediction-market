const Order = require('../models/orderModel');
const { stripeProvider } = require('../services/payments');
const { markOrderPaid } = require('../services/orders');
const { getConfig } = require('../config/env');
const { serializeOrder } = require('./orderController');
const { notFound, forbidden, conflict, badRequest } = require('../utils/httpError');
const logger = require('../utils/logger');

// Stripe calls this with a signed raw body. Only verified events change orders.
exports.stripeWebhook = async (req, res) => {
  let event;
  try {
    event = stripeProvider.constructWebhookEvent(req.body, req.get('stripe-signature'));
  } catch (err) {
    if (err.status) throw err;
    logger.warn('stripe_webhook_rejected', { message: err.message });
    throw badRequest('Invalid signature');
  }

  const session = event.data?.object || {};
  const orderId = session.metadata?.orderId || session.client_reference_id;
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      if (session.payment_status === 'paid' && orderId) {
        await markOrderPaid(orderId, { reference: session.payment_intent || session.id, amountTotal: session.amount_total });
      }
      break;
    case 'checkout.session.async_payment_failed':
      if (orderId) await Order.updateOne({ _id: orderId, status: 'pending_payment' }, { $set: { 'payment.status': 'failed' } });
      break;
    default:
      break;
  }
  res.json({ received: true });
};

// Development/test only: completes a mock payment for the shopper's own order.
exports.completeMockPayment = async (req, res) => {
  if (getConfig().PAYMENT_PROVIDER !== 'mock') throw notFound();
  const order = await Order.findById(req.params.orderId);
  if (!order) throw notFound('Order not found');
  if (!order.userId.equals(req.user._id)) throw forbidden();
  if (order.payment.provider !== 'mock') throw conflict('This order does not use the mock provider');
  const paid = await markOrderPaid(order._id, { reference: `mockpay_${order._id}`, amountTotal: order.amounts.totalCents });
  res.json({ order: serializeOrder(paid) });
};
