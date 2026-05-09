/**
 * b2bRoutes.js
 * Routes for B2B operations and corporate accounts
 */

const express = require('express');
const router = express.Router();
const B2BServiceLayerService = require('../services/B2BServiceLayerService');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
const logger = require('../config/logger');

/**
 * POST /api/ecommerce/b2b/accounts
 * Create corporate account (public)
 */
router.post('/accounts', async (req, res) => {
  try {
    const result = await B2BServiceLayerService.createCorporateAccount(req.body);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Error creating corporate account:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ecommerce/b2b/orders
 * Create bulk order (protected)
 */
router.post('/orders', verifyToken, async (req, res) => {
  try {
    const result = await B2BServiceLayerService.createBulkOrder(req.user.userId, req.body);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Error creating bulk order:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ecommerce/b2b/orders/:orderId/approve
 * Approve bulk order (admin-only)
 */
router.post('/orders/:orderId/approve', verifyAdmin, async (req, res) => {
  try {
    const approverNotes = req.body.notes || '';
    const result = await B2BServiceLayerService.approveBulkOrder(req.params.orderId, approverNotes);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error approving bulk order:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ecommerce/b2b/orders/:orderId/invoice
 * Generate invoice for bulk order (admin-only)
 */
router.post('/orders/:orderId/invoice', verifyAdmin, async (req, res) => {
  try {
    const result = await B2BServiceLayerService.generateInvoice(req.params.orderId, req.body);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Error generating invoice:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ecommerce/b2b/dashboard
 * Get B2B dashboard (protected)
 */
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const result = await B2BServiceLayerService.getB2BDashboard(req.user.userId);
    res.status(200).json({ success: true, data: result, message: 'Dashboard retrieved' });
  } catch (error) {
    logger.error('Error getting B2B dashboard:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ecommerce/b2b/pricing/:productId
 * Get bulk pricing for product (public)
 */
router.get('/pricing/:productId', async (req, res) => {
  try {
    const quantity = parseInt(req.query.quantity) || 10;
    const result = await B2BServiceLayerService.getBulkPricing(req.params.productId, quantity);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error('Error getting bulk pricing:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ecommerce/b2b/accounts/:accountId/payments
 * Get payment history (admin-only)
 */
router.get('/accounts/:accountId/payments', verifyAdmin, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const result = await B2BServiceLayerService.getPaymentHistory(req.params.accountId, limit);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error('Error getting payment history:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ecommerce/b2b/accounts/:accountId/credit-request
 * Request credit limit increase (protected)
 */
router.post('/accounts/:accountId/credit-request', verifyToken, async (req, res) => {
  try {
    const result = await B2BServiceLayerService.requestCreditLimitIncrease(
      req.params.accountId,
      req.body.requestedLimit
    );
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error requesting credit limit increase:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ecommerce/b2b/accounts/:accountId/approve-credit
 * Approve credit limit increase (admin-only)
 */
router.post('/accounts/:accountId/approve-credit', verifyAdmin, async (req, res) => {
  try {
    const result = await B2BServiceLayerService.approveCreditLimitIncrease(
      req.params.accountId,
      req.body.newLimit
    );
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error approving credit limit increase:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
