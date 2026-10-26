const crypto = require('node:crypto');
const path = require('node:path');
const { z } = require('zod');

// Reads and validates configuration once. Fails fast with a readable message
// instead of starting a half-working server (e.g. MONGODB_URI undefined).
const bool = (def) =>
  z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => (v === undefined ? def : v === 'true' || v === '1'));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  REFRESH_TOKEN_SECRET: z.string().min(1, 'REFRESH_TOKEN_SECRET is required'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().positive().default(7),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  CLIENT_ORIGINS: z.string().default('http://localhost:3000'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  TRUST_PROXY: z.string().default('loopback'),
  RATE_LIMIT_ENABLED: bool(true),
  CURRENCY: z
    .string()
    .regex(/^[a-z]{3}$/)
    .default('gbp'),
  TAX_RATE: z.coerce.number().min(0).max(1).default(0),
  // Delivery prices in CURRENCY. Standard delivery is free from
  // FREE_SHIPPING_THRESHOLD (0 = never); express is offered only when SHIPPING_EXPRESS is set.
  SHIPPING_STANDARD: z.coerce.number().min(0).default(3.99),
  SHIPPING_EXPRESS: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number().min(0).optional()),
  FREE_SHIPPING_THRESHOLD: z.coerce.number().min(0).default(100),
  // Countries the store delivers to (2-letter codes, comma-separated).
  SHIP_TO_COUNTRIES: z
    .string()
    .regex(/^[A-Za-z]{2}(\s*,\s*[A-Za-z]{2})*$/, 'SHIP_TO_COUNTRIES must be 2-letter country codes, e.g. GB')
    .default('GB'),
  RESERVATION_MINUTES: z.coerce.number().int().min(31).max(1440).default(35),
  PAYMENT_PROVIDER: z.enum(['stripe', 'mock']).default('stripe'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_ALLOW_LIVE: bool(false),
  // Methods offered at checkout, in display order. Each must be enabled in the Stripe dashboard.
  PAYMENT_METHODS: z.string().default('apple_pay,card,paypal,klarna,google_pay'),
  FIREBASE_PROJECT_ID: z.string().optional(),
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().default('Get It Sourced <no-reply@getitsourced.com>'),
  // Where new-order and contact-form alerts go (default: the email in Admin → Shop details).
  NOTIFY_EMAIL: z.preprocess((v) => (v === '' ? undefined : v), z.string().email().optional()),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).default('info'),
  // Encrypts admins' two-factor secrets in the database (required in production).
  MFA_SECRET_KEY: z.string().optional(),
  // Where uploaded product photos are stored (a persistent volume in production).
  UPLOAD_DIR: z.string().default(path.resolve(__dirname, '../../uploads')),
  // Vercel Blob store for photos (set automatically when a store is connected
  // to the Vercel project). When set, photos are stored there instead of UPLOAD_DIR.
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  // Protects the daily cron endpoint (Vercel sends it as a Bearer token).
  CRON_SECRET: z.string().optional(),
  // Single-service hosting (Railway, Render, Fly, a VPS): this Node process also
  // serves the built storefront, so the whole shop runs from one container at
  // one address. Off by default; nginx (or Vercel) serves the pages otherwise.
  SERVE_STATIC: bool(false),
  // Where the built storefront lives when SERVE_STATIC is on.
  STATIC_DIR: z.string().default(path.resolve(__dirname, '../../../build')),
});

const PAYMENT_METHOD_IDS = ['apple_pay', 'google_pay', 'card', 'paypal', 'klarna'];

const WEAK_SECRETS = new Set(['someone', 'SCROLLME_SECRET', 'changeme', 'secret']);

