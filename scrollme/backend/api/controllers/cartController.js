const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const { unitPriceCents, computeTotals, totalsToJSON, deliveryOptions } = require('../services/pricing');
const { fromCents } = require('../utils/money');
const { badRequest, notFound, conflict } = require('../utils/httpError');

const sameLine = (item, productId, size) => item.productId.toString() === productId.toString() && (item.size || '') === (size || '');

const checkSize = (product, size) => {
  if (product.sizes?.length) {
    if (!size) throw badRequest('Please choose a size');
    if (!product.sizes.includes(size)) throw badRequest(`Size ${size} is not available for this product`);
    return size;
  }
  return '';
};

// Joins the stored cart with live product data. Prices always come from the
// product document, never from the client or from what was stored earlier.
const buildCartView = async (cart, deliveryMethod = 'standard') => {
  const items = cart?.items || [];
  const products = await Product.find({ _id: { $in: items.map((i) => i.productId) } }).lean();
  const byId = new Map(products.map((p) => [p._id.toString(), p]));

  const lines = [];
  const issues = [];
  for (const item of items) {
    const product = byId.get(item.productId.toString());
    if (!product || !product.isActive) {
      issues.push({ productId: item.productId, size: item.size, message: 'This product is no longer available' });
      continue;
    }
    const unit = unitPriceCents(product);
    const line = {
      productId: product._id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      imageUrl: product.imageUrl,
      // `image` and `price` keep the field names used by the original frontend.
      image: product.imageUrl,
      size: item.size || '',
      quantity: item.quantity,
      stock: product.stock,
      unitPriceCents: unit,
      price: fromCents(unit),
      lineTotal: fromCents(unit * item.quantity),
    };
    if (product.stock < item.quantity) {
      issues.push({
        productId: product._id,
        size: line.size,
        message: product.stock === 0 ? `${product.name} is out of stock` : `Only ${product.stock} of ${product.name} left in stock`,
      });
    }
    lines.push(line);
  }
  const totals = computeTotals(lines, deliveryMethod);
  return {
    items: lines.map(({ unitPriceCents: _u, ...rest }) => rest),
    totalQuantity: lines.reduce((n, l) => n + l.quantity, 0),
    summary: totalsToJSON(totals),
    deliveryMethod,
    deliveryOptions: deliveryOptions(totals.subtotalCents),
    issues,
    lines, // internal, removed before sending
  };
};

const send = async (res, cart, status = 200, message, deliveryMethod) => {
  const { lines: _lines, ...view } = await buildCartView(cart, deliveryMethod);
  res.status(status).json(message ? { message, ...view } : view);
};

const getOrCreateCart = async (userId) => (await Cart.findOne({ userId })) || new Cart({ userId, items: [] });

exports.viewCart = async (req, res) => {
  const delivery = req.query.delivery === 'express' ? 'express' : 'standard';
  const cart = await Cart.findOne({ userId: req.user._id });
  await send(res, cart, 200, undefined, delivery);
};

// Add item to cart
exports.addToCart = async (req, res) => {
  const { productId, quantity } = req.body;
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) throw notFound('Product not found');
  const size = checkSize(product, req.body.size);

  const cart = await getOrCreateCart(req.user._id);
  const existing = cart.items.find((i) => sameLine(i, productId, size));
  const newQty = (existing?.quantity || 0) + quantity;
  if (newQty > 20) throw badRequest('You can buy at most 20 of one item');
  if (newQty > product.stock) {
    throw conflict(product.stock === 0 ? 'This product is out of stock' : `Only ${product.stock} left in stock`);
  }
  if (existing) existing.quantity = newQty;
  else cart.items.push({ productId, size, quantity });
  await cart.save();
  await send(res, cart, 200, 'Item added to cart');
};

// Update cart item quantity
exports.updateCartItem = async (req, res) => {
  const { productId, quantity, size } = req.body;
  const cart = await Cart.findOne({ userId: req.user._id });
  const item = cart?.items.find((i) => sameLine(i, productId, size));
  if (!item) throw notFound('Item not found in cart');
  const product = await Product.findById(productId).lean();
  if (product && quantity > product.stock) {
    throw conflict(product.stock === 0 ? 'This product is out of stock' : `Only ${product.stock} left in stock`);
  }
  item.quantity = quantity;
  await cart.save();
  await send(res, cart, 200, 'Cart item updated');
};

// Delete item from cart
exports.deleteCartItem = async (req, res) => {
  const { productId, size } = req.body;
  const cart = await Cart.findOne({ userId: req.user._id });
  const index = cart ? cart.items.findIndex((i) => sameLine(i, productId, size)) : -1;
  if (index === -1) throw notFound('Item not found in cart');
  cart.items.splice(index, 1);
  await cart.save();
  await send(res, cart, 200, 'Item removed from cart');
};

// Clear entire cart
exports.clearCart = async (req, res) => {
  await Cart.updateOne({ userId: req.user._id }, { $set: { items: [] } });
  await send(res, null, 200, 'Cart cleared');
};

exports.buildCartView = buildCartView;
