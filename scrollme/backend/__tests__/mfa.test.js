const request = require('supertest');
const OTPAuth = require('otpauth');
const User = require('../api/models/userModel');
const mailer = require('../api/services/mailer');
const googleAuth = require('../api/services/googleAuth');
const { resetConfig } = require('../api/config/env');
const { useTestApp, createUser, signedInAgent, STRONG_PASSWORD, TEST_MFA_SECRET } = require('./helpers/setup');

const ctx = useTestApp();

const codeFor = (secret, offsetSteps = 0) =>
  new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret.replace(/\s/g, '')) }).generate({ timestamp: Date.now() + offsetSteps * 30000 });
const cookie = (res, name) => (res.headers['set-cookie'] || []).find((c) => c.startsWith(`${name}=`));
const login = (agent, user) => agent.post('/api/auth/login').send({ username: user.username, password: STRONG_PASSWORD });

// An admin who has not set up two-factor yet.
const newAdmin = async () => {
  const user = await createUser({ roles: ['user', 'admin'] });
  const agent = request.agent(ctx.app);
  const res = await login(agent, user);
  return { user, agent, res };
};

const enableFor = async (agent) => {
  const setup = await agent.post('/api/auth/mfa/setup');
  const enabled = await agent.post('/api/auth/mfa/enable').send({ code: codeFor(setup.body.secret) });
  return { setup, enabled, secret: setup.body.secret.replace(/\s/g, '') };
};

describe('two-factor setup for admins', () => {
  it('keeps admin features locked until two-factor is set up', async () => {
    const { agent, res } = await newAdmin();
    expect(res.body.mfaRequired).toBeUndefined();
    expect(res.body.user.mfaEnabled).toBe(false);
    const blocked = await agent.get('/api/admin/stats');
    expect(blocked.status).toBe(403);
    expect(blocked.body.reason).toBe('MFA_SETUP_REQUIRED');
    expect((await agent.post('/api/admin/uploads')).status).toBe(403);
    expect((await agent.get('/api/auth/mfa')).body).toEqual({ enabled: false, required: true, verified: false, recoveryCodesLeft: 0 });
  });

  it('sets up with a QR code, needs a correct code, returns recovery codes and signs out other devices', async () => {
    const { user, agent } = await newAdmin();
    const otherDevice = request.agent(ctx.app);
    await login(otherDevice, user);

    const setup = await agent.post('/api/auth/mfa/setup');
    expect(setup.status).toBe(200);
    expect(setup.body.qr).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(setup.body.uri).toMatch(/^otpauth:\/\/totp\/Get%20It%20Sourced:/);
    expect(setup.body.secret).toMatch(/^[A-Z2-7]{4}( [A-Z2-7]{1,4})+$/);
    const secret = setup.body.secret.replace(/\s/g, '');

    expect((await agent.post('/api/auth/mfa/enable').send({ code: '000000' })).status).toBe(400);
    const enabled = await agent.post('/api/auth/mfa/enable').send({ code: codeFor(secret) });
    expect(enabled.status).toBe(200);
    expect(enabled.body.recoveryCodes).toHaveLength(10);
    expect(new Set(enabled.body.recoveryCodes).size).toBe(10);
    enabled.body.recoveryCodes.forEach((c) => expect(c).toMatch(/^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/));

    // This session passed the check; the other device has to sign in again.
    expect((await agent.get('/api/admin/stats')).status).toBe(200);
    expect((await otherDevice.get('/api/auth/me')).status).toBe(401);

    // Stored encrypted and hashed, never in the clear.
    const stored = await User.findById(user._id).select('+mfa.secret +mfa.recoveryCodes').lean();
    expect(stored.mfa.secret).not.toContain(secret);
    expect(stored.mfa.recoveryCodes).not.toContain(enabled.body.recoveryCodes[0]);
    expect((await agent.get('/api/auth/mfa')).body).toEqual({ enabled: true, required: true, verified: true, recoveryCodesLeft: 10 });
  });

  it('is only for admins', async () => {
    const { agent } = await signedInAgent(ctx.app);
    expect((await agent.post('/api/auth/mfa/setup')).status).toBe(403);
    expect((await agent.get('/api/auth/mfa')).body.required).toBe(false);
  });
});

