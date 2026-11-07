const Product = require('../models/productModel');

// The owner's price rules, from the supplier's price today (in pounds):
//   £30 or under: not sold      over £30 to £65: £10 off
//   over £65 to £100: £20 off   over £100 to £200: £15 off
//   over £200 to £300: £45 off  over £300: not sold
const RULES = [
  { upTo: 30, off: null },
  { upTo: 65, off: 10 },
  { upTo: 100, off: 20 },
  { upTo: 200, off: 15 },
  { upTo: 300, off: 45 },
];
const shopPriceFor = (supplierPrice) => {
  if (typeof supplierPrice !== 'number' || !Number.isFinite(supplierPrice) || supplierPrice <= 0) return null;
  const rule = RULES.find((r) => supplierPrice <= r.upTo);
  if (!rule || rule.off === null) return null;
  return Math.round((supplierPrice - rule.off) * 100) / 100;
};

const SYNC_FIELDS = '+sourceUrl +sourceCode +sourceSize +priceLocked +hiddenBySync +sourceCheckedAt';
// The same sizes in any order count as no change.
const sameSizes = (a = [], b = []) => a.length === b.length && a.every((s) => b.includes(s));

// One day's findings for some products, by SKU: { sku, supplierPrice, sizes }.
// supplierPrice null means sold out or gone. Returns what changed.
const applyResults = async (results, now = new Date()) => {
  const products = await Product.find({ sku: { $in: results.map((r) => r.sku) } }).select(SYNC_FIELDS);
  const bySku = new Map(products.map((p) => [p.sku, p]));
  const changes = [];
  for (const r of results) {
    const p = bySku.get(r.sku);
    if (!p) continue;
    const ownerHidden = !p.isActive && !p.hiddenBySync;
    const hasSizes = p.sizes.length > 0;
    const sizes = Array.isArray(r.sizes) ? r.sizes : null;
    const newPrice = shopPriceFor(r.supplierPrice);
    const available = newPrice !== null && !(hasSizes && sizes && sizes.length === 0);
    const base = { sku: p.sku, name: p.name };
    if (!available) {
      if (p.isActive) {
        p.isActive = false;
        p.hiddenBySync = true;
        changes.push({ ...base, type: 'hidden', reason: r.supplierPrice == null ? 'sold out' : `supplier price £${r.supplierPrice} is outside the rules` });
      }
    } else if (!ownerHidden) {
      const price = p.priceLocked ? p.price : newPrice;
      if (price !== p.price) changes.push({ ...base, type: 'price', from: p.price, to: price });
      p.price = price;
      p.retailPrice = r.supplierPrice;
      if (hasSizes && sizes && !sameSizes(p.sizes, sizes)) {
        changes.push({ ...base, type: 'sizes', from: p.sizes.join(' '), to: sizes.join(' ') });
        p.sizes = sizes;
      }
      if (p.hiddenBySync) {
        p.isActive = true;
        p.hiddenBySync = false;
        changes.push({ ...base, type: 'back', to: price });
      }
    }
    p.sourceCheckedAt = now;
    if (p.isModified()) {
      p.updatedAt = now;
      await p.save();
    }
  }
  return changes;
};

module.exports = { shopPriceFor, applyResults, SYNC_FIELDS, RULES };
