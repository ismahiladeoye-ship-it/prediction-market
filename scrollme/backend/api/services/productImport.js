const { parse } = require('csv-parse/sync');
const Product = require('../models/productModel');
const { COLLECTIONS } = require('../config/collections');
const { productCreate, productUpdate } = require('../validators/schemas');
const { UPLOAD_URL } = require('./images');

const MAX_ROWS = 1000;

// Spreadsheet headings (lower-cased, spaces/dashes as underscores) and the
// product field each one fills. Unknown columns are ignored.
const COLUMNS = {
  sku: 'sku',
  name: 'name',
  product_name: 'name',
  brand: 'brand',
  category: 'category',
  price: 'price',
  stock: 'stock',
  quantity: 'stock',
  sizes: 'sizes',
  colour: 'color',
  color: 'color',
  material: 'material',
  description: 'description',
  tags: 'tags',
  images: 'images',
  photos: 'images',
  active: 'isActive',
};

// Everyday names for categories the storefront's collections use.
const CATEGORY_ALIASES = {
  't-shirt': 'tshirts',
  't-shirts': 'tshirts',
  tee: 'tshirts',
  tees: 'tshirts',
  hoodie: 'sweatshirts',
  hoodies: 'sweatshirts',
  sweatshirt: 'sweatshirts',
  jumper: 'sweaters',
  jumpers: 'sweaters',
  knitwear: 'sweaters',
  tracksuit: 'tracksuits',
  'track-pants': 'track-pants',
  joggers: 'track-pants',
  trainers: 'sports-shoes',
  sneakers: 'sports-shoes',
  jacket: 'jackets',
  coat: 'coats',
  cap: 'caps',
  hat: 'hat',
  bag: 'backpacks',
  bags: 'backpacks',
  watch: 'watches',
  perfume: 'perfume-and-body-mist',
  fragrance: 'perfume-and-body-mist',
  fragrances: 'perfume-and-body-mist',
  aftershave: 'perfume-and-body-mist',
};
const COLLECTION_CATEGORIES = new Set(COLLECTIONS.flatMap((c) => c.categories));

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const toCategory = (value) => {
  const slug = slugify(value);
  if (CATEGORY_ALIASES[slug]) return CATEGORY_ALIASES[slug];
  // "Jackets"/"Jacket" both work when one of them is a known category.
  if (!COLLECTION_CATEGORIES.has(slug) && COLLECTION_CATEGORIES.has(`${slug}s`)) return `${slug}s`;
  return slug;
};

