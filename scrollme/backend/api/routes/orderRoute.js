const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const orders = require('../controllers/orderController');
const s = require('../validators/schemas');
const { checkoutLimiter } = require('../middleware/rateLimit');
const { asyncHandler } = require('../utils/httpError');

const idParams = validate({ params: s.idParam('orderId') });

router.use(authMiddleware);
router.post('/', checkoutLimiter, validate({ body: s.checkout }), asyncHandler(orders.checkout));
router.get('/', validate({ query: s.pageQuery }), asyncHandler(orders.listMyOrders));
router.get('/:orderId', idParams, asyncHandler(orders.getOrder));
router.post('/:orderId/cancel', idParams, asyncHandler(orders.cancelOrder));
router.post('/:orderId/pay', checkoutLimiter, idParams, asyncHandler(orders.resumePayment));

module.exports = router;
