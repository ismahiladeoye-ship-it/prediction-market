const SiteContent = require('../models/siteContentModel');
const logger = require('../utils/logger');

const HOME = 'home';

const homeResponse = (doc) => ({
  // null means "not customised": the storefront shows its starter slides.
  heroSlides: doc?.heroSlides?.length ? doc.heroSlides : null,
  heroMono: typeof doc?.heroMono === 'boolean' ? doc.heroMono : null,
  updatedAt: doc?.updatedAt || null,
});

// Public: the home page's cover images.
exports.getHome = async (req, res) => {
  res.json(homeResponse(await SiteContent.findById(HOME).lean()));
};

// Admin: replace the cover images (the whole list, in display order).
exports.updateHome = async (req, res) => {
  const doc = await SiteContent.findByIdAndUpdate(
    HOME,
    { $set: { heroSlides: req.body.heroSlides, heroMono: req.body.heroMono, updatedBy: req.user._id } },
    { new: true, upsert: true, runValidators: true }
  ).lean();
  logger.info('admin_action', { action: 'home_update', adminId: String(req.user._id), slides: doc.heroSlides.length });
  res.json({ message: 'Home page updated', ...homeResponse(doc) });
};

// Admin: go back to the starter cover images.
exports.resetHome = async (req, res) => {
  await SiteContent.deleteOne({ _id: HOME });
  logger.info('admin_action', { action: 'home_reset', adminId: String(req.user._id) });
  res.json({ message: 'Starter cover images restored', ...homeResponse(null) });
};
