// `reason` is a stable machine-readable code for the client (e.g. MFA_SETUP_REQUIRED).
class HttpError extends Error {
  constructor(status, message, details, reason) {
    super(message);
    this.status = status;
    this.details = details;
    this.reason = reason;
  }
}

const badRequest = (message, details) => new HttpError(400, message, details);
const unauthorized = (message = 'Authentication required') => new HttpError(401, message);
const forbidden = (message = 'You do not have permission to do that', reason) => new HttpError(403, message, undefined, reason);
const notFound = (message = 'Not found') => new HttpError(404, message);
const conflict = (message, details) => new HttpError(409, message, details);

// Wraps async route handlers so rejected promises reach the error middleware.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { HttpError, badRequest, unauthorized, forbidden, notFound, conflict, asyncHandler };
