/**
 * Food Delivery Authentication & Profile Routes
 * Phase 1 API endpoints
 */

const express = require('express');
const FoodDeliveryAuthController = require('../controllers/FoodDeliveryAuthController');
const FoodDeliveryUserProfileController = require('../controllers/FoodDeliveryUserProfileController');
const FoodDeliveryValidations = require('../middleware/FoodDeliveryValidations');
const { authenticateToken } = require('../middleware/authMiddleware');
const uploadMiddleware = require('../middleware/uploadMiddleware');

const router = express.Router();

// ==================== AUTHENTICATION ROUTES ====================

// Send OTP
router.post(
  '/auth/send-otp',
  FoodDeliveryValidations.sendOTPValidation(),
  FoodDeliveryAuthController.sendOTP
);

// Verify OTP & Login
router.post(
  '/auth/verify-otp',
  FoodDeliveryValidations.verifyOTPValidation(),
  FoodDeliveryAuthController.verifyOTP
);

// Email/Password Login
router.post(
  '/auth/login',
  FoodDeliveryValidations.emailPasswordLoginValidation(),
  FoodDeliveryAuthController.login
);

// Social Login
router.post(
  '/auth/social-login',
  FoodDeliveryValidations.socialLoginValidation(),
  FoodDeliveryAuthController.socialLogin
);

// Register with Email & Password
router.post(
  '/auth/register',
  FoodDeliveryValidations.registerValidation(),
  FoodDeliveryAuthController.register
);

// Verify Email Token
router.post(
  '/auth/verify-email',
  FoodDeliveryAuthController.verifyEmail
);

// Forgot Password
router.post(
  '/auth/forgot-password',
  FoodDeliveryValidations.forgotPasswordValidation(),
  FoodDeliveryAuthController.forgotPassword
);

// Reset Password
router.post(
  '/auth/reset-password',
  FoodDeliveryValidations.resetPasswordValidation(),
  FoodDeliveryAuthController.resetPassword
);

// Change Password (Protected)
router.post(
  '/auth/change-password',
  authenticateToken,
  FoodDeliveryValidations.changePasswordValidation(),
  FoodDeliveryAuthController.changePassword
);

// Logout (Protected)
router.post(
  '/auth/logout',
  authenticateToken,
  FoodDeliveryAuthController.logout
);

// Refresh Token
router.post(
  '/auth/refresh-token',
  FoodDeliveryAuthController.refreshToken
);

// ==================== PROFILE ROUTES (PROTECTED) ====================

// Get Profile
router.get(
  '/profile',
  authenticateToken,
  FoodDeliveryUserProfileController.getProfile
);

// Update Profile
router.put(
  '/profile',
  authenticateToken,
  FoodDeliveryValidations.updateProfileValidation(),
  FoodDeliveryUserProfileController.updateProfile
);

// Upload Profile Picture
router.post(
  '/profile/picture',
  authenticateToken,
  uploadMiddleware.single('profilePicture'),
  FoodDeliveryUserProfileController.uploadProfilePicture
);

// Update Preferences
router.put(
  '/profile/preferences',
  authenticateToken,
  FoodDeliveryValidations.updatePreferencesValidation(),
  FoodDeliveryUserProfileController.updatePreferences
);

// ==================== ADDRESS ROUTES (PROTECTED) ====================

// Add Address
router.post(
  '/addresses',
  authenticateToken,
  FoodDeliveryValidations.addAddressValidation(),
  FoodDeliveryUserProfileController.addAddress
);

// Get All Addresses
router.get(
  '/addresses',
  authenticateToken,
  FoodDeliveryUserProfileController.getAddresses
);

// Get Default Address
router.get(
  '/addresses/default',
  authenticateToken,
  FoodDeliveryUserProfileController.getDefaultAddress
);

// Update Address
router.put(
  '/addresses/:addressId',
  authenticateToken,
  FoodDeliveryValidations.addressIdValidation(),
  FoodDeliveryValidations.updateAddressValidation(),
  FoodDeliveryUserProfileController.updateAddress
);

// Delete Address
router.delete(
  '/addresses/:addressId',
  authenticateToken,
  FoodDeliveryValidations.addressIdValidation(),
  FoodDeliveryUserProfileController.deleteAddress
);

// Set Default Address
router.put(
  '/addresses/:addressId/default',
  authenticateToken,
  FoodDeliveryValidations.addressIdValidation(),
  FoodDeliveryUserProfileController.setDefaultAddress
);

// Verify Address
router.post(
  '/addresses/:addressId/verify',
  authenticateToken,
  FoodDeliveryValidations.addressIdValidation(),
  FoodDeliveryUserProfileController.verifyAddress
);

// Record Address Usage
router.post(
  '/addresses/:addressId/usage',
  authenticateToken,
  FoodDeliveryValidations.addressIdValidation(),
  FoodDeliveryUserProfileController.recordAddressUsage
);

module.exports = router;
