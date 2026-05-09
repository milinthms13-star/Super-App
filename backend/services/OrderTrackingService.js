/**
 * Order Tracking Service - Phase 9 Feature A
 * Real-time order status tracking, notifications, location updates
 */

const OrderTracking = require('../models/OrderTracking');
const Notification = require('../models/FoodDeliveryNotification');

class OrderTrackingService {
  /**
   * Initialize order tracking
   */
  static async initializeTracking(orderId, userId, restaurantId) {
    try {
      const trackingId = `TRACK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const tracking = new OrderTracking({
        trackingId,
        orderId,
        userId,
        restaurantId,
        orderStatus: 'placed',
        statusTimeline: [
          {
            status: 'placed',
            timestamp: new Date(),
            updatedBy: 'system',
          },
        ],
        notifications: [],
      });

      await tracking.save();
      return { success: true, data: tracking };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Update order status with timeline tracking
   */
  static async updateOrderStatus(trackingId, newStatus, notes = '') {
    try {
      const tracking = await OrderTracking.findOne({ trackingId });
      if (!tracking) {
        return { success: false, message: 'Tracking record not found' };
      }

      tracking.orderStatus = newStatus;
      tracking.statusTimeline.push({
        status: newStatus,
        timestamp: new Date(),
        notes,
        updatedBy: 'system',
      });

      await tracking.save();
      return { success: true, data: tracking, message: 'Order status updated' };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Update current location for delivery
   */
  static async updateCurrentLocation(trackingId, lat, long, accuracy = 10) {
    try {
      const tracking = await OrderTracking.findOne({ trackingId });
      if (!tracking) {
        return { success: false, message: 'Tracking record not found' };
      }

      tracking.deliveryTracking.currentLocation = {
        lat,
        long,
        address: `${lat}, ${long}`,
        updatedAt: new Date(),
        accuracy,
      };

      await tracking.save();
      return { success: true, data: tracking, message: 'Location updated' };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Add notification to tracking
   */
  static async addNotification(trackingId, type, message) {
    try {
      const tracking = await OrderTracking.findOne({ trackingId });
      if (!tracking) {
        return { success: false, message: 'Tracking record not found' };
      }

      const notificationId = `NOTIF-${Date.now()}`;
      tracking.notifications.push({
        notificationId,
        type,
        message,
        sentAt: new Date(),
        delivered: true,
        deliveredAt: new Date(),
      });

      await tracking.save();
      return { success: true, data: tracking, message: 'Notification added' };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Mark notification as read
   */
  static async markNotificationRead(trackingId, notificationId) {
    try {
      const tracking = await OrderTracking.findOne({ trackingId });
      if (!tracking) {
        return { success: false, message: 'Tracking record not found' };
      }

      const notification = tracking.notifications.find((n) => n.notificationId === notificationId);
      if (notification) {
        notification.read = true;
        notification.readAt = new Date();
      }

      await tracking.save();
      return { success: true, data: tracking };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Report delivery issue
   */
  static async reportIssue(trackingId, issueType, description) {
    try {
      const tracking = await OrderTracking.findOne({ trackingId });
      if (!tracking) {
        return { success: false, message: 'Tracking record not found' };
      }

      const issueId = `ISSUE-${Date.now()}`;
      tracking.issues.push({
        issueId,
        type: issueType,
        description,
        reportedAt: new Date(),
        status: 'open',
      });

      await tracking.save();
      return { success: true, data: tracking, message: 'Issue reported' };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get real-time tracking details
   */
  static async getTrackingDetails(trackingId) {
    try {
      const tracking = await OrderTracking.findOne({ trackingId });
      if (!tracking) {
        return { success: false, message: 'Tracking record not found' };
      }

      return {
        success: true,
        data: {
          trackingId: tracking.trackingId,
          orderId: tracking.orderId,
          orderStatus: tracking.orderStatus,
          statusTimeline: tracking.statusTimeline,
          currentLocation: tracking.deliveryTracking.currentLocation,
          estimatedDeliveryTime: tracking.estimatedTimes.totalTime,
          notifications: tracking.notifications,
          issues: tracking.issues,
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Calculate delivery time estimate
   */
  static async calculateDeliveryEstimate(restaurantId, deliveryDistance, itemCount) {
    try {
      // Simple estimation: 5 min prep + 2 min per item + 1 min per km
      const prepTime = 5;
      const itemTime = itemCount * 2;
      const deliveryTime = Math.ceil(deliveryDistance);

      const totalTime = prepTime + itemTime + deliveryTime;

      return {
        success: true,
        data: {
          preparationTime: prepTime,
          itemTime,
          deliveryTime,
          totalEstimatedTime: totalTime,
          confidence: 0.85,
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Cancel order with refund processing
   */
  static async cancelOrder(trackingId, cancelReason) {
    try {
      const tracking = await OrderTracking.findOne({ trackingId });
      if (!tracking) {
        return { success: false, message: 'Tracking record not found' };
      }

      tracking.cancellation = {
        isCancelled: true,
        cancelledAt: new Date(),
        reason: cancelReason,
        refundStatus: 'processing',
      };

      tracking.orderStatus = 'cancelled';
      await tracking.save();

      return { success: true, data: tracking, message: 'Order cancelled, refund processing' };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get tracking by order ID
   */
  static async getTrackingByOrderId(orderId) {
    try {
      const tracking = await OrderTracking.findOne({ orderId });
      if (!tracking) {
        return { success: false, message: 'Tracking not found for this order' };
      }
      return { success: true, data: tracking };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }
}

module.exports = OrderTrackingService;
