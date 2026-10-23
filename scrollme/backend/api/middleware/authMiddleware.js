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
  return { user };
};

// Rejects the request with 401 unless a valid access token is present.
const authMiddleware = async (req, res, next) => {
  try {
    const { user, error } = await loadUser(req);
    if (!user) return next(unauthorized(error));
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

// Attaches req.user when a valid token is present but never rejects.
const optionalAuth = async (req, res, next) => {
  try {
    const { user } = await loadUser(req);
    if (user) req.user = user;
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

const requireAdmin = requireRole('admin', 'super_admin');

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.optionalAuth = optionalAuth;
module.exports.requireRole = requireRole;
module.exports.requireAdmin = requireAdmin;
