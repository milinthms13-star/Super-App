const FoodDeliveryPayment = require('../models/FoodDeliveryPayment');
const FoodDeliveryOrder = require('../models/FoodOrder');
const FoodDeliveryWallet = require('../models/FoodDeliveryWallet');

class PaymentService {
  /**
   * Initiate payment for order
   */
  static async initiatePayment(orderId, userId, paymentMethod, amount, details = {}) {
    try {
      const order = await FoodDeliveryOrder.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const payment = new FoodDeliveryPayment({
        orderId,
        userId,
        paymentMethod,
        amount,
        transactionId,
        status: 'pending',
        paymentGateway: details.gateway || 'razorpay',
        breakup: details.breakup || {
          subtotal: order.subtotal || amount,
          deliveryFee: order.deliveryFee || 0,
          taxes: order.taxes || 0,
          discount: order.discount || 0,
          walletUsed: details.walletUsed || 0,
          tip: details.tip || 0,
          total: amount,
        },
        upi: paymentMethod === 'upi' ? details.upi : null,
        card: paymentMethod === 'card' ? details.card : null,
        netbanking: paymentMethod === 'netbanking' ? details.netbanking : null,
        walletPayment: paymentMethod === 'wallet' ? details.walletPayment : null,
        cod: paymentMethod === 'cod' ? details.cod : null,
        metadata: details.metadata || {},
      });

      await payment.save();
      return payment;
    } catch (error) {
      throw new Error(`Payment initiation failed: ${error.message}`);
    }
  }

  /**
   * Authorize payment (UPI, Card, Net Banking)
   */
  static async authorizePayment(paymentId, gatewayTransactionId) {
    try {
      const payment = await FoodDeliveryPayment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      payment.gatewayTransactionId = gatewayTransactionId;
      payment.markAuthorized();
      await payment.save();

      return payment;
    } catch (error) {
      throw new Error(`Payment authorization failed: ${error.message}`);
    }
  }

