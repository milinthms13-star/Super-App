/**
 * ReturnService.js
 * Phase 5E - Return/cancellation request handling and refund management
 */

const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Return = require('../models/Return');
const Notification = require('../models/Notification');
const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

class ReturnService {
  static instance;

  static getInstance() {
    if (!this.instance) {
      this.instance = new ReturnService();
    }
    return this.instance;
  }

  /**
   * Create return request
   */
  async initiateReturn(orderId, userId, reason, items = [], comments = '') {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.userId.toString() !== userId.toString()) {
        throw new Error('Unauthorized');
      }

      // Check if order is eligible for return (must be delivered)
      if (order.status !== 'Delivered') {
        throw new Error('Order must be delivered before initiating return');
      }

      // Check return window (30 days from delivery)
      const deliveryDate = order.deliveredAt || order.createdAt;
      const daysSinceDelivery = Math.floor((Date.now() - deliveryDate) / (1000 * 60 * 60 * 24));

      if (daysSinceDelivery > 30) {
        throw new Error('Return window expired. You can only return items within 30 days of delivery.');
      }

      // Create return request
      const returnId = `RET_${Date.now()}_${randomUUID().split('-')[0].toUpperCase()}`;

      const returnRequest = new Return({
        returnId,
        orderId,
        userId,
        reason,
        items: items.length > 0 ? items : order.items.map(item => ({ productId: item.productId, quantity: item.quantity })),
        comments,
        status: 'initiated',
        initiatedAt: new Date(),
        metadata: {
          daysSinceDelivery,
          refundable: true,
        },
      });

      await returnRequest.save();

      // Update order status
      order.status = 'Return Initiated';
      order.returnId = returnRequest._id;
      await order.save();

      // Send notification
      await Notification.create({
        userId,
        type: 'return_initiated',
        title: 'Return Request Received',
        message: `Your return request #${returnId} has been received. We'll review it shortly.`,
        data: { returnId, orderId },
      });

      logger.info(`Return initiated: ${returnId} for order ${orderId}`);

