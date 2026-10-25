const SiteContent = require('../models/siteContentModel');
const { getConfig } = require('../config/env');
const { fromCents, toCents } = require('../utils/money');

const BUSINESS = 'business';

// Used until the owner fills in Admin → Shop details.
const DEFAULTS = {
  name: 'Get It Sourced',
  legalName: '',
  address: '',
  email: '',
  phone: '',
  companyNumber: '',
  vatNumber: '',
  deliveryEstimate: '3–5 working days',
  returnPostage: 'customer',
  socials: { instagram: '', tiktok: '', whatsapp: '' },
};

const withDefaults = (business) => ({
  ...DEFAULTS,
  ...Object.fromEntries(Object.entries(business || {}).filter(([, v]) => v !== undefined && v !== null)),
  socials: { ...DEFAULTS.socials, ...(business?.socials || {}) },
});

const getShopDetails = async () => {
  const doc = await SiteContent.findById(BUSINESS).lean();
  return { ...withDefaults(doc?.business), configured: Boolean(doc?.business), updatedAt: doc?.updatedAt || null };
};

const saveShopDetails = async (business, userId) => {
  const doc = await SiteContent.findByIdAndUpdate(BUSINESS, { $set: { business, updatedBy: userId } }, { new: true, upsert: true, runValidators: true }).lean();
  return { ...withDefaults(doc.business), configured: true, updatedAt: doc.updatedAt };
};

// Delivery terms come from the API settings, so the Delivery page always matches checkout.
const deliveryTerms = () => {
  const config = getConfig();
  return {
    currency: config.CURRENCY,
    standard: fromCents(toCents(config.SHIPPING_STANDARD)),
    express: config.SHIPPING_EXPRESS === undefined ? null : fromCents(toCents(config.SHIPPING_EXPRESS)),
    freeOver: config.FREE_SHIPPING_THRESHOLD > 0 ? fromCents(toCents(config.FREE_SHIPPING_THRESHOLD)) : null,
    countries: config.shipToCountries,
  };
};

// Where owner alerts (new orders, contact messages) go.
const notifyAddress = async () => getConfig().NOTIFY_EMAIL || (await getShopDetails()).email || null;

module.exports = { getShopDetails, saveShopDetails, deliveryTerms, notifyAddress, DEFAULTS };
