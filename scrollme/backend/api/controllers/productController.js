const Product = require('../models/productModel');
const { notFound } = require('../utils/httpError');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  price_asc: { price: 1, _id: 1 },
  price_desc: { price: -1, _id: -1 },
  rating: { 'ratings.averageRating': -1, 'ratings.numberOfReviews': -1, _id: 1 },
  name: { name: 1, _id: 1 },
};

const PUBLIC_FIELDS = '-__v';

// Builds the Mongo filter for the public catalogue (and the admin list).
const buildFilter = (query, { includeInactive = false } = {}) => {
  const filter = includeInactive ? {} : { isActive: true };
  if (query.category) filter.category = query.category;
  if (query.brand) filter.brand = new RegExp(`^${escapeRegex(query.brand)}$`, 'i');
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
      return { $or: [{ name: re }, { brand: re }, { category: re }, { tags: re }, { color: re }] };
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
  res.status(200).json(await paginate(buildFilter(query), query));
};

// Distinct categories of active products with counts, most popular first.
exports.listCategories = async (req, res) => {
  const rows = await Product.aggregate([
    { $match: { isActive: true, category: { $nin: [null, ''] } } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);
  res.status(200).json({ categories: rows.map((r) => ({ slug: r._id, count: r.count })) });
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
  res.status(200).json(product);
};

exports.buildFilter = buildFilter;
exports.paginate = paginate;
