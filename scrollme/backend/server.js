require('dotenv').config();
const { getConfig } = require('./api/config/env');
const logger = require('./api/utils/logger');

let config;
try {
  config = getConfig();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const { createApp } = require('./api/app');
const { connectDb, disconnectDb } = require('./api/database/db');
const { releaseExpiredOrders } = require('./api/services/orders');

const start = async () => {
  await connectDb(config.MONGODB_URI);
  const app = createApp();
  const server = app.listen(config.PORT, () => {
    logger.info('server_started', { port: config.PORT, env: config.NODE_ENV, paymentProvider: config.PAYMENT_PROVIDER });
  });

  // Return stock held by abandoned checkouts.
  const sweeper = setInterval(() => releaseExpiredOrders().catch((err) => logger.error('reservation_sweep_failed', { err })), 60 * 1000);

  const shutdown = (signal) => {
    logger.info('shutdown', { signal });
    clearInterval(sweeper);
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

start().catch((err) => {
  logger.error('startup_failed', { err });
  process.exit(1);
});
