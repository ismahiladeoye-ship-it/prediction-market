const crypto = require('node:crypto');
const User = require('../models/userModel');
const { getConfig } = require('../config/env');
const { REFRESH_COOKIE, setAuthCookies, clearAuthCookies, verifyRefreshToken } = require('../services/tokens');
const mailer = require('../services/mailer');
const { verifyGoogleIdToken } = require('../services/googleAuth');
const { badRequest, unauthorized, conflict, HttpError } = require('../utils/httpError');
const logger = require('../utils/logger');

// Real bcrypt hash of a random string, compared against when the user does not exist.
const DUMMY_HASH = '$2b$12$QRwGchrL8LjfV4hGSmigAup8WIdSYopb8y.uAszQLu8qei1DpUXMK';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

exports.register = async (req, res) => {
  const { firstName, lastName, username, email, password, confirmPassword } = req.body;
  if (confirmPassword !== undefined && confirmPassword !== password) throw badRequest('Passwords do not match');

  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    const field = existingUser.email === email ? 'email' : 'username';
    throw conflict(`An account with that ${field} already exists.`);
  }

  // Roles are never taken from the request body.
  const user = await User.create({ firstName, lastName, username, email, password, roles: ['user'] });
  setAuthCookies(res, user);
  res.status(201).json({ message: 'User registered successfully', user: user.toPublicJSON() });
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne(username.includes('@') ? { email: username } : { username }).select('+password');
  // Same message and a hash comparison either way, so responses do not reveal which usernames exist.
  const ok = user ? await user.comparePassword(password) : await User.hydrate({ password: DUMMY_HASH }).comparePassword(password);
  if (!user || !ok) throw unauthorized('Invalid username or password');

  setAuthCookies(res, user);
  res.status(200).json({ message: 'Logged in successfully', user: user.toPublicJSON() });
};

exports.logOut = async (req, res) => {
  // Revoke every session of this user when we can identify them from the refresh cookie.
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    try {
      const decoded = verifyRefreshToken(token);
      await User.updateOne({ _id: decoded.id, tokenVersion: decoded.v }, { $inc: { tokenVersion: 1 } });
    } catch {
      // An invalid or expired token is already useless; clearing cookies is enough.
    }
  }
  clearAuthCookies(res);
  res.status(200).json({ message: 'Logged out successfully' });
};

exports.refreshToken = async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw unauthorized('No refresh token provided');
  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    clearAuthCookies(res);
    throw unauthorized('Invalid or expired refresh token');
  }
  const user = await User.findById(decoded.id);
  if (!user || user.tokenVersion !== decoded.v) {
    clearAuthCookies(res);
    throw unauthorized('Session has been revoked');
  }
  setAuthCookies(res, user);
  res.status(200).json({ message: 'Tokens refreshed', user: user.toPublicJSON() });
};

// Kept for the original frontend contract: { message: 'Authenticated', user }.
exports.checkAuthStatus = async (req, res) => {
  res.status(200).json({ message: 'Authenticated', user: req.user.toPublicJSON() });
};

exports.me = async (req, res) => {
  res.status(200).json({ user: req.user.toPublicJSON() });
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    user.passwordReset = { tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 30 * 60 * 1000) };
    await user.save();
    const link = `${getConfig().APP_URL}/reset-password?token=${token}`;
    await mailer
      .sendMail({
        to: user.email,
        subject: 'Reset your Get It Sourced password',
        text: `Hi ${user.firstName},\n\nUse this link within 30 minutes to choose a new password:\n${link}\n\nIf you did not ask for this, you can ignore this email.`,
      })
      .catch((err) => logger.error('password_reset_mail_failed', { err }));
  }
  // Identical response whether or not the address is registered.
  res.status(200).json({ message: 'If an account exists for that email, a reset link has been sent.' });
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  const user = await User.findOne({
    'passwordReset.tokenHash': hashToken(token),
    'passwordReset.expiresAt': { $gt: new Date() },
  });
  if (!user) throw badRequest('Invalid or expired reset link');
  user.password = password;
  user.passwordReset = undefined;
  user.tokenVersion += 1; // sign out all existing sessions
  user.authProvider = user.authProvider || 'password';
  await user.save();
  clearAuthCookies(res);
  res.status(200).json({ message: 'Password updated. Please sign in with your new password.' });
};

exports.googleLogin = async (req, res) => {
  const claims = await verifyGoogleIdToken(req.body.idToken);
  if (!claims.email || !claims.email_verified) throw new HttpError(401, 'Google account email is not verified');
  const email = claims.email.toLowerCase();
  let user = await User.findOne({ email });
  if (!user) {
    const [first, ...rest] = String(claims.name || email.split('@')[0]).split(' ');
    const base =
      email
        .split('@')[0]
        .replace(/[^a-z0-9._-]/g, '')
        .slice(0, 20) || 'user';
    let username = base;
    while (await User.exists({ username })) username = `${base}${crypto.randomInt(1000, 9999)}`;
    user = await User.create({
      firstName: first || 'Google',
      lastName: rest.join(' ') || 'User',
      username,
      email,
      // Random unusable password; the account signs in with Google or a reset link.
      password: `${crypto.randomBytes(24).toString('base64')}aA1!`,
      authProvider: 'google',
    });
  }
  setAuthCookies(res, user);
  res.status(200).json({ message: 'Logged in successfully', user: user.toPublicJSON() });
};
