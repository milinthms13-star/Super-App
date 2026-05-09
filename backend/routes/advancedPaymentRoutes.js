/**
 * advancedPaymentRoutes.js
 * API endpoints for UPI, BNPL, and EMI payments
 */

const express = require('express');
const router = express.Router();
const AdvancedPaymentService = require('../services/AdvancedPaymentService');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');
const logger = require('../config/logger');

/**
 * POST /api/payments/upi/initiate
 * Initiate UPI transaction
 */
router.post('/upi/initiate', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.body;
    const Order = require('../models/Order');

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const upiTransaction = await AdvancedPaymentService.initiateUPITransaction(
      order,
      req.userId
    );

    res.json({
      success: true,
      data: upiTransaction,
    });
  } catch (error) {
    logger.error('UPI initiate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate UPI transaction',
      error: error.message,
    });
  }
});

/**
 * GET /api/payments/upi/status/:transactionId
 * Validate UPI transaction status
 */
router.get('/upi/status/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    const status = await AdvancedPaymentService.validateUPITransaction(
      transactionId
    );

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('UPI status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check UPI status',
      error: error.message,
    });
  }
});

/**
 * POST /api/payments/bnpl/check-eligibility
 * Check BNPL eligibility
 */
router.post('/bnpl/check-eligibility', verifyToken, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required',
      });
    }

    const eligibility = await AdvancedPaymentService.checkBNPLEligibility(
      req.userId,
      amount
    );

    res.json({
      success: true,
      data: eligibility,
    });
  } catch (error) {
    logger.error('BNPL eligibility check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check BNPL eligibility',
      error: error.message,
    });
  }
});

/**
 * GET /api/payments/bnpl/plans
 * Get available BNPL plans
 */
router.get('/bnpl/plans', async (req, res) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required',
      });
    }

    const plans = await AdvancedPaymentService.getBNPLPlans(parseInt(amount));

    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    logger.error('Get BNPL plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get BNPL plans',
      error: error.message,
    });
  }
});

/**
 * POST /api/payments/bnpl/initiate
 * Initiate BNPL transaction
 */
router.post('/bnpl/initiate', verifyToken, async (req, res) => {
  try {
    const { orderId, planDuration } = req.body;
    const Order = require('../models/Order');

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const bnplTransaction = await AdvancedPaymentService.initiateBNPLTransaction(
      order,
      req.userId,
      planDuration
    );

    res.json({
      success: true,
      data: bnplTransaction,
    });
  } catch (error) {
    logger.error('BNPL initiate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate BNPL transaction',
      error: error.message,
    });
  }
});

/**
 * GET /api/payments/emi/options
 * Get EMI options for amount
 */
router.get('/emi/options', async (req, res) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required',
      });
    }

    const emiOptions = await AdvancedPaymentService.getEMIOptions(
      parseInt(amount)
    );

    res.json({
      success: true,
      data: emiOptions,
    });
  } catch (error) {
    logger.error('Get EMI options error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get EMI options',
      error: error.message,
    });
  }
});

/**
 * POST /api/payments/emi/initiate
 * Initiate EMI transaction
 */
router.post('/emi/initiate', verifyToken, async (req, res) => {
  try {
    const { orderId, emiDetails } = req.body;
    const Order = require('../models/Order');

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const emiTransaction = await AdvancedPaymentService.initiateEMITransaction(
      order,
      req.userId,
      emiDetails
    );

    res.json({
      success: true,
      data: emiTransaction,
    });
  } catch (error) {
    logger.error('EMI initiate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate EMI transaction',
      error: error.message,
    });
  }
});

module.exports = router;
