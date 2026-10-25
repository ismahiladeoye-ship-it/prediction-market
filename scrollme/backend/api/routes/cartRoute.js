const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const cartController = require('../controllers/cartController');
const s = require('../validators/schemas');
const { asyncHandler } = require('../utils/httpError');

router.use(authMiddleware);

router.get(['/', '/view'], asyncHandler(cartController.viewCart));
router.post('/add', validate({ body: s.cartAdd }), asyncHandler(cartController.addToCart));
router.put('/update', validate({ body: s.cartUpdate }), asyncHandler(cartController.updateCartItem));
router.delete('/delete', validate({ body: s.cartRemove }), asyncHandler(cartController.deleteCartItem));
// Same as /delete without a request body: DELETE /api/cart/items/:productId?size=M
router.delete(
  '/items/:productId',
  (req, res, next) => {
    req.body = { productId: req.params.productId, size: typeof req.query.size === 'string' ? req.query.size : '' };
    next();
  },
  validate({ body: s.cartRemove }),
  asyncHandler(cartController.deleteCartItem)
);
router.delete('/clear', asyncHandler(cartController.clearCart));

module.exports = router;
