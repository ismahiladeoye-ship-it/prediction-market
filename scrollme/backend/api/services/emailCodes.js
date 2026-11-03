const crypto = require('node:crypto');
const User = require('../models/userModel');
const { getConfig } = require('../config/env');
const mailer = require('./mailer');
const { getShopDetails } = require('./shopDetails');
const { render } = require('./notifications');
const { afterResponse } = require('../utils/background');
const { MongoStore } = require('../middleware/rateLimitStore');
const logger = require('../utils/logger');

// 6-digit codes emailed for password resets ("passwordReset") and to confirm a
// new account's address ("emailVerification"). Each user has at most one code
// per purpose: a new code replaces the old one.
const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

// Keyed hash: a copy of the database alone is not enough to work out a code
// (a plain hash of 6 digits is quick to reverse).
const hashCode = (purpose, userId, code) => crypto.createHmac('sha256', getConfig().JWT_SECRET).update(`${purpose}:${userId}:${code}`).digest('hex');

// Saves a new code for the user and returns it (to be emailed).
const issueCode = async (user, purpose) => {
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await User.updateOne(
    { _id: user._id },
    { $set: { [purpose]: { codeHash: hashCode(purpose, user._id, code), expiresAt: new Date(Date.now() + CODE_TTL_MS), attempts: 0 } } }
  );
  return code;
};

// True and the code is used up when it matches. Each guess is counted before it
// is checked, in one step, so guesses sent all at once cannot get past the
// limit: after MAX_ATTEMPTS guesses, or after 15 minutes, a new code is needed.
const checkCode = async (userId, purpose, code) => {
  const user = await User.findOneAndUpdate(
    {
      _id: userId,
      [`${purpose}.codeHash`]: { $exists: true },
      [`${purpose}.expiresAt`]: { $gt: new Date() },
      [`${purpose}.attempts`]: { $not: { $gte: MAX_ATTEMPTS } },
    },
    { $inc: { [`${purpose}.attempts`]: 1 } }
  ).select(`+${purpose}.codeHash`);
  const record = user?.[purpose];
  if (!record?.codeHash) return false;
  const given = Buffer.from(hashCode(purpose, userId, code));
  const stored = Buffer.from(record.codeHash);
  if (given.length !== stored.length || !crypto.timingSafeEqual(given, stored)) return false;
  // Only one request can use a code, even if two arrive at once.
  const used = await User.updateOne({ _id: userId, [`${purpose}.codeHash`]: record.codeHash }, { $unset: { [purpose]: 1 } });
  return used.modifiedCount === 1;
};

// Sign-up confirmation codes go to addresses nobody has proven are theirs, so
// the whole shop sends at most this many an hour. That keeps a burst of fake
// sign-ups from using up the email allowance that order emails depend on.
const UNCONFIRMED_EMAILS_PER_HOUR = 30;
const unconfirmedMail = new MongoStore('unconfirmed-mail');
unconfirmedMail.init({ windowMs: 60 * 60 * 1000 });
const canEmailUnconfirmed = async () => {
  if (!getConfig().RATE_LIMIT_ENABLED) return true;
  const { totalHits } = await unconfirmedMail.increment('all');
  if (totalHits > UNCONFIRMED_EMAILS_PER_HOUR) {
    logger.warn('unconfirmed_email_cap_reached', { perHour: UNCONFIRMED_EMAILS_PER_HOUR });
    return false;
  }
  return true;
};

const TEMPLATES = {
  passwordReset: {
    subject: (code) => `${code} is your Get It Sourced password reset code`,
    heading: 'Reset your password',
    lead: 'Enter this code on the password reset page, then choose a new password.',
    ignore: 'If you did not ask to reset your password, you can ignore this email; your password has not changed.',
  },
  emailVerification: {
    subject: (code) => `${code} is your Get It Sourced confirmation code`,
    heading: 'Confirm your email address',
    lead: 'Enter this code on the shop to confirm your email address.',
    ignore: 'If you did not create an account, you can ignore this email.',
  },
};

// Emails the code without making the visitor wait for the mail server.
const sendCode = (user, purpose, code) =>
  afterResponse(
    (async () => {
      const t = TEMPLATES[purpose];
      const shop = await getShopDetails();
      const content = render({
        shop,
        heading: t.heading,
        blocks: [{ text: `Hi ${user.firstName},` }, { text: t.lead }, { text: `Your code: ${code}` }, { text: `It works for 15 minutes. ${t.ignore}` }],
      });
      await mailer.sendMail({ to: user.email, subject: t.subject(code), ...content });
    })().catch((err) => logger.error('code_email_failed', { purpose, err }))
  );

module.exports = { issueCode, checkCode, sendCode, canEmailUnconfirmed, MAX_ATTEMPTS, CODE_TTL_MS, UNCONFIRMED_EMAILS_PER_HOUR };
