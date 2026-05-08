const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation middleware for Phase 4 (Tracking & Chat) endpoints
 */

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array().map((err) => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

// ============ ORDER TRACKING VALIDATIONS ============

const startTrackingValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),
  body('deliveryPersonId').isMongoId().withMessage('Invalid delivery person ID'),
  body('deliveryPersonDetails.name').trim().notEmpty().withMessage('Delivery person name is required'),
  body('deliveryPersonDetails.phone').isMobilePhone().withMessage('Invalid phone number'),
  body('deliveryPersonDetails.image').optional().isURL().withMessage('Invalid image URL'),
  body('deliveryPersonDetails.vehicleType')
    .isIn(['bike', 'cycle', 'scooter', 'car'])
    .withMessage('Invalid vehicle type'),
  body('deliveryPersonDetails.vehicleNumber').trim().notEmpty().withMessage('Vehicle number is required'),
  body('deliveryPersonDetails.rating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Rating must be between 0 and 5'),
  handleValidationErrors,
];

const getTrackingStatusValidation = [
  param('trackingId').isMongoId().withMessage('Invalid tracking ID'),
  handleValidationErrors,
];

const getTrackingByOrderIdValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),
  handleValidationErrors,
];

const updateRiderLocationValidation = [
  param('trackingId').isMongoId().withMessage('Invalid tracking ID'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('accuracy').optional().isInt({ min: 0 }).withMessage('Invalid accuracy'),
  body('speed').optional().isInt({ min: 0 }).withMessage('Invalid speed'),
  handleValidationErrors,
];

const getRouteHistoryValidation = [
  param('trackingId').isMongoId().withMessage('Invalid tracking ID'),
  handleValidationErrors,
];

const markPickedUpValidation = [
  param('trackingId').isMongoId().withMessage('Invalid tracking ID'),
  handleValidationErrors,
];

const markDeliveredValidation = [
  param('trackingId').isMongoId().withMessage('Invalid tracking ID'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be under 500 characters'),
  handleValidationErrors,
];

const reportIssueValidation = [
  param('trackingId').isMongoId().withMessage('Invalid tracking ID'),
  body('issueType')
    .isIn(['delivery_delay', 'navigation_error', 'traffic_heavy', 'rider_issue'])
    .withMessage('Invalid issue type'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  body('severity')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid severity level'),
  handleValidationErrors,
];

const getNearbyOrdersValidation = [
  query('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  query('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  query('radius')
    .optional()
    .isFloat({ min: 0.1, max: 50 })
    .withMessage('Radius must be between 0.1 and 50 km'),
  handleValidationErrors,
];

const emergencyCallValidation = [
  param('trackingId').isMongoId().withMessage('Invalid tracking ID'),
  handleValidationErrors,
];

// ============ CHAT VALIDATIONS ============

const getOrCreateChatValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),
  body('deliveryPersonId').optional().isMongoId().withMessage('Invalid delivery person ID'),
  handleValidationErrors,
];

const sendMessageValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),
  body('messageType')
    .isIn(['text', 'location', 'call', 'image', 'system'])
    .withMessage('Invalid message type'),
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters'),
  body('sender').optional().isIn(['customer', 'rider']).withMessage('Invalid sender'),
  body('location').optional().custom((value) => {
    if (typeof value !== 'object' || !value.latitude || !value.longitude) {
      throw new Error('Location must contain latitude and longitude');
    }
    return true;
  }),
  body('imageUrl').optional().isURL().withMessage('Invalid image URL'),
  handleValidationErrors,
];

const getMessagesValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be 0 or greater'),
  handleValidationErrors,
];

const markAsReadValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),
  body('reader').isIn(['customer', 'rider']).withMessage('Reader must be customer or rider'),
  handleValidationErrors,
];

const getUnreadCountValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),
  query('reader').isIn(['customer', 'rider']).withMessage('Reader must be customer or rider'),
  handleValidationErrors,
];

const initiateCallValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),
  body('callType').isIn(['audio', 'video']).withMessage('Invalid call type'),
  body('initiator').optional().isIn(['customer', 'rider']).withMessage('Invalid initiator'),
  body('recipientId').optional().isMongoId().withMessage('Invalid recipient ID'),
  body('deviceToken').optional().trim().notEmpty().withMessage('Device token required'),
  handleValidationErrors,
];

const endCallValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),
  body('status')
    .optional()
    .isIn(['completed', 'missed', 'rejected'])
    .withMessage('Invalid call status'),
  handleValidationErrors,
];

const getCallHistoryValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),
  handleValidationErrors,
];

const sendLocationValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('address').optional().trim().isLength({ max: 200 }).withMessage('Address too long'),
  body('sender').optional().isIn(['customer', 'rider']).withMessage('Invalid sender'),
  handleValidationErrors,
];

const sendImageValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),
  body('imageUrl').isURL().withMessage('Invalid image URL'),
  body('sender').optional().isIn(['customer', 'rider']).withMessage('Invalid sender'),
  handleValidationErrors,
];

const blockChatValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),
  body('blockedBy').isIn(['customer', 'rider']).withMessage('Invalid blocker'),
  handleValidationErrors,
];

const unblockChatValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),
  handleValidationErrors,
];

const getChatSummaryValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),
  handleValidationErrors,
];

const getUserChatsValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be 0 or greater'),
  handleValidationErrors,
];

const getQuickRepliesValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),
  handleValidationErrors,
];

const closeChatValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),
  handleValidationErrors,
];

const muteNotificationsValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),
  handleValidationErrors,
];

const unmuteNotificationsValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),
  handleValidationErrors,
];

// ============ PAGINATION VALIDATIONS ============

const paginationValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be 0 or greater'),
  handleValidationErrors,
];

module.exports = {
  // Tracking validations
  startTrackingValidation,
  getTrackingStatusValidation,
  getTrackingByOrderIdValidation,
  updateRiderLocationValidation,
  getRouteHistoryValidation,
  markPickedUpValidation,
  markDeliveredValidation,
  reportIssueValidation,
  getNearbyOrdersValidation,
  emergencyCallValidation,

  // Chat validations
  getOrCreateChatValidation,
  sendMessageValidation,
  getMessagesValidation,
  markAsReadValidation,
  getUnreadCountValidation,
  initiateCallValidation,
  endCallValidation,
  getCallHistoryValidation,
  sendLocationValidation,
  sendImageValidation,
  blockChatValidation,
  unblockChatValidation,
  getChatSummaryValidation,
  getUserChatsValidation,
  getQuickRepliesValidation,
  closeChatValidation,
  muteNotificationsValidation,
  unmuteNotificationsValidation,

  // Utility
  paginationValidation,
  handleValidationErrors,
};
