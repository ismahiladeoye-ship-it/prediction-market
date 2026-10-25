const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const { getConfig } = require('../config/env');
const { fromCents } = require('../utils/money');

// The shop trades in the UK, so a month runs from midnight to midnight UK time.
const TIME_ZONE = 'Europe/London';
// Same threshold as the dashboard's low-stock count.
const LOW_STOCK = 5;
// Paid orders that kept the money; cancelled/refunded ones are reported separately.
const SOLD = ['paid', 'processing', 'shipped', 'delivered'];
const REVERSED = ['cancelled', 'refunded'];
const TREND_MONTHS = 12;

const ukParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

// "2026-10" for the given instant, in UK time.
const monthOf = (date) => {
  const p = Object.fromEntries(ukParts.formatToParts(date).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}`;
};

// UTC instant at which a month starts in UK time (GMT or BST).
const monthStart = (year, month) => {
  const utc = new Date(Date.UTC(year, month - 1, 1));
  const p = Object.fromEntries(ukParts.formatToParts(utc).map((x) => [x.type, Number(x.value)]));
  const offset = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - utc.getTime();
  return new Date(utc.getTime() - offset);
};

const addMonths = (year, month, delta) => {
  const index = year * 12 + (month - 1) + delta;
  return [Math.floor(index / 12), (index % 12) + 1];
};
const key = (year, month) => `${year}-${String(month).padStart(2, '0')}`;

// S, M, L… in wearing order, then shoe sizes by number, then anything else.
const LETTER_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'XXXL', '3XL'];
const sizeRank = (size) => {
  const letter = LETTER_SIZES.indexOf(String(size).toUpperCase());
  if (letter >= 0) return letter;
  const number = parseFloat(size);
  return Number.isNaN(number) ? 10000 : 100 + number;
};
const bySize = (a, b) => sizeRank(a.size) - sizeRank(b.size) || String(a.size).localeCompare(String(b.size));

// What sold in a month (by product and size), takings, stock on hand and the
// twelve months up to it. month is "YYYY-MM"; defaults to the current UK month.
const monthlyOrderBook = async (month = monthOf(new Date())) => {
  const [year, mon] = month.split('-').map(Number);
  const start = monthStart(year, mon);
  const end = monthStart(...addMonths(year, mon, 1));
  const trendStart = monthStart(...addMonths(year, mon, -(TREND_MONTHS - 1)));
  const inMonth = { 'payment.paidAt': { $gte: start, $lt: end } };

  const [[sold], [reversed], [stock], trend] = await Promise.all([
    Order.aggregate([
      { $match: { ...inMonth, status: { $in: SOLD } } },
      { $sort: { 'payment.paidAt': -1 } },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                orders: { $sum: 1 },
                subtotal: { $sum: '$amounts.subtotalCents' },
                shipping: { $sum: '$amounts.shippingCents' },
                tax: { $sum: '$amounts.taxCents' },
                total: { $sum: '$amounts.totalCents' },
              },
            },
          ],
          lines: [
            { $unwind: '$items' },
            {
              $group: {
                _id: { productId: '$items.productId', size: '$items.size' },
                quantity: { $sum: '$items.quantity' },
                cents: { $sum: '$items.lineTotalCents' },
                // As sold most recently, in case the product was since renamed or removed.
                name: { $first: '$items.name' },
                brand: { $first: '$items.brand' },
                category: { $first: '$items.category' },
                imageUrl: { $first: '$items.imageUrl' },
              },
            },
          ],
        },
      },
    ]),
    Order.aggregate([
      { $match: { ...inMonth, status: { $in: REVERSED } } },
      { $group: { _id: null, orders: { $sum: 1 }, total: { $sum: '$amounts.totalCents' } } },
    ]),
    Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          products: { $sum: 1 },
          units: { $sum: { $max: ['$stock', 0] } },
          outOfStock: { $sum: { $cond: [{ $lte: ['$stock', 0] }, 1, 0] } },
          lowStock: { $sum: { $cond: [{ $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', LOW_STOCK] }] }, 1, 0] } },
        },
      },
    ]),
    Order.aggregate([
      { $match: { 'payment.paidAt': { $gte: trendStart, $lt: end }, status: { $in: SOLD } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$payment.paidAt', timezone: TIME_ZONE } },
          orders: { $sum: 1 },
          items: { $sum: { $sum: '$items.quantity' } },
          total: { $sum: '$amounts.totalCents' },
        },
      },
    ]),
  ]);

  // One row per product, with its sizes, and today's stock.
  const rows = new Map();
  for (const line of sold.lines) {
    const id = String(line._id.productId);
    const row = rows.get(id) || {
      productId: id,
      name: line.name,
      brand: line.brand || '',
      category: line.category || '',
      imageUrl: line.imageUrl || '',
      sizes: [],
      quantity: 0,
      cents: 0,
    };
    if (line._id.size) row.sizes.push({ size: line._id.size, quantity: line.quantity });
    row.quantity += line.quantity;
    row.cents += line.cents;
    rows.set(id, row);
  }
  const current = await Product.find({ _id: { $in: [...rows.keys()] } })
    .select('name sku brand category imageUrl stock isActive')
    .lean();
  const byId = new Map(current.map((p) => [String(p._id), p]));
  const products = [...rows.values()]
    .map(({ cents, ...row }) => {
      const p = byId.get(row.productId);
      return {
        ...row,
        ...(p ? { name: p.name, brand: p.brand || row.brand, category: p.category || row.category, imageUrl: p.imageUrl || row.imageUrl } : {}),
        sku: p?.sku || '',
        sizes: row.sizes.sort(bySize),
        sales: fromCents(cents),
        stock: p ? p.stock : null,
        isActive: Boolean(p?.isActive),
      };
    })
    .sort((a, b) => b.quantity - a.quantity || b.sales - a.sales || a.name.localeCompare(b.name));

  const totals = sold.totals[0] || { orders: 0, subtotal: 0, shipping: 0, tax: 0, total: 0 };
  const trendByMonth = new Map(trend.map((t) => [t._id, t]));
  const months = Array.from({ length: TREND_MONTHS }, (_, i) => {
    const m = key(...addMonths(year, mon, -i));
    const t = trendByMonth.get(m);
    return { month: m, orders: t?.orders || 0, itemsSold: t?.items || 0, total: fromCents(t?.total || 0) };
  });

  return {
    month,
    currentMonth: monthOf(new Date()),
    currency: getConfig().CURRENCY,
    summary: {
      orders: totals.orders,
      itemsSold: products.reduce((n, p) => n + p.quantity, 0),
      productSales: fromCents(totals.subtotal),
      delivery: fromCents(totals.shipping),
      tax: fromCents(totals.tax),
      total: fromCents(totals.total),
      averageOrder: totals.orders ? fromCents(Math.round(totals.total / totals.orders)) : 0,
      cancelledOrRefunded: { orders: reversed?.orders || 0, total: fromCents(reversed?.total || 0) },
    },
    products,
    stock: {
      products: stock?.products || 0,
      units: stock?.units || 0,
      outOfStock: stock?.outOfStock || 0,
      lowStock: stock?.lowStock || 0,
      lowStockThreshold: LOW_STOCK,
    },
    months,
  };
};

module.exports = { monthlyOrderBook, monthOf, monthStart };
