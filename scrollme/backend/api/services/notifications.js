const Order = require('../models/orderModel');
const mailer = require('./mailer');
const { getConfig } = require('../config/env');
const { getShopDetails, notifyAddress } = require('./shopDetails');
const logger = require('../utils/logger');
const { afterResponse } = require('../utils/background');

// Emails to customers (order confirmation, shipped, refunded) and alerts to
// the shop owner (new order, new contact message). Sending never blocks or
// fails the request that triggered it; problems are logged as email_failed.

const COUNTRY_NAMES = { GB: 'United Kingdom' };

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const money = (cents, currency) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: (currency || 'gbp').toUpperCase() }).format(cents / 100);

const appUrl = (path) => new URL(path, getConfig().APP_URL).toString();

const firstName = (fullName) =>
  String(fullName || '')
    .trim()
    .split(/\s+/)[0] || 'there';

const shopFooterLines = (shop) =>
  [
    shop.legalName && shop.legalName !== shop.name ? `${shop.name} is a trading name of ${shop.legalName}` : shop.name,
    ...String(shop.address || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean),
    [shop.companyNumber && `Company number ${shop.companyNumber}`, shop.vatNumber && `VAT number ${shop.vatNumber}`].filter(Boolean).join(' · '),
  ].filter(Boolean);

// One email, as plain text and simple HTML. Blocks are { text } paragraphs,
// { lines } (address-like) or { rows: [[label, value], ...] }; all escaped.
const render = ({ shop, heading, blocks, button }) => {
  const footer = shopFooterLines(shop);
  const text = [
    heading,
    '',
    ...blocks.flatMap((b) => {
      if (b.rows) return [...b.rows.map(([l, v]) => `${l}  ${v}`), ''];
      if (b.lines) return [...b.lines, ''];
      return [b.text, ''];
    }),
    ...(button ? [`${button.label}: ${button.url}`, ''] : []),
    '—',
    ...footer,
  ].join('\n');

  const block = (b) => {
    if (b.rows) {
      return `<table role="presentation" width="100%" style="border-collapse:collapse;margin:0 0 18px">${b.rows
        .map(
          ([l, v], i) =>
            `<tr><td style="padding:6px 0;${i === b.rows.length - 1 && b.total ? 'font-weight:700;border-top:1px solid #ddd' : ''}">${escapeHtml(
              l
            )}</td><td align="right" style="padding:6px 0;white-space:nowrap;${i === b.rows.length - 1 && b.total ? 'font-weight:700;border-top:1px solid #ddd' : ''}">${escapeHtml(v)}</td></tr>`
        )
        .join('')}</table>`;
    }
    if (b.lines) return `<p style="margin:0 0 18px;line-height:1.5">${b.lines.map(escapeHtml).join('<br>')}</p>`;
    return `<p style="margin:0 0 18px;line-height:1.5">${escapeHtml(b.text)}</p>`;
  };
  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#111">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<div style="background:#111;color:#fff;padding:18px 24px;border-radius:12px 12px 0 0;font-size:20px;letter-spacing:2px;font-weight:700">${escapeHtml(
    shop.name.toUpperCase()
  )}</div>
<div style="background:#fff;padding:24px;border-radius:0 0 12px 12px">
<h1 style="font-size:20px;margin:0 0 18px">${escapeHtml(heading)}</h1>
${blocks.map(block).join('\n')}
${
  button
    ? `<p style="margin:24px 0"><a href="${escapeHtml(button.url)}" style="background:#111;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700;display:inline-block">${escapeHtml(
        button.label
      )}</a></p>`
    : ''
}
</div>
<p style="font-size:12px;color:#666;line-height:1.5;padding:16px 8px">${footer.map(escapeHtml).join('<br>')}</p>
</div></body></html>`;
  return { text, html };
};

const send = async (message, context) => {
  try {
    if (!message.to) {
      logger.warn('email_skipped_no_recipient', context);
      return false;
    }
    await mailer.sendMail(message);
    return true;
  } catch (err) {
    logger.error('email_failed', { ...context, err });
    return false;
  }
};

// Each order email goes out once, even if payment is confirmed twice
// (webhook and return page) or an admin repeats a status change.
const claim = async (orderId, key) => {
  const res = await Order.updateOne({ _id: orderId, [`notifications.${key}`]: { $exists: false } }, { $set: { [`notifications.${key}`]: new Date() } });
  return res.modifiedCount === 1;
};

const itemRows = (order) => order.items.map((i) => [`${i.name}${i.size ? ` (size ${i.size})` : ''} × ${i.quantity}`, money(i.lineTotalCents, order.currency)]);

const totalRows = (order) => [
  ['Subtotal', money(order.amounts.subtotalCents, order.currency)],
  ['Delivery', order.amounts.shippingCents ? money(order.amounts.shippingCents, order.currency) : 'Free'],
  ...(order.amounts.taxCents ? [['Tax', money(order.amounts.taxCents, order.currency)]] : []),
  ['Total', money(order.amounts.totalCents, order.currency)],
];

const addressLines = (a) =>
  [a.fullName, a.line1, a.line2, [a.city, a.postalCode].filter(Boolean).join(' '), COUNTRY_NAMES[a.country] || a.country].filter(Boolean);

const contactLine = (shop) => (shop.email ? `Questions? Reply to this email or write to ${shop.email}.` : `Questions? Contact us at ${appUrl('/contact-us')}.`);

const orderConfirmation = (order, shop) =>
  render({
    shop,
    heading: `Thanks for your order, ${firstName(order.shippingAddress.fullName)}`,
    blocks: [
      { text: `We've received your payment for order ${order.orderNumber} and we're getting it ready.` },
      { rows: itemRows(order) },
      { rows: totalRows(order), total: true },
      { text: 'Delivering to:' },
      { lines: addressLines(order.shippingAddress) },
      { text: `Delivery usually takes ${shop.deliveryEstimate}. We'll email you when your order is on its way.` },
      {
        text: `Changed your mind? You can cancel within 14 days of receiving your order, and we accept returns of unused items within 30 days. See ${appUrl(
          '/returns'
        )} for how to return an item.`,
      },
      { text: contactLine(shop) },
    ],
    button: { label: 'View your order', url: appUrl(`/orders/${order._id}`) },
  });

