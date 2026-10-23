const express = require('express');
const { z } = require('zod');
const router = express.Router();
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const admin = require('../controllers/adminController');
const s = require('../validators/schemas');
const { asyncHandler } = require('../utils/httpError');

const productId = validate({ params: s.idParam('productId') });
const orderId = validate({ params: s.idParam('orderId') });
const adminProductQuery = s.productListQuery.extend({
  active: z.enum(['true', 'false']).optional(),
  lowStock: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.use(authMiddleware, requireAdmin);

router.get('/stats', asyncHandler(admin.stats));

router.get('/products', validate({ query: adminProductQuery }), asyncHandler(admin.listProducts));
router.post('/products', validate({ body: s.productCreate }), asyncHandler(admin.createProduct));
router.get('/products/:productId', productId, asyncHandler(admin.getProduct));
router.patch('/products/:productId', productId, validate({ body: s.productUpdate }), asyncHandler(admin.updateProduct));
router.delete('/products/:productId', productId, asyncHandler(admin.deleteProduct));
router.post(
  '/products/:productId/stock',
  productId,
  validate({
    body: z.object({
      delta: z.coerce
        .number()
        .int()
        .min(-100000)
        .max(100000)
        .refine((v) => v !== 0, 'delta must not be 0'),
    }),
  }),
  asyncHandler(admin.adjustStock)
);

router.get('/orders', validate({ query: s.pageQuery }), asyncHandler(admin.listOrders));
router.get('/orders/:orderId', orderId, asyncHandler(admin.getOrder));
router.patch('/orders/:orderId/status', orderId, validate({ body: s.orderStatusUpdate }), asyncHandler(admin.updateOrderStatus));

module.exports = router;
