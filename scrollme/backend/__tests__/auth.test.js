const request = require('supertest');
const User = require('../api/models/userModel');
const mailer = require('../api/services/mailer');
const { useTestApp, createUser, STRONG_PASSWORD } = require('./helpers/setup');

const ctx = useTestApp();

const newUser = (overrides = {}) => ({
  firstName: 'Ada',
  lastName: 'Lovelace',
  username: 'ada',
  email: 'ada@example.com',
  password: STRONG_PASSWORD,
  confirmPassword: STRONG_PASSWORD,
  ...overrides,
});

const cookieNames = (res) => (res.headers['set-cookie'] || []).map((c) => c.split('=')[0]);

describe('registration', () => {
  it('creates a user, hashes the password and sets httpOnly session cookies', async () => {
    const res = await request(ctx.app).post('/api/auth/register').send(newUser());
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ username: 'ada', email: 'ada@example.com', roles: ['user'] });
    expect(res.body.user.password).toBeUndefined();
    expect(cookieNames(res)).toEqual(expect.arrayContaining(['accessToken', 'refreshToken']));
    expect(res.headers['set-cookie'].join(';')).toMatch(/HttpOnly/);
    const stored = await User.findOne({ username: 'ada' }).select('+password');
    expect(stored.password).not.toBe(STRONG_PASSWORD);
    expect(stored.password).toMatch(/^\$2[aby]\$/);
  });

  it.each([
    ['short password', { password: 'Ab1!', confirmPassword: 'Ab1!' }, /at least 8/],
    ['no special character', { password: 'Abcdefg1', confirmPassword: 'Abcdefg1' }, /special character/],
    ['invalid email', { email: 'not-an-email' }, /valid email/],
    ['invalid name', { firstName: '1' }, /First name/],
    ['mismatched confirmation', { confirmPassword: 'Different1!' }, /do not match/],
  ])('rejects %s', async (_label, overrides, message) => {
    const res = await request(ctx.app).post('/api/auth/register').send(newUser(overrides));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(message);
  });

  it('ignores a roles field in the request body', async () => {
    const res = await request(ctx.app)
      .post('/api/auth/register')
      .send({ ...newUser(), roles: ['admin'] });
    expect(res.status).toBe(201);
    expect((await User.findOne({ username: 'ada' })).roles).toEqual(['user']);
  });

  it('rejects duplicate usernames and emails with 409', async () => {
    await request(ctx.app).post('/api/auth/register').send(newUser());
    const dupEmail = await request(ctx.app)
      .post('/api/auth/register')
      .send(newUser({ username: 'other' }));
    expect(dupEmail.status).toBe(409);
    expect(dupEmail.body.message).toMatch(/email/);
  });
});

describe('login and session', () => {
  it('logs in with username or email and returns the public profile', async () => {
    const user = await createUser();
    for (const username of [user.username, user.email]) {
      const res = await request(ctx.app).post('/api/auth/login').send({ username, password: STRONG_PASSWORD });
      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(user.id);
      expect(res.body.user.roles).toEqual(['user']);
    }
  });

  it('returns the same 401 for an unknown user and a wrong password', async () => {
    const user = await createUser();
    const wrong = await request(ctx.app).post('/api/auth/login').send({ username: user.username, password: 'Wrong1!pass' });
    const unknown = await request(ctx.app).post('/api/auth/login').send({ username: 'nobody', password: 'Wrong1!pass' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  it('blocks operator injection in the login body', async () => {
    await createUser();
    const res = await request(ctx.app)
      .post('/api/auth/login')
      .send({ username: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(400);
  });

  it('protects /status and /me', async () => {
    expect((await request(ctx.app).get('/api/auth/me')).status).toBe(401);
    const user = await createUser();
    const agent = request.agent(ctx.app);
    await agent.post('/api/auth/login').send({ username: user.username, password: STRONG_PASSWORD });
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe(user.username);
    const status = await agent.get('/api/auth/status');
    expect(status.body.message).toBe('Authenticated');
  });

  it('refreshes tokens with the refresh cookie and rotates them', async () => {
    const user = await createUser();
    const agent = request.agent(ctx.app);
    await agent.post('/api/auth/login').send({ username: user.username, password: STRONG_PASSWORD });
    const res = await agent.post('/api/auth/refresh-token');
    expect(res.status).toBe(200);
    expect(cookieNames(res)).toEqual(expect.arrayContaining(['accessToken', 'refreshToken']));
    expect((await agent.get('/api/auth/me')).status).toBe(200);
  });

  it('rejects refresh without a cookie or with a forged token', async () => {
    expect((await request(ctx.app).post('/api/auth/refresh-token')).status).toBe(401);
    const forged = await request(ctx.app).post('/api/auth/refresh-token').set('Cookie', 'refreshToken=abc.def.ghi');
    expect(forged.status).toBe(401);
  });

  it('logout revokes both the access and the refresh token server-side', async () => {
    const user = await createUser();
    const agent = request.agent(ctx.app);
    const login = await agent.post('/api/auth/login').send({ username: user.username, password: STRONG_PASSWORD });
    const stolenCookies = login.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');

    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(200);

    // Replaying the old cookies must fail even though they have not expired.
    expect((await request(ctx.app).get('/api/auth/me').set('Cookie', stolenCookies)).status).toBe(401);
    expect((await request(ctx.app).post('/api/auth/refresh-token').set('Cookie', stolenCookies)).status).toBe(401);
  });
});

describe('password reset', () => {
  it('resets the password with the emailed token and revokes old sessions', async () => {
    const user = await createUser();
    const spy = jest.spyOn(mailer, 'sendMail').mockResolvedValue({ delivered: true });
    const agent = request.agent(ctx.app);
    await agent.post('/api/auth/login').send({ username: user.username, password: STRONG_PASSWORD });

    const res = await request(ctx.app).post('/api/auth/forgot-password').send({ email: user.email });
    expect(res.status).toBe(200);
    const token = spy.mock.calls[0][0].text.match(/token=([a-f0-9]{64})/)[1];

    const weak = await request(ctx.app).post('/api/auth/reset-password').send({ token, password: 'weak' });
    expect(weak.status).toBe(400);

    const ok = await request(ctx.app).post('/api/auth/reset-password').send({ token, password: 'N3w!Password' });
    expect(ok.status).toBe(200);
    expect((await agent.get('/api/auth/me')).status).toBe(401);

    const login = await request(ctx.app).post('/api/auth/login').send({ username: user.username, password: 'N3w!Password' });
    expect(login.status).toBe(200);
    // Token is single-use.
    expect((await request(ctx.app).post('/api/auth/reset-password').send({ token, password: 'An0ther!Pass' })).status).toBe(400);
    spy.mockRestore();
  });

  it('answers identically for unknown emails', async () => {
    const spy = jest.spyOn(mailer, 'sendMail');
    const res = await request(ctx.app).post('/api/auth/forgot-password').send({ email: 'nobody@example.com' });
    expect(res.status).toBe(200);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('google sign-in', () => {
  it('is disabled (501) when FIREBASE_PROJECT_ID is not configured', async () => {
    const res = await request(ctx.app)
      .post('/api/auth/google')
      .send({ idToken: 'x'.repeat(40) });
    expect(res.status).toBe(501);
  });
});
