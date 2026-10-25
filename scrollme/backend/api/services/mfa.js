const crypto = require('node:crypto');
const OTPAuth = require('otpauth');
const qrcode = require('qrcode-generator');
const { getConfig } = require('../config/env');

const ISSUER = 'Get It Sourced';
const PERIOD = 30;
const RECOVERY_CODE_COUNT = 10;
// No 0/O or 1/I, so codes read back reliably.
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// AES-256-GCM so a database leak alone does not reveal the secrets.
const encrypt = (plain) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getConfig().mfaKey, iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64')).join('.');
};

const decrypt = (blob) => {
  const [iv, tag, data] = String(blob)
    .split('.')
    .map((s) => Buffer.from(s, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', getConfig().mfaKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
};

// null when the secret cannot be decrypted (MFA_SECRET_KEY changed); recovery
// codes are hashes, so they keep working.
const readSecret = (blob) => {
  try {
    return decrypt(blob);
  } catch {
    return null;
  }
};

const totp = (secretBase32, label = 'admin') =>
  new OTPAuth.TOTP({ issuer: ISSUER, label, algorithm: 'SHA1', digits: 6, period: PERIOD, secret: OTPAuth.Secret.fromBase32(secretBase32) });

const newSecret = () => new OTPAuth.Secret({ size: 20 }).base32;

// What the setup screen shows: a QR code for the authenticator app and the
// same key as text for typing in by hand.
const setupDetails = (secretBase32, accountLabel) => {
  const uri = totp(secretBase32, accountLabel).toString();
  const qr = qrcode(0, 'M');
  qr.addData(uri);
  qr.make();
  const svg = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  return { secret: secretBase32.match(/.{1,4}/g).join(' '), uri, qr: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}` };
};

// Returns the code's time step when it is valid (allowing one step of clock
// drift either way) and newer than the last one used, otherwise null.
const verifyCode = (secretBase32, code, lastStep) => {
  if (!secretBase32 || !/^\d{6}$/.test(String(code))) return null;
  const delta = totp(secretBase32).validate({ token: String(code), window: 1 });
  if (delta === null) return null;
  const step = Math.floor(Date.now() / 1000 / PERIOD) + delta;
  return typeof lastStep === 'number' && step <= lastStep ? null : step;
};

const normalizeRecoveryCode = (code) =>
  String(code)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
const hashRecoveryCode = (code) => crypto.createHash('sha256').update(normalizeRecoveryCode(code)).digest('hex');

const newRecoveryCodes = () =>
  Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const chars = Array.from(crypto.randomBytes(10), (b) => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length]).join('');
    return `${chars.slice(0, 5)}-${chars.slice(5)}`;
  });

module.exports = { encrypt, decrypt, readSecret, totp, newSecret, setupDetails, verifyCode, hashRecoveryCode, newRecoveryCodes, PERIOD };
