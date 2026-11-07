#!/usr/bin/env node
// Daily price check. For every product linked to a supplier page, reads that
// page once (colours of one item share a page), finds the product's colour (or
// bottle size), today's price and the sizes in stock, and sends the findings
// to the shop, which applies the owner's price rules (see
// backend/api/services/priceSync.js) and emails the owner a summary.
//
//   SHOP_URL=https://getitsourced.com PRICE_SYNC_KEY=... node scripts/price-sync.mjs [--dry-run] [--limit N]
//
// Safety: a page that cannot be read, or reads with no sizes at all, leaves its
// products as they are; and if a run would hide more than a quarter of what it
// checked, it hides nothing and says so in the report.

const SUPPLIER = 'https://www.houseoffraser.co.uk';
const UA = 'GetItSourcedPriceCheck/1.0 (+https://getitsourced.com)';
const PAUSE_MS = 1200;
const MAX_HIDE_SHARE = 0.25;

// ---- Reading a supplier page ----------------------------------------------
const VARIANT =
  /\\"isOnStock\\":(true|false),[^{}]*?\\"size\\":\\"([^"\\]+)\\",\\"sku\\":\\"(\d+)\\",\\"sizeSequence\\":\\"\d+\\",\\"stockLevel\\":(?:null|\\"[^"\\]*\\"),\\"stockLevelThreshold\\":\{[^}]*\},\\"price\\":\{\\"value\\":\{\\"centAmount\\":(\d+),[^}]*\}\},\\"ticketPrice\\":\{\\"value\\":\{\\"centAmount\\":(\d+)/g;

const WORDS = {
  'X SMALL': 'XS',
  '2X SMALL': '2XS',
  'XX SMALL': '2XS',
  SMALL: 'S',
  MEDIUM: 'M',
  LARGE: 'L',
  'X LARGE': 'XL',
  '2X LARGE': '2XL',
  'XX LARGE': '2XL',
  '3X LARGE': '3XL',
  'XXX LARGE': '3XL',
  '4X LARGE': '4XL',
  XXL: '2XL',
  XXXL: '3XL',
  XXS: '2XS',
  'EXTRA LARGE': 'XL',
  'EXTRA SMALL': 'XS',
  'EXTRA EXTRA LARGE': '2XL',
};
// '7 (41)' -> '7'; EU-first '36 (3.5)' -> '3.5'; '4/EU36.5' -> '4'; 'UK 5' -> '5'; 'X Large' -> 'XL'.
export const tidySize = (size) => {
  const m = size.match(/^\s*(\d+(?:\.\d+)?)\s*\((?:UK\s*)?(\d+(?:\.\d+)?)\)/i);
  if (m && Number(m[1]) >= 30 && Number(m[2]) < 20) return m[2];
  let s = size
    .replace(/\s*\(.*\)$/, '')
    .trim()
    .replace(/\/EU.*$/i, '')
    .replace(/^UK\s*/i, '')
    .replace(/\.$/, '');
  s = s.replace(/\s+/g, ' ');
  return WORDS[s.toUpperCase()] || s;
};
const LETTERS = ['3XS', '2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];
const sizeKey = (s) => {
  if (LETTERS.includes(s)) return [0, LETTERS.indexOf(s), s];
  const n = parseFloat(s);
  return Number.isNaN(n) ? [2, 0, s] : [1, n, s];
};
export const sortSizes = (sizes) =>
  [...sizes].sort((a, b) => {
    const [x, y] = [sizeKey(a), sizeKey(b)];
    return x[0] - y[0] || x[1] - y[1] || String(x[2]).localeCompare(String(y[2]));
  });

// { colourCode: { all: Set(size), inStock: [{ size, price }] } } from a product page.
export const readPage = (html) => {
  const out = {};
  for (const [, onStock, size, sku, cents] of html.matchAll(VARIANT)) {
    const code = sku.slice(0, 8);
    const c = (out[code] ||= { all: new Set(), inStock: [] });
    const label = tidySize(size);
    c.all.add(label);
    if (onStock === 'true' && !c.inStock.some((v) => v.size === label)) c.inStock.push({ size: label, price: Number(cents) / 100 });
  }
  return out;
};

// The price most in-stock sizes sell at (ties go to the higher price), and those sizes.
export const mainPrice = (inStock) => {
  const groups = new Map();
  for (const v of inStock) groups.set(v.price, [...(groups.get(v.price) || []), v.size]);
  let best = null;
  for (const [price, sizes] of groups)
    if (!best || sizes.length > best.sizes.length || (sizes.length === best.sizes.length && price > best.price)) best = { price, sizes };
  return best;
};

const normSize = (s) => String(s).toLowerCase().replace(/\s+/g, '');

// What one product looks like today: { supplierPrice, sizes } or null when unknown.
export const finding = (product, page) => {
  const colours = Object.values(page);
  if (!colours.length) return null; // could not read the page
  const c = page[product.sourceCode] || (colours.length === 1 && !product.sourceCode ? colours[0] : null);
  if (product.sourceSize) {
    const want = normSize(product.sourceSize);
    const pool = c || (colours.length === 1 ? colours[0] : null);
    if (!pool) return { supplierPrice: null };
    if (![...pool.all].some((s) => normSize(s) === want)) return null; // size not on the page: leave it
    const hit = pool.inStock.find((v) => normSize(v.size) === want);
    return { supplierPrice: hit ? hit.price : null };
  }
  if (!c || !c.inStock.length) return { supplierPrice: null, sizes: [] };
  const best = mainPrice(c.inStock);
  return { supplierPrice: best.price, sizes: sortSizes(best.sizes) };
};

// ---- Running the check -----------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fetchPage = async (path) => {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const res = await fetch(SUPPLIER + path, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow' });
      if (res.status === 404 || res.status === 410) return { gone: true };
      if (res.ok) return { html: await res.text() };
    } catch {
      // network trouble: retry once, then leave these products alone
    }
    await sleep(5000);
  }
  return { unreachable: true };
};