  /**
   * Capture payment (complete transaction)
   */
  static async capturePayment(paymentId, captureDetails = {}) {
    try {
      const payment = await FoodDeliveryPayment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status === 'success') {
        throw new Error('Payment already captured');
      }

      payment.capture();
      payment.receiptUrl = captureDetails.receiptUrl || '';
      await payment.save();

      // Mark order as paid
      await FoodDeliveryOrder.findByIdAndUpdate(payment.orderId, {
        paymentStatus: 'completed',
        paymentId: paymentId,
      });

      return payment;
    } catch (error) {
      throw new Error(`Payment capture failed: ${error.message}`);
    }
  }

  /**
   * Process wallet payment
   */
  static async processWalletPayment(paymentId) {
    try {
      const payment = await FoodDeliveryPayment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.paymentMethod !== 'wallet') {
        throw new Error('Payment method is not wallet');
      }

      const wallet = await FoodDeliveryWallet.findOne({ userId: payment.userId });
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (wallet.balance < payment.amount) {
        throw new Error('Insufficient wallet balance');
      }

      // Use wallet balance
      wallet.useBalance(payment.amount);
      await wallet.save();

      // Update payment
      payment.walletPayment.walletId = wallet._id;
      payment.walletPayment.walletUsedAmount = payment.amount;
      payment.walletPayment.remainingBalance = wallet.balance;
      payment.capture();
      await payment.save();

      // Mark order as paid
      await FoodDeliveryOrder.findByIdAndUpdate(payment.orderId, {
        paymentStatus: 'completed',
        paymentId: paymentId,
      });

      return payment;
    } catch (error) {
      throw new Error(`Wallet payment processing failed: ${error.message}`);
    }
  }

  /**
   * Process COD payment (mark for collection)
   */
  static async processCODPayment(paymentId) {
    try {
      const payment = await FoodDeliveryPayment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.paymentMethod !== 'cod') {
        throw new Error('Payment method is not COD');
      }

      payment.cod.payableAmount = payment.amount;
      payment.cod.collectionStatus = 'pending';
      payment.status = 'success';
      payment.addStatusUpdate('success', 'COD payment marked for collection');
      await payment.save();

      // Mark order as pending payment collection
      await FoodDeliveryOrder.findByIdAndUpdate(payment.orderId, {
        paymentStatus: 'pending_collection',
        paymentId: paymentId,
      });

      return payment;
    } catch (error) {
      throw new Error(`COD payment processing failed: ${error.message}`);
    }
  }

  /**
   * Get payment status
   */
  static async getPaymentStatus(paymentId) {
    try {
      const payment = await FoodDeliveryPayment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      return payment.toSummary();
    } catch (error) {
      throw new Error(`Failed to get payment status: ${error.message}`);
    }
  }

  /**
   * Get payment by transaction ID
   */
  static async getPaymentByTransactionId(transactionId) {
    try {
      const payment = await FoodDeliveryPayment.findOne({ transactionId });
      if (!payment) {
        throw new Error('Payment not found');
      }

      return payment;
    } catch (error) {
      throw new Error(`Failed to get payment: ${error.message}`);
    }
  }

  /**
   * Get payment by order ID
   */
  static async getPaymentByOrderId(orderId) {
    try {
      const payment = await FoodDeliveryPayment.findOne({ orderId });
      if (!payment) {
        throw new Error('Payment not found for order');
      }

      return payment;
    } catch (error) {
      throw new Error(`Failed to get payment: ${error.message}`);
    }
  }

  /**
   * Get user payment history
   */
  static async getUserPaymentHistory(userId, limit = 20, skip = 0) {
    try {
      const payments = await FoodDeliveryPayment.find({ userId })
        .sort({ initiatedAt: -1 })
        .limit(limit)
        .skip(skip)
        .select('-metadata -card.cardHash');

      return payments;
    } catch (error) {
      throw new Error(`Failed to get payment history: ${error.message}`);
    }
  }

  /**
   * Handle payment failure
   */
  static async handlePaymentFailure(paymentId, failureReason) {
    try {
      const payment = await FoodDeliveryPayment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      payment.markFailed(failureReason);
      payment.retryCount += 1;

      if (payment.retryCount < 3) {
        payment.nextRetryAt = new Date(Date.now() + 5 * 60 * 1000); // Retry after 5 mins
      }

      await payment.save();

      // Update order status
      await FoodDeliveryOrder.findByIdAndUpdate(payment.orderId, {
        paymentStatus: 'failed',
      });

      return payment;
    } catch (error) {
      throw new Error(`Payment failure handling failed: ${error.message}`);
    }
  }

  /**
   * Retry failed payment
   */
  static async retryPayment(paymentId) {
    try {
      const payment = await FoodDeliveryPayment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (!['failed', 'pending'].includes(payment.status)) {
        throw new Error('Payment cannot be retried');
      }

      payment.status = 'pending';
      payment.retryCount += 1;
      payment.addStatusUpdate('pending', `Retry attempt ${payment.retryCount}`);
      await payment.save();

      return payment;
    } catch (error) {
      throw new Error(`Payment retry failed: ${error.message}`);
    }
  }

  /**
   * Verify payment with gateway
   */
  static async verifyPayment(paymentId, gatewayVerificationData) {
    try {
      const payment = await FoodDeliveryPayment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      // In production, verify with payment gateway
      // This is a stub for actual gateway verification
      if (gatewayVerificationData.status === 'authorized') {
        payment.markAuthorized();
        await payment.save();
        return payment;
      }

      throw new Error('Payment verification failed');
    } catch (error) {
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }

  /**
   * Cancel payment
   */
  static async cancelPayment(paymentId, reason = '') {
    try {
      const payment = await FoodDeliveryPayment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (!['pending', 'processing'].includes(payment.status)) {
        throw new Error('Only pending/processing payments can be cancelled');
      }

      payment.status = 'cancelled';
      payment.addStatusUpdate('cancelled', reason);
      await payment.save();

      // Update order status
      await FoodDeliveryOrder.findByIdAndUpdate(payment.orderId, {
        paymentStatus: 'cancelled',
      });

      return payment;
    } catch (error) {
      throw new Error(`Payment cancellation failed: ${error.message}`);
    }
  }

  /**
   * Get payment analytics
   */
  static async getPaymentAnalytics(startDate, endDate) {
    try {
      const analytics = await FoodDeliveryPayment.aggregate([
        {
          $match: {
            initiatedAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            avgAmount: { $avg: '$amount' },
          },
        },
      ]);

      const methodAnalytics = await FoodDeliveryPayment.aggregate([
        {
          $match: {
            initiatedAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
          },
        },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
      ]);

      return {
        byStatus: analytics,
        byMethod: methodAnalytics,
        generatedAt: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to get payment analytics: ${error.message}`);
    }
  }

  /**
   * Mark payment as reconciled
   */
  static async markReconciled(paymentId, reconciledBy) {
    try {
      const payment = await FoodDeliveryPayment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      payment.reconciled = true;
      payment.reconciledAt = new Date();
      payment.reconciledBy = reconciledBy;
      await payment.save();

      return payment;
    } catch (error) {
      throw new Error(`Reconciliation failed: ${error.message}`);
    }
  }
}

module.exports = PaymentService;
