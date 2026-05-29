const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const authController = require('../controllers/auth.controller');
const authValidator = require('../validators/auth.validator');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts — please try again later' },
});

// Public
router.post('/signup',          authLimiter, validate(authValidator.signup),       authController.signup);
router.post('/login',           authLimiter, validate(authValidator.login),        authController.login);
router.post('/refresh',         authLimiter, validate(authValidator.refresh),       authController.refresh);
router.post('/password/forgot', authLimiter, validate(authValidator.requestReset), authController.requestPasswordReset);
router.post('/password/reset',  authLimiter, validate(authValidator.resetPassword), authController.resetPassword);

// Authenticated
router.post('/logout',  authenticate, authController.logout);
router.get('/me',       authenticate, authController.me);
router.patch('/me',     authenticate, validate(authValidator.updateProfile), authController.updateMe);

// Admin only
router.get('/users',   authenticate, authorize('admin'), authController.listUsers);

// Google OAuth
router.post('/google', authLimiter, authController.googleLogin);

// WebAuthn — registration (requires being logged in)
router.post('/webauthn/register/start',  authenticate, authController.webAuthnRegisterStart);
router.post('/webauthn/register/finish', authenticate, authController.webAuthnRegisterFinish);

// WebAuthn — login (public, provides its own auth)
router.post('/webauthn/login/start',  authLimiter, authController.webAuthnLoginStart);
router.post('/webauthn/login/finish', authLimiter, authController.webAuthnLoginFinish);

module.exports = router;
