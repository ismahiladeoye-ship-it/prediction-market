const User = require('../../api/models/userModel');
const { encrypt } = require('../../api/services/mfa');
const usersData = require('./users.json');

// Demo admins get two-factor with this well-known key (development data only):
// add it to an authenticator app, or run `npm run dev-admin-code`.
const DEV_ADMIN_MFA_SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

// Demo accounts for local development only (password: see users.json).
const seedUsers = async ({ reset = false } = {}) => {
  if (reset) await User.deleteMany({ username: { $in: usersData.map((u) => u.username) } });
  let created = 0;
  for (const data of usersData) {
    if (await User.exists({ $or: [{ username: data.username }, { email: data.email }] })) continue;
    const isAdmin = data.roles.includes('admin');
    // The model hashes the password.
    await User.create(isAdmin ? { ...data, mfa: { enabled: true, enabledAt: new Date(), secret: encrypt(DEV_ADMIN_MFA_SECRET), recoveryCodes: [] } } : data);
    created += 1;
  }
  console.log(`${created} users inserted`);
  return created;
};

module.exports = seedUsers;
module.exports.DEV_ADMIN_MFA_SECRET = DEV_ADMIN_MFA_SECRET;
