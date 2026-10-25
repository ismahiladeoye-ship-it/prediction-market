// Creates or promotes an administrator.
// Usage: node scripts/createAdmin.js --email=a@b.com --username=admin --first=Ada --last=Admin
// The password is read from the ADMIN_PASSWORD environment variable so it never lands in shell history.
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../api/models/userModel');
const { password: passwordSchema } = require('../api/validators/schemas');

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];

(async () => {
  const email = arg('email')?.toLowerCase();
  if (!email) throw new Error('--email is required');
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const existing = await User.findOne({ email });
    if (existing) {
      if (!existing.roles.includes('admin')) existing.roles.push('admin');
      await existing.save();
      console.log(`Granted admin to ${email}`);
      return;
    }
    const password = process.env.ADMIN_PASSWORD;
    const check = passwordSchema.safeParse(password || '');
    if (!check.success) throw new Error(`ADMIN_PASSWORD: ${check.error.issues[0].message}`);
    await User.create({
      email,
      username: arg('username') || email.split('@')[0],
      firstName: arg('first') || 'Store',
      lastName: arg('last') || 'Admin',
      password,
      roles: ['user', 'admin'],
    });
    console.log(`Created admin ${email}`);
  } finally {
    await mongoose.disconnect();
  }
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
