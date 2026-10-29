const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const authenticateUser = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  demoLoginSchema
} = require('../validators/authValidator');

// Public Authentication Endpoints
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
// router.post('/demo-login', validate(demoLoginSchema), authController.demoLogin);

// Protected Identity & Profile Endpoints
router.use(authenticateUser);
router.post('/logout', authController.logout);
router.get('/me', authController.getProfile);
router.get('/profile', authController.getProfile);
router.put('/profile', validate(updateProfileSchema), authController.updateProfile);
router.get('/role', authController.getRole);

module.exports = router;
