const express = require('express');
const site = require('../controllers/siteController');
const { asyncHandler } = require('../utils/httpError');
const publicCache = require('../middleware/publicCache');

const router = express.Router();

// Shop content edited in the admin (e.g. home page cover images).
router.get('/home', publicCache(), asyncHandler(site.getHome));
router.get('/business', publicCache(), asyncHandler(site.getBusiness));

module.exports = router;
