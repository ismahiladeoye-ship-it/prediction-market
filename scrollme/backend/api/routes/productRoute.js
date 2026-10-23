const express = require('express');
const router = express.Router();
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const productController = require('../controllers/productController');
const admin = require('../controllers/adminController');
const s = require('../validators/schemas');
const { asyncHandler } = require('../utils/httpError');

const idParams = validate({ params: s.idParam('productId') });

// Public catalogue
router.get('/list', validate({ query: s.productListQuery }), asyncHandler(productController.listProducts));
router.get('/categories', asyncHandler(productController.listCategories));
router.get('/collections', asyncHandler(productController.listCollections));
router.get('/brands', asyncHandler(productController.listBrands));
router.get('/:productId', idParams, asyncHandler(productController.getProductById));

// Original write endpoints, now restricted to admins (same handlers as /api/admin/products)
router.post('/add', authMiddleware, requireAdmin, validate({ body: s.productCreate }), asyncHandler(admin.createProduct));
router.put('/update/:productId', authMiddleware, requireAdmin, idParams, validate({ body: s.productUpdate }), asyncHandler(admin.updateProduct));
router.delete('/delete/:productId', authMiddleware, requireAdmin, idParams, asyncHandler(admin.deleteProduct));

module.exports = router;
