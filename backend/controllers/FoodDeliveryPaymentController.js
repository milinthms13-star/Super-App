const PaymentService = require('../services/FoodDeliveryPaymentService');
const WalletService = require('../services/FoodDeliveryWalletService');
const NotificationService = require('../services/FoodDeliveryNotificationService');

class PaymentController {
  /**
   * Initiate payment
   */
  static async initiatePayment(req, res) {
    try {
      const { orderId, paymentMethod, amount } = req.body;
      const userId = req.user?.userId;

      if (!orderId || !paymentMethod || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: orderId, paymentMethod, amount',
        });
      }

      const payment = await PaymentService.initiatePayment(
        orderId,
        userId,
        paymentMethod,
        amount,
        req.body
      );

      res.status(201).json({
        success: true,
        data: payment,
        message: 'Payment initiated successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Authorize payment
   */
  static async authorizePayment(req, res) {
    try {
      const { paymentId } = req.params;
      const { gatewayTransactionId } = req.body;

      if (!paymentId || !gatewayTransactionId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: gatewayTransactionId',
        });
      }

      const payment = await PaymentService.authorizePayment(paymentId, gatewayTransactionId);

      res.json({
        success: true,
        data: payment,
        message: 'Payment authorized',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Capture payment
   */
  static async capturePayment(req, res) {
    try {
      const { paymentId } = req.params;

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: paymentId',
        });
      }

      const payment = await PaymentService.capturePayment(paymentId, req.body);

      // Send payment success notification
      await NotificationService.sendPaymentSuccessNotification(payment.orderId, {
        userId: payment.userId,
        transactionId: payment.transactionId,
      });

      res.json({
        success: true,
        data: payment.toSummary(),
        message: 'Payment captured successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Process wallet payment
   */
  static async processWalletPayment(req, res) {
    try {
      const { paymentId } = req.params;

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: paymentId',
        });
      }

      const payment = await PaymentService.processWalletPayment(paymentId);

      // Send payment success notification
      await NotificationService.sendPaymentSuccessNotification(payment.orderId, {
        userId: payment.userId,
        transactionId: payment.transactionId,
      });

      res.json({
        success: true,
        data: payment.toSummary(),
        message: 'Wallet payment processed successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Process COD payment
   */
  static async processCODPayment(req, res) {
    try {
      const { paymentId } = req.params;

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: paymentId',
        });
      }

      const payment = await PaymentService.processCODPayment(paymentId);

      // Send COD confirmation
      await NotificationService.sendCODConfirmationNotification(payment.orderId, {
        userId: payment.userId,
        amount: payment.amount,
      });

      res.json({
        success: true,
        data: payment.toSummary(),
        message: 'COD payment marked for collection',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get payment status
   */
  static async getPaymentStatus(req, res) {
    try {
      const { paymentId } = req.params;

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: paymentId',
        });
      }

      const payment = await PaymentService.getPaymentStatus(paymentId);

      res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get payment by order
   */
  static async getPaymentByOrder(req, res) {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: orderId',
        });
      }

      const payment = await PaymentService.getPaymentByOrderId(orderId);

      res.json({
        success: true,
        data: payment.toSummary(),
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get user payment history
   */
  static async getPaymentHistory(req, res) {
    try {
      const userId = req.user?.userId;
      const { limit = 20, skip = 0 } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const payments = await PaymentService.getUserPaymentHistory(
        userId,
        parseInt(limit),
        parseInt(skip)
      );

      res.json({
        success: true,
        data: payments,
        count: payments.length,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Retry failed payment
   */
  static async retryPayment(req, res) {
    try {
      const { paymentId } = req.params;

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: paymentId',
        });
      }

      const payment = await PaymentService.retryPayment(paymentId);

      res.json({
        success: true,
        data: payment,
        message: 'Payment retry initiated',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Verify payment
   */
  static async verifyPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const { verificationData } = req.body;

      if (!paymentId || !verificationData) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
        });
      }

      const payment = await PaymentService.verifyPayment(paymentId, verificationData);

      res.json({
        success: true,
        data: payment.toSummary(),
        message: 'Payment verified successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Cancel payment
   */
  static async cancelPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const { reason } = req.body;

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: paymentId',
        });
      }

      const payment = await PaymentService.cancelPayment(paymentId, reason);

      res.json({
        success: true,
        data: payment.toSummary(),
        message: 'Payment cancelled successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get payment analytics (admin)
   */
  static async getPaymentAnalytics(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: startDate, endDate',
        });
      }

      const analytics = await PaymentService.getPaymentAnalytics(startDate, endDate);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = PaymentController;
