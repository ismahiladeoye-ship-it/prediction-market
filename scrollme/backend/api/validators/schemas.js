const mongoose = require('mongoose');
const { z } = require('zod');
const { COLLECTION_SLUGS } = require('../config/collections');

// A missing value reads "Required" rather than zod 4's type error (applies to every schema).
z.config({ customError: (issue) => (issue.code === 'invalid_type' && issue.input === undefined ? 'Required' : undefined) });

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v) && /^[a-f\d]{24}$/i.test(v), 'Invalid id');

// bcrypt only uses the first 72 bytes, so longer passwords are rejected rather than silently truncated.
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'Password is too long (maximum 72 bytes)')
  .refine((v) => /[A-Z]/.test(v), 'Password must contain at least one uppercase letter')
  .refine((v) => /[a-z]/.test(v), 'Password must contain at least one lowercase letter')
  .refine((v) => /[0-9]/.test(v), 'Password must contain at least one number')
  .refine((v) => /[^A-Za-z0-9]/.test(v), 'Password must contain at least one special character (e.g. ! @ # $ % ^ & *)');

const name = (label) =>
  z
    .string()
    .trim()
    .min(2, `${label} must be at least 2 characters long`)
    .max(50, `${label} is too long`)
    .regex(/^[\p{L}][\p{L}' -]*$/u, `${label} may contain only letters, spaces, apostrophes and hyphens`);

const register = z.object({
  firstName: name('First name'),
  lastName: name('Last name'),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Username must be at least 3 characters long')
    .max(30, 'Username is too long')
    .regex(/^[a-z0-9._-]+$/, 'Username may contain only letters, numbers, dots, underscores and hyphens'),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address').max(254),
  password,
  confirmPassword: z.string().optional(),
});

const login = z.object({
  // The original UI signs in with a username; an email address is accepted too.
  username: z.string().trim().toLowerCase().min(1, 'Username is required').max(254),
  password: z.string().min(1, 'Password is required').max(200),
});

const forgotPassword = z.object({ email: z.string().trim().toLowerCase().email('Please enter a valid email address') });
const resetPassword = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, 'Invalid or expired reset link'), password });
const googleLogin = z.object({ idToken: z.string().min(20).max(5000) });
// A 6-digit authenticator code or a recovery code; spaces are ignored.
const mfaCode = z.object({
  code: z
    .string()
    .max(40)
    .transform((v) => v.replace(/\s+/g, ''))
    .refine((v) => v.length >= 6, 'Enter the code from your authenticator app'),
});

const sortValues = ['newest', 'price_asc', 'price_desc', 'rating', 'name'];
const productListQuery = z.object({
  // Deep pages make the database skip huge numbers of documents; nobody browses past this.
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  q: z.string().trim().max(100).optional(),
  category: z
    .string()
    .trim()
    .toLowerCase()
    .max(60)
    .regex(/^[a-z0-9-]*$/, 'Invalid category')
    .optional(),
  brand: z.string().trim().max(60).optional(),
  collection: z.enum(COLLECTION_SLUGS, { message: 'Unknown collection' }).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  inStock: z.enum(['true', 'false']).optional(),
  sort: z.enum(sortValues).default('newest'),
});

const quantity = z.coerce.number().int('Quantity must be a whole number').min(1, 'Quantity must be at least 1').max(20, 'You can buy at most 20 of one item');
const size = z.string().trim().max(20).default('');

const cartAdd = z.object({ productId: objectId, quantity: quantity.default(1), size });
const cartUpdate = z.object({ productId: objectId, quantity, size });
const cartRemove = z.object({ productId: objectId, size });

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i;

