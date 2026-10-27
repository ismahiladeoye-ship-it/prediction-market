const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const mfa = require('../controllers/mfaController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const {
  authLimiter,
  loginAccountLimiter,
  mfaAccountLimiter,
  registerLimiter,
  passwordResetLimiter,
  passwordResetEmailLimiter,
  verificationEmailLimiter,
} = require('../middleware/rateLimit');
const s = require('../validators/schemas');
const { asyncHandler } = require('../utils/httpError');

router.post('/register', registerLimiter, authLimiter, validate({ body: s.register }), asyncHandler(auth.register));
router.post('/login', authLimiter, validate({ body: s.login }), loginAccountLimiter, asyncHandler(auth.login));
router.post('/google', authLimiter, validate({ body: s.googleLogin }), asyncHandler(auth.googleLogin));
router.post('/logout', asyncHandler(auth.logOut));
router.post('/refresh-token', asyncHandler(auth.refreshToken));
router.post('/forgot-password', passwordResetLimiter, validate({ body: s.forgotPassword }), passwordResetEmailLimiter, asyncHandler(auth.forgotPassword));
router.post('/reset-password', authLimiter, validate({ body: s.resetPassword }), asyncHandler(auth.resetPassword));
router.get('/status', authMiddleware, asyncHandler(auth.checkAuthStatus));

// Confirming a new account's email address with the 6-digit code.
router.post('/verify-email', authMiddleware, authLimiter, validate({ body: s.emailCode }), asyncHandler(auth.verifyEmail));
router.post('/resend-verification', authMiddleware, verificationEmailLimiter, asyncHandler(auth.resendVerification));

// Two-factor sign-in (admins).
router.get('/mfa', authMiddleware, asyncHandler(mfa.status));
router.post('/mfa/setup', authMiddleware, asyncHandler(mfa.setup));
router.post('/mfa/enable', authMiddleware, validate({ body: s.mfaCode }), asyncHandler(mfa.enable));
router.post('/mfa/verify', authLimiter, validate({ body: s.mfaCode }), mfa.loadPending, mfaAccountLimiter, asyncHandler(mfa.verify));
router.get('/me', authMiddleware, asyncHandler(auth.me));

module.exports = router;
