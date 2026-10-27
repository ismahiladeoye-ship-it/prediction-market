// On Vercel a function is suspended once it has replied, so emails sent after
// the response must be handed to waitUntil or they can be cut off.
jest.mock('@vercel/functions', () => ({ waitUntil: jest.fn() }));

const request = require('supertest');
const { waitUntil } = require('@vercel/functions');
const mailer = require('../api/services/mailer');
const { useTestApp, createUser } = require('./helpers/setup');

const ctx = useTestApp();

describe('emails sent after the response', () => {
  let mailSpy;
  beforeEach(() => {
    waitUntil.mockClear();
    mailSpy = jest.spyOn(mailer, 'sendMail').mockResolvedValue({ delivered: true });
  });
  afterEach(() => mailSpy.mockRestore());

  it('keeps the password-reset email running until it is sent', async () => {
    const user = await createUser();
    expect((await request(ctx.app).post('/api/auth/forgot-password').send({ email: user.email })).status).toBe(200);
    expect(waitUntil).toHaveBeenCalledTimes(1);
    await waitUntil.mock.calls[0][0];
    expect(mailSpy).toHaveBeenCalledWith(expect.objectContaining({ to: user.email, subject: 'Reset your Get It Sourced password' }));
  });

  it('does not wait on anything for an unknown address', async () => {
    expect((await request(ctx.app).post('/api/auth/forgot-password').send({ email: 'nobody@example.com' })).status).toBe(200);
    expect(waitUntil).not.toHaveBeenCalled();
  });

  it('keeps the contact-form alert running until it is sent', async () => {
    const res = await request(ctx.app).post('/api/contact').send({ name: 'Ada', email: 'ada@example.com', message: 'Do you have these in size 9?' });
    expect(res.status).toBe(201);
    expect(waitUntil).toHaveBeenCalledTimes(1);
  });
});
