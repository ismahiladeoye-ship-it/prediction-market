const express = require('express');
const validate = require('../middleware/validate');
const s = require('../validators/schemas');
const c = require('../controllers/priceSyncController');
const { asyncHandler } = require('../utils/httpError');

// Daily price check. app.js puts c.requireSyncKey in front of all of these.
const router = express.Router();
router.get('/products', validate({ query: s.priceSyncListQuery }), asyncHandler(c.listProducts));
router.post('/sources', validate({ body: s.priceSyncSources }), asyncHandler(c.setSources));
router.post('/apply', validate({ body: s.priceSyncApply }), asyncHandler(c.apply));
router.post('/report', validate({ body: s.priceSyncReport }), asyncHandler(c.report));
module.exports = router;
