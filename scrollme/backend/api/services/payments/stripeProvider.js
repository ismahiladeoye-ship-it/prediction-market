const Stripe = require('stripe');
const { getConfig } = require('../../config/env');
const { HttpError } = require('../../utils/httpError');

let client;
const getClient = () => {
  const { STRIPE_SECRET_KEY } = getConfig();
  if (!STRIPE_SECRET_KEY) throw new HttpError(503, 'Payments are not configured (STRIPE_SECRET_KEY missing)');
  if (!client) client = new Stripe(STRIPE_SECRET_KEY);
  return client;
};

// Tests inject a fake client.
const setClient = (c) => {
  client = c;
};

// Uses Stripe Checkout (hosted page): card data never touches this server.
const createCheckout = async (order) => {
  const config = getConfig();
  const lineItems = order.items.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency: order.currency,
      unit_amount: item.unitPriceCents,
      product_data: {
        name: item.size ? `${item.name} (size ${item.size})` : item.name,
        ...(item.imageUrl && /^https:\/\//.test(item.imageUrl) ? { images: [item.imageUrl] } : {}),
      },
    },
  }));
  if (order.amounts.taxCents > 0) {
    lineItems.push({ quantity: 1, price_data: { currency: order.currency, unit_amount: order.amounts.taxCents, product_data: { name: 'Tax' } } });
  }
  if (order.amounts.shippingCents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: { currency: order.currency, unit_amount: order.amounts.shippingCents, product_data: { name: `Delivery (${order.deliveryMethod})` } },
    });
  }
  const session = await getClient().checkout.sessions.create(
    {
      mode: 'payment',
      customer_email: order.email,
      client_reference_id: order._id.toString(),
      metadata: { orderId: order._id.toString(), orderNumber: order.orderNumber },
      line_items: lineItems,
      expires_at: Math.floor(new Date(order.reservationExpiresAt).getTime() / 1000) - 60,
      success_url: `${config.APP_URL}/orders/${order._id}?checkout=success`,
      cancel_url: `${config.APP_URL}/orders/${order._id}?checkout=cancelled`,
    },
    { idempotencyKey: `checkout-${order._id}` }
  );
  return { sessionId: session.id, url: session.url };
};

// Returns { paid, reference, amountTotal } for a Checkout Session.
const getSessionStatus = async (sessionId) => {
  const session = await getClient().checkout.sessions.retrieve(sessionId);
  return {
    paid: session.payment_status === 'paid',
    expired: session.status === 'expired',
    reference: session.payment_intent || session.id,
    amountTotal: session.amount_total,
    orderId: session.metadata?.orderId || session.client_reference_id,
  };
};

const constructWebhookEvent = (rawBody, signature) => {
  const { STRIPE_WEBHOOK_SECRET } = getConfig();
  if (!STRIPE_WEBHOOK_SECRET) throw new HttpError(503, 'Webhook secret not configured');
  // Signature verification uses only the secret, so a bare instance is enough.
  return Stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
};

module.exports = { name: 'stripe', createCheckout, getSessionStatus, constructWebhookEvent, setClient };
