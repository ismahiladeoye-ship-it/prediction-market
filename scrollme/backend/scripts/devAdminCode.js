// Development only: prints the current two-factor code for the seeded demo
// admin (mjohnson), whose authenticator key is DEV_ADMIN_MFA_SECRET.
const { totp } = require('../api/services/mfa');
const { DEV_ADMIN_MFA_SECRET } = require('./users/seedUsers');

if (process.env.NODE_ENV === 'production') {
  console.error('Not available in production');
  process.exit(1);
}
console.log(totp(DEV_ADMIN_MFA_SECRET).generate());
