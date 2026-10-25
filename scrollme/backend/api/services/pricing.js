const { getConfig } = require('../config/env');
const { toCents, fromCents } = require('../utils/money');

// Express is offered only when it has a price (SHIPPING_EXPRESS).
const deliveryMethods = () => (getConfig().SHIPPING_EXPRESS === undefined ? ['standard'] : ['standard', 'express']);

// The single source of truth for what a product costs. The storefront shows
// `price`, so that is what is charged.
const unitPriceCents = (product) => toCents(product.price);

const shippingCents = (subtotalCents, deliveryMethod = 'standard') => {
  const config = getConfig();
  if (subtotalCents === 0) return 0;
  const threshold = toCents(config.FREE_SHIPPING_THRESHOLD);
  if (deliveryMethod === 'standard' && threshold > 0 && subtotalCents >= threshold) return 0;
  return toCents(deliveryMethod === 'express' ? config.SHIPPING_EXPRESS : config.SHIPPING_STANDARD);
};

// lines: [{ unitPriceCents, quantity }]
const computeTotals = (lines, deliveryMethod = 'standard') => {
  const config = getConfig();
  const subtotalCents = lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
  const taxCents = Math.round(subtotalCents * config.TAX_RATE);
  const ship = shippingCents(subtotalCents, deliveryMethod);
  return {
    subtotalCents,
    taxCents,
    shippingCents: ship,
    totalCents: subtotalCents + taxCents + ship,
  };
};

const totalsToJSON = (totals) => ({
  subtotal: fromCents(totals.subtotalCents),
  tax: fromCents(totals.taxCents),
  shipping: fromCents(totals.shippingCents),
  total: fromCents(totals.totalCents),
  currency: getConfig().CURRENCY,
});

const deliveryOptions = (subtotalCents) =>
  deliveryMethods().map((method) => ({
    method,
    label: method === 'express' ? 'Express delivery (1-2 working days)' : 'Standard delivery (3-5 working days)',
    price: fromCents(shippingCents(subtotalCents || 1, method)),
  }));

module.exports = { deliveryMethods, unitPriceCents, computeTotals, totalsToJSON, deliveryOptions };
