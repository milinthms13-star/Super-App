/**
 * ScheduledDeliveryService
 * Business logic for scheduled orders and future delivery management
 * Handles scheduling, reminders, modifications, and tracking
 */

const ScheduledOrder = require('../models/ScheduledOrder');
const moment = require('moment');

class ScheduledDeliveryService {
  /**
   * Create a scheduled order
   */
  static async createScheduledOrder(orderData) {
    try {
      const scheduledOrderId = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Set modification deadline (30 minutes before delivery)
      const deliveryTime = new Date(orderData.scheduledDeliveryTime);
      const modificationDeadline = new Date(deliveryTime.getTime() - 30 * 60000);

      const scheduledOrder = new ScheduledOrder({
        scheduledOrderId,
        ...orderData,
        modificationDeadline,
      });

      // Add initial status to timeline
      scheduledOrder.statusTimeline.push({
        status: 'scheduled',
        timestamp: new Date(),
        notes: 'Order scheduled successfully',
      });

      await scheduledOrder.save();

      return {
        success: true,
        data: scheduledOrder,
        message: 'Order scheduled successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Get scheduled orders for a user
   */
  static async getUserScheduledOrders(userId, status = null) {
    try {
      const query = { userId };

      if (status) {
        query.status = status;
      }

      const orders = await ScheduledOrder.find(query)
        .sort({ scheduledDeliveryTime: 1 });

      return {
        success: true,
        data: orders,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Get upcoming scheduled orders for a restaurant
   */
  static async getRestaurantUpcomingOrders(restaurantId) {
    try {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const orders = await ScheduledOrder.find({
        restaurantId,
        scheduledDeliveryTime: { $gte: now, $lte: nextWeek },
        'cancellation.isCancelled': false,
      }).sort({ scheduledDeliveryTime: 1 });

      return {
        success: true,
        data: orders,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Get scheduled order details
   */
  static async getScheduledOrderById(scheduledOrderId) {
    try {
      const order = await ScheduledOrder.findOne({ scheduledOrderId })
        .populate('items.itemId')
        .populate('orderId');

      if (!order) {
        return {
          success: false,
          message: 'Scheduled order not found',
        };
      }

      return {
        success: true,
        data: order,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Check if order can be modified
   */
  static async canModifyOrder(scheduledOrderId) {
    try {
      const order = await ScheduledOrder.findOne({ scheduledOrderId });

      if (!order) {
        return {
          success: false,
          message: 'Order not found',
        };
      }

      const canModify = order.canModify();

      return {
        success: true,
        data: {
          canModify,
          reason: canModify ? 'Order can be modified' : 'Modification deadline passed',
          modificationDeadline: order.modificationDeadline,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Modify scheduled order
   */
  static async modifyScheduledOrder(scheduledOrderId, modificationData) {
    try {
      const order = await ScheduledOrder.findOne({ scheduledOrderId });

      if (!order) {
        return {
          success: false,
          message: 'Order not found',
        };
      }

      if (!order.canModify()) {
        return {
          success: false,
          message: 'Cannot modify order - modification deadline has passed',
        };
      }

      // Update items, pricing if provided
      if (modificationData.items) {
        order.items = modificationData.items;
      }

      if (modificationData.pricing) {
        order.pricing = modificationData.pricing;
      }

      if (modificationData.deliveryAddress) {
        order.deliveryAddress = modificationData.deliveryAddress;
      }

      // Record modification
      await order.addModification(modificationData.reason || 'Order modified', 'user');

      return {
        success: true,
        data: order,
        message: 'Order modified successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Update scheduled order status
   */
  static async updateOrderStatus(scheduledOrderId, newStatus, notes = '') {
    try {
      const order = await ScheduledOrder.findOne({ scheduledOrderId });

      if (!order) {
        return {
          success: false,
          message: 'Order not found',
        };
      }

      await order.updateStatus(newStatus, notes);

      return {
        success: true,
        data: order,
        message: `Order status updated to ${newStatus}`,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Send reminder notifications
   */
  static async sendReminders() {
    try {
      const now = new Date();

      // Find orders needing 1-hour reminder
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      const oneHourOrders = await ScheduledOrder.find({
        scheduledDeliveryTime: {
          $gte: now,
          $lte: oneHourLater,
        },
        'reminderSent.oneHourBefore': false,
        'cancellation.isCancelled': false,
      });

      // Find orders needing 30-minute reminder
      const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);
      const thirtyMinuteOrders = await ScheduledOrder.find({
        scheduledDeliveryTime: {
          $gte: now,
          $lte: thirtyMinutesLater,
        },
        'reminderSent.thirtyMinutesBefore': false,
        'cancellation.isCancelled': false,
      });

      const reminders = {
        oneHourBefore: oneHourOrders.length,
        thirtyMinutesBefore: thirtyMinuteOrders.length,
      };

      // Mark reminders as sent
      for (const order of oneHourOrders) {
        await order.markReminderSent('oneHourBefore');
      }

      for (const order of thirtyMinuteOrders) {
        await order.markReminderSent('thirtyMinutesBefore');
      }

      return {
        success: true,
        data: reminders,
        message: 'Reminders sent successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Cancel scheduled order
   */
  static async cancelScheduledOrder(scheduledOrderId, reason, cancelledBy = 'user') {
    try {
      const order = await ScheduledOrder.findOne({ scheduledOrderId });

      if (!order) {
        return {
          success: false,
          message: 'Order not found',
        };
      }

      if (order.cancellation.isCancelled) {
        return {
          success: false,
          message: 'Order is already cancelled',
        };
      }

      order.cancellation.isCancelled = true;
      order.cancellation.cancelledAt = new Date();
      order.cancellation.cancelledBy = cancelledBy;
      order.cancellation.reason = reason;
      order.cancellation.refundStatus = 'pending';

      await order.updateStatus('cancelled', `Cancelled by ${cancelledBy}: ${reason}`);

      return {
        success: true,
        data: order,
        message: 'Order cancelled successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Get scheduled orders statistics
   */
  static async getStatistics(startDate, endDate) {
    try {
      const stats = await ScheduledOrder.aggregate([
        {
          $match: {
            scheduledDeliveryTime: {
              $gte: new Date(startDate),
              $lte: new Date(endDate),
            },
          },
        },
        {
          $group: {
            _id: null,
            totalScheduledOrders: { $sum: 1 },
            completedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] },
            },
            cancelledOrders: {
              $sum: { $cond: [{ $eq: ['$cancellation.isCancelled', true] }, 1, 0] },
            },
            totalValue: { $sum: '$pricing.total' },
            avgOrderValue: { $avg: '$pricing.total' },
          },
        },
      ]);

      return {
        success: true,
        data: stats[0] || {},
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Rate a delivered scheduled order
   */
  static async rateScheduledOrder(scheduledOrderId, score, comment) {
    try {
      const order = await ScheduledOrder.findOne({ scheduledOrderId });

      if (!order) {
        return {
          success: false,
          message: 'Order not found',
        };
      }

      if (order.status !== 'delivered') {
        return {
          success: false,
          message: 'Only delivered orders can be rated',
        };
      }

      order.rating.score = score;
      order.rating.comment = comment;
      order.rating.ratedAt = new Date();

      await order.save();

      return {
        success: true,
        data: order,
        message: 'Order rated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }
}

module.exports = ScheduledDeliveryService;
