/**
 * Phase 14 Validations
 * Input validation for all Phase 14 endpoints
 */

const { body, query, param, validationResult } = require('express-validator');

class Phase14Validations {
  /**
   * Search validations
   */
  static validateSearch = [
    body('query')
      .trim()
      .notEmpty()
      .withMessage('Search query is required')
      .isLength({ min: 1, max: 200 })
      .withMessage('Query must be between 1 and 200 characters'),
    body('filters')
      .optional()
      .isObject()
      .withMessage('Filters must be an object'),
    body('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    body('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ];

  /**
   * Revenue forecast validation
   */
  static validateRevenueForecast = [
    query('days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Days must be between 1 and 365')
  ];

  /**
   * Churn prediction validation
   */
  static validateChurnPrediction = [
    param('userId')
      .notEmpty()
      .withMessage('User ID is required')
      .isMongoId()
      .withMessage('Invalid user ID format')
  ];

  /**
   * Batch churn prediction validation
   */
  static validateBatchChurnPrediction = [
    body('userIds')
      .isArray()
      .withMessage('User IDs must be an array')
      .notEmpty()
      .withMessage('At least one user ID is required'),
    body('userIds.*')
      .isMongoId()
      .withMessage('Each user ID must be valid MongoDB ID')
  ];

  /**
   * Demand forecast validation
   */
  static validateDemandForecast = [
    param('categoryId')
      .notEmpty()
      .withMessage('Category ID is required'),
    query('days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Days must be between 1 and 365')
  ];

  /**
   * Segmentation validation
   */
  static validateSegmentationType = [
    param('type')
      .notEmpty()
      .withMessage('Segment type is required')
      .isIn(['behavioral', 'rfm', 'cohort'])
      .withMessage('Invalid segment type')
  ];

  /**
   * Segmentation users validation
   */
  static validateSegmentationUsers = [
    param('segmentName')
      .notEmpty()
      .withMessage('Segment name is required')
      .trim(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000')
  ];

  /**
   * Recommendations validation
   */
  static validateRecommendations = [
    param('userId')
      .notEmpty()
      .withMessage('User ID is required')
      .isMongoId()
      .withMessage('Invalid user ID format'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ];

  /**
   * Batch recommendations validation
   */
  static validateBatchRecommendations = [
    body('userIds')
      .isArray()
      .withMessage('User IDs must be an array')
      .notEmpty()
      .withMessage('At least one user ID is required'),
    body('userIds.*')
      .isMongoId()
      .withMessage('Each user ID must be valid'),
    body('limit')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Limit must be between 1 and 20')
  ];

  /**
   * Recommendation feedback validation
   */
  static validateRecommendationFeedback = [
    body('userId')
      .notEmpty()
      .withMessage('User ID is required')
      .isMongoId()
      .withMessage('Invalid user ID format'),
    body('recommendationId')
      .notEmpty()
      .withMessage('Recommendation ID is required'),
    body('feedback')
      .notEmpty()
      .withMessage('Feedback is required')
      .isIn(['helpful', 'not_helpful', 'clicked', 'purchased'])
      .withMessage('Invalid feedback value'),
    body('productId')
      .notEmpty()
      .withMessage('Product ID is required')
      .isMongoId()
      .withMessage('Invalid product ID format')
  ];

  /**
   * Index recommendation validation
   */
  static validateIndexCollection = [
    param('collection')
      .notEmpty()
      .withMessage('Collection name is required')
      .trim()
  ];

  /**
   * Cache strategy validation
   */
  static validateCacheStrategy = [
    param('dataType')
      .notEmpty()
      .withMessage('Data type is required')
      .trim(),
    body('ttl')
      .optional()
      .isInt({ min: 60, max: 86400 })
      .withMessage('TTL must be between 60 and 86400 seconds')
  ];

  /**
   * Cache invalidation validation
   */
  static validateCacheInvalidation = [
    body('dataType')
      .notEmpty()
      .withMessage('Data type is required')
      .trim()
      .isIn([
        'user-profile',
        'product-catalog',
        'order-history',
        'analytics-metrics',
        'recommendations',
        'search-results',
        'session-data',
        'feature-flags'
      ])
      .withMessage('Invalid data type')
  ];

  /**
   * Query statistics validation
   */
  static validateQueryStatistics = [
    query('timeWindow')
      .optional()
      .isIn(['hour', 'day', 'week', 'month'])
      .withMessage('Invalid time window'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000')
  ];

  /**
   * Search suggestions validation
   */
  static validateSearchSuggestions = [
    query('partial')
      .notEmpty()
      .withMessage('Partial search term is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Partial must be between 1 and 100 characters'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Limit must be between 1 and 20')
  ];

  /**
   * Trending products validation
   */
  static validateTrendingProducts = [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('timeWindow')
      .optional()
      .isIn(['day', 'week', 'month'])
      .withMessage('Invalid time window')
  ];

  /**
   * Validation error handler middleware
   */
  static handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }

    next();
  };
}

module.exports = Phase14Validations;
