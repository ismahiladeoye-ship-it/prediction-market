const express = require('express');
const { z } = require('zod');
const router = express.Router();
const validate = require('../middleware/validate');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimit');
const newsletter = require('../controllers/newsletterController');
const { asyncHandler } = require('../utils/httpError');

const body = z.object({ email: z.string().trim().toLowerCase().email('Please enter a valid email address').max(254) });

router.post('/', authLimiter, validate({ body }), asyncHandler(newsletter.subscribe));
router.get('/', authMiddleware, requireAdmin, asyncHandler(newsletter.listSubscribers));

module.exports = router;
