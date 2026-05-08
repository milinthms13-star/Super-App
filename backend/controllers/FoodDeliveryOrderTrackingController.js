const OrderTrackingService = require('../services/FoodDeliveryOrderTrackingService');
const NotificationService = require('../services/FoodDeliveryNotificationService');
const WebSocketManager = require('../services/WebSocketManager');

class OrderTrackingController {
  /**
   * Start tracking for an order
   */
  static async startTracking(req, res) {
    try {
      const { orderId } = req.params;
      const { deliveryPersonId, deliveryPersonDetails } = req.body;

      if (!orderId || !deliveryPersonId || !deliveryPersonDetails) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: orderId, deliveryPersonId, deliveryPersonDetails',
        });
      }

      const tracking = await OrderTrackingService.startTracking(
        orderId,
        deliveryPersonId,
        deliveryPersonDetails
      );

      res.status(201).json({
        success: true,
        data: tracking,
        message: 'Tracking started successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get tracking status
   */
  static async getTrackingStatus(req, res) {
    try {
      const { trackingId } = req.params;

      if (!trackingId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: trackingId',
        });
      }

      const tracking = await OrderTrackingService.getTrackingStatus(trackingId);

      res.json({
        success: true,
        data: tracking,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get tracking by order ID
   */
  static async getTrackingByOrderId(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user?.userId;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: orderId',
        });
      }

      const tracking = await OrderTrackingService.getTrackingByOrderId(orderId);

      // Verify user owns this order
      if (userId && tracking.userId.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access',
        });
      }

      res.json({
        success: true,
        data: tracking,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Update rider location (real-time)
   */
  static async updateRiderLocation(req, res) {
    try {
      const { trackingId } = req.params;
      const { latitude, longitude, accuracy, speed } = req.body;

      if (!trackingId || !latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: trackingId, latitude, longitude',
        });
      }

      const tracking = await OrderTrackingService.updateRiderLocation(
        trackingId,
        latitude,
        longitude,
        accuracy,
        speed
      );

      // Broadcast via WebSocket
      WebSocketManager.sendETAUpdate(
        trackingId,
        tracking.estimatedTimeRemaining ? Math.round(tracking.estimatedTimeRemaining / 60) : null,
        tracking.distanceToDelivery
      );

      res.json({
        success: true,
        data: {
          trackingId,
          location: tracking.currentLocation,
          eta: {
            minutes: tracking.estimatedTimeRemaining ? Math.round(tracking.estimatedTimeRemaining / 60) : null,
            distance: tracking.distanceToDelivery,
          },
          status: tracking.status,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get route history
   */
  static async getRouteHistory(req, res) {
    try {
      const { trackingId } = req.params;

      if (!trackingId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: trackingId',
        });
      }

      const history = await OrderTrackingService.getRouteHistory(trackingId);

      res.json({
        success: true,
        data: {
          trackingId,
          waypoints: history,
          totalPoints: history.length,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Mark delivery as picked up
   */
  static async markPickedUp(req, res) {
    try {
      const { trackingId } = req.params;

      if (!trackingId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: trackingId',
        });
      }

      const tracking = await OrderTrackingService.markPickedUp(trackingId);

      // Send notification
      await NotificationService.createNotification(
        'order_picked_up',
        'Order Picked Up',
        'Your order has been picked up from the restaurant',
        { userId: tracking.userId }
      );

      res.json({
        success: true,
        data: tracking,
        message: 'Marked as picked up',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Mark delivery as completed
   */
  static async markDelivered(req, res) {
    try {
      const { trackingId } = req.params;
      const { notes } = req.body;

      if (!trackingId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: trackingId',
        });
      }

      const tracking = await OrderTrackingService.markDelivered(trackingId, notes);

      // Send notification
      await NotificationService.createNotification(
        'order_delivered',
        'Order Delivered ✅',
        'Your order has been delivered. Thank you!',
        { userId: tracking.userId }
      );

      // Broadcast completion
      WebSocketManager.sendStatusUpdate(trackingId, 'delivered', 'Order has been delivered');

      res.json({
        success: true,
        data: tracking,
        message: 'Order marked as delivered',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Report delivery issue
   */
  static async reportIssue(req, res) {
    try {
      const { trackingId } = req.params;
      const { issueType, description, severity } = req.body;

      if (!trackingId || !issueType || !description) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: issueType, description',
        });
      }

      const tracking = await OrderTrackingService.reportIssue(
        trackingId,
        issueType,
        description,
        severity
      );

      // Send notification to customer
      await NotificationService.createNotification(
        'delivery_issue',
        'Delivery Issue Reported',
        `Issue: ${description}`,
        { userId: tracking.userId }
      );

      res.json({
        success: true,
        data: {
          trackingId,
          issue: tracking.issues[tracking.issues.length - 1],
        },
        message: 'Issue reported successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get rider active trackings
   */
  static async getRiderActiveTrackings(req, res) {
    try {
      const deliveryPersonId = req.user?.userId;

      if (!deliveryPersonId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const trackings = await OrderTrackingService.getDeliveryPersonActiveTrackings(deliveryPersonId);

      res.json({
        success: true,
        data: trackings,
        count: trackings.length,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get customer trackings
   */
  static async getCustomerTrackings(req, res) {
    try {
      const userId = req.user?.userId;
      const { limit = 10, skip = 0 } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const trackings = await OrderTrackingService.getCustomerTrackings(
        userId,
        parseInt(limit),
        parseInt(skip)
      );

      res.json({
        success: true,
        data: trackings,
        count: trackings.length,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Start emergency call
   */
  static async startEmergencyCall(req, res) {
    try {
      const { trackingId } = req.params;

      if (!trackingId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: trackingId',
        });
      }

      const tracking = await OrderTrackingService.startEmergencyCall(trackingId);

      res.json({
        success: true,
        data: {
          trackingId,
          emergencyContact: tracking.emergencyContact,
        },
        message: 'Emergency call initiated',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * End emergency call
   */
  static async endEmergencyCall(req, res) {
    try {
      const { trackingId } = req.params;

      if (!trackingId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: trackingId',
        });
      }

      const tracking = await OrderTrackingService.endEmergencyCall(trackingId);

      res.json({
        success: true,
        data: {
          trackingId,
          emergencyContact: tracking.emergencyContact,
        },
        message: 'Emergency call ended',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get nearby orders (for rider assignment)
   */
  static async getNearbyOrders(req, res) {
    try {
      const { latitude, longitude, radius = 2 } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: latitude, longitude',
        });
      }

      const nearby = await OrderTrackingService.getNearbyOrders(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(radius)
      );

      res.json({
        success: true,
        data: nearby,
        count: nearby.length,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = OrderTrackingController;
