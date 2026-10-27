const mongoose = require('mongoose');
const request = require('supertest');
const { createApp } = require('../../api/app');
const { resetConfig } = require('../../api/config/env');
const User = require('../../api/models/userModel');
const Product = require('../../api/models/productModel');
const { encrypt, totp } = require('../../api/services/mfa');

const STRONG_PASSWORD = 'Str0ng!Passw0rd';
// Authenticator key given to test admins (admin features need two-factor).
const TEST_MFA_SECRET = 'KRSXG5CTMVRXEZLUKRSXG5CTMVRXEZLU';
const isAdminRole = (roles = []) => roles.some((r) => r === 'admin' || r === 'super_admin');

// Connects to this file's database and returns helpers bound to a fresh app.
const useTestApp = () => {
  const ctx = {};
  beforeAll(async () => {
    resetConfig();
    await mongoose.connect(process.env.MONGODB_URI);
    await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
    ctx.app = createApp();
  });
  afterEach(async () => {
    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
  });
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  return ctx;
};

let counter = 0;
const createUser = async (overrides = {}) => {
  counter += 1;
  return User.create({
    firstName: 'Test',
    lastName: 'User',
    username: `user${counter}`,
    email: `user${counter}@example.com`,
    password: STRONG_PASSWORD,
    ...overrides,
  });
};

// Returns a supertest agent that keeps cookies, already signed in. Admins get
// two-factor set up and pass the code step, as in production.
const signedInAgent = async (app, overrides = {}) => {
  const withMfa = isAdminRole(overrides.roles) && overrides.mfa === undefined;
  const user = await createUser(withMfa ? { ...overrides, mfa: { enabled: true, secret: encrypt(TEST_MFA_SECRET), recoveryCodes: [] } } : overrides);
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ username: user.username, password: STRONG_PASSWORD });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  if (res.body.mfaRequired) {
    const verified = await agent.post('/api/auth/mfa/verify').send({ code: totp(TEST_MFA_SECRET).generate() });
    if (verified.status !== 200) throw new Error(`two-factor failed: ${verified.status} ${JSON.stringify(verified.body)}`);
  }
  return { agent, user };
};

const createProduct = (overrides = {}) =>
  Product.create({
    name: 'Slim Fit Casual Shirt',
    description: 'A shirt',
    price: 49.99,
    department: 'men',
    category: 'clothing',
    subcategory: 'shirts',
    brand: 'greenfibre',
    stock: 10,
    imageUrl: 'https://example.com/shirt.jpg',
    color: 'Blue',
    sizes: ['S', 'M', 'L'],
    ...overrides,
  });

// Code emails are sent after the response; waits for one (to `to`, if given)
// and returns its 6-digit code.
const emailedCode = async (mailSpy, to) => {
  for (let i = 0; i < 100; i += 1) {
    const call = [...mailSpy.mock.calls].reverse().find(([m]) => !to || m.to === to);
    if (call) return call[0].subject.match(/\d{6}/)[0];
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error('No code email was sent');
};

module.exports = { useTestApp, createUser, signedInAgent, createProduct, emailedCode, STRONG_PASSWORD, TEST_MFA_SECRET };
