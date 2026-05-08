const { body, query, validationResult } = require('express-validator');

/**
 * Handle validation errors middleware
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

/**
 * Analytics query validation
 */
const analyticsQueryValidation = [
  query('startDate')
    .notEmpty()
    .withMessage('startDate is required')
    .isISO8601()
    .withMessage('startDate must be ISO8601 format'),
  query('endDate')
    .notEmpty()
    .withMessage('endDate is required')
    .isISO8601()
    .withMessage('endDate must be ISO8601 format'),
  query('period')
    .optional()
    .isIn(['hourly', 'daily', 'weekly', 'monthly', 'yearly'])
    .withMessage('Invalid period. Must be: hourly, daily, weekly, monthly, yearly'),
  handleValidationErrors,
];

/**
 * Create report validation
 */
const createReportValidation = [
  body('reportName')
    .trim()
    .notEmpty()
    .withMessage('reportName is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('reportName must be between 3 and 100 characters'),
  body('reportType')
    .notEmpty()
    .withMessage('reportType is required')
    .isIn(['payment', 'wallet', 'refund', 'custom', 'fraud', 'performance'])
    .withMessage('Invalid reportType'),
  body('metrics')
    .notEmpty()
    .withMessage('metrics is required')
    .isArray()
    .withMessage('metrics must be an array'),
  body('metrics.*')
    .trim()
    .notEmpty()
    .withMessage('Each metric must be non-empty'),
  body('dimensions')
    .optional()
    .isArray()
    .withMessage('dimensions must be an array'),
  body('frequency')
    .optional()
    .isIn(['once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
    .withMessage('Invalid frequency'),
  body('filters')
    .optional()
    .isObject()
    .withMessage('filters must be an object'),
  handleValidationErrors,
];

/**
 * Update report validation
 */
const updateReportValidation = [
  body('reportName')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('reportName must be between 3 and 100 characters'),
  body('frequency')
    .optional()
    .isIn(['once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
    .withMessage('Invalid frequency'),
  body('metrics')
    .optional()
    .isArray()
    .withMessage('metrics must be an array'),
  body('dimensions')
    .optional()
    .isArray()
    .withMessage('dimensions must be an array'),
  handleValidationErrors,
];

/**
 * Generate report validation
 */
const generateReportValidation = [
  body('format')
    .optional()
    .isIn(['json', 'csv', 'pdf', 'excel'])
    .withMessage('Invalid format'),
  handleValidationErrors,
];

/**
 * Send report validation
 */
const sendReportValidation = [
  body('recipients')
    .notEmpty()
    .withMessage('recipients is required')
    .isArray()
    .withMessage('recipients must be an array'),
  body('recipients.*')
    .trim()
    .isEmail()
    .withMessage('Each recipient must be a valid email'),
  body('includeFormat')
    .optional()
    .isIn(['pdf', 'csv', 'excel', 'json'])
    .withMessage('Invalid format'),
  handleValidationErrors,
];

/**
 * Review fraud case validation
 */
const reviewFraudCaseValidation = [
  body('resolution')
    .notEmpty()
    .withMessage('resolution is required')
    .isIn(['approved', 'rejected', 'appealed', 'resolved'])
    .withMessage('Invalid resolution'),
  body('notes')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('notes must be between 10 and 500 characters'),
  handleValidationErrors,
];

/**
 * Export analytics validation
 */
const exportAnalyticsValidation = [
  query('type')
    .notEmpty()
    .withMessage('type is required')
    .isIn(['payment', 'wallet', 'refund', 'fraud', 'comprehensive'])
    .withMessage('Invalid type'),
  query('format')
    .optional()
    .isIn(['csv', 'pdf', 'excel', 'json'])
    .withMessage('Invalid format'),
  query('startDate')
    .notEmpty()
    .withMessage('startDate is required')
    .isISO8601()
    .withMessage('startDate must be ISO8601 format'),
  query('endDate')
    .notEmpty()
    .withMessage('endDate is required')
    .isISO8601()
    .withMessage('endDate must be ISO8601 format'),
  handleValidationErrors,
];

/**
 * Trending metrics validation
 */
const trendingMetricsValidation = [
  query('metric')
    .notEmpty()
    .withMessage('metric is required')
    .isIn([
      'payment_success_rate',
      'refund_rate',
      'wallet_balance',
      'fraud_detection_rate',
      'average_transaction_amount',
    ])
    .withMessage('Invalid metric'),
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('days must be between 1 and 365'),
  handleValidationErrors,
];

/**
 * Get reports query validation
 */
const getReportsValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
  query('skip')
    .optional()
    .isInt({ min: 0 })
    .withMessage('skip must be >= 0'),
  query('status')
    .optional()
    .isIn(['scheduled', 'generating', 'generated', 'failed', 'archived'])
    .withMessage('Invalid status'),
  handleValidationErrors,
];

/**
 * Fraud risk query validation
 */
const fraudRiskQueryValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
  query('skip')
    .optional()
    .isInt({ min: 0 })
    .withMessage('skip must be >= 0'),
  query('status')
    .optional()
    .isIn(['pending_review', 'approved', 'rejected', 'appealed', 'resolved'])
    .withMessage('Invalid status'),
  query('riskLevel')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid riskLevel'),
  query('timeframe')
    .optional()
    .isIn(['1h', '24h', '7d', '30d'])
    .withMessage('Invalid timeframe'),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  analyticsQueryValidation,
  createReportValidation,
  updateReportValidation,
  generateReportValidation,
  sendReportValidation,
  reviewFraudCaseValidation,
  exportAnalyticsValidation,
  trendingMetricsValidation,
  getReportsValidation,
  fraudRiskQueryValidation,
};
