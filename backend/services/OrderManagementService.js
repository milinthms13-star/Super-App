/**
 * OrderManagementService.js
 * Phase 5E - Order lifecycle management and status updates
 */

const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

class OrderManagementService {
  static instance;

  static getInstance() {
    if (!this.instance) {
      this.instance = new OrderManagementService();
    }
    return this.instance;
  }

  /**
   * Get user's orders with pagination and filtering
   */
  async getUserOrders(userId, filters = {}, page = 1, limit = 10) {
    try {
      const {
        status,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount,
        sortBy = 'createdAt',
        sortOrder = -1,
      } = filters;

      const query = { userId };

      // Apply filters
      if (status) query.status = status;
      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }
      if (minAmount || maxAmount) {
        query.total = {};
        if (minAmount) query.total.$gte = minAmount;
        if (maxAmount) query.total.$lte = maxAmount;
      }

      const skip = (page - 1) * limit;
      const sortObj = { [sortBy]: sortOrder };

      const orders = await Order.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .select('_id total status createdAt items paymentMethod deliveryFee')
        .lean();

      const total = await Order.countDocuments(query);

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching user orders:', error);
      throw error;
    }
  }

  /**
   * Get order details with full information
   */
  async getOrderDetails(orderId, userId) {
    try {
      const order = await Order.findById(orderId);

      if (!order) {
        throw new Error('Order not found');
      }

      // Verify ownership
      if (order.userId.toString() !== userId.toString()) {
        throw new Error('Unauthorized access to order');
      }

      // Fetch related payment info
      const payment = await Payment.findOne({ orderId });

      return {
        order: order.toObject(),
        payment: payment ? {
          status: payment.status,
          method: payment.paymentMethod,
          gateway: payment.paymentGateway,
          amount: payment.amount,
          transactionId: payment.gatewayTransactionId,
        } : null,
      };
    } catch (error) {
      logger.error('Error fetching order details:', error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, newStatus, metadata = {}) {
    try {
      const validStatuses = [
        'Pending Payment',
        'Confirmed',
        'Processing',
        'Shipped',
        'Delivered',
        'Cancelled',
        'Refunded',
        'Return Initiated',
        'Return Approved',
        'Return Rejected',
        'Returned',
      ];

      if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status: ${newStatus}`);
      }

      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const oldStatus = order.status;
      order.status = newStatus;

      // Add status history
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({
        status: newStatus,
        timestamp: new Date(),
        metadata,
      });

      await order.save();

      // Send notification
      await this.sendStatusNotification(order.userId, orderId, oldStatus, newStatus);

      logger.info(`Order ${orderId} status updated: ${oldStatus} → ${newStatus}`);

      return order;
    } catch (error) {
      logger.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId, userId, reason = 'Customer requested cancellation') {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.userId.toString() !== userId.toString()) {
        throw new Error('Unauthorized');
      }

      // Check if order can be cancelled
      const cancellableStatuses = ['Pending Payment', 'Confirmed', 'Processing'];
      if (!cancellableStatuses.includes(order.status)) {
        throw new Error(`Cannot cancel order with status: ${order.status}`);
      }

      // Update order status
      order.status = 'Cancelled';
      order.cancelledAt = new Date();
      order.cancellationReason = reason;
      order.cancellationMetadata = {
        cancelledBy: 'customer',
        cancelledAt: new Date(),
        reason,
      };

      await order.save();

      // Process refund if payment was captured
      const payment = await Payment.findOne({ orderId });
      if (payment && payment.status === 'captured') {
        // Trigger refund process
        const CheckoutService = require('./CheckoutService');
        await CheckoutService.processRefund(orderId, reason);
      }

      // Send cancellation notification
      await Notification.create({
        userId,
        type: 'order_cancelled',
        title: 'Order Cancelled',
        message: `Your order #${orderId} has been cancelled. Refund initiated.`,
        data: { orderId },
      });

      logger.info(`Order ${orderId} cancelled by customer`);

      return order;
    } catch (error) {
      logger.error('Error cancelling order:', error);
      throw error;
    }
  }

  /**
   * Get order statistics for user
   */
  async getUserOrderStats(userId) {
    try {
      const stats = await Order.aggregate([
        { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: '$total' },
            avgOrderValue: { $avg: '$total' },
            completedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] },
            },
            cancelledOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] },
            },
            returnedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'Returned'] }, 1, 0] },
            },
          },
        },
      ]);

      if (stats.length === 0) {
        return {
          totalOrders: 0,
          totalSpent: 0,
          avgOrderValue: 0,
          completedOrders: 0,
          cancelledOrders: 0,
          returnedOrders: 0,
        };
      }

      return stats[0];
    } catch (error) {
      logger.error('Error fetching order statistics:', error);
      throw error;
    }
  }

  /**
   * Send status change notification
   */
  async sendStatusNotification(userId, orderId, oldStatus, newStatus) {
    try {
      const statusMessages = {
        'Confirmed': 'Your order has been confirmed!',
        'Processing': 'Your order is being prepared for shipment.',
        'Shipped': 'Your order is on its way!',
        'Delivered': 'Your order has been delivered. Thank you for shopping!',
        'Cancelled': 'Your order has been cancelled.',
        'Refunded': 'Your refund has been processed.',
        'Return Initiated': 'Your return request has been received.',
        'Return Approved': 'Your return has been approved. Please ship the items.',
        'Return Rejected': 'Your return request has been rejected.',
        'Returned': 'Your return has been received and processed.',
      };

      const notification = new Notification({
        userId,
        type: 'order_status_update',
        title: `Order ${newStatus}`,
        message: statusMessages[newStatus] || `Order status updated to ${newStatus}`,
        data: {
          orderId,
          oldStatus,
          newStatus,
        },
      });

      await notification.save();

      // TODO: Send email notification
      logger.info(`Status notification sent for order ${orderId}`);
    } catch (error) {
      logger.error('Error sending status notification:', error);
    }
  }

  /**
   * Bulk update order statuses (admin operation)
   */
  async bulkUpdateOrderStatus(orderIds, newStatus) {
    try {
      const result = await Order.updateMany(
        { _id: { $in: orderIds } },
        {
          $set: { status: newStatus, updatedAt: new Date() },
          $push: {
            statusHistory: {
              status: newStatus,
              timestamp: new Date(),
              metadata: { bulkUpdate: true },
            },
          },
        }
      );

      logger.info(`Bulk updated ${result.modifiedCount} orders to ${newStatus}`);
      return result;
    } catch (error) {
      logger.error('Error in bulk update:', error);
      throw error;
    }
  }

  /**
   * Get order timeline (status progression)
   */
  async getOrderTimeline(orderId) {
    try {
      const order = await Order.findById(orderId).select('statusHistory status createdAt');
      if (!order) {
        throw new Error('Order not found');
      }

      const timeline = [
        {
          status: 'Confirmed',
          timestamp: order.createdAt,
          completed: true,
        },
      ];

      if (order.statusHistory && order.statusHistory.length > 0) {
        order.statusHistory.forEach(entry => {
          timeline.push({
            status: entry.status,
            timestamp: entry.timestamp,
            completed: true,
            metadata: entry.metadata,
          });
        });
      }

      return timeline;
    } catch (error) {
      logger.error('Error fetching order timeline:', error);
      throw error;
    }
  }

  /**
   * Apply order discount/coupon adjustment
   */
  async applyOrderDiscount(orderId, discountAmount, reason) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      order.adjustments = order.adjustments || [];
      order.adjustments.push({
        type: 'discount',
        amount: discountAmount,
        reason,
        appliedAt: new Date(),
      });

      order.total -= discountAmount;
      await order.save();

      logger.info(`Discount applied to order ${orderId}: -₹${discountAmount}`);
      return order;
    } catch (error) {
      logger.error('Error applying order discount:', error);
      throw error;
    }
  }

  /**
   * Get orders by status (admin)
   */
  async getOrdersByStatus(status, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const orders = await Order.find({ status })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('_id customerName total status createdAt');

      const total = await Order.countDocuments({ status });

      return {
        orders,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      };
    } catch (error) {
      logger.error('Error fetching orders by status:', error);
      throw error;
    }
  }
}

module.exports = OrderManagementService.getInstance();