const address = z
  .object({
    fullName: z.string().trim().min(2, 'Full name is required').max(100),
    line1: z.string().trim().min(3, 'Address line 1 is required').max(200),
    line2: z.string().trim().max(200).optional().default(''),
    city: z.string().trim().min(2, 'City is required').max(100),
    state: z.string().trim().max(100).optional().default(''),
    postalCode: z
      .string()
      .trim()
      .min(3, 'Postal code is required')
      .max(12)
      .regex(/^[A-Za-z0-9 -]+$/, 'Postal code is invalid'),
    country: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, 'Country must be a 2-letter code, e.g. US'),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{7,20}$/, 'Phone number is invalid'),
  })
  // UK postcodes are checked properly and stored in capitals with single spaces.
  .transform((a) => (a.country === 'GB' ? { ...a, postalCode: a.postalCode.toUpperCase().replace(/\s+/g, ' ') } : a))
  .superRefine((a, ctx) => {
    if (a.country === 'GB' && !UK_POSTCODE.test(a.postalCode)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['postalCode'], message: 'Enter a valid UK postcode' });
    }
  });

const paymentMethod = z.enum(['apple_pay', 'google_pay', 'card', 'paypal', 'klarna'], { message: 'Choose a payment method' });

const checkout = z.object({
  shippingAddress: address,
  deliveryMethod: z.enum(['standard', 'express']).default('standard'),
  paymentMethod: paymentMethod.default('card'),
});

const resumePayment = z.object({ paymentMethod: paymentMethod.optional() });

// A product photo: an uploaded file (/api/uploads/…) or an http(s) link.
const imageRef = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (v) => /^\/api\/uploads\/[a-f0-9]{32}\.webp$/.test(v) || (/^https?:\/\//i.test(v) && URL.canParse(v)),
    'Image must be an uploaded photo or a link starting with http:// or https://'
  );

// A page on this shop, e.g. /collections/footwear or /products?q=tracksuit.
// Never another site: "//host" and "/\host" are refused because browsers
// treat them as links to another site.
const internalLink = z
  .string()
  .trim()
  .max(200)
  .regex(/^\/(?![/\\])\S*$/, 'Use a page on this shop starting with /, e.g. /collections/footwear');

