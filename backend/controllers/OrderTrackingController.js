/**
 * Order Tracking Controller - Phase 9 Feature A
 * REST endpoints for real-time order tracking
 */

const OrderTrackingService = require('../services/OrderTrackingService');

class OrderTrackingController {
  /**
   * POST /api/phase9/tracking/initialize
   * Initialize order tracking
   */
  static async initializeTracking(req, res) {
    try {
      const { orderId, userId, restaurantId } = req.body;

      if (!orderId || !userId || !restaurantId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
          errors: ['orderId', 'userId', 'restaurantId are required'],
        });
      }

      const result = await OrderTrackingService.initializeTracking(orderId, userId, restaurantId);
      res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /api/phase9/tracking/:trackingId/status
   * Update order status
   */
  static async updateOrderStatus(req, res) {
    try {
      const { trackingId } = req.params;
      const { status, notes } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required',
        });
      }

      const result = await OrderTrackingService.updateOrderStatus(trackingId, status, notes);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /api/phase9/tracking/:trackingId/location
   * Update current location
   */
  static async updateLocation(req, res) {
    try {
      const { trackingId } = req.params;
      const { lat, long, accuracy } = req.body;

      if (!lat || !long) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required',
        });
      }

      const result = await OrderTrackingService.updateCurrentLocation(trackingId, lat, long, accuracy);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/phase9/tracking/:trackingId/notification
   * Add notification
   */
  static async addNotification(req, res) {
    try {
      const { trackingId } = req.params;
      const { type, message } = req.body;

      if (!type || !message) {
        return res.status(400).json({
          success: false,
          message: 'Type and message are required',
        });
      }

      const result = await OrderTrackingService.addNotification(trackingId, type, message);
      res.status(result.success ? 201 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /api/phase9/tracking/:trackingId/notification/:notificationId/read
   * Mark notification as read
   */
  static async markNotificationRead(req, res) {
    try {
      const { trackingId, notificationId } = req.params;

      const result = await OrderTrackingService.markNotificationRead(trackingId, notificationId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/phase9/tracking/:trackingId/issue
   * Report delivery issue
   */
  static async reportIssue(req, res) {
    try {
      const { trackingId } = req.params;
      const { issueType, description } = req.body;

      if (!issueType || !description) {
        return res.status(400).json({
          success: false,
          message: 'Issue type and description are required',
        });
      }

      const result = await OrderTrackingService.reportIssue(trackingId, issueType, description);
      res.status(result.success ? 201 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/tracking/:trackingId
   * Get tracking details
   */
  static async getTrackingDetails(req, res) {
    try {
      const { trackingId } = req.params;

      const result = await OrderTrackingService.getTrackingDetails(trackingId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/tracking/order/:orderId
   * Get tracking by order ID
   */
  static async getTrackingByOrderId(req, res) {
    try {
      const { orderId } = req.params;

      const result = await OrderTrackingService.getTrackingByOrderId(orderId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/phase9/tracking/estimate
   * Calculate delivery time estimate
   */
  static async calculateDeliveryEstimate(req, res) {
    try {
      const { restaurantId, deliveryDistance, itemCount } = req.body;

      if (!restaurantId || !deliveryDistance || !itemCount) {
        return res.status(400).json({
          success: false,
          message: 'restaurantId, deliveryDistance, and itemCount are required',
        });
      }

      const result = await OrderTrackingService.calculateDeliveryEstimate(restaurantId, deliveryDistance, itemCount);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * DELETE /api/phase9/tracking/:trackingId/cancel
   * Cancel order
   */
  static async cancelOrder(req, res) {
    try {
      const { trackingId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Cancellation reason is required',
        });
      }

      const result = await OrderTrackingService.cancelOrder(trackingId, reason);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = OrderTrackingController;
