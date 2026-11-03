const request = require('supertest');
const mailer = require('../api/services/mailer');
const { Counter, MongoStore } = require('../api/middleware/rateLimitStore');
const { resetConfig } = require('../api/config/env');
const { useTestApp, createUser, STRONG_PASSWORD } = require('./helpers/setup');

const ctx = useTestApp();

let mailSpy;
beforeEach(() => {
  mailSpy = jest.spyOn(mailer, 'sendMail').mockResolvedValue({ delivered: true });
  process.env.RATE_LIMIT_ENABLED = 'true';
  resetConfig();
});
afterEach(() => {
  mailSpy.mockRestore();
  process.env.RATE_LIMIT_ENABLED = 'false';
  resetConfig();
});

// Each request appears to come from its own address (tests trust the loopback proxy).
const fromIp = (req, n) => req.set('X-Forwarded-For', `203.0.113.${n}`);
const settle = () => new Promise((r) => setTimeout(r, 50));

describe('password-reset emails', () => {
  it('go to one address at most 3 times an hour, however many IPs ask', async () => {
    const user = await createUser();
    for (let i = 1; i <= 3; i += 1) {
      expect((await fromIp(request(ctx.app).post('/api/auth/forgot-password'), i).send({ email: user.email })).status).toBe(200);
    }
    const blocked = await fromIp(request(ctx.app).post('/api/auth/forgot-password'), 4).send({ email: user.email.toUpperCase() });
    expect(blocked.status).toBe(429);
    await settle();
    expect(mailSpy).toHaveBeenCalledTimes(3);
  });

  it('are limited per IP too, and the same for unknown addresses', async () => {
    for (let i = 0; i < 10; i += 1) {
      expect((await fromIp(request(ctx.app).post('/api/auth/forgot-password'), 9).send({ email: `nobody${i}@example.com` })).status).toBe(200);
    }
    expect((await fromIp(request(ctx.app).post('/api/auth/forgot-password'), 9).send({ email: 'nobody10@example.com' })).status).toBe(429);
  });
});

describe('sign-ups', () => {
  it('are limited to 10 an hour from one IP, successful or not', async () => {
    const signUp = (i) =>
      fromIp(request(ctx.app).post('/api/auth/register'), 7).send({
        firstName: 'Bulk',
        lastName: 'Account',
        username: `bulk${i}`,
        email: `bulk${i}@example.com`,
        password: STRONG_PASSWORD,
      });
    for (let i = 0; i < 10; i += 1) expect((await signUp(i)).status).toBe(201);
    expect((await signUp(10)).status).toBe(429);
    // Someone else is unaffected.
    const other = await fromIp(request(ctx.app).post('/api/auth/register'), 8).send({
      firstName: 'Real',
      lastName: 'Customer',
      username: 'realcustomer',
      email: 'real@example.com',
      password: STRONG_PASSWORD,
    });
    expect(other.status).toBe(201);
  });
});

