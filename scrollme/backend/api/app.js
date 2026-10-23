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
const authRoutes = require('./routes/authRoute');
const cartRoute = require('./routes/cartRoute');
const productRoute = require('./routes/productRoute');
const wishlistRoute = require('./routes/wishlistRoute');
const orderRoute = require('./routes/orderRoute');
const paymentRoute = require('./routes/paymentRoute');
const adminRoute = require('./routes/adminRoute');

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

  // Stripe webhook must receive the raw body, so it is registered before express.json().
  app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json', limit: '1mb' }), asyncHandler(paymentController.stripeWebhook));

  app.use('/api', apiLimiter);
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // CSRF defence in depth (cookies are also SameSite): state-changing requests
  // must be JSON, which a cross-site HTML form cannot send.
  app.use('/api', (req, res, next) => {
    const hasBody = Number(req.headers['content-length'] || 0) > 0 || req.headers['transfer-encoding'] !== undefined;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && hasBody && !req.is('application/json')) {
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

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};

module.exports = { createApp };
