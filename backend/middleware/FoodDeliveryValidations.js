/**
 * Food Delivery Validation Rules
 * Express-validator rules for FoodDelivery endpoints
 */

const { body, param, query } = require('express-validator');

class FoodDeliveryValidations {
  // ==================== AUTH VALIDATIONS ====================

  static sendOTPValidation() {
    return [
      body('phoneNumber')
        .matches(/^[0-9]{10}$/)
        .withMessage('Phone number must be 10 digits'),
    ];
  }

  static verifyOTPValidation() {
    return [
      body('phoneNumber')
        .matches(/^[0-9]{10}$/)
        .withMessage('Phone number must be 10 digits'),
      body('otp')
        .matches(/^[0-9]{6}$/)
        .withMessage('OTP must be 6 digits'),
      body('userData').optional().isObject(),
      body('deviceInfo').optional().isObject(),
    ];
  }

  static emailPasswordLoginValidation() {
    return [
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Invalid email address'),
      body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters'),
      body('deviceInfo').optional().isObject(),
    ];
  }

  static registerValidation() {
    return [
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Invalid email address'),
      body('password')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .withMessage(
          'Password must be at least 8 characters with uppercase, lowercase, number and special character'
        ),
      body('firstName')
        .trim()
        .notEmpty()
        .withMessage('First name is required')
        .isLength({ min: 2 })
        .withMessage('First name must be at least 2 characters'),
      body('lastName')
        .trim()
        .optional()
        .isLength({ min: 2 })
        .withMessage('Last name must be at least 2 characters'),
    ];
  }

  static socialLoginValidation() {
    return [
      body('provider')
        .isIn(['google', 'apple', 'facebook'])
        .withMessage('Invalid provider'),
      body('socialData').isObject().withMessage('Social data is required'),
      body('socialData.id')
        .notEmpty()
        .withMessage('Provider ID is required'),
      body('socialData.email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
      body('deviceInfo').optional().isObject(),
    ];
  }

  static forgotPasswordValidation() {
    return [
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Invalid email address'),
    ];
  }

  static resetPasswordValidation() {
    return [
      body('token')
        .notEmpty()
        .withMessage('Reset token is required'),
      body('password')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .withMessage(
          'Password must be at least 8 characters with uppercase, lowercase, number and special character'
        ),
    ];
  }

  static changePasswordValidation() {
    return [
      body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
      body('newPassword')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .withMessage(
          'New password must be at least 8 characters with uppercase, lowercase, number and special character'
        ),
    ];
  }

  // ==================== PROFILE VALIDATIONS ====================

  static updateProfileValidation() {
    return [
      body('firstName')
        .optional()
        .trim()
        .isLength({ min: 2 })
        .withMessage('First name must be at least 2 characters'),
      body('lastName')
        .optional()
        .trim()
        .isLength({ min: 2 })
        .withMessage('Last name must be at least 2 characters'),
      body('phoneNumber')
        .optional()
        .matches(/^[0-9]{10}$/)
        .withMessage('Phone number must be 10 digits'),
      body('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Invalid email address'),
      body('gender')
        .optional()
        .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
        .withMessage('Invalid gender'),
      body('dateOfBirth')
        .optional()
        .isISO8601()
        .withMessage('Invalid date format'),
    ];
  }

  static updatePreferencesValidation() {
    return [
      body('language')
        .optional()
        .isIn(['en', 'hi', 'ta', 'te', 'kn', 'ml'])
        .withMessage('Invalid language'),
      body('cuisine')
        .optional()
        .isArray()
        .withMessage('Cuisine must be an array'),
      body('dietaryRestrictions')
        .optional()
        .isArray()
        .withMessage('Dietary restrictions must be an array'),
      body('spiceLevel')
        .optional()
        .isIn(['mild', 'medium', 'hot', 'extra_hot'])
        .withMessage('Invalid spice level'),
      body('notificationPreferences')
        .optional()
        .isObject()
        .withMessage('Notification preferences must be an object'),
      body('darkMode')
        .optional()
        .isBoolean()
        .withMessage('Dark mode must be a boolean'),
    ];
  }

  // ==================== ADDRESS VALIDATIONS ====================

  static addAddressValidation() {
    return [
      body('label')
        .trim()
        .notEmpty()
        .withMessage('Address label is required'),
      body('addressType')
        .optional()
        .isIn(['home', 'work', 'other'])
        .withMessage('Invalid address type'),
      body('streetAddress')
        .trim()
        .notEmpty()
        .withMessage('Street address is required'),
      body('apt_building')
        .optional()
        .trim(),
      body('area')
        .optional()
        .trim(),
      body('city')
        .trim()
        .notEmpty()
        .withMessage('City is required'),
      body('state')
        .trim()
        .notEmpty()
        .withMessage('State is required'),
      body('postalCode')
        .matches(/^[0-9]{6}$/)
        .withMessage('Postal code must be 6 digits'),
      body('latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Invalid latitude'),
      body('longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Invalid longitude'),
      body('landmark')
        .optional()
        .trim(),
      body('instructions')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Instructions must not exceed 500 characters'),
      body('contactName')
        .optional()
        .trim(),
      body('contactPhone')
        .optional()
        .matches(/^[0-9]{10}$/)
        .withMessage('Contact phone must be 10 digits'),
      body('isDefault')
        .optional()
        .isBoolean()
        .withMessage('isDefault must be a boolean'),
    ];
  }

  static updateAddressValidation() {
    return [
      body('label')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Address label cannot be empty'),
      body('addressType')
        .optional()
        .isIn(['home', 'work', 'other'])
        .withMessage('Invalid address type'),
      body('streetAddress')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Street address cannot be empty'),
      body('apt_building')
        .optional()
        .trim(),
      body('area')
        .optional()
        .trim(),
      body('city')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('City cannot be empty'),
      body('state')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('State cannot be empty'),
      body('postalCode')
        .optional()
        .matches(/^[0-9]{6}$/)
        .withMessage('Postal code must be 6 digits'),
      body('latitude')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Invalid latitude'),
      body('longitude')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Invalid longitude'),
      body('landmark')
        .optional()
        .trim(),
      body('instructions')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Instructions must not exceed 500 characters'),
      body('isDefault')
        .optional()
        .isBoolean()
        .withMessage('isDefault must be a boolean'),
    ];
  }

  static addressIdValidation() {
    return [
      param('addressId')
        .isMongoId()
        .withMessage('Invalid address ID'),
    ];
  }
}

module.exports = FoodDeliveryValidations;
