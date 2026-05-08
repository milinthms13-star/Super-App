const RefundService = require('../services/FoodDeliveryRefundService');
const NotificationService = require('../services/FoodDeliveryNotificationService');

class RefundController {
  /**
   * Initiate refund
   */
  static async initiateRefund(req, res) {
    try {
      const { orderId, reason, description, refundMethod } = req.body;
      const userId = req.user?.userId;

      if (!orderId || !reason) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: orderId, reason',
        });
      }

      const refund = await RefundService.initiateRefund(
        orderId,
        userId,
        reason,
        description,
        refundMethod
      );

      // Send refund initiated notification
      await NotificationService.sendRefundInitiatedNotification(orderId, {
        userId,
        refundAmount: refund.refundAmount,
        reason,
      });

      res.status(201).json({
        success: true,
        data: refund.toSummary(),
        message: 'Refund initiated successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Approve refund (admin)
   */
  static async approveRefund(req, res) {
    try {
      const { refundId } = req.params;
      const { notes } = req.body;
      const approvedBy = req.user?.userId;

      if (!refundId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: refundId',
        });
      }

      const refund = await RefundService.approveRefund(refundId, approvedBy, notes);

      // Send approval notification
      await NotificationService.sendRefundApprovedNotification(refund.orderId, {
        userId: refund.userId,
        refundAmount: refund.refundAmount,
      });

      res.json({
        success: true,
        data: refund.toSummary(),
        message: 'Refund approved successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Reject refund (admin)
   */
  static async rejectRefund(req, res) {
    try {
      const { refundId } = req.params;
      const { reason } = req.body;
      const rejectedBy = req.user?.userId;

      if (!refundId || !reason) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: reason',
        });
      }

      const refund = await RefundService.rejectRefund(refundId, rejectedBy, reason);

      // Send rejection notification
      await NotificationService.sendRefundRejectedNotification(refund.orderId, {
        userId: refund.userId,
        reason,
      });

      res.json({
        success: true,
        data: refund.toSummary(),
        message: 'Refund rejected successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Process refund
   */
  static async processRefund(req, res) {
    try {
      const { refundId } = req.params;

      if (!refundId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: refundId',
        });
      }

      const refund = await RefundService.processRefund(refundId);

      // Send processing notification
      await NotificationService.sendRefundProcessingNotification(refund.orderId, {
        userId: refund.userId,
        refundAmount: refund.refundAmount,
        method: refund.refundMethod,
      });

      res.json({
        success: true,
        data: refund.toSummary(),
        message: 'Refund processing initiated',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get refund status
   */
  static async getRefundStatus(req, res) {
    try {
      const { refundId } = req.params;

      if (!refundId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: refundId',
        });
      }

      const refund = await RefundService.getRefundStatus(refundId);

      res.json({
        success: true,
        data: refund,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get refund by order
   */
  static async getRefundByOrder(req, res) {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: orderId',
        });
      }

      const refund = await RefundService.getRefundByOrder(orderId);

      if (!refund) {
        return res.status(404).json({
          success: false,
          message: 'No refund found for this order',
        });
      }

      res.json({
        success: true,
        data: refund.toSummary(),
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get user refunds
   */
  static async getUserRefunds(req, res) {
    try {
      const userId = req.user?.userId;
      const { limit = 20, skip = 0 } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const refunds = await RefundService.getUserRefunds(
        userId,
        parseInt(limit),
        parseInt(skip)
      );

      res.json({
        success: true,
        data: refunds.map((r) => r.toSummary()),
        count: refunds.length,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Retry failed refund
   */
  static async retryFailedRefund(req, res) {
    try {
      const { refundId } = req.params;

      if (!refundId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: refundId',
        });
      }

      const refund = await RefundService.retryFailedRefund(refundId);

      res.json({
        success: true,
        data: refund.toSummary(),
        message: 'Refund retry initiated',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get refund analytics (admin)
   */
  static async getRefundAnalytics(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: startDate, endDate',
        });
      }

      const analytics = await RefundService.getRefundAnalytics(startDate, endDate);

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

module.exports = RefundController;
