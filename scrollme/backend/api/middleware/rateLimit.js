const rateLimit = require('express-rate-limit');
const { getConfig } = require('../config/env');

const make = (options) =>
  rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later.' },
    // Read per request so tests and operators can switch limiting off via config.
    skip: () => !getConfig().RATE_LIMIT_ENABLED,
    ...options,
  });

// Brute-force protection for credential endpoints.
const authLimiter = make({ windowMs: 15 * 60 * 1000, limit: 20, skipSuccessfulRequests: true });
// Per account, so password guessing spread over many IPs is throttled too.
const loginAccountLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `login:${String(req.body?.username || '').toLowerCase()}`,
});
// Two-factor codes: 5 wrong tries per account per 15 minutes.
const mfaAccountLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `mfa:${req.mfaUser?._id}`,
});
const checkoutLimiter = make({ windowMs: 10 * 60 * 1000, limit: 30 });
const apiLimiter = make({ windowMs: 60 * 1000, limit: 300 });

module.exports = { authLimiter, loginAccountLimiter, mfaAccountLimiter, checkoutLimiter, apiLimiter };
