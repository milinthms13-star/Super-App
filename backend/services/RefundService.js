/**
 * Refund Service - Phase 11 Payment Processing
 * Specialized service for handling refunds and refund management
 */

const Payment = require('../models/Payment');
const Transaction = require('../models/Transaction');
const PaymentService = require('./PaymentService');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class RefundService {
  /**
   * Process refund
   */
  static async processRefund(paymentId, refundData) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (!payment.canBeRefunded()) {
        throw new Error('Payment cannot be refunded in current state');
      }

      // Initiate refund via payment service
      const refundedPayment = await PaymentService.initiateRefund(paymentId, refundData);

      // Mark refund as processing
      await this.updateRefundStatus(refundedPayment.refund.refundId, 'processing');

      return refundedPayment;
    } catch (error) {
      logger.error('Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Complete refund
   */
  static async completeRefund(refundId) {
    try {
      const payment = await Payment.findOne({ 'refund.refundId': refundId });
      if (!payment) {
        throw new Error('Refund not found');
      }

      payment.refund.refundStatus = 'completed';
      payment.refund.refundCompletedAt = new Date();

      await payment.save();

      // Update associated transaction
      const transaction = await Transaction.findOne({ 
        reference: { refundId } 
      });
      
      if (transaction) {
        transaction.status = 'completed';
        await transaction.save();
      }

      logger.info(`Refund completed: ${refundId}`);
      return payment;
    } catch (error) {
      logger.error('Error completing refund:', error);
      throw error;
    }
  }

  /**
   * Auto refund on order cancellation
   */
  static async autoRefundOnCancellation(orderId, cancellationReason) {
    try {
      const payment = await Payment.findOne({ orderId, status: 'captured' });
      if (!payment) {
        throw new Error('No captured payment found for this order');
      }

      // Initiate auto refund
      const refundedPayment = await this.processRefund(payment._id, {
        reason: `Order cancelled: ${cancellationReason}`,
        autoRefund: true,
      });

      logger.info(`Auto-refund initiated for order: ${orderId}`);
      return refundedPayment;
    } catch (error) {
      logger.error('Error in auto-refund:', error);
      throw error;
    }
  }

  /**
   * Get refund status
   */
  static async getRefundStatus(refundId) {
    try {
      const payment = await Payment.findOne({ 'refund.refundId': refundId });
      if (!payment) {
        throw new Error('Refund not found');
      }

      return {
        refundId: payment.refund.refundId,
        paymentId: payment.paymentId,
        amount: payment.refund.refundAmount,
        status: payment.refund.refundStatus,
        reason: payment.refund.refundReason,
        initiatedAt: payment.refund.refundInitiatedAt,
        completedAt: payment.refund.refundCompletedAt,
      };
    } catch (error) {
      logger.error('Error fetching refund status:', error);
      throw error;
    }
  }

  /**
   * Update refund status
   */
  static async updateRefundStatus(refundId, status) {
    try {
      const payment = await Payment.findOne({ 'refund.refundId': refundId });
      if (!payment) {
        throw new Error('Refund not found');
      }

      payment.refund.refundStatus = status;

      if (status === 'completed') {
        payment.refund.refundCompletedAt = new Date();
      }

      await payment.save();
      return payment;
    } catch (error) {
      logger.error('Error updating refund status:', error);
      throw error;
    }
  }

  /**
   * Get refunds for user
   */
  static async getRefundsByUser(userId, options = {}) {
    try {
      const { page = 1, limit = 10, status } = options;
      const skip = (page - 1) * limit;

      const query = { userId, 'refund.refundId': { $exists: true } };
      if (status) query['refund.refundStatus'] = status;

      const payments = await Payment.find(query)
        .sort({ 'refund.refundInitiatedAt': -1 })
        .skip(skip)
        .limit(limit);

      const total = await Payment.countDocuments(query);

      const refunds = payments.map(p => ({
        refundId: p.refund.refundId,
        paymentId: p.paymentId,
        orderId: p.orderId,
        amount: p.refund.refundAmount,
        status: p.refund.refundStatus,
        reason: p.refund.refundReason,
        initiatedAt: p.refund.refundInitiatedAt,
        completedAt: p.refund.refundCompletedAt,
      }));

      return {
        refunds,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching user refunds:', error);
      throw error;
    }
  }

  /**
   * Refund to wallet
   */
  static async refundToWallet(paymentId, refundData) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      // Process refund with wallet flag
      const refundedPayment = await this.processRefund(paymentId, {
        ...refundData,
        refundToWallet: true,
      });

      // Here you would integrate with wallet service to add refunded amount
      // const WalletService = require('./WalletService');
      // await WalletService.addBalance(payment.userId, refundedPayment.refund.refundAmount);

      return refundedPayment;
    } catch (error) {
      logger.error('Error in wallet refund:', error);
      throw error;
    }
  }

  /**
   * Refund statistics
   */
  static async getRefundStatistics(options = {}) {
    try {
      const { startDate, endDate } = options;

      const matchStage = { 'refund.refundId': { $exists: true } };
      if (startDate || endDate) {
        matchStage['refund.refundInitiatedAt'] = {};
        if (startDate) matchStage['refund.refundInitiatedAt'].$gte = new Date(startDate);
        if (endDate) matchStage['refund.refundInitiatedAt'].$lte = new Date(endDate);
      }

      const stats = await Payment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$refund.refundStatus',
            count: { $sum: 1 },
            totalAmount: { $sum: '$refund.refundAmount' },
            avgAmount: { $avg: '$refund.refundAmount' },
          },
        },
      ]);

      return stats;
    } catch (error) {
      logger.error('Error fetching refund statistics:', error);
      throw error;
    }
  }

  /**
   * Pending refunds that need processing
   */
  static async getPendingRefunds() {
    try {
      const payments = await Payment.find({
        'refund.refundId': { $exists: true },
        'refund.refundStatus': 'processing',
      }).sort({ 'refund.refundInitiatedAt': 1 });

      return payments;
    } catch (error) {
      logger.error('Error fetching pending refunds:', error);
      throw error;
    }
  }

  /**
   * Retry failed refund
   */
  static async retryFailedRefund(refundId) {
    try {
      const payment = await Payment.findOne({ 'refund.refundId': refundId });
      if (!payment) {
        throw new Error('Refund not found');
      }

      if (payment.refund.refundStatus !== 'failed') {
        throw new Error('Only failed refunds can be retried');
      }

      // Retry with gateway
      const retryResponse = await PaymentService.callPaymentGateway(
        payment.paymentGateway,
        'refund',
        {
          gatewayTransactionId: payment.gatewayTransactionId,
          amount: payment.refund.refundAmount,
          reason: payment.refund.refundReason,
        }
      );

      if (retryResponse.success) {
        payment.refund.refundStatus = 'processing';
        await payment.save();
        logger.info(`Refund retry successful: ${refundId}`);
        return payment;
      } else {
        throw new Error(retryResponse.error || 'Refund retry failed');
      }
    } catch (error) {
      logger.error('Error retrying refund:', error);
      throw error;
    }
  }
}

module.exports = RefundService;
