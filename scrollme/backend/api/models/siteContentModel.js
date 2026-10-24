const mongoose = require('mongoose');

// One home-page cover image (hero slide), edited in Admin → Home page.
const slideSchema = new mongoose.Schema(
  {
    image: { type: String, required: true },
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    cta: { type: String, required: true },
    link: { type: String, required: true },
    // Which part of the photo stays in view when it is cropped.
    focus: { type: String, enum: ['top', 'center', 'bottom'], default: 'center' },
  },
  { _id: false }
);

// Content the shop owner edits without a code change. A single document,
// _id 'home'; when it does not exist the storefront shows its starter slides.
const siteContentSchema = new mongoose.Schema(
  {
    _id: { type: String },
    heroSlides: { type: [slideSchema], default: undefined },
    heroMono: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SiteContent', siteContentSchema);
