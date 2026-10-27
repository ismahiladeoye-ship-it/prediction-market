const request = require('supertest');
const User = require('../api/models/userModel');
const mailer = require('../api/services/mailer');
const googleAuth = require('../api/services/googleAuth');
const { resetConfig } = require('../api/config/env');
const { useTestApp, createUser, createProduct, emailedCode, STRONG_PASSWORD } = require('./helpers/setup');

const ctx = useTestApp();

const newCustomer = (n) => ({
  firstName: 'Grace',
  lastName: 'Hopper',
  username: `grace${n}`,
  email: `grace${n}@example.com`,
  password: STRONG_PASSWORD,
});

const address = { fullName: 'Ada Lovelace', line1: '12 Analytical Street', city: 'London', postalCode: 'N1 9GU', country: 'GB', phone: '+44 20 7946 0958' };

describe('confirming a new account email with a 6-digit code', () => {
  let mailSpy;
  beforeEach(() => {
    process.env.EMAIL_VERIFICATION = 'on';
    resetConfig();
    mailSpy = jest.spyOn(mailer, 'sendMail').mockResolvedValue({ delivered: true });
  });
  afterEach(() => {
    delete process.env.EMAIL_VERIFICATION;
    resetConfig();
    mailSpy.mockRestore();
  });

  it('emails a code at sign-up, blocks orders until it is entered, then confirms the address', async () => {
    const agent = request.agent(ctx.app);
    const reg = await agent.post('/api/auth/register').send(newCustomer(1));
    expect(reg.status).toBe(201);
    expect(reg.body).toMatchObject({ verificationRequired: true, user: { emailVerified: false } });
    const first = await emailedCode(mailSpy, 'grace1@example.com');
    expect(mailSpy.mock.calls[0][0].subject).toBe(`${first} is your Get It Sourced confirmation code`);

    // Signed in, but no orders until the address is confirmed.
    const product = await createProduct();
    await agent.post('/api/cart/add').send({ productId: product.id, quantity: 1, size: 'M' });
    const blocked = await agent.post('/api/orders').send({ shippingAddress: address });
    expect(blocked.status).toBe(403);
    expect(blocked.body.reason).toBe('EMAIL_UNVERIFIED');

    expect((await agent.post('/api/auth/verify-email').send({ code: first === '000000' ? '111111' : '000000' })).status).toBe(400);
    // A new code replaces the old one.
    mailSpy.mockClear();
    expect((await agent.post('/api/auth/resend-verification')).body.message).toMatch(/new code to grace1@example.com/);
    const second = await emailedCode(mailSpy, 'grace1@example.com');
    if (second !== first) expect((await agent.post('/api/auth/verify-email').send({ code: first })).status).toBe(400);

    const ok = await agent.post('/api/auth/verify-email').send({ code: second });
    expect(ok.status).toBe(200);
    expect(ok.body.user.emailVerified).toBe(true);
    expect((await agent.get('/api/auth/me')).body.user.emailVerified).toBe(true);
    expect((await agent.post('/api/orders').send({ shippingAddress: address })).status).toBe(201);
  });

  it('needs a signed-in account and a 6-digit code', async () => {
    expect((await request(ctx.app).post('/api/auth/verify-email').send({ code: '123456' })).status).toBe(401);
    expect((await request(ctx.app).post('/api/auth/resend-verification')).status).toBe(401);
    const agent = request.agent(ctx.app);
    await agent.post('/api/auth/register').send(newCustomer(2));
    expect((await agent.post('/api/auth/verify-email').send({ code: 'abc' })).status).toBe(400);
  });

  it('treats existing accounts, Google sign-ins and password resets as confirmed', async () => {
    const old = await createUser();
    const login = await request(ctx.app).post('/api/auth/login').send({ username: old.username, password: STRONG_PASSWORD });
    expect(login.body.user.emailVerified).toBe(true);

    process.env.FIREBASE_PROJECT_ID = 'demo-project';
    resetConfig();
    const google = jest.spyOn(googleAuth, 'verifyGoogleIdToken').mockResolvedValue({ email: 'new@example.com', email_verified: true, name: 'New Person' });
    const g = await request(ctx.app)
      .post('/api/auth/google')
      .send({ idToken: 'x'.repeat(40) });
    expect(g.body.user.emailVerified).toBe(true);
    google.mockRestore();
    delete process.env.FIREBASE_PROJECT_ID;

    await request(ctx.app).post('/api/auth/register').send(newCustomer(3));
    // The sign-up email goes out after the response: wait for it so it is not
    // mistaken for the reset email.
    await emailedCode(mailSpy, 'grace3@example.com');
    mailSpy.mockClear();
    await request(ctx.app).post('/api/auth/forgot-password').send({ email: 'grace3@example.com' });
    const code = await emailedCode(mailSpy, 'grace3@example.com');
    await request(ctx.app).post('/api/auth/reset-password').send({ email: 'grace3@example.com', code, password: 'N3w!Password' });
    expect((await User.findOne({ email: 'grace3@example.com' })).emailVerified).toBe(true);
  });
});

describe('without email sending set up', () => {
  it('does not ask new accounts for a code', async () => {
    const res = await request(ctx.app).post('/api/auth/register').send(newCustomer(4));
    expect(res.body).toMatchObject({ verificationRequired: false, user: { emailVerified: true } });
  });
});
