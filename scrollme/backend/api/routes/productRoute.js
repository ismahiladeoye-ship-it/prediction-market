const express = require('express');
const router = express.Router();
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const productController = require('../controllers/productController');
const admin = require('../controllers/adminController');
const s = require('../validators/schemas');
const { asyncHandler } = require('../utils/httpError');
const publicCache = require('../middleware/publicCache');

const idParams = validate({ params: s.idParam('productId') });

// Public catalogue (the same for everyone, so the CDN may share it briefly)
router.get('/list', publicCache(), validate({ query: s.productListQuery }), asyncHandler(productController.listProducts));
router.get('/categories', publicCache(), asyncHandler(productController.listCategories));
router.get('/brands', publicCache(), asyncHandler(productController.listBrands));
router.get('/highlights', publicCache(), asyncHandler(productController.highlights));
router.get('/:productId', publicCache(), idParams, asyncHandler(productController.getProductById));

// Original write endpoints, now restricted to admins (same handlers as /api/admin/products)
router.post('/add', authMiddleware, requireAdmin, validate({ body: s.productCreate }), asyncHandler(admin.createProduct));
router.put('/update/:productId', authMiddleware, requireAdmin, idParams, validate({ body: s.productUpdate }), asyncHandler(admin.updateProduct));
router.delete('/delete/:productId', authMiddleware, requireAdmin, idParams, asyncHandler(admin.deleteProduct));

module.exports = router;
