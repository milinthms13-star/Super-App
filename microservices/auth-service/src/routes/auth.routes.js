const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { body } = require('express-validator');

// Validation middleware
const validateRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('name').trim().notEmpty().isLength({ min: 2, max: 100 }),
  body('phone').optional().isMobilePhone(),
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('mpin').isLength({ min: 4, max: 6 }).isNumeric(),
];

const validateMpin = [
  body('mpin').isLength({ min: 4, max: 6 }).isNumeric(),
];

// Routes
router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.loginWithMpin);
router.post('/set-mpin', authMiddleware.authenticate, validateMpin, authController.setMpin);
router.post('/logout', authMiddleware.authenticate, authController.logout);
router.get('/verify', authMiddleware.authenticate, authController.verifyToken);

module.exports = router;
