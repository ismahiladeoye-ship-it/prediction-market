const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const { getConfig } = require('../config/env');
const { badRequest, HttpError } = require('../utils/httpError');
const logger = require('../utils/logger');

// Public URL prefix for stored photos (served by app.js, proxied by nginx).
const UPLOAD_URL_PREFIX = '/api/uploads/';
const UPLOAD_URL = /^\/api\/uploads\/[a-f0-9]{32}\.webp$/;
// The same photos when stored in a Vercel Blob store.
const BLOB_URL = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/products\/[a-f0-9]{32}\.webp$/;
// Our photo file names: a random 16-byte id as WebP.
const STORED_NAME = /^products\/[a-f0-9]{32}\.webp$/;

// A photo saved by saveProductImage, wherever it is stored (local, Vercel Blob
// or an R2/S3 bucket at the configured public URL).
const isStoredPhoto = (url) => {
  if (typeof url !== 'string') return false;
  if (UPLOAD_URL.test(url) || BLOB_URL.test(url)) return true;
  const { r2 } = getConfig();
  return Boolean(r2) && url.startsWith(`${r2.publicUrl}/`) && STORED_NAME.test(url.slice(r2.publicUrl.length + 1));
};
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

// Uploads one photo to the configured S3-compatible bucket (Cloudflare R2) and
// returns its public URL. aws4fetch signs the request; it is loaded only here.
const storeInR2 = async (r2, name, data) => {
  const { AwsClient } = require('aws4fetch');
  const client = new AwsClient({ accessKeyId: r2.accessKeyId, secretAccessKey: r2.secretAccessKey, region: 'auto', service: 's3' });
  const key = `products/${name}`;
  const res = await client.fetch(`${r2.endpoint}/${r2.bucket}/${key}`, {
    method: 'PUT',
    body: data,
    headers: { 'content-type': 'image/webp', 'cache-control': 'public, max-age=31536000, immutable' },
  });
  if (!res.ok) {
    logger.error('r2_upload_failed', { status: res.status, body: (await res.text().catch(() => '')).slice(0, 300) });
    throw new HttpError(502, 'The photo could not be saved to storage. Check the R2 settings and try again.');
  }
  return `${r2.publicUrl}/${key}`;
};

// An S3 bucket (R2) if configured, else Vercel Blob, else the local disk.
// Serverless hosting (Vercel) has no lasting disk, so one of the first two is required.
const store = async (name, data) => {
  const config = getConfig();
  if (config.r2) return storeInR2(config.r2, name, data);
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
  if (config.onVercel)
    throw new HttpError(503, 'Photo storage is not set up yet: connect a Vercel Blob store (or set the R2_* variables) to the project, then redeploy.');
  await fs.mkdir(config.UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(config.UPLOAD_DIR, name), data, { flag: 'wx' });
  return `${UPLOAD_URL_PREFIX}${name}`;
};

module.exports = { saveProductImage, isStoredPhoto, UPLOAD_URL, BLOB_URL, UPLOAD_URL_PREFIX };
