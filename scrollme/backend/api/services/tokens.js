const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { getConfig } = require('../config/env');

const ACCESS_COOKIE = 'accessToken';
const REFRESH_COOKIE = 'refreshToken';
// Set after a correct password for accounts with two-factor; only the code
// check can turn it into a session.
const MFA_PENDING_COOKIE = 'mfaPending';
const MFA_PENDING_PATH = '/api/auth/mfa';
const MFA_PENDING_MINUTES = 5;
// The refresh cookie is only sent to the auth endpoints that need it.
const REFRESH_PATH = '/api/auth';

const baseCookie = () => {
  const config = getConfig();
  return {
    httpOnly: true,
    secure: config.cookieSecure || config.COOKIE_SAMESITE === 'none',
    sameSite: config.COOKIE_SAMESITE,
  };
};

// Tokens are only ever HS256; verification refuses any other algorithm.
const ALGORITHM = 'HS256';

// `mfa` records that this session passed the two-factor check (needed for admin).
const signAccessToken = (user, { mfa = false } = {}) => {
  const config = getConfig();
  return jwt.sign({ typ: 'access', id: user._id.toString(), roles: user.roles, v: user.tokenVersion, mfa }, config.JWT_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: config.ACCESS_TOKEN_TTL,
  });
};

const signRefreshToken = (user, { mfa = false } = {}) => {
  const config = getConfig();
  return jwt.sign({ typ: 'refresh', id: user._id.toString(), v: user.tokenVersion, mfa }, config.REFRESH_TOKEN_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: `${config.REFRESH_TOKEN_TTL_DAYS}d`,
  });
};

const verifyTyped = (token, secret, typ) => {
  const payload = jwt.verify(token, secret, { algorithms: [ALGORITHM] });
  if (payload.typ !== typ) throw new jwt.JsonWebTokenError('wrong token type');
  return payload;
};
const verifyAccessToken = (token) => verifyTyped(token, getConfig().JWT_SECRET, 'access');
const verifyRefreshToken = (token) => verifyTyped(token, getConfig().REFRESH_TOKEN_SECRET, 'refresh');

// Signed with its own derived key, so it can never pass as a session token.
const pendingKey = () => crypto.createHash('sha256').update(`mfa-pending:${getConfig().JWT_SECRET}`).digest('hex');
const verifyMfaPendingToken = (token) => verifyTyped(token, pendingKey(), 'mfa-pending');

const setMfaPendingCookie = (res, user) => {
  const token = jwt.sign({ typ: 'mfa-pending', id: user._id.toString(), v: user.tokenVersion }, pendingKey(), {
    algorithm: ALGORITHM,
    expiresIn: `${MFA_PENDING_MINUTES}m`,
  });
  res.cookie(MFA_PENDING_COOKIE, token, { ...baseCookie(), path: MFA_PENDING_PATH, maxAge: MFA_PENDING_MINUTES * 60 * 1000 });
};

const clearMfaPendingCookie = (res) => res.clearCookie(MFA_PENDING_COOKIE, { ...baseCookie(), path: MFA_PENDING_PATH });

const setAuthCookies = (res, user, { mfa = false } = {}) => {
  const config = getConfig();
  const base = baseCookie();
  const accessToken = signAccessToken(user, { mfa });
  const accessMs = jwt.decode(accessToken).exp * 1000 - Date.now();
  res.cookie(ACCESS_COOKIE, accessToken, { ...base, path: '/', maxAge: accessMs });
  res.cookie(REFRESH_COOKIE, signRefreshToken(user, { mfa }), {
    ...base,
    path: REFRESH_PATH,
    maxAge: config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
};

const clearAuthCookies = (res) => {
  const base = baseCookie();
  res.clearCookie(ACCESS_COOKIE, { ...base, path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...base, path: REFRESH_PATH });
};

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  MFA_PENDING_COOKIE,
  verifyMfaPendingToken,
  setMfaPendingCookie,
  clearMfaPendingCookie,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
};