// Home page cover images (hero slides).
const heroSlide = z
  .object({
    // Also used inside CSS url(), so no quotes, brackets or spaces.
    image: imageRef.refine((v) => !/["'()\\\s<>]/.test(v), 'That photo link contains characters that are not allowed'),
    title: z.string().trim().min(1, 'Add a heading').max(60, 'Keep the heading to 60 characters'),
    subtitle: z.string().trim().max(120, 'Keep the text to 120 characters').default(''),
    cta: z.string().trim().min(1, 'Add the button text').max(24, 'Keep the button text to 24 characters'),
    link: internalLink,
    focus: z.enum(['top', 'center', 'bottom']).default('center'),
  })
  .strict();
const homeContent = z
  .object({
    heroSlides: z.array(heroSlide).min(1, 'Add at least one cover image').max(6, 'Up to 6 cover images'),
    heroMono: z.boolean().default(true),
  })
  .strict();

const optionalText = (max, message) =>
  z
    .string()
    .trim()
    .max(max, message || `Keep it to ${max} characters`)
    .default('');
const socialLink = (hosts, example) =>
  z
    .string()
    .trim()
    .max(200)
    .refine((v) => {
      if (!v) return true;
      try {
        const url = new URL(v);
        return url.protocol === 'https:' && hosts.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`));
      } catch {
        return false;
      }
    }, `Paste the full link, e.g. ${example}`)
    .default('');

// Admin → Shop details.
const businessDetails = z
  .object({
    name: z.string().trim().min(1, 'Add the shop name').max(80),
    legalName: optionalText(150),
    address: optionalText(300),
    email: z.union([z.literal(''), z.string().trim().toLowerCase().email('Enter a valid email address').max(254)]).default(''),
    phone: z
      .string()
      .trim()
      .max(30)
      .regex(/^[0-9+()\-\s]*$/, 'Use digits, spaces and + ( ) - only')
      .default(''),
    companyNumber: z
      .string()
      .trim()
      .toUpperCase()
      .max(12)
      .regex(/^[A-Z0-9]*$/, 'Letters and numbers only, e.g. 12345678')
      .default(''),
    vatNumber: z
      .string()
      .trim()
      .toUpperCase()
      .max(16)
      .regex(/^[A-Z0-9 ]*$/, 'Letters and numbers only, e.g. GB123456789')
      .default(''),
    deliveryEstimate: z.string().trim().min(1, 'Add how long delivery takes').max(60).default('3–5 working days'),
    returnPostage: z.enum(['customer', 'free']).default('customer'),
    socials: z
      .object({
        instagram: socialLink(['instagram.com'], 'https://www.instagram.com/yourshop'),
        tiktok: socialLink(['tiktok.com'], 'https://www.tiktok.com/@yourshop'),
        whatsapp: socialLink(['wa.me', 'whatsapp.com'], 'https://wa.me/447700900000'),
      })
      .strict()
      .default({}),
  })
  .strict();

// Contact page: a question, or a sourcing request for a specific item.
const contactMessage = z
  .object({
    kind: z.enum(['general', 'sourcing']).default('general'),
    name: z.string().trim().min(1, 'Add your name').max(100),
    email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
    phone: z
      .string()
      .trim()
      .max(30)
      .regex(/^[0-9+()\-\s]*$/, 'Use digits, spaces and + ( ) - only')
      .default(''),
    orderNumber: z
      .string()
      .trim()
      .toUpperCase()
      .max(40)
      .regex(/^[A-Z0-9-]*$/, 'Order numbers look like GIS-…')
      .default(''),
    item: optionalText(200),
    size: optionalText(40),
    budget: optionalText(40),
    message: z.string().trim().min(10, 'Tell us a little more (at least 10 characters)').max(5000, 'Keep it to 5,000 characters'),
    // Hidden field that people never fill in; bots often do.
    website: z.string().max(200).default(''),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.kind === 'sourcing' && !v.item) ctx.addIssue({ code: 'custom', path: ['item'], message: 'Tell us which item you are looking for' });
  });
const messageStatus = z.object({ status: z.enum(['new', 'replied', 'closed']) }).strict();
const messageListQuery = z.object({
  status: z.enum(['new', 'replied', 'closed', 'all']).default('new'),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const sku = z
  .string()
  .trim()
  .min(1, 'SKU is required')
  .max(64, 'SKU is too long')
  .regex(/^[A-Za-z0-9._/-]+$/, 'SKU may contain only letters, numbers, dots, dashes, slashes and underscores');

const productFields = {
  sku: sku.optional(),
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional(),
  price: z.coerce.number().min(0).max(1000000),
  discounted_price: z.coerce.number().min(0).max(1000000).optional(),
  category: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, 'Category must be a slug, e.g. t-shirts')
    .max(60),
  stock: z.coerce.number().int().min(0).max(1000000),
  imageUrl: imageRef.optional().or(z.literal('')),
  images: z.array(imageRef).max(12, 'Up to 12 photos per product').optional(),
  brand: z.string().trim().max(60).optional(),
  material: z.string().trim().max(60).optional(),
  color: z.string().trim().max(40).optional(),
  sizes: z.array(z.string().trim().min(1).max(20)).max(30).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  weight: z.coerce.number().min(0).optional(),
  isActive: z.boolean().optional(),
};
const productCreate = z.object(productFields).strict();
const productUpdate = z.object(productFields).partial().strict();

const orderStatusUpdate = z.object({
  status: z.enum(['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
  note: z.string().trim().max(500).optional(),
  trackingNumber: z.string().trim().max(100).optional(),
});

const pageQuery = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).optional(),
  q: z.string().trim().max(100).optional(),
});

const idParam = (key) => z.object({ [key]: objectId });

module.exports = {
  objectId,
  password,
  register,
  login,
  forgotPassword,
  resetPassword,
  googleLogin,
  mfaCode,
  productListQuery,
  cartAdd,
  cartUpdate,
  cartRemove,
  checkout,
  paymentMethod,
  resumePayment,
  productCreate,
  productUpdate,
  orderStatusUpdate,
  homeContent,
  businessDetails,
  contactMessage,
  messageStatus,
  messageListQuery,
  pageQuery,
  idParam,
};
