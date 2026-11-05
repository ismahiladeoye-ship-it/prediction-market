const Product = require('../models/productModel');
const Order = require('../models/orderModel');
const { UNISEX_DEPARTMENTS } = require('../config/taxonomy');
const { notFound } = require('../utils/httpError');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  price_asc: { price: 1, _id: 1 },
  price_desc: { price: -1, _id: -1 },
  rating: { 'ratings.averageRating': -1, 'ratings.numberOfReviews': -1, _id: 1 },
  name: { name: 1, _id: 1 },
};

// Internal fields (SKU, parcel weight and size) stay out of public responses.
const PUBLIC_FIELDS = '-__v -sku -weight -dimensions';

// Customers see whether an item can be bought, never how many are left: stock
// counts are for the shop's admins only (the admin API keeps them).
// eslint-disable-next-line no-unused-vars
const toPublic = ({ stock, sku, weight, dimensions, __v, ...product }) => ({ ...product, inStock: stock > 0 });

// Builds the Mongo filter for the public catalogue (and the admin list).
const buildFilter = (query, { includeInactive = false } = {}) => {
  const filter = includeInactive ? {} : { isActive: true };
  // Unisex products are listed under Men and Women.
  if (query.department) filter.department = UNISEX_DEPARTMENTS.includes(query.department) ? { $in: [query.department, 'unisex'] } : query.department;
  if (query.category) filter.category = query.category;
  if (query.subcategory) filter.subcategory = query.subcategory;
  if (query.brand) filter.brand = new RegExp(`^${escapeRegex(query.brand)}$`, 'i');
  else if (query.brands) {
    const names = query.brands
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean)
      .slice(0, 20);
    if (names.length) filter.brand = { $in: names.map((b) => new RegExp(`^${escapeRegex(b)}$`, 'i')) };
  }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {};
    if (query.minPrice !== undefined) filter.price.$gte = query.minPrice;
    if (query.maxPrice !== undefined) filter.price.$lte = query.maxPrice;
  }
  if (query.inStock === 'true') filter.stock = { $gt: 0 };
  if (query.q) {
    const words = query.q.split(/\s+/).filter(Boolean).slice(0, 6);
    // Every word must match one of the searchable fields.
    filter.$and = words.map((w) => {
      const re = new RegExp(escapeRegex(w), 'i');
      return { $or: [{ name: re }, { brand: re }, { category: re }, { subcategory: re }, { tags: re }, { color: re }, { sku: re }] };
    });
  }
  return filter;
};

const paginate = async (filter, query) => {
  const { page, limit, sort } = query;
  const [products, totalProducts] = await Promise.all([
    Product.find(filter)
      .sort(SORTS[sort] || SORTS.newest)
      .skip((page - 1) * limit)
      .limit(limit)
      .select(PUBLIC_FIELDS)
      .lean(),
    Product.countDocuments(filter),
  ]);
  return { page, limit, totalProducts, totalPages: Math.ceil(totalProducts / limit), products };
};

// Controller to list products with search, filters, sorting and pagination
exports.listProducts = async (req, res) => {
  const query = req.validatedQuery;
  const result = await paginate(buildFilter(query), query);
  res.status(200).json({ ...result, products: result.products.map(toPublic) });
};

