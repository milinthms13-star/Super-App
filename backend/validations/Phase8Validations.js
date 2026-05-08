/**
 * Phase 8 Validations
 * Comprehensive validation middleware for all Phase 8 endpoints
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array().map((e) => ({ field: e.param, message: e.msg })),
    });
  }
  next();
};

// Menu Variant Validators

const createMenuVariantValidation = [
  body('menuItemId').notEmpty().withMessage('menuItemId is required'),
  body('restaurantId').notEmpty().withMessage('restaurantId is required'),
  body('variantName')
    .notEmpty()
    .withMessage('variantName is required')
    .isIn(['half', 'full', 'small', 'medium', 'large', 'xlarge', 'single', 'double', 'combo'])
    .withMessage('Invalid variant name'),
  body('displayName').notEmpty().withMessage('displayName is required'),
  body('basePrice').isFloat({ min: 0 }).withMessage('basePrice must be a positive number'),
  handleValidationErrors,
];

const updateMenuVariantValidation = [
  param('variantId').notEmpty().withMessage('variantId is required'),
  handleValidationErrors,
];

const getMenuVariantValidation = [
  param('variantId').notEmpty().withMessage('variantId is required'),
  handleValidationErrors,
];

// AddOn Validators

const createAddOnValidation = [
  body('restaurantId').notEmpty().withMessage('restaurantId is required'),
  body('addOnName').notEmpty().withMessage('addOnName is required'),
  body('category')
    .notEmpty()
    .withMessage('category is required')
    .isIn(['cheese', 'sauce', 'topping', 'spice', 'drink', 'dessert', 'extra', 'other'])
    .withMessage('Invalid category'),
  body('price').isFloat({ min: 0 }).withMessage('price must be a positive number'),
  handleValidationErrors,
];

const getAddOnValidation = [
  param('addOnId').notEmpty().withMessage('addOnId is required'),
  handleValidationErrors,
];

const checkAllergensValidation = [
  param('addOnId').notEmpty().withMessage('addOnId is required'),
  body('userAllergens').isArray().withMessage('userAllergens must be an array'),
  handleValidationErrors,
];

// Scheduled Delivery Validators

const createScheduledOrderValidation = [
  body('orderId').notEmpty().withMessage('orderId is required'),
  body('userId').notEmpty().withMessage('userId is required'),
  body('restaurantId').notEmpty().withMessage('restaurantId is required'),
  body('scheduledDeliveryTime').notEmpty().withMessage('scheduledDeliveryTime is required'),
  body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array'),
  body('pricing').notEmpty().withMessage('pricing is required'),
  body('paymentMethod')
    .notEmpty()
    .withMessage('paymentMethod is required')
    .isIn(['wallet', 'card', 'upi', 'cod'])
    .withMessage('Invalid payment method'),
  body('deliveryAddress').notEmpty().withMessage('deliveryAddress is required'),
  handleValidationErrors,
];

const getScheduledOrderValidation = [
  param('scheduledOrderId').notEmpty().withMessage('scheduledOrderId is required'),
  handleValidationErrors,
];

const modifyScheduledOrderValidation = [
  param('scheduledOrderId').notEmpty().withMessage('scheduledOrderId is required'),
  handleValidationErrors,
];

const updateScheduledOrderStatusValidation = [
  param('scheduledOrderId').notEmpty().withMessage('scheduledOrderId is required'),
  body('status')
    .notEmpty()
    .withMessage('status is required')
    .isIn(['scheduled', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'failed'])
    .withMessage('Invalid status'),
  handleValidationErrors,
];

const cancelScheduledOrderValidation = [
  param('scheduledOrderId').notEmpty().withMessage('scheduledOrderId is required'),
  body('reason').notEmpty().withMessage('reason is required'),
  handleValidationErrors,
];

const rateScheduledOrderValidation = [
  param('scheduledOrderId').notEmpty().withMessage('scheduledOrderId is required'),
  body('score').isInt({ min: 1, max: 5 }).withMessage('score must be between 1 and 5'),
  handleValidationErrors,
];

// Loyalty Validators

const createLoyaltyAccountValidation = [
  body('userId').notEmpty().withMessage('userId is required'),
  handleValidationErrors,
];

const getLoyaltyAccountValidation = [
  param('userId').notEmpty().withMessage('userId is required'),
  handleValidationErrors,
];

const addPointsValidation = [
  body('userId').notEmpty().withMessage('userId is required'),
  body('amount').isInt({ min: 1 }).withMessage('amount must be a positive integer'),
  body('source').notEmpty().withMessage('source is required'),
  handleValidationErrors,
];

const redeemPointsValidation = [
  body('userId').notEmpty().withMessage('userId is required'),
  body('pointsToRedeem').isInt({ min: 1 }).withMessage('pointsToRedeem must be a positive integer'),
  body('rewardId').notEmpty().withMessage('rewardId is required'),
  body('rewardName').notEmpty().withMessage('rewardName is required'),
  handleValidationErrors,
];

const calculatePointsValidation = [
  body('userId').notEmpty().withMessage('userId is required'),
  body('orderValue').isFloat({ min: 0 }).withMessage('orderValue must be a positive number'),
  handleValidationErrors,
];

const applyCashbackValidation = [
  body('userId').notEmpty().withMessage('userId is required'),
  body('orderValue').isFloat({ min: 0 }).withMessage('orderValue must be a positive number'),
  handleValidationErrors,
];

const addReferralValidation = [
  body('userId').notEmpty().withMessage('userId is required'),
  body('referredUserId').notEmpty().withMessage('referredUserId is required'),
  body('referredEmail').isEmail().withMessage('referredEmail must be a valid email'),
  handleValidationErrors,
];

// Recommendation Validators

const getRecommendationsValidation = [
  param('userId').notEmpty().withMessage('userId is required'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  handleValidationErrors,
];

const trackEngagementValidation = [
  body('userId').notEmpty().withMessage('userId is required'),
  body('recommendedItemId').notEmpty().withMessage('recommendedItemId is required'),
  body('action')
    .optional()
    .isIn(['viewed', 'clicked', 'ordered'])
    .withMessage('Invalid action'),
  handleValidationErrors,
];

// Analytics Validators

const generateDailyAnalyticsValidation = [
  body('date').optional().isISO8601().withMessage('date must be a valid ISO date'),
  handleValidationErrors,
];

const getAnalyticsRangeValidation = [
  query('startDate').notEmpty().withMessage('startDate is required'),
  query('endDate').notEmpty().withMessage('endDate is required'),
  query('period')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'yearly'])
    .withMessage('Invalid period'),
  handleValidationErrors,
];

const getBusinessInsightsValidation = [
  query('startDate').notEmpty().withMessage('startDate is required'),
  query('endDate').notEmpty().withMessage('endDate is required'),
  handleValidationErrors,
];

const getPeakHoursValidation = [
  query('restaurantId').optional().notEmpty().withMessage('restaurantId cannot be empty'),
  handleValidationErrors,
];

module.exports = {
  // Menu Variants
  createMenuVariantValidation,
  updateMenuVariantValidation,
  getMenuVariantValidation,

  // AddOns
  createAddOnValidation,
  getAddOnValidation,
  checkAllergensValidation,

  // Scheduled Orders
  createScheduledOrderValidation,
  getScheduledOrderValidation,
  modifyScheduledOrderValidation,
  updateScheduledOrderStatusValidation,
  cancelScheduledOrderValidation,
  rateScheduledOrderValidation,

  // Loyalty
  createLoyaltyAccountValidation,
  getLoyaltyAccountValidation,
  addPointsValidation,
  redeemPointsValidation,
  calculatePointsValidation,
  applyCashbackValidation,
  addReferralValidation,

  // Recommendations
  getRecommendationsValidation,
  trackEngagementValidation,

  // Analytics
  generateDailyAnalyticsValidation,
  getAnalyticsRangeValidation,
  getBusinessInsightsValidation,
  getPeakHoursValidation,

  // Middleware
  handleValidationErrors,
};
