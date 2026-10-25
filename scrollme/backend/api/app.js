const crypto = require('node:crypto');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { getConfig } = require('./config/env');
const requestLogger = require('./middleware/requestLogger');
const { apiLimiter } = require('./middleware/rateLimit');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { asyncHandler } = require('./utils/httpError');
const paymentController = require('./controllers/paymentController');
const { releaseExpiredOrders } = require('./services/orders');
const authRoutes = require('./routes/authRoute');
const cartRoute = require('./routes/cartRoute');
const productRoute = require('./routes/productRoute');
const wishlistRoute = require('./routes/wishlistRoute');
const orderRoute = require('./routes/orderRoute');
const paymentRoute = require('./routes/paymentRoute');
const adminRoute = require('./routes/adminRoute');
const newsletterRoute = require('./routes/newsletterRoute');
const siteRoute = require('./routes/siteRoute');
const contactRoute = require('./routes/contactRoute');

// Operator injection ({ "$ne": null }) is prevented by validating every request
// body/query with zod into plain strings and numbers before it reaches a query.
mongoose.set('strictQuery', true);

const createApp = () => {
  const config = getConfig();
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(requestLogger);
  app.use(
    helmet({
      // JSON API: lock everything down; the SPA is served (with its own CSP) by nginx.
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'same-site' },
    })
  );
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || config.clientOrigins.includes(origin)),
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
      credentials: true,
    })
  );

  // API responses are per-visitor: never store them in browser or CDN caches.
  // Uploaded photos (below) are the exception: they are cached for a year.
  app.use('/api', (req, res, next) => {
    if (!req.path.startsWith('/uploads/')) res.set('Cache-Control', 'no-store');
    next();
  });

  // Health checks: liveness and readiness (database reachable).
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.get(
    '/api/ready',
    asyncHandler(async (req, res) => {
      if (mongoose.connection.readyState !== 1) return res.status(503).json({ status: 'unavailable', db: 'disconnected' });
      await mongoose.connection.db.admin().ping();
      res.json({ status: 'ok', db: 'connected' });
    })
  );

  // Daily backstop for serverless hosting, called by Vercel Cron with
  // "Authorization: Bearer <CRON_SECRET>": returns stock held by unpaid orders
  // whose time ran out. Disabled unless CRON_SECRET is set.
  app.get(
    '/api/cron/release-expired',
    asyncHandler(async (req, res) => {
      const secret = config.CRON_SECRET;
      const given = Buffer.from(req.get('authorization') || '');
      const expected = Buffer.from(`Bearer ${secret}`);
      if (!secret || given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
        return res.status(404).json({ message: 'Not found' });
      }
      res.json({ released: await releaseExpiredOrders() });
    })
  );

  // Uploaded product photos: random names, re-encoded WebP, never change.
  // Served before the rate limiter because a product grid loads many at once.
  app.use(
    '/api/uploads',
    express.static(config.UPLOAD_DIR, { index: false, dotfiles: 'deny', immutable: true, maxAge: '365d', fallthrough: false }),
    (err, req, res, next) => (err?.status >= 400 && err.status < 500 ? res.status(err.status).json({ message: 'Not found' }) : next(err))
  );

  // Stripe webhook must receive the raw body, so it is registered before express.json().
  app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json', limit: '1mb' }), asyncHandler(paymentController.stripeWebhook));

  app.use('/api', apiLimiter);
  // Spreadsheet uploads are larger than any other request body.
  app.use('/api/admin/products/import', express.json({ limit: '2mb' }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // CSRF defence in depth (cookies are also SameSite): state-changing requests
  // must come from an allowed origin and, with a body, be JSON, which a
  // cross-site HTML form cannot send. Browsers always send Origin on such requests.
  const allowedOrigins = new Set([...config.clientOrigins, new URL(config.APP_URL).origin]);
  app.use('/api', (req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
    const origin = req.get('origin');
    if (origin && !allowedOrigins.has(origin)) {
      return res.status(403).json({ message: 'Cross-site request blocked' });
    }
    const hasBody = Number(req.headers['content-length'] || 0) > 0 || req.headers['transfer-encoding'] !== undefined;
    // The only non-JSON write: photo uploads (admin-only, Origin-checked above).
    const isPhotoUpload = req.path === '/admin/uploads' && req.is('multipart/form-data');
    if (hasBody && !req.is('application/json') && !isPhotoUpload) {
      return res.status(415).json({ message: 'Content-Type must be application/json' });
    }
    next();
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/product', productRoute);
  app.use('/api/cart', cartRoute);
  app.use('/api/wishlist', wishlistRoute);
  app.use('/api/orders', orderRoute);
  app.use('/api/payments', paymentRoute);
  app.use('/api/admin', adminRoute);
  app.use('/api/newsletter', newsletterRoute);
  app.use('/api/site', siteRoute);
  app.use('/api/contact', contactRoute);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};

module.exports = { createApp };
