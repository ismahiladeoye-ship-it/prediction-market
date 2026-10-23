const mongoose = require('mongoose');
const request = require('supertest');
const { createApp } = require('../../api/app');
const { resetConfig } = require('../../api/config/env');
const User = require('../../api/models/userModel');
const Product = require('../../api/models/productModel');

const STRONG_PASSWORD = 'Str0ng!Passw0rd';

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

// Returns a supertest agent that keeps cookies, already signed in.
const signedInAgent = async (app, overrides = {}) => {
  const user = await createUser(overrides);
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ username: user.username, password: STRONG_PASSWORD });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, user };
};

const createProduct = (overrides = {}) =>
  Product.create({
    name: 'Slim Fit Casual Shirt',
    description: 'A shirt',
    price: 49.99,
    category: 'shirts',
    brand: 'greenfibre',
    stock: 10,
    imageUrl: 'https://example.com/shirt.jpg',
    color: 'Blue',
    sizes: ['S', 'M', 'L'],
    ...overrides,
  });

module.exports = { useTestApp, createUser, signedInAgent, createProduct, STRONG_PASSWORD };
