const express = require('express');
const site = require('../controllers/siteController');
const { asyncHandler } = require('../utils/httpError');

const router = express.Router();

// Shop content edited in the admin (e.g. home page cover images).
router.get('/home', asyncHandler(site.getHome));

module.exports = router;
