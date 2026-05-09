/**
 * Payment Controller - Phase 11 Payment Processing
 * Handles API endpoints for payment operations
 */

const PaymentService = require('../services/PaymentService');
const PaymentGatewayService = require('../services/PaymentGatewayService');
const RefundService = require('../services/RefundService');
const logger = require('../utils/logger');

class PaymentController {
  /**
   * Create a payment
   * POST /api/v1/payments
   */
  static async createPayment(req, res) {
    try {
      const { orderId, userId, amount, paymentMethod, paymentGateway, metadata } = req.body;

      const payment = await PaymentService.createPayment({
        orderId,
        userId,
        amount,
        paymentMethod,
        paymentGateway,
        metadata,
      });

      res.status(201).json({
        success: true,
        data: payment,
        message: 'Payment created successfully',
      });
    } catch (error) {
      logger.error('Error creating payment:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Process payment
   * POST /api/v1/payments/:paymentId/process
   */
  static async processPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const gatewayPayload = req.body;

      const payment = await PaymentService.processPayment(paymentId, gatewayPayload);

      res.status(200).json({
        success: true,
        data: payment,
        message: 'Payment processed successfully',
      });
    } catch (error) {
      logger.error('Error processing payment:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Capture payment
   * POST /api/v1/payments/:paymentId/capture
   */
  static async capturePayment(req, res) {
    try {
      const { paymentId } = req.params;

      const payment = await PaymentService.capturePayment(paymentId);

      res.status(200).json({
        success: true,
        data: payment,
        message: 'Payment captured successfully',
      });
    } catch (error) {
      logger.error('Error capturing payment:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Verify payment
   * GET /api/v1/payments/:paymentId/verify
   */
  static async verifyPayment(req, res) {
    try {
      const { paymentId } = req.params;

      const payment = await PaymentService.verifyPayment(paymentId);

      res.status(200).json({
        success: true,
        data: payment,
        message: 'Payment verified successfully',
      });
    } catch (error) {
      logger.error('Error verifying payment:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Get payment details
   * GET /api/v1/payments/:paymentId
   */
  static async getPayment(req, res) {
    try {
      const { paymentId } = req.params;

      const payment = await PaymentService.getPaymentDetails(paymentId);

      res.status(200).json({
        success: true,
        data: payment,
        message: 'Payment retrieved successfully',
      });
    } catch (error) {
      logger.error('Error fetching payment:', error);
      res.status(404).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Get payments for user
   * GET /api/v1/payments/user/:userId
   */
  static async getUserPayments(req, res) {
    try {
      const { userId } = req.params;
      const { page, limit, status, paymentMethod } = req.query;

      const result = await PaymentService.getPaymentsByUser(userId, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        status,
        paymentMethod,
      });

      res.status(200).json({
        success: true,
        data: result.payments,
        pagination: result.pagination,
        message: 'User payments retrieved successfully',
      });
    } catch (error) {
      logger.error('Error fetching user payments:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Initiate refund
   * POST /api/v1/payments/:paymentId/refund
   */
  static async initiateRefund(req, res) {
    try {
      const { paymentId } = req.params;
      const { amount, reason, autoRefund } = req.body;

      const payment = await PaymentService.initiateRefund(paymentId, {
        amount,
        reason,
        autoRefund,
      });

      res.status(200).json({
        success: true,
        data: payment,
        message: 'Refund initiated successfully',
      });
    } catch (error) {
      logger.error('Error initiating refund:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Get refund status
   * GET /api/v1/refunds/:refundId
   */
  static async getRefundStatus(req, res) {
    try {
      const { refundId } = req.params;

      const refundStatus = await RefundService.getRefundStatus(refundId);

      res.status(200).json({
        success: true,
        data: refundStatus,
        message: 'Refund status retrieved successfully',
      });
    } catch (error) {
      logger.error('Error fetching refund status:', error);
      res.status(404).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Get user refunds
   * GET /api/v1/refunds/user/:userId
   */
  static async getUserRefunds(req, res) {
    try {
      const { userId } = req.params;
      const { page, limit, status } = req.query;

      const result = await RefundService.getRefundsByUser(userId, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        status,
      });

      res.status(200).json({
        success: true,
        data: result.refunds,
        pagination: result.pagination,
        message: 'User refunds retrieved successfully',
      });
    } catch (error) {
      logger.error('Error fetching user refunds:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Get payment analytics
   * GET /api/v1/payments/analytics/summary
   */
  static async getPaymentAnalytics(req, res) {
    try {
      const { startDate, endDate, groupBy } = req.query;

      const analytics = await PaymentService.getPaymentAnalytics({
        startDate,
        endDate,
        groupBy: groupBy || 'day',
      });

      res.status(200).json({
        success: true,
        data: analytics,
        message: 'Payment analytics retrieved successfully',
      });
    } catch (error) {
      logger.error('Error fetching analytics:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Handle payment gateway webhook
   * POST /api/v1/payments/webhook/:gatewayName
   */
  static async handleWebhook(req, res) {
    try {
      const { gatewayName } = req.params;
      const webhookData = req.body;

      // Verify webhook signature
      const gateway = await PaymentGatewayService.getGateway(gatewayName);
      // Implement signature verification based on gateway

      // Process webhook data (update payment status, etc.)
      logger.info(`Webhook received from ${gatewayName}:`, webhookData);

      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
      });
    } catch (error) {
      logger.error('Error processing webhook:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Get available payment gateways
   * GET /api/v1/payment-gateways
   */
  static async getAvailableGateways(req, res) {
    try {
      const gateways = await PaymentGatewayService.getActiveGateways();

      res.status(200).json({
        success: true,
        data: gateways,
        message: 'Available gateways retrieved successfully',
      });
    } catch (error) {
      logger.error('Error fetching gateways:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Get best gateway for payment
   * POST /api/v1/payment-gateways/select
   */
  static async selectBestGateway(req, res) {
    try {
      const { amount, paymentMethod } = req.body;

      const gateway = await PaymentGatewayService.selectBestGateway(amount, paymentMethod);

      res.status(200).json({
        success: true,
        data: gateway,
        message: 'Best gateway selected successfully',
      });
    } catch (error) {
      logger.error('Error selecting gateway:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Retry failed payment
   * POST /api/v1/payments/:paymentId/retry
   */
  static async retryPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const gatewayPayload = req.body;

      const payment = await PaymentService.processPayment(paymentId, gatewayPayload);

      res.status(200).json({
        success: true,
        data: payment,
        message: 'Payment retry initiated successfully',
      });
    } catch (error) {
      logger.error('Error retrying payment:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Cancel payment
   * POST /api/v1/payments/:paymentId/cancel
   */
  static async cancelPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const { reason } = req.body;

      const payment = await PaymentService.getPaymentDetails(paymentId);
      
      if (!payment || (payment.status !== 'initiated' && payment.status !== 'processing')) {
        throw new Error('Payment cannot be cancelled in current state');
      }

      payment.status = 'cancelled';
      payment.metadata.cancelledReason = reason;
      payment.metadata.cancelledAt = new Date();
      await payment.save();

      res.status(200).json({
        success: true,
        data: payment,
        message: 'Payment cancelled successfully',
      });
    } catch (error) {
      logger.error('Error cancelling payment:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }
}

module.exports = PaymentController;
