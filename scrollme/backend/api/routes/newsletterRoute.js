const express = require('express');
const { z } = require('zod');
const router = express.Router();
const validate = require('../middleware/validate');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');
const { newsletterLimiter } = require('../middleware/rateLimit');
const newsletter = require('../controllers/newsletterController');
const { asyncHandler } = require('../utils/httpError');

const body = z.object({ email: z.string().trim().toLowerCase().email('Please enter a valid email address').max(254) });

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

router.post('/', newsletterLimiter, validate({ body }), asyncHandler(newsletter.subscribe));
router.get('/', authMiddleware, requireAdmin, validate({ query: listQuery }), asyncHandler(newsletter.listSubscribers));

module.exports = router;
