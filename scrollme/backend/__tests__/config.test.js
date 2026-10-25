const { loadConfig } = require('../api/config/env');

const base = { MONGODB_URI: 'mongodb://x/y', JWT_SECRET: 'a', REFRESH_TOKEN_SECRET: 'b' };
const strong = (c) => c.repeat(40);
// A valid production configuration to vary one setting at a time.
const prod = { ...base, NODE_ENV: 'production', JWT_SECRET: strong('a'), REFRESH_TOKEN_SECRET: strong('b'), MFA_SECRET_KEY: strong('m') };

describe('configuration', () => {
  it('fails fast when required variables are missing', () => {
    expect(() => loadConfig({})).toThrow(/MONGODB_URI/);
  });

  it('rejects weak or shared secrets in production', () => {
    expect(() => loadConfig({ ...base, NODE_ENV: 'production', JWT_SECRET: 'someone', REFRESH_TOKEN_SECRET: strong('r') })).toThrow(/JWT_SECRET/);
    expect(() => loadConfig({ ...base, NODE_ENV: 'production', JWT_SECRET: strong('a'), REFRESH_TOKEN_SECRET: strong('a') })).toThrow(/must differ/);
  });

  it('requires its own strong key for two-factor secrets in production', () => {
    expect(() => loadConfig({ ...prod, MFA_SECRET_KEY: undefined })).toThrow(/MFA_SECRET_KEY/);
    expect(() => loadConfig({ ...prod, MFA_SECRET_KEY: 'short' })).toThrow(/MFA_SECRET_KEY/);
    expect(() => loadConfig({ ...prod, MFA_SECRET_KEY: prod.JWT_SECRET })).toThrow(/MFA_SECRET_KEY/);
    expect(loadConfig(prod).mfaKey).toHaveLength(32);
  });

  it('refuses the mock payment provider in production', () => {
    expect(() => loadConfig({ ...prod, PAYMENT_PROVIDER: 'mock' })).toThrow(/mock/);
  });

  it('defaults to a UK store: pounds, free delivery from £100, no express, UK addresses', () => {
    const c = loadConfig(base);
    expect(c.CURRENCY).toBe('gbp');
    expect(c.SHIPPING_STANDARD).toBe(3.99);
    expect(c.FREE_SHIPPING_THRESHOLD).toBe(100);
    expect(c.SHIPPING_EXPRESS).toBeUndefined();
    expect(c.shipToCountries).toEqual(['GB']);
    expect(loadConfig({ ...base, SHIPPING_EXPRESS: '' }).SHIPPING_EXPRESS).toBeUndefined();
    expect(loadConfig({ ...base, SHIPPING_EXPRESS: '4.99' }).SHIPPING_EXPRESS).toBe(4.99);
    expect(loadConfig({ ...base, SHIP_TO_COUNTRIES: 'gb, ie' }).shipToCountries).toEqual(['GB', 'IE']);
    expect(() => loadConfig({ ...base, SHIP_TO_COUNTRIES: 'United Kingdom' })).toThrow(/SHIP_TO_COUNTRIES/);
  });

  it('refuses live Stripe keys unless explicitly allowed', () => {
    expect(() => loadConfig({ ...base, STRIPE_SECRET_KEY: 'sk_live_123' })).toThrow(/live key/);
    expect(loadConfig({ ...base, STRIPE_SECRET_KEY: 'sk_live_123', STRIPE_ALLOW_LIVE: 'true' }).STRIPE_ALLOW_LIVE).toBe(true);
    expect(loadConfig({ ...base, STRIPE_SECRET_KEY: 'sk_test_123' }).STRIPE_SECRET_KEY).toBe('sk_test_123');
  });

  it('uses secure cookies by default in production', () => {
    const c = loadConfig(prod);
    expect(c.cookieSecure).toBe(true);
    expect(loadConfig(base).cookieSecure).toBe(false);
  });
});
