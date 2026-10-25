const express = require('express');
const { z } = require('zod');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const wishlist = require('../controllers/wishlistController');
const s = require('../validators/schemas');
const { asyncHandler } = require('../utils/httpError');

router.use(authMiddleware);
router.get('/', asyncHandler(wishlist.getWishlist));
router.post('/', validate({ body: z.object({ productId: s.objectId }) }), asyncHandler(wishlist.addToWishlist));
router.post('/merge', validate({ body: z.object({ productIds: z.array(s.objectId).max(200) }) }), asyncHandler(wishlist.mergeWishlist));
router.delete('/', asyncHandler(wishlist.clearWishlist));
router.delete('/:productId', validate({ params: s.idParam('productId') }), asyncHandler(wishlist.removeFromWishlist));

module.exports = router;
