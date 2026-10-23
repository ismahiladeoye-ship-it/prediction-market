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
    .default('usd'),
  TAX_RATE: z.coerce.number().min(0).max(1).default(0),
  SHIPPING_STANDARD: z.coerce.number().min(0).default(20),
  SHIPPING_EXPRESS: z.coerce.number().min(0).default(40),
  FREE_SHIPPING_THRESHOLD: z.coerce.number().min(0).default(0),
  RESERVATION_MINUTES: z.coerce.number().int().min(31).max(1440).default(35),
  PAYMENT_PROVIDER: z.enum(['stripe', 'mock']).default('stripe'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_ALLOW_LIVE: bool(false),
  // Methods offered at checkout, in display order. Each must be enabled in the Stripe dashboard.
  PAYMENT_METHODS: z.string().default('apple_pay,card,paypal,klarna,google_pay'),
  FIREBASE_PROJECT_ID: z.string().optional(),
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().default('ScrollMe <no-reply@scrollme.local>'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).default('info'),
});

const PAYMENT_METHOD_IDS = ['apple_pay', 'google_pay', 'card', 'paypal', 'klarna'];

const WEAK_SECRETS = new Set(['someone', 'SCROLLME_SECRET', 'changeme', 'secret']);

function loadConfig(source = process.env) {
  const parsed = schema.safeParse(source);
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
    clientOrigins: env.CLIENT_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
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
