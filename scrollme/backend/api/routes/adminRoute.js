const express = require('express');
const { z } = require('zod');
const router = express.Router();
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const admin = require('../controllers/adminController');
const uploads = require('../controllers/uploadController');
const site = require('../controllers/siteController');
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

// Home page cover images.
router.put('/home', validate({ body: s.homeContent }), asyncHandler(site.updateHome));
router.delete('/home', asyncHandler(site.resetHome));

// Product photos (multipart, one image per request).
router.post('/uploads', uploads.receivePhoto, asyncHandler(uploads.uploadPhoto));

router.get('/products', validate({ query: adminProductQuery }), asyncHandler(admin.listProducts));
router.post('/products', validate({ body: s.productCreate }), asyncHandler(admin.createProduct));
router.post(
  '/products/import',
  validate({
    body: z.object({
      csv: z.string().min(1, 'Choose a spreadsheet').max(2_000_000, 'The spreadsheet is too large (2 MB maximum)'),
      dryRun: z.boolean().default(true),
      // Photo file name -> uploaded URL (null while only checking).
      photos: z
        .record(z.string().max(255), z.string().max(200).nullable())
        .refine((p) => Object.keys(p).length <= 2000, 'Too many photos')
        .default({}),
    }),
  }),
  asyncHandler(admin.importProducts)
);
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
router.get(
  '/order-book',
  validate({
    query: z.object({
      month: z
        .string()
        .regex(/^20\d\d-(0[1-9]|1[0-2])$/, 'Use a month like 2026-10')
        .optional(),
    }),
  }),
  asyncHandler(admin.orderBook)
);
router.get('/orders/:orderId', orderId, asyncHandler(admin.getOrder));
router.patch('/orders/:orderId/status', orderId, validate({ body: s.orderStatusUpdate }), asyncHandler(admin.updateOrderStatus));

module.exports = router;
