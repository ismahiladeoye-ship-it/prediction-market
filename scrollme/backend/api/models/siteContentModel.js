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

// The business behind the shop, edited in Admin → Shop details. Shown in the
// footer, the legal pages and emails (UK law requires the trader's name,
// geographic address and email to be easy to find).
const businessSchema = new mongoose.Schema(
  {
    name: String,
    legalName: String,
    address: String,
    email: String,
    phone: String,
    companyNumber: String,
    vatNumber: String,
    deliveryEstimate: String,
    returnPostage: { type: String, enum: ['customer', 'free'] },
    socials: { instagram: String, tiktok: String, whatsapp: String },
  },
  { _id: false }
);

// Content the shop owner edits without a code change, one document each:
// _id 'home' (cover images; when missing the storefront shows its starter
// slides) or 'business' (shop details).
const siteContentSchema = new mongoose.Schema(
  {
    _id: { type: String },
    heroSlides: { type: [slideSchema], default: undefined },
    heroMono: { type: Boolean, default: true },
    business: businessSchema,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SiteContent', siteContentSchema);
