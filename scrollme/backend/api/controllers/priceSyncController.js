const crypto = require('crypto');
const Product = require('../models/productModel');
const { getConfig } = require('../config/env');
const { applyResults, SYNC_FIELDS } = require('../services/priceSync');
const { sendPriceSyncReport } = require('../services/notifications');

// Only the daily price check (with the shared key) may use these endpoints.
// Without PRICE_SYNC_KEY set they do not exist.
exports.requireSyncKey = (req, res, next) => {
  const key = getConfig().PRICE_SYNC_KEY;
  const given = Buffer.from(req.get('x-price-sync-key') || '');
  const expected = Buffer.from(key || '');
  if (!key || given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    return res.status(404).json({ message: 'Not found' });
  }
  next();
};

// Products the check looks after (every product with a SKU), a page at a time.
exports.listProducts = async (req, res) => {
  const { page, limit } = req.validatedQuery;
  const filter = { sku: { $type: 'string' } };
  const [products, total] = await Promise.all([
    Product.find(filter)
      .select(`sku name category price retailPrice sizes isActive ${SYNC_FIELDS}`)
      .sort({ sku: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);
  res.json({
    page,
    totalPages: Math.ceil(total / limit),
    products: products.map(({ _id, __v, ...p }) => p),
  });
};

// Links products to their supplier pages, and records prices set by hand.
exports.setSources = async (req, res) => {
  const ops = req.body.items.map(({ sku, price, ...fields }) => ({
    updateOne: {
      filter: { sku },
      update: { $set: { ...fields, ...(price !== undefined ? { price, priceLocked: true } : {}), updatedAt: new Date() } },
    },
  }));
  const result = await Product.bulkWrite(ops, { ordered: false });
  res.json({ matched: result.matchedCount, updated: result.modifiedCount });
};

// Applies one batch of the day's findings.
exports.apply = async (req, res) => {
  const changes = await applyResults(req.body.results);
  res.json({ checked: req.body.results.length, changes });
};

// Emails the owner a summary of the day's run.
exports.report = async (req, res) => {
  await sendPriceSyncReport(req.body);
  res.status(202).json({ message: 'Report sent' });
};