// Active products counted by department, category and subcategory. The
// storefront adds unisex counts to both departments and hides empty menus.
exports.listCategories = async (req, res) => {
  const rows = await Product.aggregate([
    { $match: { isActive: true, category: { $nin: [null, ''] } } },
    { $group: { _id: { department: '$department', category: '$category', subcategory: '$subcategory' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  res.status(200).json({
    counts: rows.map((r) => ({
      department: r._id.department || null,
      category: r._id.category,
      subcategory: r._id.subcategory || null,
      count: r.count,
    })),
  });
};

exports.listBrands = async (req, res) => {
  const match = { isActive: true, brand: { $nin: [null, ''] } };
  if (typeof req.query.category === 'string' && /^[a-z0-9-]{1,60}$/.test(req.query.category)) match.category = req.query.category;
  const rows = await Product.aggregate([
    { $match: match },
    { $group: { _id: '$brand', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: 200 },
  ]);
  res.status(200).json({ brands: rows.map((r) => ({ name: r._id, count: r.count })) });
};

// Controller to get details of a product by its ID
exports.getProductById = async (req, res) => {
  const product = await Product.findOne({ _id: req.params.productId, isActive: true }).select(PUBLIC_FIELDS).lean();
  if (!product) throw notFound('Product not found');
  // The same item in other colours: products on sale in the same department
  // with the same brand and the same name, or the same name with the colour on
  // the end ("Samba – Black"). Men's and women's versions of a shoe share a
  // name, so the department keeps their colours apart.
  let colours = [];
  if (product.color) {
    const suffix = ` – ${product.color}`;
    const base = product.name.endsWith(suffix) ? product.name.slice(0, -suffix.length) : product.name;
    const candidates = await Product.find({
      isActive: true,
      department: product.department ?? null,
      brand: product.brand ?? null,
      color: { $nin: [null, ''] },
      $or: [{ name: base }, { name: { $regex: `^${escapeRegex(base)} – ` } }],
    })
      .select('name color category stock')
      .sort({ createdAt: 1, _id: 1 })
      .limit(40)
      .lean();
    colours = candidates.filter((c) => c.name === base || c.name === `${base} – ${c.color}`);
  }
  res.status(200).json({
    ...toPublic(product),
    colours: colours.length > 1 ? colours.map((c) => ({ _id: c._id, color: c.color, category: c.category, inStock: c.stock > 0 })) : [],
  });
};

// Home page highlights, 7 items each, in stock, one per brand and one per kind
// of item so each row is varied. "Hot & trending": the most bought in the last 30 days, topped up with
// the newest arrivals. "Specials": the biggest savings on the retail price.
const HIGHLIGHTS = 7;
const HIDDEN = { __v: 0, sku: 0, weight: 0, dimensions: 0 };
// One product per kind of item (subcategory), best first; the caller then keeps
// one per brand too, so each row mixes trainers, hoodies, perfume and so on.
const onePerKind = (sort) => [
  { $sort: sort },
  { $group: { _id: { $ifNull: ['$subcategory', '$_id'] }, doc: { $first: '$$ROOT' } } },
  { $replaceRoot: { newRoot: '$doc' } },
  { $sort: sort },
];
const brandOnce = (list, brands = new Set()) => list.filter((p) => !brands.has(p.brand) && brands.add(p.brand));

exports.highlights = async (req, res) => {
  const forSale = { isActive: true, stock: { $gt: 0 } };
  const specials = await Product.aggregate([
    { $match: { ...forSale, retailPrice: { $gt: 0 } } },
    { $addFields: { saving: { $divide: [{ $subtract: ['$retailPrice', '$price'] }, '$retailPrice'] } } },
    { $match: { saving: { $gt: 0 } } },
    ...onePerKind({ saving: -1, _id: 1 }),
    { $limit: 40 },
    { $project: { ...HIDDEN, saving: 0 } },
  ]).then((list) => brandOnce(list).slice(0, HIGHLIGHTS));
  const taken = specials.map((p) => p._id);

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const bought = await Order.aggregate([
    { $match: { 'payment.status': 'paid', createdAt: { $gte: since } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.productId', sold: { $sum: '$items.quantity' } } },
    { $sort: { sold: -1, _id: 1 } },
    { $limit: 100 },
  ]);
  const rank = new Map(bought.map((b, i) => [String(b._id), i]));
  const popular = bought.length
    ? (
        await Product.find({ ...forSale, _id: { $in: bought.map((b) => b._id), $nin: taken } })
          .select(HIDDEN)
          .lean()
      ).sort((a, b) => rank.get(String(a._id)) - rank.get(String(b._id)))
    : [];
  const brands = new Set();
  const trending = brandOnce(popular, brands).slice(0, HIGHLIGHTS);
  if (trending.length < HIGHLIGHTS) {
    const newest = await Product.aggregate([
      { $match: { ...forSale, _id: { $nin: [...taken, ...trending.map((p) => p._id)] }, brand: { $nin: [...brands] } } },
      ...onePerKind({ createdAt: -1, _id: -1 }),
      { $limit: 40 },
      { $project: HIDDEN },
    ]);
    trending.push(...brandOnce(newest, brands).slice(0, HIGHLIGHTS - trending.length));
  }
  res.set('Cache-Control', 'public, max-age=300');
  res.status(200).json({ trending: trending.map(toPublic), specials: specials.map(toPublic) });
};

exports.buildFilter = buildFilter;
exports.toPublic = toPublic;
exports.paginate = paginate;