      return returnRequest;
    } catch (error) {
      logger.error('Error initiating return:', error);
      throw error;
    }
  }

  /**
   * Approve return request
   */
  async approveReturn(returnId, adminNotes = '') {
    try {
      const returnRequest = await Return.findOne({ returnId });
      if (!returnRequest) {
        throw new Error('Return request not found');
      }

      returnRequest.status = 'approved';
      returnRequest.approvedAt = new Date();
      returnRequest.adminNotes = adminNotes;

      await returnRequest.save();

      // Update order status
      const order = await Order.findById(returnRequest.orderId);
      if (order) {
        order.status = 'Return Approved';
        await order.save();
      }

      // Send notification
      await Notification.create({
        userId: returnRequest.userId,
        type: 'return_approved',
        title: 'Return Approved',
        message: 'Your return has been approved. Please ship the items back to us using the provided label.',
        data: { returnId },
      });

      logger.info(`Return approved: ${returnId}`);

      return returnRequest;
    } catch (error) {
      logger.error('Error approving return:', error);
      throw error;
    }
  }

  /**
   * Reject return request
   */
  async rejectReturn(returnId, rejectionReason) {
    try {
      const returnRequest = await Return.findOne({ returnId });
      if (!returnRequest) {
        throw new Error('Return request not found');
      }

      returnRequest.status = 'rejected';
      returnRequest.rejectedAt = new Date();
      returnRequest.rejectionReason = rejectionReason;

      await returnRequest.save();

      // Update order status
      const order = await Order.findById(returnRequest.orderId);
      if (order) {
        order.status = 'Return Rejected';
        await order.save();
      }

      // Send notification
      await Notification.create({
        userId: returnRequest.userId,
        type: 'return_rejected',
        title: 'Return Rejected',
        message: `Your return request has been rejected. Reason: ${rejectionReason}`,
        data: { returnId },
      });

      logger.info(`Return rejected: ${returnId}`);

      return returnRequest;
    } catch (error) {
      logger.error('Error rejecting return:', error);
      throw error;
    }
  }

  /**
   * Mark return as received (goods received back)
   */
  async markReturnReceived(returnId, receivedItems = {}) {
    try {
      const returnRequest = await Return.findOne({ returnId });
      if (!returnRequest) {
        throw new Error('Return request not found');
      }

      returnRequest.status = 'received';
      returnRequest.receivedAt = new Date();
      returnRequest.receivedItems = receivedItems;

      await returnRequest.save();

      // Calculate refund amount
      const refundAmount = await this.calculateRefundAmount(returnRequest);

      logger.info(`Return received: ${returnId}, Refund: ₹${refundAmount}`);

      return returnRequest;
    } catch (error) {
      logger.error('Error marking return received:', error);
      throw error;
    }
  }

  /**
   * Process refund for return
   */
  async processReturnRefund(returnId) {
    try {
      const returnRequest = await Return.findOne({ returnId });
      if (!returnRequest) {
        throw new Error('Return request not found');
      }

      if (returnRequest.status !== 'received') {
        throw new Error('Return must be received before processing refund');
      }

      // Calculate refund amount
      const refundAmount = await this.calculateRefundAmount(returnRequest);

      // Process refund via payment gateway
      const payment = await Payment.findOne({ orderId: returnRequest.orderId });
      if (!payment) {
        throw new Error('Payment record not found');
      }

      // Initiate refund
      const CheckoutService = require('./CheckoutService');
      await CheckoutService.processRefund(returnRequest.orderId.toString(), 'Return refund');

      // Update return status
      returnRequest.status = 'refunded';
      returnRequest.refundedAt = new Date();
      returnRequest.refundAmount = refundAmount;
      returnRequest.refundTransactionId = payment.refundId;

      await returnRequest.save();

      // Update order status
      const order = await Order.findById(returnRequest.orderId);
      if (order) {
        order.status = 'Returned';
        order.refundDetails = {
          amount: refundAmount,
          reason: 'Return refund',
          refundedAt: new Date(),
        };
        await order.save();
      }

      // Send notification
      await Notification.create({
        userId: returnRequest.userId,
        type: 'refund_processed',
        title: 'Refund Processed',
        message: `Your refund of ₹${refundAmount} has been processed. It will appear in your account within 5-7 business days.`,
        data: { returnId, refundAmount },
      });

      logger.info(`Refund processed for return: ${returnId}, Amount: ₹${refundAmount}`);

      return returnRequest;
    } catch (error) {
      logger.error('Error processing return refund:', error);
      throw error;
    }
  }

  /**
   * Calculate refund amount based on return items and conditions
   */
  async calculateRefundAmount(returnRequest) {
    try {
      const order = await Order.findById(returnRequest.orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      let refundAmount = 0;

      // Calculate based on returned items
      returnRequest.items.forEach(returnItem => {
        const orderItem = order.items.find(
          item => item.productId.toString() === returnItem.productId.toString()
        );

        if (orderItem) {
          const itemRefund = orderItem.price * returnItem.quantity;
          refundAmount += itemRefund;
        }
      });

      // Apply deductions if necessary (e.g., damage, restocking fee)
      if (returnRequest.metadata?.deductionAmount) {
        refundAmount -= returnRequest.metadata.deductionAmount;
      }

      // Ensure non-negative refund
      refundAmount = Math.max(0, refundAmount);

      return refundAmount;
    } catch (error) {
      logger.error('Error calculating refund amount:', error);
      throw error;
    }
  }

  /**
   * Get user's returns
   */
  async getUserReturns(userId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const returns = await Return.find({ userId })
        .sort({ initiatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('returnId orderId reason status initiatedAt refundAmount');

      const total = await Return.countDocuments({ userId });

      return {
        returns,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      };
    } catch (error) {
      logger.error('Error fetching user returns:', error);
      throw error;
    }
  }

  /**
   * Get return details
   */
  async getReturnDetails(returnId, userId = null) {
    try {
      const returnRequest = await Return.findOne({ returnId });
      if (!returnRequest) {
        throw new Error('Return not found');
      }

      if (userId && returnRequest.userId.toString() !== userId.toString()) {
        throw new Error('Unauthorized');
      }

      return returnRequest;
    } catch (error) {
      logger.error('Error fetching return details:', error);
      throw error;
    }
  }

  /**
   * Get all pending returns (admin)
   */
  async getPendingReturns(page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const returns = await Return.find({
        status: { $in: ['initiated', 'approved', 'received'] },
      })
        .sort({ initiatedAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Return.countDocuments({
        status: { $in: ['initiated', 'approved', 'received'] },
      });

      return {
        returns,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      };
    } catch (error) {
      logger.error('Error fetching pending returns:', error);
      throw error;
    }
  }

  /**
   * Generate return shipping label
   */
  async generateReturnLabel(returnId) {
    try {
      const returnRequest = await Return.findOne({ returnId });
      if (!returnRequest) {
        throw new Error('Return not found');
      }

      if (returnRequest.status !== 'approved') {
        throw new Error('Return must be approved before generating label');
      }

      // Generate label data (mock implementation)
      const label = {
        labelId: `LBL_${Date.now()}`,
        returnId,
        shipmentType: 'prepaid',
        from: {
          name: 'Malabarbazaar',
          address: process.env.COMPANY_ADDRESS || '123 Main St, City',
        },
        to: {
          // Get from order delivery address
        },
        trackingNumber: `TRK${Date.now()}`,
        expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      };

      returnRequest.shippingLabel = label;
      returnRequest.labelGeneratedAt = new Date();
      await returnRequest.save();

      logger.info(`Return label generated: ${returnId}`);

      return label;
    } catch (error) {
      logger.error('Error generating return label:', error);
      throw error;
    }
  }

  /**
   * Get return statistics (admin)
   */
  async getReturnStatistics(dateFrom, dateTo) {
    try {
      const stats = await Return.aggregate([
        {
          $match: {
            initiatedAt: {
              $gte: new Date(dateFrom),
              $lte: new Date(dateTo),
            },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalRefundAmount: { $sum: { $ifNull: ['$refundAmount', 0] } },
          },
        },
      ]);

      const totalReturns = stats.reduce((sum, stat) => sum + stat.count, 0);
      const totalRefunds = stats.reduce((sum, stat) => sum + stat.totalRefundAmount, 0);

      return {
        byStatus: stats,
        totalReturns,
        totalRefunds,
        period: { from: dateFrom, to: dateTo },
      };
    } catch (error) {
      logger.error('Error fetching return statistics:', error);
      throw error;
    }
  }
}

module.exports = ReturnService.getInstance();
