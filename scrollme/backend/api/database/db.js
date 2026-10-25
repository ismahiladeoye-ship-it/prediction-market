const mongoose = require('mongoose');
const logger = require('../utils/logger');

mongoose.connection.on('disconnected', () => logger.warn('mongodb_disconnected'));
mongoose.connection.on('reconnected', () => logger.info('mongodb_reconnected'));

const connectDb = async (uri) => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, socketTimeoutMS: 30000 });
  logger.info('mongodb_connected', { host: mongoose.connection.host, db: mongoose.connection.name });
  // Build declared indexes (no-op when they already exist).
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes().catch((err) => logger.warn('index_sync_failed', { model: m.modelName, err }))));
};

const disconnectDb = () => mongoose.disconnect();

module.exports = { connectDb, disconnectDb };
