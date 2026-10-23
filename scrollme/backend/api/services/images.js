const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const { getConfig } = require('../config/env');
const { badRequest } = require('../utils/httpError');

// Public URL prefix for stored photos (served by app.js, proxied by nginx).
const UPLOAD_URL_PREFIX = '/api/uploads/';
const UPLOAD_URL = /^\/api\/uploads\/[a-f0-9]{32}\.webp$/;
const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp', 'heif']);
const MAX_SIDE = 1600;

// Decodes an uploaded photo, applies its rotation, scales it to at most
// 1600 px, re-encodes it as WebP (which drops EXIF/GPS and any embedded
// content) and stores it under a random name. Anything that is not a real
// JPEG, PNG, WebP or HEIC image is rejected.
const saveProductImage = async (buffer) => {
  let meta;
  try {
    // limitInputPixels guards against decompression bombs.
    meta = await sharp(buffer, { limitInputPixels: 50_000_000 }).metadata();
  } catch {
    throw badRequest('That file is not an image we can read. Use JPEG, PNG or WebP.');
  }
  if (!ACCEPTED_FORMATS.has(meta.format)) throw badRequest('Use JPEG, PNG or WebP photos.');

  let output;
  try {
    output = await sharp(buffer, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw badRequest('That photo could not be processed. Use JPEG, PNG or WebP.');
  }

  const dir = getConfig().UPLOAD_DIR;
  await fs.mkdir(dir, { recursive: true });
  const name = `${crypto.randomBytes(16).toString('hex')}.webp`;
  await fs.writeFile(path.join(dir, name), output.data, { flag: 'wx' });
  return { url: `${UPLOAD_URL_PREFIX}${name}`, width: output.info.width, height: output.info.height, bytes: output.info.size };
};

module.exports = { saveProductImage, UPLOAD_URL, UPLOAD_URL_PREFIX };
