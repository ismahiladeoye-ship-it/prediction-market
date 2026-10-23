const multer = require('multer');
const { saveProductImage } = require('../services/images');
const { badRequest } = require('../utils/httpError');
const logger = require('../utils/logger');

const MAX_BYTES = 15 * 1024 * 1024;

// One photo per request, held in memory only until it has been re-encoded.
const receive = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1, fields: 0 } }).single('image');

exports.receivePhoto = (req, res, next) =>
  receive(req, res, (err) => {
    if (err?.code === 'LIMIT_FILE_SIZE') return next(badRequest('Photos must be 15 MB or smaller'));
    if (err) return next(badRequest('Send one photo in the "image" field'));
    if (!req.file) return next(badRequest('Choose a photo to upload'));
    next();
  });

exports.uploadPhoto = async (req, res) => {
  const image = await saveProductImage(req.file.buffer);
  logger.info('admin_action', { action: 'photo_upload', adminId: String(req.user._id), url: image.url, bytes: image.bytes });
  res.status(201).json(image);
};
