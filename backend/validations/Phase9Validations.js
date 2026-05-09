/**
 * Phase 9 Validations - Input validation for all Phase 9 features
 * Uses express-validator for comprehensive request validation
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware: Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

/**
 * FEATURE A: Order Tracking Validations
 */

const validateInitializeTracking = [
  body('deliveryPartnerId').notEmpty().withMessage('deliveryPartnerId is required'),
  body('restaurantId').notEmpty().withMessage('restaurantId is required'),
  handleValidationErrors,
];

const validateUpdateOrderStatus = [
  param('trackingId').notEmpty().withMessage('trackingId is required'),
  body('newStatus').isIn(['placed', 'confirmed', 'preparing', 'ready', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled', 'failed']).withMessage('Invalid status'),
  handleValidationErrors,
];

const validateUpdateLocation = [
  param('trackingId').notEmpty().withMessage('trackingId is required'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  handleValidationErrors,
];

const validateAddNotification = [
  param('trackingId').notEmpty().withMessage('trackingId is required'),
  body('notificationType').notEmpty().withMessage('notificationType is required'),
  body('message').notEmpty().withMessage('message is required'),
  handleValidationErrors,
];

const validateReportIssue = [
  param('trackingId').notEmpty().withMessage('trackingId is required'),
  body('issueType').notEmpty().withMessage('issueType is required'),
  body('description').notEmpty().withMessage('description is required'),
  handleValidationErrors,
];

/**
 * FEATURE B: Review & Safety Validations
 */

const validateSubmitReview = [
  body('orderId').notEmpty().withMessage('orderId is required'),
  body('restaurantId').notEmpty().withMessage('restaurantId is required'),
  body('reviewData.overallRating').isInt({ min: 1, max: 5 }).withMessage('overallRating must be 1-5'),
  handleValidationErrors,
];

const validateAddMedia = [
  param('reviewId').notEmpty().withMessage('reviewId is required'),
  body('mediaUrl').isURL().withMessage('Invalid mediaUrl'),
  body('mediaType').isIn(['photo', 'video']).withMessage('mediaType must be photo or video'),
  handleValidationErrors,
];

const validateMarkHelpful = [
  param('reviewId').notEmpty().withMessage('reviewId is required'),
  body('isHelpful').isBoolean().withMessage('isHelpful must be boolean'),
  handleValidationErrors,
];

const validateFlagReview = [
  param('reviewId').notEmpty().withMessage('reviewId is required'),
  body('flagReason').notEmpty().withMessage('flagReason is required'),
  handleValidationErrors,
];

const validateModerateReview = [
  param('reviewId').notEmpty().withMessage('reviewId is required'),
  body('action').isIn(['approve', 'reject']).withMessage('action must be approve or reject'),
  handleValidationErrors,
];

const validateUpdateFSSAI = [
  param('restaurantId').notEmpty().withMessage('restaurantId is required'),
  body('fssaiData.licenseNumber').notEmpty().withMessage('licenseNumber is required'),
  handleValidationErrors,
];

const validateRecordComplaint = [
  param('restaurantId').notEmpty().withMessage('restaurantId is required'),
  body('complaintData.type').notEmpty().withMessage('type is required'),
  body('complaintData.description').notEmpty().withMessage('description is required'),
  handleValidationErrors,
];

/**
 * FEATURE C: Gamification Validations
 */

const validateAddExperience = [
  body('amount').isInt({ min: 1 }).withMessage('amount must be positive integer'),
  handleValidationErrors,
];

const validateUpdateStreak = [
  body('streakType').isIn(['ordering', 'reviewing', 'referral']).withMessage('Invalid streakType'),
  handleValidationErrors,
];

const validateRecordAchievement = [
  body('achievementType').notEmpty().withMessage('achievementType is required'),
  body('title').notEmpty().withMessage('title is required'),
  handleValidationErrors,
];

const validateGetLeaderboard = [
  query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('limit must be 1-500'),
  handleValidationErrors,
];

const validateGetLeaderboardByCategory = [
  param('category').notEmpty().withMessage('category is required'),
  query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('limit must be 1-500'),
  handleValidationErrors,
];

/**
 * FEATURE D: Dynamic Pricing & Promotion Validations
 */

const validateCreatePricingRule = [
  body('restaurantId').notEmpty().withMessage('restaurantId is required'),
  body('ruleData.strategyType').isIn(['surge_pricing', 'personalized', 'time_based', 'demand_based', 'competitor_based']).withMessage('Invalid strategyType'),
  handleValidationErrors,
];

const validateCalculatePrice = [
  body('restaurantId').notEmpty().withMessage('restaurantId is required'),
  body('orderData').notEmpty().withMessage('orderData is required'),
  handleValidationErrors,
];

const validateCreatePromotion = [
  body('restaurantId').notEmpty().withMessage('restaurantId is required'),
  body('promotionData.promotionType').notEmpty().withMessage('promotionType is required'),
  body('promotionData.promotionName').notEmpty().withMessage('promotionName is required'),
  handleValidationErrors,
];

const validateValidateCoupon = [
  body('couponCode').notEmpty().withMessage('couponCode is required'),
  body('orderData').notEmpty().withMessage('orderData is required'),
  handleValidationErrors,
];

const validateApplyPromotion = [
  body('promotionId').notEmpty().withMessage('promotionId is required'),
  body('orderId').notEmpty().withMessage('orderId is required'),
  body('orderValue').isFloat({ min: 0 }).withMessage('orderValue must be positive'),
  handleValidationErrors,
];

/**
 * FEATURE E: Vendor & Inventory Validations
 */

const validateCreateVendor = [
  body('restaurantName').notEmpty().withMessage('restaurantName is required'),
  body('address').notEmpty().withMessage('address is required'),
  body('city').notEmpty().withMessage('city is required'),
  handleValidationErrors,
];

const validateUpdateRatings = [
  param('vendorId').notEmpty().withMessage('vendorId is required'),
  body('ratingData').notEmpty().withMessage('ratingData is required'),
  handleValidationErrors,
];

const validateGetNearbyVendors = [
  query('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  query('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  query('radius').optional().isFloat({ min: 0.1 }).withMessage('radius must be positive'),
  handleValidationErrors,
];

const validateSearchByCuisine = [
  param('cuisine').notEmpty().withMessage('cuisine is required'),
  handleValidationErrors,
];

const validateCanDeliverTo = [
  param('vendorId').notEmpty().withMessage('vendorId is required'),
  body('deliveryArea').notEmpty().withMessage('deliveryArea is required'),
  handleValidationErrors,
];

const validateCreateInventoryItem = [
  body('restaurantId').notEmpty().withMessage('restaurantId is required'),
  body('itemData.menuItemId').notEmpty().withMessage('menuItemId is required'),
  body('itemData.currentStock').isInt({ min: 0 }).withMessage('currentStock must be non-negative'),
  handleValidationErrors,
];

const validateUpdateStock = [
  param('inventoryId').notEmpty().withMessage('inventoryId is required'),
  body('quantity').isInt({ min: 0 }).withMessage('quantity must be non-negative'),
  body('action').isIn(['add', 'remove', 'adjust']).withMessage('action must be add, remove, or adjust'),
  handleValidationErrors,
];

const validateRecordWaste = [
  param('inventoryId').notEmpty().withMessage('inventoryId is required'),
  body('wasteQuantity').isInt({ min: 1 }).withMessage('wasteQuantity must be positive'),
  handleValidationErrors,
];

const validateGetLowStockItems = [
  param('restaurantId').notEmpty().withMessage('restaurantId is required'),
  handleValidationErrors,
];

const validateGetExpiringItems = [
  param('restaurantId').notEmpty().withMessage('restaurantId is required'),
  query('daysThreshold').optional().isInt({ min: 1, max: 365 }).withMessage('daysThreshold must be 1-365'),
  handleValidationErrors,
];

/**
 * Export all validators
 */
module.exports = {
  // Middleware
  handleValidationErrors,

  // Feature A: Order Tracking
  validateInitializeTracking,
  validateUpdateOrderStatus,
  validateUpdateLocation,
  validateAddNotification,
  validateReportIssue,

  // Feature B: Review & Safety
  validateSubmitReview,
  validateAddMedia,
  validateMarkHelpful,
  validateFlagReview,
  validateModerateReview,
  validateUpdateFSSAI,
  validateRecordComplaint,

  // Feature C: Gamification
  validateAddExperience,
  validateUpdateStreak,
  validateRecordAchievement,
  validateGetLeaderboard,
  validateGetLeaderboardByCategory,

  // Feature D: Pricing & Promotions
  validateCreatePricingRule,
  validateCalculatePrice,
  validateCreatePromotion,
  validateValidateCoupon,
  validateApplyPromotion,

  // Feature E: Vendor & Inventory
  validateCreateVendor,
  validateUpdateRatings,
  validateGetNearbyVendors,
  validateSearchByCuisine,
  validateCanDeliverTo,
  validateCreateInventoryItem,
  validateUpdateStock,
  validateRecordWaste,
  validateGetLowStockItems,
  validateGetExpiringItems,
};
