const User = require('../models/userModel');
const Product = require('../models/productModel');
const { notFound } = require('../utils/httpError');

const MAX_ITEMS = 200;
const FIELDS = 'name imageUrl price color category brand stock sizes isActive';

const view = async (userId) => {
  const user = await User.findById(userId).populate({ path: 'wishlist', select: FIELDS }).lean();
  // Deleted products drop out; inactive ones are kept but flagged.
  return { items: (user?.wishlist || []).filter(Boolean) };
};

exports.getWishlist = async (req, res) => {
  res.json(await view(req.user._id));
};

exports.addToWishlist = async (req, res) => {
  const { productId } = req.body;
  if (!(await Product.exists({ _id: productId, isActive: true }))) throw notFound('Product not found');
  await User.updateOne({ _id: req.user._id, [`wishlist.${MAX_ITEMS - 1}`]: { $exists: false } }, { $addToSet: { wishlist: productId } });
  res.json(await view(req.user._id));
};

exports.removeFromWishlist = async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $pull: { wishlist: req.params.productId } });
  res.json(await view(req.user._id));
};

// Merges a guest's locally saved wishlist into the account after sign-in.
exports.mergeWishlist = async (req, res) => {
  const ids = [...new Set(req.body.productIds)].slice(0, MAX_ITEMS);
  const existing = await Product.find({ _id: { $in: ids }, isActive: true }).distinct('_id');
  if (existing.length) await User.updateOne({ _id: req.user._id }, { $addToSet: { wishlist: { $each: existing } } });
  const user = await User.findById(req.user._id).select('wishlist');
  if (user.wishlist.length > MAX_ITEMS) {
    user.wishlist = user.wishlist.slice(-MAX_ITEMS);
    await user.save();
  }
  res.json(await view(req.user._id));
};

exports.clearWishlist = async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $set: { wishlist: [] } });
  res.json({ items: [] });
};
