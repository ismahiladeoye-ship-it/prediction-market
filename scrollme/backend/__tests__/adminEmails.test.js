const request = require('supertest');
const User = require('../api/models/userModel');
const googleAuth = require('../api/services/googleAuth');
const { resetConfig } = require('../api/config/env');
const { useTestApp, createUser, STRONG_PASSWORD } = require('./helpers/setup');

const ctx = useTestApp();

const signIn = (username) => request.agent(ctx.app).post('/api/auth/login').send({ username, password: STRONG_PASSWORD });

// ADMIN_EMAILS lets the shop owner become an admin by signing in, without
// editing the database by hand.
describe('ADMIN_EMAILS', () => {
  beforeEach(() => {
    process.env.ADMIN_EMAILS = ' Owner@Example.com , partner@example.com';
    resetConfig();
  });
  afterEach(() => {
    delete process.env.ADMIN_EMAILS;
    delete process.env.FIREBASE_PROJECT_ID;
    resetConfig();
  });

  it('makes a listed account an admin when it signs in, once', async () => {
    const owner = await createUser({ email: 'owner@example.com' });
    const res = await signIn(owner.username);
    expect(res.status).toBe(200);
    expect(res.body.user.roles).toEqual(['user', 'admin']);
    await signIn('owner@example.com');
    expect((await User.findById(owner._id)).roles).toEqual(['user', 'admin']);
  });

  it('still needs two-factor set up before the admin pages open', async () => {
    const owner = await createUser({ email: 'owner@example.com' });
    const agent = request.agent(ctx.app);
    await agent.post('/api/auth/login').send({ username: owner.username, password: STRONG_PASSWORD });
    const res = await agent.get('/api/admin/stats');
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('MFA_SETUP_REQUIRED');
  });

  it('leaves other accounts, wrong passwords and unconfirmed emails alone', async () => {
    const other = await createUser({ email: 'someone@example.com' });
    expect((await signIn(other.username)).body.user.roles).toEqual(['user']);

    const owner = await createUser({ email: 'owner@example.com' });
    expect((await request(ctx.app).post('/api/auth/login').send({ username: owner.username, password: 'Wr0ng!Password' })).status).toBe(401);
    expect((await User.findById(owner._id)).roles).toEqual(['user']);

    const unconfirmed = await createUser({ email: 'partner@example.com', emailVerified: false });
    expect((await signIn(unconfirmed.username)).body.user.roles).toEqual(['user']);
  });

  it('also works for Google sign-in accounts', async () => {
    process.env.FIREBASE_PROJECT_ID = 'demo-project';
    resetConfig();
    const google = jest.spyOn(googleAuth, 'verifyGoogleIdToken').mockResolvedValue({ email: 'partner@example.com', email_verified: true, name: 'Pat Partner' });
    const res = await request(ctx.app)
      .post('/api/auth/google')
      .send({ idToken: 'x'.repeat(40) });
    google.mockRestore();
    expect(res.body.user.roles).toEqual(['user', 'admin']);
  });

  it('does nothing when the setting is empty', async () => {
    delete process.env.ADMIN_EMAILS;
    resetConfig();
    const owner = await createUser({ email: 'owner@example.com' });
    expect((await signIn(owner.username)).body.user.roles).toEqual(['user']);
  });
});
