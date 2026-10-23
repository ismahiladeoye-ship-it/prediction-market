const { loadConfig } = require('../api/config/env');

const base = { MONGODB_URI: 'mongodb://x/y', JWT_SECRET: 'a', REFRESH_TOKEN_SECRET: 'b' };
const strong = (c) => c.repeat(40);

describe('configuration', () => {
  it('fails fast when required variables are missing', () => {
    expect(() => loadConfig({})).toThrow(/MONGODB_URI/);
  });

  it('rejects weak or shared secrets in production', () => {
    expect(() => loadConfig({ ...base, NODE_ENV: 'production', JWT_SECRET: 'someone', REFRESH_TOKEN_SECRET: strong('r') })).toThrow(/JWT_SECRET/);
    expect(() => loadConfig({ ...base, NODE_ENV: 'production', JWT_SECRET: strong('a'), REFRESH_TOKEN_SECRET: strong('a') })).toThrow(/must differ/);
  });

  it('refuses the mock payment provider in production', () => {
    expect(() => loadConfig({ ...base, NODE_ENV: 'production', JWT_SECRET: strong('a'), REFRESH_TOKEN_SECRET: strong('b'), PAYMENT_PROVIDER: 'mock' })).toThrow(
      /mock/
    );
  });

  it('refuses live Stripe keys unless explicitly allowed', () => {
    expect(() => loadConfig({ ...base, STRIPE_SECRET_KEY: 'sk_live_123' })).toThrow(/live key/);
    expect(loadConfig({ ...base, STRIPE_SECRET_KEY: 'sk_live_123', STRIPE_ALLOW_LIVE: 'true' }).STRIPE_ALLOW_LIVE).toBe(true);
    expect(loadConfig({ ...base, STRIPE_SECRET_KEY: 'sk_test_123' }).STRIPE_SECRET_KEY).toBe('sk_test_123');
  });

  it('uses secure cookies by default in production', () => {
    const c = loadConfig({ ...base, NODE_ENV: 'production', JWT_SECRET: strong('a'), REFRESH_TOKEN_SECRET: strong('b') });
    expect(c.cookieSecure).toBe(true);
    expect(loadConfig(base).cookieSecure).toBe(false);
  });
});