const orderShipped = (order, shop) =>
  render({
    shop,
    heading: `Your order is on its way`,
    blocks: [
      { text: `Good news, ${firstName(order.shippingAddress.fullName)}: order ${order.orderNumber} has been sent.` },
      ...(order.trackingNumber ? [{ text: `Tracking number: ${order.trackingNumber}` }] : []),
      { rows: itemRows(order) },
      { text: 'Delivering to:' },
      { lines: addressLines(order.shippingAddress) },
      { text: contactLine(shop) },
    ],
    button: { label: 'Track your order', url: appUrl(`/orders/${order._id}`) },
  });

const orderRefunded = (order, shop) =>
  render({
    shop,
    heading: `Your refund for order ${order.orderNumber}`,
    blocks: [
      {
        text: `We've refunded ${money(
          order.amounts.totalCents,
          order.currency
        )} to the payment method you used. Refunds usually reach your account within 5–10 working days, depending on your bank.`,
      },
      { text: contactLine(shop) },
    ],
    button: { label: 'View your order', url: appUrl(`/orders/${order._id}`) },
  });

const newOrderAlert = (order, shop) =>
  render({
    shop,
    heading: `New order ${order.orderNumber}: ${money(order.amounts.totalCents, order.currency)}`,
    blocks: [
      ...(order.attention ? [{ text: `Needs attention: ${order.attention}` }] : []),
      { rows: itemRows(order) },
      { rows: totalRows(order), total: true },
      { text: `Customer: ${order.email}` },
      { lines: [...addressLines(order.shippingAddress), order.shippingAddress.phone].filter(Boolean) },
      { text: `Delivery: ${order.deliveryMethod}` },
    ],
    button: { label: 'Open in admin', url: appUrl(`/admin/orders?q=${encodeURIComponent(order.orderNumber)}`) },
  });

// After payment: confirmation to the customer and an alert to the owner.
const notifyOrderPaid = async (order) => {
  try {
    const shop = await getShopDetails();
    if (await claim(order._id, 'confirmation')) {
      await send(
        { to: order.email, replyTo: shop.email || undefined, subject: `Order confirmed: ${order.orderNumber}`, ...orderConfirmation(order, shop) },
        { kind: 'order_confirmation', orderId: String(order._id) }
      );
    }
    if (await claim(order._id, 'ownerAlert')) {
      await send(
        { to: await notifyAddress(), subject: `New order ${order.orderNumber}`, ...newOrderAlert(order, shop) },
        { kind: 'new_order_alert', orderId: String(order._id) }
      );
    }
  } catch (err) {
    logger.error('email_failed', { kind: 'order_paid', orderId: String(order._id), err });
  }
};

// Shipped and refunded orders: tell the customer.
const notifyOrderStatus = async (order) => {
  const templates = { shipped: ['shipped', orderShipped, 'Your order is on its way'], refunded: ['refunded', orderRefunded, 'Refund issued'] };
  const entry = templates[order.status];
  if (!entry) return;
  const [key, template, subject] = entry;
  try {
    if (!(await claim(order._id, key))) return;
    const shop = await getShopDetails();
    await send(
      { to: order.email, replyTo: shop.email || undefined, subject: `${subject}: ${order.orderNumber}`, ...template(order, shop) },
      { kind: `order_${key}`, orderId: String(order._id) }
    );
  } catch (err) {
    logger.error('email_failed', { kind: `order_${key}`, orderId: String(order._id), err });
  }
};

// A contact-page message: alert the owner; replying goes straight to the sender.
const notifyNewMessage = async (msg) => {
  try {
    const shop = await getShopDetails();
    const sourcing = msg.kind === 'sourcing';
    const content = render({
      shop,
      heading: sourcing ? `Sourcing request from ${msg.name}` : `Message from ${msg.name}`,
      blocks: [
        {
          rows: [
            ['From', `${msg.name} <${msg.email}>`],
            ...(msg.phone ? [['Phone', msg.phone]] : []),
            ...(msg.orderNumber ? [['Order', msg.orderNumber]] : []),
            ...(msg.item ? [['Looking for', msg.item]] : []),
            ...(msg.size ? [['Size', msg.size]] : []),
            ...(msg.budget ? [['Budget', msg.budget]] : []),
          ],
        },
        { text: msg.message },
        { text: 'Reply to this email to answer them directly.' },
      ],
      button: { label: 'Open in admin', url: appUrl('/admin/messages') },
    });
    await send(
      {
        to: await notifyAddress(),
        replyTo: msg.email,
        subject: sourcing ? `New sourcing request: ${msg.item}` : `New message from ${msg.name}`,
        ...content,
      },
      { kind: 'new_message_alert', messageId: String(msg._id) }
    );
  } catch (err) {
    logger.error('email_failed', { kind: 'new_message_alert', messageId: String(msg._id), err });
  }
};

// Callers do not wait for emails; afterResponse keeps them sending on Vercel.
module.exports = {
  notifyOrderPaid: (order) => afterResponse(notifyOrderPaid(order)),
  notifyOrderStatus: (order) => afterResponse(notifyOrderStatus(order)),
  notifyNewMessage: (msg) => afterResponse(notifyNewMessage(msg)),
  render,
  escapeHtml,
};
