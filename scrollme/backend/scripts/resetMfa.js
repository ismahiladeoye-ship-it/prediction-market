// Turns off two-factor sign-in for an account whose phone and recovery codes
// are lost, and signs it out everywhere. The admin sets it up again on next login.
// Usage: npm run reset-mfa -- --email=owner@example.com
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../api/models/userModel');

const email = process.argv
  .find((a) => a.startsWith('--email='))
  ?.split('=')[1]
  ?.toLowerCase();

(async () => {
  if (!email) throw new Error('--email is required');
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const res = await User.updateOne({ email }, { $unset: { mfa: 1 }, $inc: { tokenVersion: 1 } });
    if (!res.matchedCount) throw new Error(`No account with email ${email}`);
    console.log(`Two-factor sign-in reset for ${email}; all sessions signed out.`);
  } finally {
    await mongoose.disconnect();
  }
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
