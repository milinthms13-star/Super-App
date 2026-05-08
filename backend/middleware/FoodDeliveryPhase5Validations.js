const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation middleware for Phase 5 (Payments & Wallet) endpoints
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

// ============ PAYMENT VALIDATIONS ============

const initiatePaymentValidation = [
  body('orderId').isMongoId().withMessage('Invalid order ID'),
  body('paymentMethod')
    .isIn(['upi', 'card', 'netbanking', 'wallet', 'cod'])
    .withMessage('Invalid payment method'),
  body('amount').isFloat({ min: 0 }).withMessage('Invalid amount'),
  body('upi').optional().custom((value) => {
    if (value && !value.vpa) {
      throw new Error('UPI VPA required');
    }
    return true;
  }),
  body('card').optional().custom((value) => {
    if (value && (!value.last4 || !value.brand)) {
      throw new Error('Card details required');
    }
    return true;
  }),
  handleValidationErrors,
];

const authorizePaymentValidation = [
  param('paymentId').isMongoId().withMessage('Invalid payment ID'),
  body('gatewayTransactionId').trim().notEmpty().withMessage('Gateway transaction ID required'),
  handleValidationErrors,
];

const capturePaymentValidation = [
  param('paymentId').isMongoId().withMessage('Invalid payment ID'),
  body('receiptUrl').optional().isURL().withMessage('Invalid receipt URL'),
  handleValidationErrors,
];

const processWalletPaymentValidation = [
  param('paymentId').isMongoId().withMessage('Invalid payment ID'),
  handleValidationErrors,
];

const processCODPaymentValidation = [
  param('paymentId').isMongoId().withMessage('Invalid payment ID'),
  handleValidationErrors,
];

const getPaymentStatusValidation = [
  param('paymentId').isMongoId().withMessage('Invalid payment ID'),
  handleValidationErrors,
];

const getPaymentByOrderValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),
  handleValidationErrors,
];

const getPaymentHistoryValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be 0 or greater'),
  handleValidationErrors,
];

const retryPaymentValidation = [
  param('paymentId').isMongoId().withMessage('Invalid payment ID'),
  handleValidationErrors,
];

const verifyPaymentValidation = [
  param('paymentId').isMongoId().withMessage('Invalid payment ID'),
  body('verificationData').notEmpty().withMessage('Verification data required'),
  handleValidationErrors,
];

const cancelPaymentValidation = [
  param('paymentId').isMongoId().withMessage('Invalid payment ID'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason too long'),
  handleValidationErrors,
];

// ============ WALLET VALIDATIONS ============

const addMoneyValidation = [
  body('amount').isFloat({ min: 100, max: 100000 }).withMessage('Amount must be between 100 and 100000'),
  body('source')
    .optional()
    .isIn(['manual', 'promotion', 'cashback'])
    .withMessage('Invalid source'),
  handleValidationErrors,
];

const getTransactionsValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be 0 or greater'),
  handleValidationErrors,
];

const addLinkedPaymentMethodValidation = [
  body('method.type')
    .isIn(['upi', 'card', 'netbanking'])
    .withMessage('Invalid payment method type'),
  body('method.value').trim().notEmpty().withMessage('Payment method value required'),
  handleValidationErrors,
];

const setBeneficiaryValidation = [
  body('accountHolderName').trim().notEmpty().withMessage('Account holder name required'),
  body('accountNumber')
    .trim()
    .matches(/^\d{9,18}$/)
    .withMessage('Invalid account number'),
  body('accountType')
    .optional()
    .isIn(['savings', 'current'])
    .withMessage('Invalid account type'),
  body('ifscCode')
    .trim()
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .withMessage('Invalid IFSC code'),
  body('bankName').trim().notEmpty().withMessage('Bank name required'),
  handleValidationErrors,
];

const updatePreferencesValidation = [
  body('preferences').isObject().withMessage('Preferences must be an object'),
  handleValidationErrors,
];

const applyPromoCodeValidation = [
  body('promoCode').trim().notEmpty().withMessage('Promo code required'),
  body('amount').isFloat({ min: 0 }).withMessage('Invalid amount'),
  body('expiryDays')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Expiry days must be between 1 and 365'),
  handleValidationErrors,
];

// ============ REFUND VALIDATIONS ============

const initiateRefundValidation = [
  body('orderId').isMongoId().withMessage('Invalid order ID'),
  body('reason')
    .isIn([
      'customer_request',
      'order_cancelled',
      'order_not_delivered',
      'poor_quality',
      'wrong_order',
      'restaurant_unavailable',
      'delivery_failed',
      'duplicate_charge',
      'system_error',
      'other',
    ])
    .withMessage('Invalid refund reason'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description too long'),
  body('refundMethod')
    .optional()
    .isIn(['original_payment', 'wallet', 'bank_transfer'])
    .withMessage('Invalid refund method'),
  handleValidationErrors,
];

const approveRefundValidation = [
  param('refundId').isMongoId().withMessage('Invalid refund ID'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes too long'),
  handleValidationErrors,
];

const rejectRefundValidation = [
  param('refundId').isMongoId().withMessage('Invalid refund ID'),
  body('reason').trim().notEmpty().withMessage('Rejection reason required'),
  handleValidationErrors,
];

const processRefundValidation = [
  param('refundId').isMongoId().withMessage('Invalid refund ID'),
  handleValidationErrors,
];

const getRefundStatusValidation = [
  param('refundId').isMongoId().withMessage('Invalid refund ID'),
  handleValidationErrors,
];

const getRefundByOrderValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),
  handleValidationErrors,
];

const getUserRefundsValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be 0 or greater'),
  handleValidationErrors,
];

const retryFailedRefundValidation = [
  param('refundId').isMongoId().withMessage('Invalid refund ID'),
  handleValidationErrors,
];

// ============ ANALYTICS VALIDATIONS ============

const getAnalyticsValidation = [
  query('startDate').isISO8601().withMessage('Invalid start date'),
  query('endDate').isISO8601().withMessage('Invalid end date'),
  handleValidationErrors,
];

module.exports = {
  // Payment validations
  initiatePaymentValidation,
  authorizePaymentValidation,
  capturePaymentValidation,
  processWalletPaymentValidation,
  processCODPaymentValidation,
  getPaymentStatusValidation,
  getPaymentByOrderValidation,
  getPaymentHistoryValidation,
  retryPaymentValidation,
  verifyPaymentValidation,
  cancelPaymentValidation,

  // Wallet validations
  addMoneyValidation,
  getTransactionsValidation,
  addLinkedPaymentMethodValidation,
  setBeneficiaryValidation,
  updatePreferencesValidation,
  applyPromoCodeValidation,

  // Refund validations
  initiateRefundValidation,
  approveRefundValidation,
  rejectRefundValidation,
  processRefundValidation,
  getRefundStatusValidation,
  getRefundByOrderValidation,
  getUserRefundsValidation,
  retryFailedRefundValidation,

  // Analytics validations
  getAnalyticsValidation,

  // Utility
  handleValidationErrors,
};
