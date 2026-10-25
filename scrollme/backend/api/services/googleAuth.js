const { createRemoteJWKSet, jwtVerify } = require('jose');
const { getConfig } = require('../config/env');
const { HttpError } = require('../utils/httpError');

// Verifies a Firebase Authentication ID token (Google sign-in) against
// Google's published keys. No service-account credentials are needed.
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let jwks;

const verifyGoogleIdToken = async (idToken) => {
  const { FIREBASE_PROJECT_ID } = getConfig();
  if (!FIREBASE_PROJECT_ID) throw new HttpError(501, 'Google sign-in is not configured on this server');
  if (!jwks) jwks = createRemoteJWKSet(new URL(JWKS_URL));
  try {
    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });
    return payload;
  } catch {
    throw new HttpError(401, 'Google sign-in could not be verified');
  }
};

module.exports = { verifyGoogleIdToken };
