const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const base = process.env.TEST_MONGODB_URI || fs.readFileSync(path.join(os.tmpdir(), 'scrollme-test-mongo-uri'), 'utf8');
// One database per test file so files cannot interfere with each other.
const dbName = `scrollme_test_${path.basename(expect.getState().testPath || 'x', '.test.js').replace(/\W/g, '_')}_${process.pid}`;
const url = new URL(base);
url.pathname = `/${dbName}`;

Object.assign(process.env, {
  NODE_ENV: 'test',
  MONGODB_URI: url.toString(),
  JWT_SECRET: 'test-access-secret',
  REFRESH_TOKEN_SECRET: 'test-refresh-secret',
  BCRYPT_ROUNDS: '4',
  RATE_LIMIT_ENABLED: 'false',
  PAYMENT_PROVIDER: 'mock',
  APP_URL: 'http://localhost:3000',
  CLIENT_ORIGINS: 'http://localhost:3000',
  TAX_RATE: '0.1',
  SHIPPING_STANDARD: '20',
  SHIPPING_EXPRESS: '40',
  FREE_SHIPPING_THRESHOLD: '0',
  LOG_LEVEL: 'silent',
});
