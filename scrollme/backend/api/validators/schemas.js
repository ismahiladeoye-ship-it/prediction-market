const mongoose = require('mongoose');
const { z } = require('zod');
const { COLLECTION_SLUGS } = require('../config/collections');

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

const sortValues = ['newest', 'price_asc', 'price_desc', 'rating', 'name'];
const productListQuery = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
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

const productFields = {
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
  imageUrl: z.string().trim().url().max(2000).optional().or(z.literal('')),
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
  page: z.coerce.number().int().min(1).default(1),
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
  pageQuery,
  idParam,
};
