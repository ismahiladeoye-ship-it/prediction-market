const User = require('../models/userModel');
const { ACCESS_COOKIE, verifyAccessToken } = require('../services/tokens');
const { unauthorized, forbidden } = require('../utils/httpError');

const loadUser = async (req) => {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) return { error: 'Access token missing' };
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    return { error: err.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid access token' };
  }
  const user = await User.findById(decoded.id);
  if (!user) return { error: 'User not found' };
  if ((decoded.v ?? 0) !== user.tokenVersion) return { error: 'Session has been revoked' };
  return { user, mfa: decoded.mfa === true };
};

// Rejects the request with 401 unless a valid access token is present.
const authMiddleware = async (req, res, next) => {
  try {
    const { user, mfa, error } = await loadUser(req);
    if (!user) return next(unauthorized(error));
    req.user = user;
    req.auth = { mfa };
    next();
  } catch (err) {
    next(err);
  }
};

// Attaches req.user when a valid token is present but never rejects.
const optionalAuth = async (req, res, next) => {
  try {
    const { user, mfa } = await loadUser(req);
    if (user) {
      req.user = user;
      req.auth = { mfa };
    }
    next();
  } catch (err) {
    next(err);
  }
};

const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (!req.user.roles.some((r) => roles.includes(r))) return next(forbidden());
    next();
  };

// Admin access needs two-factor: set up on the account and passed in this session.
const requireMfa = (req, res, next) => {
  if (!req.user.mfa?.enabled) {
    return next(forbidden('Set up two-factor authentication to use admin features', 'MFA_SETUP_REQUIRED'));
  }
  if (!req.auth?.mfa) return next(forbidden('Sign in again with your two-factor code to use admin features', 'MFA_REQUIRED'));
  next();
};

const requireAdmin = [requireRole('admin', 'super_admin'), requireMfa];

// For handlers that serve both customers and admins: true only for an admin
// who completed two-factor sign-in in this session.
const hasAdminAccess = (req) => Boolean(req.user?.isAdmin() && req.user.mfa?.enabled && req.auth?.mfa);

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.optionalAuth = optionalAuth;
module.exports.requireRole = requireRole;
module.exports.requireAdmin = requireAdmin;
module.exports.hasAdminAccess = hasAdminAccess;
