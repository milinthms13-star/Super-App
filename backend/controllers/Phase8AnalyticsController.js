/**
 * Phase 8 Advanced Analytics Controller
 * Handles all analytics endpoints for Phase 8
 */

const AdvancedAnalyticsService = require('../services/AdvancedAnalyticsService');

class Phase8AnalyticsController {
  /**
   * Generate daily analytics for a specific date
   * POST /api/v1/analytics/generate-daily
   */
  static async generateDailyAnalytics(req, res) {
    try {
      const { date } = req.body;
      const analyticsDate = date ? new Date(date) : new Date();

      const result = await AdvancedAnalyticsService.generateDailyAnalytics(analyticsDate);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json({
        success: true,
        message: 'Daily analytics generated successfully',
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        errors: [{ field: 'generateDailyAnalytics', message: error.message }],
      });
    }
  }

  /**
   * Get analytics for a date range
   * GET /api/v1/analytics/range?startDate=...&endDate=...&period=daily
   */
  static async getAnalyticsRange(req, res) {
    try {
      const { startDate, endDate, period = 'daily' } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate are required',
          errors: [{ field: 'date_range', message: 'Missing required date range parameters' }],
        });
      }

      const result = await AdvancedAnalyticsService.getAnalyticsRange(startDate, endDate, period);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        errors: [{ field: 'getAnalyticsRange', message: error.message }],
      });
    }
  }

  /**
   * Get business insights for a date range
   * GET /api/v1/analytics/insights?startDate=...&endDate=...
   */
  static async getBusinessInsights(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate are required',
          errors: [{ field: 'date_range', message: 'Missing required date range parameters' }],
        });
      }

      const result = await AdvancedAnalyticsService.getBusinessInsights(startDate, endDate);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        errors: [{ field: 'getBusinessInsights', message: error.message }],
      });
    }
  }

  /**
   * Get peak hours analysis for a restaurant
   * GET /api/v1/analytics/peak-hours?restaurantId=...
   */
  static async getPeakHoursAnalysis(req, res) {
    try {
      const { restaurantId } = req.query;

      const result = await AdvancedAnalyticsService.getPeakHoursAnalysis(restaurantId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        errors: [{ field: 'getPeakHoursAnalysis', message: error.message }],
      });
    }
  }
}

module.exports = Phase8AnalyticsController;