describe('signing in with two-factor', () => {
  it('needs the code after the password, accepts each code once and keeps the session on refresh', async () => {
    const { user, agent } = await newAdmin();
    const { secret } = await enableFor(agent);
    await agent.post('/api/auth/logout');

    const browser = request.agent(ctx.app);
    const step1 = await login(browser, user);
    expect(step1.body).toEqual({ mfaRequired: true, message: expect.any(String) });
    expect(cookie(step1, 'accessToken')).toBeUndefined();
    expect(cookie(step1, 'mfaPending')).toMatch(/HttpOnly/);
    expect((await browser.get('/api/auth/me')).status).toBe(401);

    expect((await browser.post('/api/auth/mfa/verify').send({ code: '123456' })).status).toBe(401);
    const code = codeFor(secret, 1);
    const ok = await browser.post('/api/auth/mfa/verify').send({ code: `${code.slice(0, 3)} ${code.slice(3)}` });
    expect(ok.status).toBe(200);
    expect(ok.body.user.mfaEnabled).toBe(true);
    expect((await browser.get('/api/admin/stats')).status).toBe(200);

    // The same code cannot be replayed on another sign-in.
    const again = request.agent(ctx.app);
    await login(again, user);
    const replay = await again.post('/api/auth/mfa/verify').send({ code });
    expect(replay.status).toBe(401);

    // Refreshing keeps the two-factor status.
    expect((await browser.post('/api/auth/refresh-token')).status).toBe(200);
    expect((await browser.get('/api/admin/stats')).status).toBe(200);
  });

  it('accepts each recovery code once', async () => {
    const { user, agent } = await newAdmin();
    const { enabled } = await enableFor(agent);
    const [first] = enabled.body.recoveryCodes;

    const browser = request.agent(ctx.app);
    await login(browser, user);
    const used = await browser.post('/api/auth/mfa/verify').send({ code: first.toLowerCase() });
    expect(used.status).toBe(200);
    expect(used.body.recoveryCodesLeft).toBe(9);

    const next = request.agent(ctx.app);
    await login(next, user);
    expect((await next.post('/api/auth/mfa/verify').send({ code: first })).status).toBe(401);
  });

  it('cannot be skipped: no pending sign-in, or the pending token used as a session', async () => {
    const { user, agent } = await newAdmin();
    await enableFor(agent);
    expect((await request(ctx.app).post('/api/auth/mfa/verify').send({ code: '123456' })).status).toBe(401);

    const step1 = await login(request.agent(ctx.app), user);
    const pending = cookie(step1, 'mfaPending').split(';')[0].split('=')[1];
    expect((await request(ctx.app).get('/api/auth/me').set('Cookie', `accessToken=${pending}`)).status).toBe(401);
    expect((await request(ctx.app).post('/api/auth/refresh-token').set('Cookie', `refreshToken=${pending}`)).status).toBe(401);
  });

  it('still asks for the code after a password reset or a Google sign-in', async () => {
    const { user, agent } = await newAdmin();
    await enableFor(agent);
    const spy = jest.spyOn(mailer, 'sendMail').mockResolvedValue({ delivered: true });
    await request(ctx.app).post('/api/auth/forgot-password').send({ email: user.email });
    const token = spy.mock.calls[0][0].text.match(/token=([a-f0-9]{64})/)[1];
    spy.mockRestore();
    expect((await request(ctx.app).post('/api/auth/reset-password').send({ token, password: 'N3w!Password' })).status).toBe(200);
    const res = await request(ctx.app).post('/api/auth/login').send({ username: user.username, password: 'N3w!Password' });
    expect(res.body.mfaRequired).toBe(true);
    expect(cookie(res, 'accessToken')).toBeUndefined();

    await User.updateOne({ _id: user._id }, { $set: { authProvider: 'google' } });
    const google = jest.spyOn(googleAuth, 'verifyGoogleIdToken').mockResolvedValue({ email: user.email, email_verified: true });
    const viaGoogle = await request(ctx.app)
      .post('/api/auth/google')
      .send({ idToken: 'x'.repeat(40) });
    google.mockRestore();
    expect(viaGoogle.body.mfaRequired).toBe(true);
    expect(cookie(viaGoogle, 'accessToken')).toBeUndefined();
  });

  it('limits wrong codes per account', async () => {
    const { user } = await signedInAgent(ctx.app, { roles: ['user', 'admin'] });
    process.env.RATE_LIMIT_ENABLED = 'true';
    resetConfig();
    try {
      const browser = request.agent(ctx.app);
      await login(browser, user);
      for (let i = 0; i < 5; i += 1) expect((await browser.post('/api/auth/mfa/verify').send({ code: '000000' })).status).toBe(401);
      expect((await browser.post('/api/auth/mfa/verify').send({ code: codeFor(TEST_MFA_SECRET, 1) })).status).toBe(429);
    } finally {
      process.env.RATE_LIMIT_ENABLED = 'false';
      resetConfig();
    }
  });

  it('still accepts recovery codes if the authenticator secret cannot be decrypted', async () => {
    const { user, agent } = await newAdmin();
    const { enabled, secret } = await enableFor(agent);
    // As if MFA_SECRET_KEY had been changed.
    await User.updateOne({ _id: user._id }, { $set: { 'mfa.secret': 'AAAA.AAAA.AAAA' } });

    const browser = request.agent(ctx.app);
    await login(browser, user);
    expect((await browser.post('/api/auth/mfa/verify').send({ code: codeFor(secret, 1) })).status).toBe(401);
    expect((await browser.post('/api/auth/mfa/verify').send({ code: enabled.body.recoveryCodes[0] })).status).toBe(200);
  });

  it('lets a signed-in admin move to a new authenticator, retiring the old one', async () => {
    const { user, agent } = await newAdmin();
    const { secret: oldSecret } = await enableFor(agent);
    const { enabled, secret: newSecret } = await enableFor(agent);
    expect(enabled.status).toBe(200);
    expect(newSecret).not.toBe(oldSecret);

    const browser = request.agent(ctx.app);
    await login(browser, user);
    expect((await browser.post('/api/auth/mfa/verify').send({ code: codeFor(oldSecret, 1) })).status).toBe(401);
    expect((await browser.post('/api/auth/mfa/verify').send({ code: codeFor(newSecret, 1) })).status).toBe(200);
  });
});
