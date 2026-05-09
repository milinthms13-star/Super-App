/**
 * Predictive Analytics Controller - Phase 14
 * Handle revenue forecasting, churn prediction, and demand forecasting
 */

const RevenueForecastingService = require('../services/revenueForecastingService');
const ChurnPredictionService = require('../services/churnPredictionService');
const DemandForecastingService = require('../services/demandForecastingService');
const logger = require('../services/logger');

class PredictiveAnalyticsController {
  /**
   * GET /api/v1/predictive/revenue-forecast
   * Get revenue forecast
   */
  static async getRevenueForecast(req, res) {
    try {
      const { days = 30, format = 'json' } = req.query;

      const forecast = await RevenueForecastingService.forecastRevenue(parseInt(days));

      return res.json({
        success: true,
        data: forecast,
        format
      });
    } catch (error) {
      logger.error('Error getting revenue forecast:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate revenue forecast'
      });
    }
  }

  /**
   * GET /api/v1/predictive/revenue-forecast/seasonal
   * Get seasonal revenue patterns
   */
  static async getSeasonalPatterns(req, res) {
    try {
      const patterns = await RevenueForecastingService.getSeasonalPatterns();

      return res.json({
        success: true,
        data: patterns
      });
    } catch (error) {
      logger.error('Error getting seasonal patterns:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get seasonal patterns'
      });
    }
  }

  /**
   * GET /api/v1/predictive/revenue-forecast/confidence
   * Get revenue forecast with confidence intervals
   */
  static async getForecastWithConfidence(req, res) {
    try {
      const { days = 30, confidence = 0.95 } = req.query;

      const forecast = await RevenueForecastingService.forecastRevenue(parseInt(days));

      return res.json({
        success: true,
        data: forecast,
        confidenceLevel: parseFloat(confidence)
      });
    } catch (error) {
      logger.error('Error getting forecast with confidence:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get confidence intervals'
      });
    }
  }

  /**
   * GET /api/v1/predictive/churn-risk/:userId
   * Get churn risk for user
   */
  static async getUserChurnRisk(req, res) {
    try {
      const { userId } = req.params;

      const churnRisk = await ChurnPredictionService.getUserChurnRisk(userId);

      return res.json({
        success: true,
        data: churnRisk
      });
    } catch (error) {
      logger.error('Error getting churn risk:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to calculate churn risk'
      });
    }
  }

  /**
   * GET /api/v1/predictive/churn-risk/batch
   * Get churn risk for multiple users
   */
  static async getBatchChurnRisk(req, res) {
    try {
      const { userIds = [] } = req.body;

      const risks = [];

      for (const userId of userIds) {
        const risk = await ChurnPredictionService.getUserChurnRisk(userId);
        risks.push({
          userId,
          churnRisk: risk
        });
      }

      return res.json({
        success: true,
        data: {
          totalUsers: userIds.length,
          risks
        }
      });
    } catch (error) {
      logger.error('Error getting batch churn risk:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to process batch churn risk'
      });
    }
  }

  /**
   * GET /api/v1/predictive/churn-risk/at-risk-users
   * Get users at risk of churning
   */
  static async getAtRiskUsers(req, res) {
    try {
      const { threshold = 70, limit = 100 } = req.query;

      const atRiskUsers = await ChurnPredictionService.getAtRiskUsers(parseFloat(threshold), parseInt(limit));

      return res.json({
        success: true,
        data: {
          threshold: parseFloat(threshold),
          users: atRiskUsers
        }
      });
    } catch (error) {
      logger.error('Error getting at-risk users:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve at-risk users'
      });
    }
  }

  /**
   * GET /api/v1/predictive/retention-recommendations/:userId
   * Get retention recommendations for user
   */
  static async getRetentionRecommendations(req, res) {
    try {
      const { userId } = req.params;

      const recommendations = await ChurnPredictionService.getRetentionRecommendations(userId);

      return res.json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      logger.error('Error getting retention recommendations:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get retention recommendations'
      });
    }
  }

  /**
   * GET /api/v1/predictive/demand-forecast/category/:categoryId
   * Forecast demand for category
   */
  static async forecastDemandByCategory(req, res) {
    try {
      const { categoryId } = req.params;
      const { days = 30 } = req.query;

      const forecast = await DemandForecastingService.forecastDemandByCategory(categoryId, parseInt(days));

      return res.json({
        success: true,
        data: forecast
      });
    } catch (error) {
      logger.error('Error forecasting demand by category:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to forecast demand'
      });
    }
  }

  /**
   * GET /api/v1/predictive/demand-forecast/region/:region
   * Forecast demand by region
   */
  static async forecastDemandByRegion(req, res) {
    try {
      const { region } = req.params;
      const { days = 30 } = req.query;

      const forecast = await DemandForecastingService.forecastDemandByRegion(region, parseInt(days));

      return res.json({
        success: true,
        data: forecast
      });
    } catch (error) {
      logger.error('Error forecasting demand by region:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to forecast regional demand'
      });
    }
  }

  /**
   * GET /api/v1/predictive/demand-forecast/insights
   * Get demand insights
   */
  static async getDemandInsights(req, res) {
    try {
      const insights = await DemandForecastingService.getDemandInsights();

      return res.json({
        success: true,
        data: insights
      });
    } catch (error) {
      logger.error('Error getting demand insights:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get demand insights'
      });
    }
  }

  /**
   * GET /api/v1/predictive/summary
   * Get overall predictive analytics summary
   */
  static async getPredictiveAnalyticsSummary(req, res) {
    try {
      const [revenueForecast, demandInsights] = await Promise.all([
        RevenueForecastingService.forecastRevenue(30),
        DemandForecastingService.getDemandInsights()
      ]);

      return res.json({
        success: true,
        data: {
          revenue: revenueForecast,
          demand: demandInsights,
          timestamp: new Date()
        }
      });
    } catch (error) {
      logger.error('Error getting predictive summary:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get predictive summary'
      });
    }
  }
}

module.exports = PredictiveAnalyticsController;
