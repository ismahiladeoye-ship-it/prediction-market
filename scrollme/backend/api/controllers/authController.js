const crypto = require('node:crypto');
const User = require('../models/userModel');
const { getConfig } = require('../config/env');
const { REFRESH_COOKIE, setAuthCookies, clearAuthCookies, verifyRefreshToken, setMfaPendingCookie, clearMfaPendingCookie } = require('../services/tokens');
const { issueCode, checkCode, sendCode } = require('../services/emailCodes');
const googleAuth = require('../services/googleAuth');
const { badRequest, unauthorized, conflict, HttpError } = require('../utils/httpError');

// Real bcrypt hash of a random string, compared against when the user does not exist.
const DUMMY_HASH = '$2b$12$QRwGchrL8LjfV4hGSmigAup8WIdSYopb8y.uAszQLu8qei1DpUXMK';

// After a correct password (or Google): accounts with two-factor get a
// short-lived "code needed" cookie instead of a session.
const beginSession = (res, user, message) => {
  if (user.mfa?.enabled) {
    setMfaPendingCookie(res, user);
    return res.status(200).json({ mfaRequired: true, message: 'Enter the 6-digit code from your authenticator app' });
  }
  setAuthCookies(res, user);
  return res.status(200).json({ message, user: user.toPublicJSON() });
};

exports.register = async (req, res) => {
  const { firstName, lastName, username, email, password, confirmPassword } = req.body;
  if (confirmPassword !== undefined && confirmPassword !== password) throw badRequest('Passwords do not match');

  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    const field = existingUser.email === email ? 'email' : 'username';
    throw conflict(`An account with that ${field} already exists.`);
  }

  // Roles are never taken from the request body. With email sending set up, the
  // address is confirmed with an emailed code before the first order.
  const verificationRequired = getConfig().emailVerificationRequired;
  const user = await User.create({
    firstName,
    lastName,
    username,
    email,
    password,
    roles: ['user'],
    ...(verificationRequired ? { emailVerified: false } : {}),
  });
  if (verificationRequired) sendCode(user, 'emailVerification', await issueCode(user, 'emailVerification'));
  setAuthCookies(res, user);
  res.status(201).json({ message: 'User registered successfully', user: user.toPublicJSON(), verificationRequired });
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne(username.includes('@') ? { email: username } : { username }).select('+password');
  // Same message and a hash comparison either way, so responses do not reveal which usernames exist.
  const ok = user ? await user.comparePassword(password) : await User.hydrate({ password: DUMMY_HASH }).comparePassword(password);
  if (!user || !ok) throw unauthorized('Invalid username or password');
  beginSession(res, user, 'Logged in successfully');
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
  clearMfaPendingCookie(res);
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
  // A session keeps its two-factor status for as long as the account has it on.
  setAuthCookies(res, user, { mfa: decoded.mfa === true && Boolean(user.mfa?.enabled) });
  res.status(200).json({ message: 'Tokens refreshed', user: user.toPublicJSON() });
};

// Kept for the original frontend contract: { message: 'Authenticated', user }.
exports.checkAuthStatus = async (req, res) => {
  res.status(200).json({ message: 'Authenticated', user: req.user.toPublicJSON() });
};

exports.me = async (req, res) => {
  res.status(200).json({ user: req.user.toPublicJSON() });
};

// Emails a 6-digit code; the reply is the same whether or not the address has
// an account, so it cannot be used to find out who shops here.
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (user) sendCode(user, 'passwordReset', await issueCode(user, 'passwordReset'));
  res.status(200).json({ message: 'If an account exists for that email, we have sent it a 6-digit code.' });
};

const WRONG_CODE = 'That code is wrong or has expired. Check your latest email, or ask for a new code.';

exports.resetPassword = async (req, res) => {
  const { email, code, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await checkCode(user._id, 'passwordReset', code))) throw badRequest(WRONG_CODE);
  user.password = password;
  user.tokenVersion += 1; // sign out all existing sessions
  user.authProvider = user.authProvider || 'password';
  // The code reached their inbox, so the address is theirs.
  if (user.emailVerified === false) user.emailVerified = true;
  await user.save();
  clearAuthCookies(res);
  res.status(200).json({ message: 'Password updated. Please sign in with your new password.' });
};

// Confirms a new account's email address with the code sent at sign-up.
exports.verifyEmail = async (req, res) => {
  if (req.user.emailVerified !== false) return res.json({ message: 'Your email address is confirmed.', user: req.user.toPublicJSON() });
  if (!(await checkCode(req.user._id, 'emailVerification', req.body.code))) throw badRequest(WRONG_CODE);
  req.user.emailVerified = true;
  await req.user.save();
  return res.json({ message: 'Thanks, your email address is confirmed.', user: req.user.toPublicJSON() });
};

exports.resendVerification = async (req, res) => {
  if (req.user.emailVerified !== false) return res.json({ message: 'Your email address is already confirmed.' });
  sendCode(req.user, 'emailVerification', await issueCode(req.user, 'emailVerification'));
  return res.json({ message: `We have sent a new code to ${req.user.email}.` });
};

exports.googleLogin = async (req, res) => {
  const claims = await googleAuth.verifyGoogleIdToken(req.body.idToken);
  if (!claims.email || !claims.email_verified) throw new HttpError(401, 'Google account email is not verified');
  const email = claims.email.toLowerCase();
  let user = await User.findOne({ email });
  // Never sign into a password account through Google: sign-up does not verify
  // email ownership, so whoever registered the address first (possibly not its
  // owner) would keep access alongside the Google user, or the reverse.
  if (user && user.authProvider !== 'google') {
    throw conflict('An account with this email already exists. Sign in with your password, or reset it from the login page.');
  }
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
      // Random unusable password; the account signs in with Google or a reset code.
      password: `${crypto.randomBytes(24).toString('base64')}aA1!`,
      authProvider: 'google',
      // Google has confirmed the address.
      emailVerified: true,
    });
  }
  beginSession(res, user, 'Logged in successfully');
};
