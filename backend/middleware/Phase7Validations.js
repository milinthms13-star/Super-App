/**
 * Phase 7 Validations
 * Input validation middleware for ML fraud detection and alert management
 */

const { body, query, param, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({
        field: e.param,
        message: e.msg,
      })),
    });
  }
  next();
};

/**
 * Validation: Get transaction fraud score
 */
const getTransactionScoreValidation = [
  body('amount')
    .isNumeric()
    .withMessage('amount must be a number')
    .custom((v) => v >= 0)
    .withMessage('amount must be non-negative'),

  body('paymentMethod')
    .optional()
    .isIn(['card', 'upi', 'wallet', 'netbanking', 'cod'])
    .withMessage('Invalid payment method'),

  body('isNewDevice')
    .optional()
    .isBoolean()
    .withMessage('isNewDevice must be boolean'),

  body('isNewPaymentMethod')
    .optional()
    .isBoolean()
    .withMessage('isNewPaymentMethod must be boolean'),

  body('deviceTrustScore')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('deviceTrustScore must be between 0 and 1'),

  body('transactionsLastHour')
    .optional()
    .isInt({ min: 0 })
    .withMessage('transactionsLastHour must be non-negative integer'),

  body('transactionsLastDay')
    .optional()
    .isInt({ min: 0 })
    .withMessage('transactionsLastDay must be non-negative integer'),

  body('accountAgeDays')
    .optional()
    .isInt({ min: 0 })
    .withMessage('accountAgeDays must be non-negative integer'),

  body('merchantRiskScore')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('merchantRiskScore must be between 0 and 1'),

  handleValidationErrors,
];

/**
 * Validation: Create ML model
 */
const createModelValidation = [
  body('modelName')
    .trim()
    .notEmpty()
    .withMessage('modelName is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('modelName must be 3-100 characters'),

  body('modelType')
    .trim()
    .notEmpty()
    .withMessage('modelType is required')
    .isIn(['xgboost', 'random_forest', 'neural_network', 'ensemble', 'logistic_regression'])
    .withMessage('Invalid modelType'),

  body('version')
    .trim()
    .notEmpty()
    .withMessage('version is required')
    .matches(/^\d+\.\d+\.\d+$/)
    .withMessage('version must be semantic (e.g., 1.0.0)'),

  body('features')
    .optional()
    .isArray()
    .withMessage('features must be an array'),

  body('trainingMetrics')
    .optional()
    .isObject()
    .withMessage('trainingMetrics must be an object'),

  handleValidationErrors,
];

/**
 * Validation: List fraud alerts
 */
const listAlertsValidation = [
  query('status')
    .optional()
    .isIn(['open', 'acknowledged', 'investigating', 'resolved', 'dismissed', 'escalated'])
    .withMessage('Invalid status'),

  query('userId')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('userId must not be empty'),

  query('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be 1-100'),

  query('skip')
    .optional()
    .isInt({ min: 0 })
    .withMessage('skip must be non-negative'),

  handleValidationErrors,
];

/**
 * Validation: Acknowledge alert
 */
const acknowledgeAlertValidation = [
  param('alertId')
    .trim()
    .notEmpty()
    .withMessage('alertId is required'),

  body('notes')
    .optional()
    .trim()
    .isLength({ min: 0, max: 500 })
    .withMessage('notes must be 0-500 characters'),

  handleValidationErrors,
];

/**
 * Validation: Escalate alert
 */
const escalateAlertValidation = [
  param('alertId')
    .trim()
    .notEmpty()
    .withMessage('alertId is required'),

  body('escalatedTo')
    .trim()
    .notEmpty()
    .withMessage('escalatedTo is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('escalatedTo must be 2-50 characters'),

  body('reason')
    .trim()
    .notEmpty()
    .withMessage('reason is required')
    .isLength({ min: 5, max: 500 })
    .withMessage('reason must be 5-500 characters'),

  body('priority')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('priority must be 1-10'),

  handleValidationErrors,
];

/**
 * Validation: Investigate alert
 */
const investigateAlertValidation = [
  param('alertId')
    .trim()
    .notEmpty()
    .withMessage('alertId is required'),

  body('findings')
    .trim()
    .notEmpty()
    .withMessage('findings is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('findings must be 10-2000 characters'),

  body('recommendedAction')
    .trim()
    .notEmpty()
    .withMessage('recommendedAction is required')
    .isIn(['none', 'block', 'challenge', 'manual_review', 'contact_user', 'freeze_account'])
    .withMessage('Invalid recommendedAction'),

  handleValidationErrors,
];

/**
 * Validation: Record action on alert
 */
const recordActionValidation = [
  param('alertId')
    .trim()
    .notEmpty()
    .withMessage('alertId is required'),

  body('action')
    .trim()
    .notEmpty()
    .withMessage('action is required')
    .isIn(['none', 'block', 'challenge', 'manual_review', 'contact_user', 'freeze_account'])
    .withMessage('Invalid action'),

  body('reason')
    .optional()
    .trim()
    .isLength({ min: 0, max: 500 })
    .withMessage('reason must be 0-500 characters'),

  handleValidationErrors,
];

/**
 * Validation: Resolve alert
 */
const resolveAlertValidation = [
  param('alertId')
    .trim()
    .notEmpty()
    .withMessage('alertId is required'),

  body('resolution')
    .trim()
    .notEmpty()
    .withMessage('resolution is required')
    .isIn(['fraud_confirmed', 'false_positive', 'legitimate_activity', 'unknown'])
    .withMessage('Invalid resolution'),

  body('feedback')
    .optional()
    .trim()
    .isLength({ min: 0, max: 1000 })
    .withMessage('feedback must be 0-1000 characters'),

  handleValidationErrors,
];

/**
 * Validation: Dismiss alert
 */
const dismissAlertValidation = [
  param('alertId')
    .trim()
    .notEmpty()
    .withMessage('alertId is required'),

  body('reason')
    .trim()
    .notEmpty()
    .withMessage('reason is required')
    .isLength({ min: 5, max: 500 })
    .withMessage('reason must be 5-500 characters'),

  handleValidationErrors,
];

/**
 * Validation: Get user patterns
 */
const getUserPatternsValidation = [
  param('userId')
    .trim()
    .notEmpty()
    .withMessage('userId is required'),

  handleValidationErrors,
];

/**
 * Validation: Get user anomalies
 */
const getUserAnomaliesValidation = [
  param('userId')
    .trim()
    .notEmpty()
    .withMessage('userId is required'),

  query('timeframe')
    .optional()
    .trim()
    .matches(/^\d+[dhm]$/)
    .withMessage('timeframe must be in format: Nd, Nh, or Nm (e.g., 7d, 24h, 30m)'),

  handleValidationErrors,
];

/**
 * Validation: Get statistics
 */
const getStatisticsValidation = [
  query('timeframe')
    .optional()
    .trim()
    .matches(/^\d+[dhm]$/)
    .withMessage('timeframe must be in format: Nd, Nh, or Nm (e.g., 24h, 7d, 30m)'),

  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  getTransactionScoreValidation,
  createModelValidation,
  listAlertsValidation,
  acknowledgeAlertValidation,
  escalateAlertValidation,
  investigateAlertValidation,
  recordActionValidation,
  resolveAlertValidation,
  dismissAlertValidation,
  getUserPatternsValidation,
  getUserAnomaliesValidation,
  getStatisticsValidation,
};
