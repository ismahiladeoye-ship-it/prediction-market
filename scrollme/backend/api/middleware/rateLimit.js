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
const checkoutLimiter = make({ windowMs: 10 * 60 * 1000, limit: 30 });
const apiLimiter = make({ windowMs: 60 * 1000, limit: 300 });

module.exports = { authLimiter, checkoutLimiter, apiLimiter };
