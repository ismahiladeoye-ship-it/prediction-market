const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');
const s = require('../validators/schemas');
const { asyncHandler } = require('../utils/httpError');

router.post('/register', authLimiter, validate({ body: s.register }), asyncHandler(auth.register));
router.post('/login', authLimiter, validate({ body: s.login }), asyncHandler(auth.login));
router.post('/google', authLimiter, validate({ body: s.googleLogin }), asyncHandler(auth.googleLogin));
router.post('/logout', asyncHandler(auth.logOut));
router.post('/refresh-token', asyncHandler(auth.refreshToken));
router.post('/forgot-password', authLimiter, validate({ body: s.forgotPassword }), asyncHandler(auth.forgotPassword));
router.post('/reset-password', authLimiter, validate({ body: s.resetPassword }), asyncHandler(auth.resetPassword));
router.get('/status', authMiddleware, asyncHandler(auth.checkAuthStatus));
router.get('/me', authMiddleware, asyncHandler(auth.me));

module.exports = router;
