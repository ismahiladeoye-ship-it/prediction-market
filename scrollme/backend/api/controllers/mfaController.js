const User = require('../models/userModel');
const mfa = require('../services/mfa');
const { setAuthCookies, clearMfaPendingCookie, verifyMfaPendingToken, MFA_PENDING_COOKIE } = require('../services/tokens');
const { unauthorized, forbidden, badRequest } = require('../utils/httpError');
const logger = require('../utils/logger');

const MFA_FIELDS = '+mfa.secret +mfa.pendingSecret +mfa.lastStep +mfa.recoveryCodes';

// Only admins use two-factor; changing it needs a session that passed it.
const assertCanManage = (req) => {
  if (!req.user.isAdmin()) throw forbidden('Two-factor sign-in is available for admin accounts');
  if (req.user.mfa?.enabled && !req.auth?.mfa) throw forbidden('Sign in with your current two-factor code first', 'MFA_REQUIRED');
};

exports.status = async (req, res) => {
  const user = await User.findById(req.user._id).select('+mfa.recoveryCodes');
  const enabled = Boolean(user.mfa?.enabled);
  res.json({
    enabled,
    required: user.isAdmin(),
    verified: Boolean(req.auth?.mfa),
    recoveryCodesLeft: enabled ? user.mfa.recoveryCodes?.length || 0 : 0,
  });
};

// Step 1: a new secret for the authenticator app (not active until confirmed).
exports.setup = async (req, res) => {
  assertCanManage(req);
  const secret = mfa.newSecret();
  await User.updateOne({ _id: req.user._id }, { $set: { 'mfa.pendingSecret': mfa.encrypt(secret) } });
  res.json(mfa.setupDetails(secret, req.user.email));
};

// Step 2: a correct code from the app switches it on and returns one-time recovery codes.
exports.enable = async (req, res) => {
  assertCanManage(req);
  const user = await User.findById(req.user._id).select(MFA_FIELDS);
  if (!user.mfa?.pendingSecret) throw badRequest('Start the setup again to get a new QR code');
  const pending = mfa.readSecret(user.mfa.pendingSecret);
  if (!pending) throw badRequest('Start the setup again to get a new QR code');
  const step = mfa.verifyCode(pending, req.body.code);
  if (step === null) throw badRequest('That code is not right. Check the time on your phone is set automatically and try the latest code.');

  const recoveryCodes = mfa.newRecoveryCodes();
  user.mfa.enabled = true;
  user.mfa.enabledAt = new Date();
  user.mfa.secret = user.mfa.pendingSecret;
  user.mfa.pendingSecret = undefined;
  user.mfa.lastStep = step;
  user.mfa.recoveryCodes = recoveryCodes.map(mfa.hashRecoveryCode);
  user.tokenVersion += 1; // every other device signs in again, with a code
  await user.save();
  setAuthCookies(res, user, { mfa: true });
  logger.info('admin_action', { action: 'mfa_enabled', adminId: String(user._id) });
  res.json({ message: 'Two-factor sign-in is on', recoveryCodes, user: user.toPublicJSON() });
};

// Reads the short-lived cookie set by a correct password.
exports.loadPending = async (req, res, next) => {
  try {
    const decoded = verifyMfaPendingToken(req.cookies?.[MFA_PENDING_COOKIE] || '');
    const user = await User.findById(decoded.id).select(MFA_FIELDS);
    if (!user || user.tokenVersion !== decoded.v || !user.mfa?.enabled) throw new Error('stale');
    req.mfaUser = user;
    next();
  } catch {
    clearMfaPendingCookie(res);
    next(unauthorized('Your sign-in timed out. Enter your password again.'));
  }
};

// Login step 2: an authenticator code (each usable once) or a recovery code.
exports.verify = async (req, res) => {
  const user = req.mfaUser;
  const { code } = req.body;
  let method = 'app';
  const secret = mfa.readSecret(user.mfa.secret);
  if (!secret) logger.error('mfa_secret_unreadable', { userId: String(user._id), hint: 'MFA_SECRET_KEY changed? Use a recovery code or npm run reset-mfa' });
  const step = mfa.verifyCode(secret, code, user.mfa.lastStep);
  if (step !== null) {
    // Conditional update, so a code cannot be used twice even in parallel.
    const claimed = await User.updateOne(
      { _id: user._id, $or: [{ 'mfa.lastStep': { $exists: false } }, { 'mfa.lastStep': { $lt: step } }] },
      { $set: { 'mfa.lastStep': step } }
    );
    if (!claimed.modifiedCount) throw unauthorized('That code was already used. Wait for the next one.');
  } else {
    const hash = mfa.hashRecoveryCode(code);
    const used = await User.updateOne({ _id: user._id, 'mfa.recoveryCodes': hash }, { $pull: { 'mfa.recoveryCodes': hash } });
    if (!used.modifiedCount) throw unauthorized('That code is not right. Check your authenticator app and try again.');
    method = 'recovery';
  }
  clearMfaPendingCookie(res);
  setAuthCookies(res, user, { mfa: true });
  logger.info('mfa_verified', { userId: String(user._id), method });
  const recoveryCodesLeft = method === 'recovery' ? user.mfa.recoveryCodes.length - 1 : undefined;
  res.json({ message: 'Signed in', user: user.toPublicJSON(), ...(recoveryCodesLeft !== undefined ? { recoveryCodesLeft } : {}) });
};