const main = async () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity;
  const shop = (process.env.SHOP_URL || '').replace(/\/$/, '');
  const key = process.env.PRICE_SYNC_KEY;
  if (!shop || !key) {
    console.log('SHOP_URL and PRICE_SYNC_KEY must be set; nothing to do.');
    return;
  }
  const api = async (method, path, body) => {
    const res = await fetch(`${shop}/api/price-sync${path}`, {
      method,
      headers: { 'X-Price-Sync-Key': key, 'Content-Type': 'application/json', 'User-Agent': UA },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
    return res.json();
  };

  const products = [];
  for (let page = 1; ; page += 1) {
    const data = await api('GET', `/products?page=${page}&limit=1000`);
    products.push(...data.products);
    if (page >= data.totalPages) break;
  }
  const linked = products.filter((p) => p.sourceUrl);
  const byPage = new Map();
  for (const p of linked) byPage.set(p.sourceUrl, [...(byPage.get(p.sourceUrl) || []), p]);
  console.log(`${products.length} products, ${linked.length} linked to ${byPage.size} supplier pages`);

  const results = [];
  let pagesChecked = 0;
  let unreachable = 0;
  for (const [path, items] of [...byPage].slice(0, limit)) {
    const got = await fetchPage(path);
    pagesChecked += 1;
    if (got.unreachable) unreachable += 1;
    else if (got.gone) for (const p of items) results.push({ sku: p.sku, supplierPrice: null });
    else {
      const page = readPage(got.html);
      if (!Object.keys(page).length) unreachable += 1;
      for (const p of items) {
        const f = finding(p, page);
        if (f) results.push({ sku: p.sku, ...f, ...(p.sizes?.length ? {} : { sizes: undefined }) });
      }
    }
    if (pagesChecked % 100 === 0) console.log(`${pagesChecked}/${byPage.size} pages read`);
    await sleep(PAUSE_MS);
  }

  // Too many sold out at once looks like a problem reading the pages: hide nothing.
  const soldOut = results.filter((r) => r.supplierPrice === null || (r.sizes && r.sizes.length === 0));
  let warning = '';
  let send = results;
  if (results.length && soldOut.length / results.length > MAX_HIDE_SHARE) {
    warning = `${soldOut.length} of ${results.length} items looked sold out, which is unusual, so nothing was hidden today. Prices were still updated.`;
    send = results.filter((r) => !soldOut.includes(r));
  }
  const clean = send.map(({ sizes, ...r }) => (sizes === undefined ? r : { ...r, sizes }));

  if (dryRun) {
    console.log(JSON.stringify({ checked: results.length, pagesChecked, unreachable, warning, sample: clean.slice(0, 20) }, null, 1));
    return;
  }
  const changes = [];
  for (let i = 0; i < clean.length; i += 300) {
    const res = await api('POST', '/apply', { results: clean.slice(i, i + 300) });
    changes.push(...res.changes);
  }
  await api('POST', '/report', { checked: results.length, pagesChecked, unreachable, warning, changes });
  const count = (t) => changes.filter((c) => c.type === t).length;
  console.log(
    `Done: ${results.length} checked, ${count('price')} prices changed, ${count('hidden')} hidden, ${count('back')} back, ${unreachable} pages unreadable.`
  );
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
