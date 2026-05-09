const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const AdvancedAnalyticsService = require('../services/AdvancedAnalyticsService');
const logger = require('../utils/logger');

/**
 * Phase 3: Advanced Analytics & Business Intelligence Routes
 * Handles seller dashboards, customer analytics, sales trends, cohort analysis
 */

/**
 * GET /api/ecommerce/analytics/seller-dashboard
 * Get seller dashboard metrics
 * Query params: period (default 30)
 */
router.get('/seller-dashboard', auth, async (req, res) => {
  try {
    const { userId: sellerId } = req;
    const { period = 30 } = req.query;

    const result = await AdvancedAnalyticsService.getSellerDashboard(
      sellerId,
      period
    );

    res.json({
      success: true,
      data: result,
      message: 'Seller dashboard retrieved',
    });
  } catch (error) {
    logger.error('Error fetching seller dashboard:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/analytics/customer
 * Get customer behavior analytics
 * Query params: period (default 30)
 */
router.get('/customer', auth, async (req, res) => {
  try {
    const { userId } = req;
    const { period = 30 } = req.query;

    const result = await AdvancedAnalyticsService.getCustomerAnalytics(
      userId,
      period
    );

    res.json({
      success: true,
      data: result,
      message: 'Customer analytics retrieved',
    });
  } catch (error) {
    logger.error('Error fetching customer analytics:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/analytics/sales-trends
 * Get sales trend analysis
 * Query params: period (default 30)
 */
router.get('/sales-trends', async (req, res) => {
  try {
    const { period = 30 } = req.query;

    const result = await AdvancedAnalyticsService.getSalesTrends(period);

    res.json({
      success: true,
      data: result,
      message: 'Sales trends retrieved',
    });
  } catch (error) {
    logger.error('Error fetching sales trends:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/analytics/product/:productId
 * Get product performance analytics
 * Query params: period (default 30)
 */
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { period = 30 } = req.query;

    const result = await AdvancedAnalyticsService.getProductAnalytics(
      productId,
      period
    );

    res.json({
      success: true,
      data: result,
      message: 'Product analytics retrieved',
    });
  } catch (error) {
    logger.error('Error fetching product analytics:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/analytics/category/:category
 * Get category insights
 * Query params: period (default 30)
 */
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { period = 30 } = req.query;

    const result = await AdvancedAnalyticsService.getCategoryInsights(
      category,
      period
    );

    res.json({
      success: true,
      data: result,
      message: 'Category insights retrieved',
    });
  } catch (error) {
    logger.error('Error fetching category insights:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/analytics/cohort
 * Get cohort analysis
 * Query params: cohortType (default monthly)
 */
router.get('/cohort', async (req, res) => {
  try {
    const { cohortType = 'monthly' } = req.query;

    const result = await AdvancedAnalyticsService.getCohortAnalysis(cohortType);

    res.json({
      success: true,
      data: result,
      message: 'Cohort analysis retrieved',
    });
  } catch (error) {
    logger.error('Error fetching cohort analysis:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/analytics/retention
 * Get retention metrics
 * Query params: period (default 30)
 */
router.get('/retention', async (req, res) => {
  try {
    const { period = 30 } = req.query;

    const result = await AdvancedAnalyticsService.getRetentionMetrics(period);

    res.json({
      success: true,
      data: result,
      message: 'Retention metrics retrieved',
    });
  } catch (error) {
    logger.error('Error fetching retention metrics:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/ecommerce/analytics/report
 * Generate custom report
 */
router.post('/report', async (req, res) => {
  try {
    const { reportConfig } = req.body;

    if (!reportConfig) {
      return res.status(400).json({
        success: false,
        message: 'reportConfig is required',
      });
    }

    const result = await AdvancedAnalyticsService.generateCustomReport(
      reportConfig
    );

    res.json({
      success: true,
      data: result,
      message: 'Custom report generated',
    });
  } catch (error) {
    logger.error('Error generating custom report:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
