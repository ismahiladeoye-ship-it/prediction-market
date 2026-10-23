const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const payments = require('../controllers/paymentController');
const s = require('../validators/schemas');
const { asyncHandler } = require('../utils/httpError');

// The webhook needs the exact raw bytes for signature verification, so it is
// mounted in app.js before the JSON body parser.
router.post('/mock/:orderId/complete', authMiddleware, validate({ params: s.idParam('orderId') }), asyncHandler(payments.completeMockPayment));

module.exports = router;
