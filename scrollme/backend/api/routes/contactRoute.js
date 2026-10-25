const express = require('express');
const contact = require('../controllers/contactController');
const { optionalAuth } = require('../middleware/authMiddleware');
const { contactLimiter } = require('../middleware/rateLimit');
const validate = require('../middleware/validate');
const s = require('../validators/schemas');
const { asyncHandler } = require('../utils/httpError');

const router = express.Router();

// The contact page form.
router.post('/', contactLimiter, optionalAuth, validate({ body: s.contactMessage }), asyncHandler(contact.createMessage));

module.exports = router;
