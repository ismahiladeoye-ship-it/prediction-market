const SYMBOL = process.env.REACT_APP_CURRENCY_SYMBOL || '£';

// e.g. £1,699.00
export const formatPrice = (amount) =>
  `${SYMBOL}${Number(amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const humanize = (slug = '') =>
  slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export const ORDER_STATUS_LABELS = {
  pending_payment: 'Awaiting payment',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export const ORDER_STATUS_COLORS = {
  pending_payment: 'orange',
  paid: 'green',
  processing: 'blue',
  shipped: 'purple',
  delivered: 'green',
  cancelled: 'gray',
  refunded: 'red',
};

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';

export const PAYMENT_METHOD_LABELS = {
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
  card: 'Credit / debit card',
  paypal: 'PayPal',
  klarna: 'Klarna',
};
