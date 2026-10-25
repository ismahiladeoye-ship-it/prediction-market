// Entry point for serverless hosting (Vercel). Each instance creates the app
// and the database connection once and reuses them. Serverless functions
// cannot keep a timer running between requests, so the stock sweeper that
// server.js runs every minute runs here as requests arrive (at most once a
// minute per instance), with a daily cron (/api/cron/release-expired) as a backstop.
const { getConfig } = require('./config/env');
const { createApp } = require('./app');
const { connectDb } = require('./database/db');
const { releaseExpiredOrders } = require('./services/orders');
const logger = require('./utils/logger');

const SWEEP_EVERY_MS = 60 * 1000;
let app;
let ready;
let lastSweep = 0;
let warned = false;

const unavailable = (res, message = 'The shop is temporarily unavailable. Please try again in a minute.') => {
  res.statusCode = 503;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ message }));
};

// Vercel's request helpers (on unless the project sets NODEJS_HELPERS=0) read
// the request body before Express can, so every sign-in, form and Stripe
// webhook would fail. They add res.json, which a plain Node response lacks.
const vercelHelpersOn = (res) => Object.hasOwn(res, 'json');

const handler = async (req, res) => {
  try {
    const config = getConfig();
    if (!ready) {
      ready = connectDb(config.MONGODB_URI).catch((err) => {
        ready = null;
        throw err;
      });
    }
    await ready;
    app = app || createApp();
  } catch (err) {
    // Bad settings or the database is unreachable: log why, tell the visitor little.
    logger.error('startup_failed', { err });
    return unavailable(res);
  }

  // Fail loudly, so the missing setting is noticed on the first visit rather than at checkout.
  if (vercelHelpersOn(res)) {
    if (!warned) {
      warned = true;
      logger.error('nodejs_helpers_enabled', { fix: 'Set the environment variable NODEJS_HELPERS=0 in the Vercel project and redeploy' });
    }
    return unavailable(res, 'Setup needed: add the environment variable NODEJS_HELPERS=0 in Vercel, then redeploy (see docs/VERCEL.md).');
  }

  if (Date.now() - lastSweep > SWEEP_EVERY_MS) {
    lastSweep = Date.now();
    await releaseExpiredOrders().catch((err) => logger.error('reservation_sweep_failed', { err }));
  }
  return app(req, res);
};

module.exports = handler;
