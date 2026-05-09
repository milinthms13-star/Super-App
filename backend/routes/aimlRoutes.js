/**
 * aimlRoutes.js
 * Routes for AI/ML features: predictive pricing, demand forecasting, churn prediction
 */

const express = require('express');
const router = express.Router();
const AIMLService = require('../services/AIMLService');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// Predictive pricing
router.get('/pricing/predict/:productId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await AIMLService.calculatePredictivePrice(req.params.productId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Demand forecasting
router.get('/demand/forecast/:productId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { forecastDays = 30 } = req.query;
    const result = await AIMLService.forecastDemand(
      req.params.productId,
      forecastDays
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ML-based recommendations
router.get('/recommendations/ml', verifyToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const result = await AIMLService.getMLRecommendations(
      req.user.userId,
      limit
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Churn prediction
router.get('/churn/predict', verifyToken, async (req, res) => {
  try {
    const result = await AIMLService.predictCustomerChurn(req.user.userId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Anomaly detection
router.get('/anomalies/detect', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await AIMLService.detectOrderAnomalies();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
