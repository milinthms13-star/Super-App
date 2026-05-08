const FoodDeliveryRefund = require('../models/FoodDeliveryRefund');
const FoodDeliveryPayment = require('../models/FoodDeliveryPayment');
const FoodDeliveryWallet = require('../models/FoodDeliveryWallet');
const FoodDeliveryOrder = require('../models/FoodOrder');

class RefundService {
  /**
   * Initiate refund for order
   */
  static async initiateRefund(orderId, userId, reason, description, refundMethod = 'original_payment') {
    try {
      const order = await FoodDeliveryOrder.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const payment = await FoodDeliveryPayment.findOne({ orderId });
      if (!payment) {
        throw new Error('Payment not found for order');
      }

      if (payment.status !== 'success') {
        throw new Error('Only completed payments can be refunded');
      }

      // Calculate refund amount (support partial refunds)
      const refundAmount = payment.amount;

      const refundId = `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const refund = new FoodDeliveryRefund({
        orderId,
        paymentId: payment._id,
        userId,
        refundId,
        refundAmount,
        originalAmount: payment.amount,
        reason,
        reasonDescription: description,
        refundMethod,
        status: 'initiated',
        requiresApproval: this._shouldRequireApproval(reason, refundAmount),
        metadata: {
          orderValue: order.total || payment.amount,
          daysSinceOrder: Math.floor((Date.now() - order.createdAt) / (1000 * 60 * 60 * 24)),
        },
        refundBreakup: {
          subtotal: payment.breakup.subtotal,
          deliveryFee: payment.breakup.deliveryFee,
          taxes: payment.breakup.taxes,
          discount: payment.breakup.discount,
          walletUsed: payment.breakup.walletUsed,
          tip: payment.breakup.tip,
          total: refundAmount,
        },
      });

      await refund.save();

      // Add audit log
      refund.auditLog.push({
        action: 'refund_initiated',
        actor: userId,
        changes: { status: 'initiated' },
      });

      await refund.save();

      return refund;
    } catch (error) {
      throw new Error(`Refund initiation failed: ${error.message}`);
    }
  }

  /**
   * Approve refund
   */
  static async approveRefund(refundId, approvedBy, notes = '') {
    try {
      const refund = await FoodDeliveryRefund.findById(refundId);
      if (!refund) {
        throw new Error('Refund not found');
      }

      if (refund.status !== 'initiated') {
        throw new Error('Only initiated refunds can be approved');
      }

      refund.approve(approvedBy, notes);

      // Add audit log
      refund.auditLog.push({
        action: 'refund_approved',
        actor: approvedBy,
        changes: { status: 'approved', approvalNotes: notes },
      });

      await refund.save();

      return refund;
    } catch (error) {
      throw new Error(`Refund approval failed: ${error.message}`);
    }
  }

  /**
   * Reject refund
   */
  static async rejectRefund(refundId, rejectedBy, reason) {
    try {
      const refund = await FoodDeliveryRefund.findById(refundId);
      if (!refund) {
        throw new Error('Refund not found');
      }

      if (refund.status !== 'initiated') {
        throw new Error('Only initiated refunds can be rejected');
      }

      refund.reject(rejectedBy, reason);

      // Add audit log
      refund.auditLog.push({
        action: 'refund_rejected',
        actor: rejectedBy,
        changes: { status: 'cancelled', rejectionReason: reason },
      });

      await refund.save();

      return refund;
    } catch (error) {
      throw new Error(`Refund rejection failed: ${error.message}`);
    }
  }

  /**
   * Process refund (send to payment method)
   */
  static async processRefund(refundId) {
    try {
      const refund = await FoodDeliveryRefund.findById(refundId);
      if (!refund) {
        throw new Error('Refund not found');
      }

      if (refund.status !== 'approved') {
        throw new Error('Only approved refunds can be processed');
      }

      refund.markProcessing('system');

      // Process based on refund method
      if (refund.refundMethod === 'wallet') {
        await this._refundToWallet(refund);
      } else if (refund.refundMethod === 'bank_transfer') {
        await this._refundToBankAccount(refund);
      } else {
        // original_payment - process through gateway
        await this._refundToOriginalPayment(refund);
      }

      // Add audit log
      refund.auditLog.push({
        action: 'refund_processed',
        actor: 'system',
        changes: { status: 'processing', processedAt: new Date() },
      });

      await refund.save();

      return refund;
    } catch (error) {
      refund.markFailed(error.message);
      await refund.save();
      throw new Error(`Refund processing failed: ${error.message}`);
    }
  }

  /**
   * Mark refund as completed
   */
  static async completeRefund(refundId, confirmationId = '') {
    try {
      const refund = await FoodDeliveryRefund.findById(refundId);
      if (!refund) {
        throw new Error('Refund not found');
      }

      refund.markCompleted(confirmationId);

      // Update order status
      await FoodDeliveryOrder.findByIdAndUpdate(refund.orderId, {
        refundStatus: 'completed',
        refundAmount: refund.refundAmount,
      });

      // Update payment status
      await FoodDeliveryPayment.findByIdAndUpdate(refund.paymentId, {
        status: 'refunded',
      });

      // Add audit log
      refund.auditLog.push({
        action: 'refund_completed',
        actor: 'system',
        changes: { status: 'completed', confirmationId },
      });

      await refund.save();

      return refund;
    } catch (error) {
      throw new Error(`Refund completion failed: ${error.message}`);
    }
  }

  /**
   * Get refund status
   */
  static async getRefundStatus(refundId) {
    try {
      const refund = await FoodDeliveryRefund.findById(refundId);
      if (!refund) {
        throw new Error('Refund not found');
      }

      return refund.toSummary();
    } catch (error) {
      throw new Error(`Failed to get refund status: ${error.message}`);
    }
  }

  /**
   * Get refund by order
   */
  static async getRefundByOrder(orderId) {
    try {
      const refund = await FoodDeliveryRefund.findOne({ orderId });
      if (!refund) {
        return null;
      }

      return refund;
    } catch (error) {
      throw new Error(`Failed to get refund: ${error.message}`);
    }
  }

  /**
   * Get user refunds
   */
  static async getUserRefunds(userId, limit = 20, skip = 0) {
    try {
      const refunds = await FoodDeliveryRefund.find({ userId })
        .sort({ initiatedAt: -1 })
        .limit(limit)
        .skip(skip);

      return refunds;
    } catch (error) {
      throw new Error(`Failed to get refunds: ${error.message}`);
    }
  }

  /**
   * Retry failed refund
   */
  static async retryFailedRefund(refundId) {
    try {
      const refund = await FoodDeliveryRefund.findById(refundId);
      if (!refund) {
        throw new Error('Refund not found');
      }

      if (refund.status !== 'processing' && refund.status !== 'failed') {
        throw new Error('Only failed/processing refunds can be retried');
      }

      if (refund.retryCount >= refund.maxRetries) {
        throw new Error('Max retries exceeded');
      }

      refund.status = 'processing';
      refund.nextRetryAt = null;
      await refund.save();

      // Process again
      await this.processRefund(refundId);

      return refund;
    } catch (error) {
      throw new Error(`Refund retry failed: ${error.message}`);
    }
  }

  /**
   * Get refund analytics
   */
  static async getRefundAnalytics(startDate, endDate) {
    try {
      const analytics = await FoodDeliveryRefund.aggregate([
        {
          $match: {
            initiatedAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$refundAmount' },
            avgAmount: { $avg: '$refundAmount' },
          },
        },
      ]);

      const reasonAnalytics = await FoodDeliveryRefund.aggregate([
        {
          $match: {
            initiatedAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
          },
        },
        {
          $group: {
            _id: '$reason',
            count: { $sum: 1 },
            totalAmount: { $sum: '$refundAmount' },
          },
        },
      ]);

      return {
        byStatus: analytics,
        byReason: reasonAnalytics,
        generatedAt: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to get refund analytics: ${error.message}`);
    }
  }

  /**
   * Private: Determine if refund requires approval
   */
  static _shouldRequireApproval(reason, amount) {
    const highRiskReasons = ['customer_request', 'other'];
    const highAmount = amount > 5000;

    return highRiskReasons.includes(reason) || highAmount;
  }

  /**
   * Private: Refund to wallet
   */
  static async _refundToWallet(refund) {
    try {
      const WalletService = require('./FoodDeliveryWalletService');

      await WalletService.addMoney(refund.userId, refund.refundAmount, 'refund', {
        description: `Refund for order ${refund.orderId}`,
        orderId: refund.orderId,
      });

      refund.destination = 'wallet';
    } catch (error) {
      throw new Error(`Wallet refund failed: ${error.message}`);
    }
  }

  /**
   * Private: Refund to original payment method
   */
  static async _refundToOriginalPayment(refund) {
    try {
      const payment = await FoodDeliveryPayment.findById(refund.paymentId);

      // In production, call payment gateway refund API
      // Stub for demonstration
      refund.gatewayRefundId = `GW-REF-${Date.now()}`;
      refund.destination = `${payment.paymentMethod} - ${payment.card?.last4 || 'N/A'}`;
    } catch (error) {
      throw new Error(`Original payment refund failed: ${error.message}`);
    }
  }

  /**
   * Private: Refund to bank account
   */
  static async _refundToBankAccount(refund) {
    try {
      const wallet = await FoodDeliveryWallet.findOne({ userId: refund.userId });

      if (!wallet || !wallet.beneficiary) {
        throw new Error('Beneficiary details not found');
      }

      // In production, call bank transfer API
      // Stub for demonstration
      refund.destination = `${wallet.beneficiary.bankName} - ${wallet.beneficiary.accountNumber.slice(-4)}`;
    } catch (error) {
      throw new Error(`Bank transfer refund failed: ${error.message}`);
    }
  }
}

module.exports = RefundService;