// On Vercel, fill in what the platform already knows: the shop's public
// address (and so the allowed origin) and the proxy in front of the API.
const withPlatformDefaults = (source) => {
  if (!source.VERCEL) return source;
  const production = source.VERCEL_PROJECT_PRODUCTION_URL ? `https://${source.VERCEL_PROJECT_PRODUCTION_URL}` : undefined;
  const appUrl = source.APP_URL || production;
  return {
    ...source,
    ...(appUrl ? { APP_URL: appUrl } : {}),
    ...(!source.CLIENT_ORIGINS && appUrl ? { CLIENT_ORIGINS: appUrl } : {}),
    ...(!source.TRUST_PROXY ? { TRUST_PROXY: '1' } : {}),
  };
};

// This deployment's own addresses on Vercel (previews and branch URLs), so
// writes from them pass the Origin check.
const platformOrigins = (source) => (source.VERCEL ? [source.VERCEL_URL, source.VERCEL_BRANCH_URL].filter(Boolean).map((host) => `https://${host}`) : []);

function loadConfig(source = process.env) {
  const parsed = schema.safeParse(withPlatformDefaults(source));
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid configuration:\n${issues}`);
  }
  const env = parsed.data;
  const isProd = env.NODE_ENV === 'production';

  if (isProd) {
    for (const key of ['JWT_SECRET', 'REFRESH_TOKEN_SECRET']) {
      if (env[key].length < 32 || WEAK_SECRETS.has(env[key])) {
        throw new Error(`Invalid configuration:\n  - ${key} must be a random value of at least 32 characters in production`);
      }
    }
    if (env.JWT_SECRET === env.REFRESH_TOKEN_SECRET) {
      throw new Error('Invalid configuration:\n  - JWT_SECRET and REFRESH_TOKEN_SECRET must differ');
    }
    if (!env.MFA_SECRET_KEY || env.MFA_SECRET_KEY.length < 32 || [env.JWT_SECRET, env.REFRESH_TOKEN_SECRET].includes(env.MFA_SECRET_KEY)) {
      throw new Error('Invalid configuration:\n  - MFA_SECRET_KEY must be its own random value of at least 32 characters in production');
    }
    if (env.PAYMENT_PROVIDER === 'mock') {
      throw new Error('Invalid configuration:\n  - PAYMENT_PROVIDER=mock is not allowed in production');
    }
  }
  if (env.PAYMENT_PROVIDER === 'stripe' && env.STRIPE_SECRET_KEY) {
    if (env.STRIPE_SECRET_KEY.startsWith('sk_live_') && !env.STRIPE_ALLOW_LIVE) {
      throw new Error('Invalid configuration:\n  - STRIPE_SECRET_KEY is a live key; set STRIPE_ALLOW_LIVE=true only once test-mode checkout is verified');
    }
  }

  return {
    ...env,
    isProd,
    isTest: env.NODE_ENV === 'test',
    paymentMethods: [...new Set(env.PAYMENT_METHODS.split(',').map((m) => m.trim()))].filter((m) => PAYMENT_METHOD_IDS.includes(m)),
    // 32-byte AES key for two-factor secrets; outside production it may be derived from JWT_SECRET.
    mfaKey: crypto
      .createHash('sha256')
      .update(env.MFA_SECRET_KEY || `mfa-dev:${env.JWT_SECRET}`)
      .digest(),
    shipToCountries: [...new Set(env.SHIP_TO_COUNTRIES.split(',').map((c) => c.trim().toUpperCase()))],
    clientOrigins: [...new Set([...env.CLIENT_ORIGINS.split(','), ...platformOrigins(source)].map((o) => o.trim()).filter(Boolean))],
    onVercel: Boolean(source.VERCEL),
    cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : isProd,
    trustProxy: /^\d+$/.test(env.TRUST_PROXY) ? Number(env.TRUST_PROXY) : env.TRUST_PROXY === 'false' ? false : env.TRUST_PROXY,
  };
}

let cached;
const getConfig = () => {
  if (!cached) cached = loadConfig();
  return cached;
};
// Tests swap configuration between suites.
const resetConfig = () => {
  cached = undefined;
};

module.exports = { loadConfig, getConfig, resetConfig, PAYMENT_METHOD_IDS };