// Codes and newsletter sign-ups: the shop must not be usable to email strangers in bulk.
describe('emails to unconfirmed addresses', () => {
  const withVerification = () => {
    process.env.EMAIL_VERIFICATION = 'on';
    resetConfig();
  };
  afterEach(() => {
    delete process.env.EMAIL_VERIFICATION;
    resetConfig();
  });

  it('new confirmation codes are limited per IP as well as per account', async () => {
    withVerification();
    const ip = 21;
    const agents = [];
    for (let i = 0; i < 3; i += 1) {
      const agent = request.agent(ctx.app);
      const res = await fromIp(agent.post('/api/auth/register'), 30 + i).send({
        firstName: 'New',
        lastName: 'Shopper',
        username: `resender${i}`,
        email: `resender${i}@example.com`,
        password: STRONG_PASSWORD,
      });
      expect(res.status).toBe(201);
      agents.push(agent);
    }
    let sent = 0;
    for (let i = 0; i < 12; i += 1) {
      const res = await fromIp(agents[i % 3].post('/api/auth/resend-verification'), ip);
      if (res.status === 200) sent += 1;
      else expect(res.status).toBe(429);
    }
    expect(sent).toBe(10);
  });

  it('the whole shop sends at most 30 sign-up codes an hour; accounts are still made', async () => {
    withVerification();
    const { UNCONFIRMED_EMAILS_PER_HOUR } = require('../api/services/emailCodes');
    expect(UNCONFIRMED_EMAILS_PER_HOUR).toBe(30);
    const signUp = (i) =>
      fromIp(request(ctx.app).post('/api/auth/register'), 100 + Math.floor(i / 9)).send({
        firstName: 'Bulk',
        lastName: 'Account',
        username: `capped${i}`,
        email: `capped${i}@example.com`,
        password: STRONG_PASSWORD,
      });
    for (let i = 0; i < 32; i += 1) expect((await signUp(i)).status).toBe(201);
    await settle();
    expect(mailSpy).toHaveBeenCalledTimes(30);
  });

  it('newsletter sign-ups count every request: 10 an hour per IP', async () => {
    for (let i = 0; i < 10; i += 1) {
      expect((await fromIp(request(ctx.app).post('/api/newsletter'), 40).send({ email: `fan${i}@example.com` })).status).toBe(200);
    }
    expect((await fromIp(request(ctx.app).post('/api/newsletter'), 40).send({ email: 'fan10@example.com' })).status).toBe(429);
  });
});

describe('shared counters', () => {
  it('are shared by every copy of the API, as on serverless hosting', async () => {
    // Each running copy builds its own store object; the counts live in the database.
    const [a, b] = [new MongoStore('test'), new MongoStore('test')];
    a.init({ windowMs: 60_000 });
    b.init({ windowMs: 60_000 });
    await a.increment('203.0.113.1');
    await b.increment('203.0.113.1');
    expect((await a.increment('203.0.113.1')).totalHits).toBe(3);
    await b.decrement('203.0.113.1');
    expect((await b.increment('203.0.113.1')).totalHits).toBe(3);
    // Sign-in failures are counted in the database, not in this process.
    const user = await createUser();
    await request(ctx.app).post('/api/auth/login').send({ username: user.username, password: 'Wrong!pass0' });
    expect(await Counter.countDocuments({ _id: /^login:/ })).toBe(1);
  });

  it('start again once the time window has passed', async () => {
    const store = new MongoStore('test');
    store.init({ windowMs: 100 });
    await store.increment('k');
    expect((await store.increment('k')).totalHits).toBe(2);
    await new Promise((r) => setTimeout(r, 150));
    expect((await store.increment('k')).totalHits).toBe(1);
  });

  it('store hashes, not emails or IPs, and expire on their own', async () => {
    const user = await createUser();
    await fromIp(request(ctx.app).post('/api/auth/forgot-password'), 5).send({ email: user.email });
    const counters = await Counter.find().lean();
    expect(counters.length).toBeGreaterThan(0);
    const stored = JSON.stringify(counters);
    expect(stored).not.toContain(user.email);
    expect(stored).not.toContain('203.0.113.5');
    for (const c of counters) expect(c.resetAt.getTime()).toBeGreaterThan(Date.now());
    const indexes = await Counter.collection.indexes();
    expect(indexes.find((i) => i.key.resetAt)).toMatchObject({ expireAfterSeconds: 0 });
  });

  it('count a successful sign-in back down', async () => {
    const user = await createUser();
    for (let i = 0; i < 9; i += 1) {
      await request(ctx.app)
        .post('/api/auth/login')
        .send({ username: user.username, password: `Wrong!pass${i}` });
    }
    // Successful sign-ins do not use up the allowance.
    for (let i = 0; i < 3; i += 1) {
      expect((await request(ctx.app).post('/api/auth/login').send({ username: user.username, password: STRONG_PASSWORD })).status).toBe(200);
      await settle(); // the count goes back down once the response has gone
    }
    await settle();
    expect((await request(ctx.app).post('/api/auth/login').send({ username: user.username, password: 'Wrong!pass9' })).status).toBe(401);
    expect((await request(ctx.app).post('/api/auth/login').send({ username: user.username, password: STRONG_PASSWORD })).status).toBe(429);
  });
});
