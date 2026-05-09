/**
 * advancedAnalyticsRoutes.js
 * Routes for analytics and reporting
 */

const express = require('express');
const router = express.Router();
const AdvancedAnalyticsService = require('../services/AdvancedAnalyticsService');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// Generate custom report
router.post('/report', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await AdvancedAnalyticsService.generateCustomReport(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get sales trends
router.get('/trends/sales', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { period = '90' } = req.query;
    const result = await AdvancedAnalyticsService.analyzeSalesTrends(period);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Forecast sales
router.get('/forecast/sales', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const result = await AdvancedAnalyticsService.forecastSales(period);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Cohort analysis
router.get('/cohort', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const result = await AdvancedAnalyticsService.cohortAnalysis(period);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Product performance
router.get('/performance/products', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const filters = {
      category: req.query.category || null,
      limit: req.query.limit || 50,
    };
    const result = await AdvancedAnalyticsService.analyzeProductPerformance(filters);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Customer LTV analysis
router.get('/ltv/customers', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await AdvancedAnalyticsService.analyzeCustomerLTV();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
