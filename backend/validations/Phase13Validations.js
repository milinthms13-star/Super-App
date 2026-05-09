/**
 * Phase 13 - Analytics Validations
 * Input validation for all analytics endpoints
 */

const { body, query, param, validationResult } = require('express-validator');

class Phase13Validations {
  /**
   * Validate report generation request
   */
  static validateReportGeneration() {
    return [
      body('startDate')
        .isISO8601()
        .notEmpty()
        .withMessage('Start date is required and must be valid ISO8601 format'),
      body('endDate')
        .isISO8601()
        .notEmpty()
        .withMessage('End date is required and must be valid ISO8601 format'),
      body('period')
        .optional()
        .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
        .withMessage('Period must be one of: daily, weekly, monthly, quarterly, yearly'),
    ];
  }

  /**
   * Validate metrics query parameters
   */
  static validateMetricsQuery() {
    return [
      query('startDate')
        .isISO8601()
        .notEmpty()
        .withMessage('Start date is required and must be valid ISO8601 format'),
      query('endDate')
        .isISO8601()
        .notEmpty()
        .withMessage('End date is required and must be valid ISO8601 format'),
    ];
  }

  /**
   * Validate trend query parameters
   */
  static validateTrendQuery() {
    return [
      query('metric')
        .isIn(['revenue', 'commissions', 'invoices', 'settlements'])
        .withMessage('Metric must be one of: revenue, commissions, invoices, settlements'),
      query('startDate')
        .isISO8601()
        .notEmpty()
        .withMessage('Start date is required and must be valid ISO8601 format'),
      query('endDate')
        .isISO8601()
        .notEmpty()
        .withMessage('End date is required and must be valid ISO8601 format'),
      query('interval')
        .optional()
        .isIn(['daily', 'weekly', 'monthly', 'yearly'])
        .withMessage('Interval must be one of: daily, weekly, monthly, yearly'),
    ];
  }

  /**
   * Validate period comparison query
   */
  static validateComparisonQuery() {
    return [
      query('metric')
        .isIn(['payments', 'commissions', 'invoices', 'settlements', 'combined'])
        .withMessage('Metric must be valid'),
      query('currentStart')
        .isISO8601()
        .notEmpty()
        .withMessage('Current start date is required'),
      query('currentEnd')
        .isISO8601()
        .notEmpty()
        .withMessage('Current end date is required'),
      query('previousStart')
        .isISO8601()
        .notEmpty()
        .withMessage('Previous start date is required'),
      query('previousEnd')
        .isISO8601()
        .notEmpty()
        .withMessage('Previous end date is required'),
    ];
  }

  /**
   * Validate export request
   */
  static validateExport() {
    return [
      query('reportType')
        .isIn(['payment', 'commission', 'invoice', 'settlement'])
        .withMessage('Report type must be one of: payment, commission, invoice, settlement'),
      query('reportId')
        .notEmpty()
        .withMessage('Report ID is required'),
      query('format')
        .optional()
        .isIn(['json', 'csv', 'pdf'])
        .withMessage('Format must be one of: json, csv, pdf'),
    ];
  }

  /**
   * Validate dashboard period
   */
  static validateDashboardPeriod() {
    return [
      query('period')
        .optional()
        .isIn(['today', 'this_week', 'this_month', 'this_quarter', 'this_year', 'all_time'])
        .withMessage('Period must be one of: today, this_week, this_month, this_quarter, this_year, all_time'),
    ];
  }

  /**
   * Validate analytics ID parameter
   */
  static validateAnalyticsId() {
    return [
      param('analyticsId')
        .notEmpty()
        .matches(/^(PA|CR|IA|SR)-/)
        .withMessage('Invalid analytics ID format'),
    ];
  }

  /**
   * Validate restaurant ID parameter
   */
  static validateRestaurantId() {
    return [
      param('restaurantId')
        .notEmpty()
        .isMongoId()
        .withMessage('Invalid restaurant ID'),
    ];
  }

  /**
   * Validate pagination query
   */
  static validatePagination() {
    return [
      query('skip')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Skip must be a non-negative integer'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    ];
  }
}

module.exports = Phase13Validations;
