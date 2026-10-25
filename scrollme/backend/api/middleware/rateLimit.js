const rateLimit = require('express-rate-limit');
const { getConfig } = require('../config/env');
const { MongoStore } = require('./rateLimitStore');

// `shared` limiters guard sign-in, codes, emails and orders: their counts live
// in the database so they hold across every running copy of the API.
const make = ({ shared, ...options }) =>
  rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later.' },
    // Read per request so tests and operators can switch limiting off via config.
    skip: () => !getConfig().RATE_LIMIT_ENABLED,
    ...(shared ? { store: new MongoStore(shared) } : {}),
    ...options,
  });

// Brute-force protection for credential endpoints.
const authLimiter = make({ shared: 'auth', windowMs: 15 * 60 * 1000, limit: 20, skipSuccessfulRequests: true });
// Per account, so password guessing spread over many IPs is throttled too.
const loginAccountLimiter = make({
  shared: 'login',
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => String(req.body?.username || '').toLowerCase(),
});
// Two-factor codes: 5 wrong tries per account per 15 minutes.
const mfaAccountLimiter = make({
  shared: 'mfa',
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => String(req.mfaUser?._id),
});
// Sign-ups count whether or not they succeed: each account can hold stock in
// unpaid orders, so unlimited accounts would get round that limit.
const registerLimiter = make({ shared: 'register', windowMs: 60 * 60 * 1000, limit: 10 });
// Password-reset emails always "succeed" (the reply never says whether the
// address has an account), so every request counts: per IP, and per address
// so nobody can flood one person's inbox from many IPs.
const passwordResetLimiter = make({ shared: 'reset-ip', windowMs: 60 * 60 * 1000, limit: 10 });
const passwordResetEmailLimiter = make({
  shared: 'reset-email',
  windowMs: 60 * 60 * 1000,
  limit: 3,
  keyGenerator: (req) => String(req.body?.email || '').toLowerCase(),
});
const checkoutLimiter = make({ shared: 'checkout', windowMs: 10 * 60 * 1000, limit: 30 });
// General flood guard on every API request; kept in memory (no database write per request).
const apiLimiter = make({ windowMs: 60 * 1000, limit: 300 });
// Contact form: 5 messages an hour from one address.
const contactLimiter = make({ shared: 'contact', windowMs: 60 * 60 * 1000, limit: 5 });

module.exports = {
  authLimiter,
  loginAccountLimiter,
  mfaAccountLimiter,
  registerLimiter,
  passwordResetLimiter,
  passwordResetEmailLimiter,
  checkoutLimiter,
  apiLimiter,
  contactLimiter,
};
