const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { HttpError } = require('../utils/httpError');

const notFoundHandler = (req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message, ...(err.details ? { details: err.details } : {}) });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(404).json({ message: 'Not found' });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return res.status(400).json({ message: details[0]?.message || 'Invalid data', details });
  }
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    if (field === 'sku') return res.status(409).json({ message: 'A product with that SKU already exists.' });
    return res.status(409).json({ message: `An account with that ${field} already exists.` });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Malformed JSON body' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body too large' });
  }
  logger.error('unhandled_error', { err, method: req.method, path: req.originalUrl, requestId: req.id });
  res.status(500).json({ message: 'Something went wrong. Please try again.', requestId: req.id });
};

module.exports = { errorHandler, notFoundHandler };
