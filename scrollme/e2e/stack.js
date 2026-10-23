// Boots a throwaway full stack for the browser tests:
// in-memory MongoDB + seeded catalogue/users + API + production build.
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const BACKEND = path.resolve(__dirname, '../backend');
const BUILD = path.resolve(__dirname, '../build');
const WEB_PORT = Number(process.env.E2E_WEB_PORT || 3100);
const API_PORT = Number(process.env.E2E_API_PORT || 8090);

(async () => {
  if (!fs.existsSync(path.join(BUILD, 'index.html'))) throw new Error('Run "npm run build" in scrollme/ first');
  const { MongoMemoryServer } = require(path.join(BACKEND, 'node_modules/mongodb-memory-server'));
  const mongod = process.env.E2E_MONGODB_URI ? null : await MongoMemoryServer.create();
  const uri = process.env.E2E_MONGODB_URI || mongod.getUri('scrollme_e2e');

  Object.assign(process.env, {
    NODE_ENV: 'development',
    MONGODB_URI: uri,
    JWT_SECRET: 'e2e-access-secret',
    REFRESH_TOKEN_SECRET: 'e2e-refresh-secret',
    BCRYPT_ROUNDS: '4',
    CLIENT_ORIGINS: `http://localhost:${WEB_PORT}`,
    APP_URL: `http://localhost:${WEB_PORT}`,
    PAYMENT_PROVIDER: 'mock',
    RATE_LIMIT_ENABLED: 'false',
    TAX_RATE: '0.1',
    LOG_LEVEL: 'warn',
    UPLOAD_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'scrollme-e2e-uploads-')),
  });

  const mongoose = require(path.join(BACKEND, 'node_modules/mongoose'));
  const { connectDb } = require(path.join(BACKEND, 'api/database/db'));
  const seedProducts = require(path.join(BACKEND, 'scripts/products/seedProducts'));
  const seedUsers = require(path.join(BACKEND, 'scripts/users/seedUsers'));
  const { createApp } = require(path.join(BACKEND, 'api/app'));

  await connectDb(uri);
  await mongoose.connection.db.dropDatabase();
  await seedProducts({ reset: true, limit: 400 });
  await seedUsers({ reset: true });

  createApp().listen(API_PORT, () => console.log(`API on ${API_PORT}`));
  require('./static-server')(BUILD, API_PORT).listen(WEB_PORT, () => console.log(`Storefront on http://localhost:${WEB_PORT}`));

  const stop = async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
    process.exit(0);
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
