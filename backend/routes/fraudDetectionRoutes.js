const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const FraudDetectionService = require('../services/FraudDetectionService');
const logger = require('../utils/logger');

/**
 * Phase 3: Fraud Detection & Prevention Routes
 * Handles transaction analysis, account takeover detection, fraud alerts
 */

/**
 * POST /api/ecommerce/fraud/analyze
 * Analyze transaction for fraud risk
 */
router.post('/analyze', auth, async (req, res) => {
  try {
    const { orderId, orderData = {} } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'orderId is required',
      });
    }

    const result = await FraudDetectionService.analyzeTransaction(
      orderId,
      orderData
    );

    res.json({
      success: true,
      data: result,
      message: 'Transaction analyzed',
    });
  } catch (error) {
    logger.error('Error analyzing transaction:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/ecommerce/fraud/detect-takeover
 * Detect account takeover attempts
 */
router.post('/detect-takeover', auth, async (req, res) => {
  try {
    const { userId } = req;
    const { loginData = {} } = req.body;

    const result = await FraudDetectionService.detectAccountTakeover(
      userId,
      loginData
    );

    res.json({
      success: true,
      data: result,
      message: 'Account analysis completed',
    });
  } catch (error) {
    logger.error('Error detecting account takeover:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/fraud/report
 * Get fraud analysis report
 * Query params: period (default 30)
 */
router.get('/report', auth, async (req, res) => {
  try {
    const { period = 30 } = req.query;

    const result = await FraudDetectionService.getFraudReport(period);

    res.json({
      success: true,
      data: result,
      message: 'Fraud report generated',
    });
  } catch (error) {
    logger.error('Error generating fraud report:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
