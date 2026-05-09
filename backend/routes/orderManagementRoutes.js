/**
 * orderManagementRoutes.js
 * Phase 5E - Order management endpoints
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const OrderManagementService = require('../services/OrderManagementService');
const FulfillmentService = require('../services/FulfillmentService');
const ReturnService = require('../services/ReturnService');
const logger = require('../utils/logger');

// ============================================
// ORDER LISTING & DETAILS
// ============================================

/**
 * GET /api/orders/my-orders
 * Get user's orders with filters and pagination
 */
router.get('/my-orders', verifyToken, async (req, res) => {
  try {
    const {
      status,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      sortBy = 'createdAt',
      sortOrder = '-1',
      page = 1,
      limit = 10,
    } = req.query;

    const filters = {
      status,
      dateFrom,
      dateTo,
      minAmount: minAmount ? Number(minAmount) : null,
      maxAmount: maxAmount ? Number(maxAmount) : null,
      sortBy,
      sortOrder: Number(sortOrder),
    };

    const result = await OrderManagementService.getUserOrders(
      req.user.id,
      filters,
      Number(page),
      Number(limit)
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    logger.error('Error fetching user orders:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/orders/:orderId
 * Get order details
 */
router.get('/:orderId', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await OrderManagementService.getOrderDetails(orderId, req.user.id);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    logger.error('Error fetching order details:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/orders/:orderId/timeline
 * Get order status timeline
 */
router.get('/:orderId/timeline', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    const timeline = await OrderManagementService.getOrderTimeline(orderId);

    res.json({
      success: true,
      data: { timeline },
    });
  } catch (err) {
    logger.error('Error fetching order timeline:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/orders/stats/my-stats
 * Get user's order statistics
 */
router.get('/stats/my-stats', verifyToken, async (req, res) => {
  try {
    const stats = await OrderManagementService.getUserOrderStats(req.user.id);

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    logger.error('Error fetching order stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ORDER CANCELLATION
// ============================================

/**
 * POST /api/orders/:orderId/cancel
 * Cancel order
 */
router.post('/:orderId/cancel', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await OrderManagementService.cancelOrder(orderId, req.user.id, reason);

    res.json({
      success: true,
      data: { orderId, status: order.status },
      message: 'Order cancelled successfully. Refund initiated.',
    });
  } catch (err) {
    logger.error('Error cancelling order:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// TRACKING
// ============================================

/**
 * GET /api/orders/:orderId/tracking
 * Get order tracking information
 */
router.get('/:orderId/tracking', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    const tracking = await FulfillmentService.getOrderTracking(orderId, req.user.id);

    res.json({
      success: true,
      data: tracking,
    });
  } catch (err) {
    logger.error('Error fetching order tracking:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/orders/track/:trackingNumber
 * Track shipment by tracking number
 */
router.get('/track/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    const tracking = await FulfillmentService.getShipmentTracking(trackingNumber);

    res.json({
      success: true,
      data: tracking,
    });
  } catch (err) {
    logger.error('Error fetching shipment tracking:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// RETURNS
// ============================================

/**
 * POST /api/orders/:orderId/return
 * Initiate return request
 */
router.post('/:orderId/return', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason, items, comments } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Return reason is required' });
    }

    const returnRequest = await ReturnService.initiateReturn(
      orderId,
      req.user.id,
      reason,
      items,
      comments
    );

    res.json({
      success: true,
      data: returnRequest,
      message: 'Return initiated successfully. We will review your request shortly.',
    });
  } catch (err) {
    logger.error('Error initiating return:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/orders/returns/my-returns
 * Get user's returns
 */
router.get('/returns/my-returns', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const result = await ReturnService.getUserReturns(req.user.id, Number(page), Number(limit));

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    logger.error('Error fetching user returns:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/orders/returns/:returnId
 * Get return details
 */
router.get('/returns/:returnId', verifyToken, async (req, res) => {
  try {
    const { returnId } = req.params;

    const returnRequest = await ReturnService.getReturnDetails(returnId, req.user.id);

    res.json({
      success: true,
      data: returnRequest,
    });
  } catch (err) {
    logger.error('Error fetching return details:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/orders/returns/:returnId/label
 * Get return shipping label
 */
router.get('/returns/:returnId/label', verifyToken, async (req, res) => {
  try {
    const { returnId } = req.params;

    const label = await ReturnService.generateReturnLabel(returnId);

    res.json({
      success: true,
      data: label,
    });
  } catch (err) {
    logger.error('Error generating return label:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
