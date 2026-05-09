/**
 * adminOrderManagementRoutes.js
 * Phase 5E - Admin order management endpoints
 */

const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const OrderManagementService = require('../services/OrderManagementService');
const ReturnService = require('../services/ReturnService');
const FulfillmentService = require('../services/FulfillmentService');
const logger = require('../utils/logger');

// ============================================
// ADMIN ORDER OPERATIONS
// ============================================

/**
 * GET /api/admin/orders
 * Get all orders (with filtering)
 */
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
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
      limit = 20,
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
      null,
      filters,
      Number(page),
      Number(limit)
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    logger.error('Error fetching all orders:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/orders/by-status/:status
 * Get orders filtered by status
 */
router.get('/by-status/:status', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { status } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const result = await OrderManagementService.getOrdersByStatus(
      status,
      Number(page),
      Number(limit)
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    logger.error('Error fetching orders by status:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/admin/orders/:orderId/status
 * Update order status (admin)
 */
router.patch('/:orderId/status', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const order = await OrderManagementService.updateOrderStatus(
      orderId,
      status,
      {
        adminId: req.user.id,
        notes,
        timestamp: new Date(),
      }
    );

    res.json({
      success: true,
      data: order,
      message: `Order status updated to ${status}`,
    });
  } catch (err) {
    logger.error('Error updating order status:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/orders/bulk-status-update
 * Bulk update order statuses
 */
router.post('/bulk-status-update', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { orderIds, status, notes } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'orderIds array is required' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const result = await OrderManagementService.bulkUpdateOrderStatus(orderIds, status);

    // Add metadata
    for (const orderId of orderIds) {
      try {
        await OrderManagementService.updateOrderStatus(orderId, status, {
          adminId: req.user.id,
          notes,
          bulkOperation: true,
        });
      } catch (error) {
        logger.warn(`Failed to update order ${orderId}:`, error.message);
      }
    }

    res.json({
      success: true,
      data: result,
      message: `Updated ${result.modifiedCount} orders to ${status}`,
    });
  } catch (err) {
    logger.error('Error in bulk status update:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ADMIN RETURN MANAGEMENT
// ============================================

/**
 * GET /api/admin/returns/pending
 * Get pending return requests
 */
router.get('/returns/pending', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const result = await ReturnService.getPendingReturns(Number(page), Number(limit));

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    logger.error('Error fetching pending returns:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/returns/:returnId
 * Get return request details
 */
router.get('/returns/:returnId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { returnId } = req.params;

    const returnRequest = await ReturnService.getReturnDetails(returnId);

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
 * POST /api/admin/returns/:returnId/approve
 * Approve return request
 */
router.post('/returns/:returnId/approve', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { returnId } = req.params;
    const { adminNotes } = req.body;

    const returnRequest = await ReturnService.approveReturn(
      returnId,
      adminNotes || `Approved by admin ${req.user.id}`
    );

    res.json({
      success: true,
      data: returnRequest,
      message: 'Return approved. Customer has been notified.',
    });
  } catch (err) {
    logger.error('Error approving return:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/returns/:returnId/reject
 * Reject return request
 */
router.post('/returns/:returnId/reject', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { returnId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const returnRequest = await ReturnService.rejectReturn(returnId, rejectionReason);

    res.json({
      success: true,
      data: returnRequest,
      message: 'Return rejected. Customer has been notified.',
    });
  } catch (err) {
    logger.error('Error rejecting return:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/returns/:returnId/mark-received
 * Mark return as received
 */
router.post('/returns/:returnId/mark-received', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { returnId } = req.params;
    const { receivedItems, condition } = req.body;

    const returnRequest = await ReturnService.markReturnReceived(returnId, {
      receivedItems,
      condition,
      receivedAt: new Date(),
      receivedBy: req.user.id,
    });

    res.json({
      success: true,
      data: returnRequest,
      message: 'Return marked as received. Refund processing initiated.',
    });
  } catch (err) {
    logger.error('Error marking return received:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/returns/:returnId/process-refund
 * Process refund for return
 */
router.post('/returns/:returnId/process-refund', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { returnId } = req.params;

    const returnRequest = await ReturnService.processReturnRefund(returnId);

    res.json({
      success: true,
      data: returnRequest,
      message: `Refund of ₹${returnRequest.refundAmount} processed successfully.`,
    });
  } catch (err) {
    logger.error('Error processing return refund:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/returns/stats
 * Get return statistics
 */
router.get('/returns/stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), dateTo = new Date() } = req.query;

    const stats = await ReturnService.getReturnStatistics(dateFrom, dateTo);

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    logger.error('Error fetching return statistics:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ADMIN FULFILLMENT/SHIPMENT MANAGEMENT
// ============================================

/**
 * POST /api/admin/shipments
 * Create shipment
 */
router.post('/shipments', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { orderId, items, shippingMethod, trackingNumber } = req.body;

    if (!orderId || !items) {
      return res.status(400).json({ error: 'orderId and items are required' });
    }

    const shipment = await FulfillmentService.createShipment(
      orderId,
      items,
      shippingMethod || 'standard',
      trackingNumber
    );

    res.json({
      success: true,
      data: shipment,
      message: `Shipment created with tracking: ${shipment.trackingNumber}`,
    });
  } catch (err) {
    logger.error('Error creating shipment:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/shipments/by-status/:status
 * Get shipments by status
 */
router.get('/shipments/by-status/:status', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { status } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const result = await FulfillmentService.getShipmentsByStatus(
      status,
      Number(page),
      Number(limit)
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    logger.error('Error fetching shipments by status:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/admin/shipments/:trackingNumber
 * Update shipment status
 */
router.patch('/shipments/:trackingNumber', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { status, location } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const shipment = await FulfillmentService.updateShipmentStatus(
      trackingNumber,
      status,
      location || ''
    );

    res.json({
      success: true,
      data: shipment,
      message: `Shipment status updated to ${status}`,
    });
  } catch (err) {
    logger.error('Error updating shipment status:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/shipments/bulk-create
 * Bulk create shipments
 */
router.post('/shipments/bulk-create', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { shipmentData } = req.body;

    if (!shipmentData || !Array.isArray(shipmentData)) {
      return res.status(400).json({ error: 'shipmentData array is required' });
    }

    const result = await FulfillmentService.processBulkShipments(shipmentData);

    res.json({
      success: true,
      data: result,
      message: `Created ${result.success} shipments, ${result.failed} failed`,
    });
  } catch (err) {
    logger.error('Error creating bulk shipments:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/shipments/stats
 * Get fulfillment statistics
 */
router.get('/shipments/stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), dateTo = new Date() } = req.query;

    const stats = await FulfillmentService.getFulfillmentStats(dateFrom, dateTo);

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    logger.error('Error fetching fulfillment stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ADMIN DASHBOARD
// ============================================

/**
 * GET /api/admin/dashboard/orders-summary
 * Get orders summary for dashboard
 */
router.get('/dashboard/orders-summary', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const Order = require('../models/Order');

    const summary = await Order.aggregate([
      {
        $facet: {
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$total' },
              },
            },
          ],
          dailyOrders: [
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                },
                count: { $sum: 1 },
                revenue: { $sum: '$total' },
              },
            },
            { $sort: { _id: -1 } },
            { $limit: 30 },
          ],
          topProducts: [
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.productId',
                productName: { $first: '$items.name' },
                orderCount: { $sum: 1 },
                revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
              },
            },
            { $sort: { orderCount: -1 } },
            { $limit: 10 },
          ],
        },
      },
    ]);

    res.json({
      success: true,
      data: summary[0],
    });
  } catch (err) {
    logger.error('Error fetching orders summary:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/dashboard/fulfillment-summary
 * Get fulfillment summary for dashboard
 */
router.get('/dashboard/fulfillment-summary', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const Shipment = require('../models/Shipment');

    const summary = await Shipment.aggregate([
      {
        $facet: {
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],
          avgDeliveryTime: [
            {
              $match: { status: 'delivered' },
            },
            {
              $group: {
                _id: null,
                avgDays: {
                  $avg: {
                    $divide: [
                      { $subtract: ['$deliveredAt', '$createdAt'] },
                      1000 * 60 * 60 * 24,
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    ]);

    res.json({
      success: true,
      data: summary[0],
    });
  } catch (err) {
    logger.error('Error fetching fulfillment summary:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/dashboard/returns-summary
 * Get returns summary for dashboard
 */
router.get('/dashboard/returns-summary', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const Return = require('../models/Return');

    const summary = await Return.aggregate([
      {
        $facet: {
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],
          byReason: [
            {
              $group: {
                _id: '$reason',
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
          ],
          totalRefunds: [
            {
              $match: { status: 'refunded' },
            },
            {
              $group: {
                _id: null,
                totalAmount: { $sum: '$refundAmount' },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    res.json({
      success: true,
      data: summary[0],
    });
  } catch (err) {
    logger.error('Error fetching returns summary:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