const list = (value) =>
  String(value || '')
    .split(/[|,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

const toNumber = (value) => {
  const cleaned = String(value).replace(/[£$€,\s]/g, '');
  return cleaned === '' ? undefined : Number(cleaned);
};

const toBoolean = (value) => {
  const v = String(value).trim().toLowerCase();
  if (v === '') return undefined;
  if (['yes', 'y', 'true', '1', 'active', 'live'].includes(v)) return true;
  if (['no', 'n', 'false', '0', 'inactive', 'hidden'].includes(v)) return false;
  return value; // left for validation to reject
};

const readCsv = (csv) => {
  const records = parse(csv, {
    bom: true,
    columns: (headers) => headers.map((h) => COLUMNS[slugify(h).replace(/-/g, '_')] || null),
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });
  return records;
};

// photos: { "front.jpg": "/api/uploads/….webp" } for files sent with the
// spreadsheet. In a dry run the values may be null (not uploaded yet).
const resolveImages = (tokens, photos, dryRun) => {
  const byName = new Map(Object.entries(photos || {}).map(([name, url]) => [name.toLowerCase(), url]));
  const images = [];
  const errors = [];
  let found = 0; // photos named and available (not yet uploaded in a dry run)
  for (const token of tokens) {
    if (/^https?:\/\//i.test(token)) {
      images.push(token);
      found += 1;
      continue;
    }
    const name = token.split(/[\\/]/).pop().toLowerCase();
    if (!byName.has(name)) {
      errors.push(`Photo "${token}" was not among the photos you selected`);
      continue;
    }
    const url = byName.get(name);
    if (url && UPLOAD_URL.test(url)) {
      images.push(url);
      found += 1;
    } else if (dryRun) found += 1;
    else errors.push(`Photo "${token}" was not uploaded`);
  }
  return { images, errors, found };
};

const has = (record, key) => Object.prototype.hasOwnProperty.call(record, key);

// Only columns present in the spreadsheet are applied, so a sheet with just
// "sku" and "stock" updates stock and leaves everything else alone.
const toProduct = (record, { photos, dryRun, isUpdate }) => {
  const errors = [];
  const warnings = [];
  const raw = {};
  if (has(record, 'sku')) raw.sku = record.sku;
  if (has(record, 'name')) raw.name = record.name;
  if (has(record, 'brand')) raw.brand = record.brand;
  if (has(record, 'category')) raw.category = record.category ? toCategory(record.category) : '';
  if (has(record, 'price')) raw.price = toNumber(record.price);
  if (has(record, 'stock')) raw.stock = toNumber(record.stock);
  if (has(record, 'sizes')) raw.sizes = list(record.sizes);
  if (has(record, 'color')) raw.color = record.color;
  if (has(record, 'material')) raw.material = record.material;
  if (has(record, 'description')) raw.description = record.description;
  if (has(record, 'tags')) raw.tags = list(record.tags);
  if (has(record, 'isActive') && record.isActive !== '') raw.isActive = toBoolean(record.isActive);
  for (const key of ['price', 'stock']) {
    if (Number.isNaN(raw[key])) {
      errors.push(`${key}: "${record[key]}" is not a number`);
      delete raw[key];
    }
  }
  if (typeof raw.isActive === 'string') {
    errors.push(`active: use yes or no (got "${raw.isActive}")`);
    delete raw.isActive;
  }
  // Blank optional text cells are simply left out on new products.
  for (const key of ['brand', 'color', 'material', 'description']) if (raw[key] === '' && !isUpdate) delete raw[key];

  if (has(record, 'images')) {
    const { images, errors: imageErrors, found } = resolveImages(list(record.images), photos, dryRun);
    errors.push(...imageErrors);
    raw.images = images;
    raw.imageUrl = images[0] || '';
    if (!found && !imageErrors.length) warnings.push('No photos: a placeholder will be shown');
  } else if (!isUpdate) {
    warnings.push('No photos: a placeholder will be shown');
  }

  const parsed = (isUpdate ? productUpdate : productCreate).safeParse(raw);
  if (!parsed.success) {
    errors.push(...parsed.error.issues.map((i) => `${i.path.join('.') || 'row'}: ${i.message}`));
  }
  if (!raw.sku) errors.push('sku: SKU is required');
  if (raw.category && !COLLECTION_CATEGORIES.has(raw.category)) {
    warnings.push(`Category "${raw.category}" is not in a collection, so it only appears in search and All products`);
  }
  return { product: parsed.success ? parsed.data : null, errors, warnings };
};

const failure = (message) => ({ ok: false, message, rows: [], summary: { create: 0, update: 0, errors: 1 } });

// Checks (dryRun) or applies a spreadsheet of products. Rows are matched to
// existing products by SKU: new SKUs are created, known ones updated. Nothing
// is written unless every row is valid.
const importProducts = async ({ csv, photos, dryRun }) => {
  let records;
  try {
    records = readCsv(csv);
  } catch (err) {
    return failure(`The spreadsheet could not be read: ${err.message}`);
  }
  if (!records.length) return failure('The spreadsheet has no product rows');
  if (records.length > MAX_ROWS) return failure(`Up to ${MAX_ROWS} products per upload (this file has ${records.length})`);
  if (!has(records[0], 'sku')) return failure('The spreadsheet needs a "sku" column (download the template to see all columns)');

  const skus = [...new Set(records.map((r) => String(r.sku || '').trim()).filter(Boolean))];
  const existing = new Map(
    (
      await Product.find({ sku: { $in: skus } })
        .select('sku')
        .lean()
    ).map((p) => [p.sku, p._id])
  );

  const seen = new Map();
  const rows = records.map((record, i) => {
    const row = i + 2; // row 1 is the heading
    const sku = String(record.sku || '').trim();
    const isUpdate = existing.has(sku);
    const { product, errors, warnings } = toProduct(record, { photos, dryRun, isUpdate });
    const key = sku.toLowerCase();
    if (key && seen.has(key)) errors.push(`SKU "${sku}" is also used on row ${seen.get(key)}`);
    else if (key) seen.set(key, row);
    const action = errors.length ? 'error' : isUpdate ? 'update' : 'create';
    return { row, sku, name: product?.name || String(record.name || ''), action, errors, warnings, product };
  });

  const summary = {
    create: rows.filter((r) => r.action === 'create').length,
    update: rows.filter((r) => r.action === 'update').length,
    errors: rows.filter((r) => r.action === 'error').length,
  };
  const result = (ok, message) => ({ ok, message, summary, rows: rows.map(({ product: _p, ...r }) => r) });

  if (summary.errors) return result(false, `${summary.errors} row(s) need fixing before anything is imported`);
  if (dryRun) return result(true, 'Ready to import');

  await Product.bulkWrite(
    rows.map((r) =>
      r.action === 'update'
        ? { updateOne: { filter: { _id: existing.get(r.sku) }, update: { $set: { ...r.product, updatedAt: new Date() } } } }
        : { insertOne: { document: r.product } }
    ),
    { ordered: true }
  );
  return result(true, `Imported ${summary.create} new and updated ${summary.update} existing product(s)`);
};

module.exports = { importProducts, toCategory, MAX_ROWS };
