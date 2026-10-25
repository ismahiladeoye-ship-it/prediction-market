const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const { getConfig } = require('../config/env');
const { badRequest, HttpError } = require('../utils/httpError');

// Public URL prefix for stored photos (served by app.js, proxied by nginx).
const UPLOAD_URL_PREFIX = '/api/uploads/';
const UPLOAD_URL = /^\/api\/uploads\/[a-f0-9]{32}\.webp$/;
// The same photos when stored in a Vercel Blob store.
const BLOB_URL = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/products\/[a-f0-9]{32}\.webp$/;
// A photo saved by saveProductImage, wherever it is stored.
const isStoredPhoto = (url) => UPLOAD_URL.test(url) || BLOB_URL.test(url);
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

  const name = `${crypto.randomBytes(16).toString('hex')}.webp`;
  const url = await store(name, output.data);
  return { url, width: output.info.width, height: output.info.height, bytes: output.info.size };
};

// Vercel Blob when a store is connected (serverless hosting has no lasting
// disk), otherwise UPLOAD_DIR.
const store = async (name, data) => {
  const config = getConfig();
  if (config.BLOB_READ_WRITE_TOKEN) {
    const { put } = require('@vercel/blob');
    const blob = await put(`products/${name}`, data, {
      access: 'public',
      contentType: 'image/webp',
      addRandomSuffix: false,
      cacheControlMaxAge: 365 * 24 * 60 * 60,
      token: config.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }
  if (config.onVercel) throw new HttpError(503, 'Photo storage is not set up yet: connect a Vercel Blob store to the project, then redeploy.');
  await fs.mkdir(config.UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(config.UPLOAD_DIR, name), data, { flag: 'wx' });
  return `${UPLOAD_URL_PREFIX}${name}`;
};

module.exports = { saveProductImage, isStoredPhoto, UPLOAD_URL, BLOB_URL, UPLOAD_URL_PREFIX };
