/**
 * businessIntelligenceRoutes.js
 * Routes for BI dashboards, custom queries, data warehousing
 */

const express = require('express');
const router = express.Router();
const BusinessIntelligenceService = require('../services/BusinessIntelligenceService');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// Executive dashboard
router.get('/dashboard/executive', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const result = await BusinessIntelligenceService.getExecutiveDashboard(parseInt(period));
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Revenue analytics
router.get('/revenue', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { period = 'daily', startDate, endDate } = req.query;
    const result = await BusinessIntelligenceService.getRevenueAnalytics(
      period,
      startDate,
      endDate
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Customer segmentation
router.get('/customers/segmentation', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await BusinessIntelligenceService.getCustomerSegmentation();
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Product performance
router.get('/products/performance', verifyToken, async (req, res) => {
  try {
    const { vendorId } = req.query;
    const result = await BusinessIntelligenceService.getProductPerformance(vendorId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Custom query
router.post('/custom-query', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await BusinessIntelligenceService.executeCustomQuery(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Cohort analysis
router.get('/cohort-analysis', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await BusinessIntelligenceService.getCohortAnalysis();
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Inventory forecast
router.get('/inventory-forecast', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await BusinessIntelligenceService.getInventoryForecast();
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Data warehouse snapshot
router.post('/warehouse/snapshot', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await BusinessIntelligenceService.createDataWarehouseSnapshot();
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
