const jwt = require('jsonwebtoken');
const { getConfig } = require('../config/env');

const ACCESS_COOKIE = 'accessToken';
const REFRESH_COOKIE = 'refreshToken';
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

const signAccessToken = (user) => {
  const config = getConfig();
  return jwt.sign({ id: user._id.toString(), roles: user.roles, v: user.tokenVersion }, config.JWT_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: config.ACCESS_TOKEN_TTL,
  });
};

const signRefreshToken = (user) => {
  const config = getConfig();
  return jwt.sign({ id: user._id.toString(), v: user.tokenVersion }, config.REFRESH_TOKEN_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: `${config.REFRESH_TOKEN_TTL_DAYS}d`,
  });
};

const verifyAccessToken = (token) => jwt.verify(token, getConfig().JWT_SECRET, { algorithms: [ALGORITHM] });
const verifyRefreshToken = (token) => jwt.verify(token, getConfig().REFRESH_TOKEN_SECRET, { algorithms: [ALGORITHM] });

const setAuthCookies = (res, user) => {
  const config = getConfig();
  const base = baseCookie();
  const accessToken = signAccessToken(user);
  const accessMs = jwt.decode(accessToken).exp * 1000 - Date.now();
  res.cookie(ACCESS_COOKIE, accessToken, { ...base, path: '/', maxAge: accessMs });
  res.cookie(REFRESH_COOKIE, signRefreshToken(user), {
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
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
};
