/**
 * Payment Link Controller - Phase 12
 * REST API endpoints for payment links
 */

const PaymentLinkService = require('../services/PaymentLinkService');
const { validationResult } = require('express-validator');

class PaymentLinkController {
  /**
   * POST /api/v1/payment-links
   * Create payment link
   */
  static async createLink(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const link = await PaymentLinkService.createPaymentLink(req.body);

      res.status(201).json({
        success: true,
        linkId: link.linkId,
        shareUrl: link.getShareUrl(),
        qrCode: link.qrCode.imageUrl,
        data: link,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/payment-links/:linkToken
   * Get link by token (track view)
   */
  static async getLink(req, res) {
    try {
      const link = await PaymentLinkService.getLinkByToken(req.params.linkToken);

      res.json({
        success: true,
        linkId: link.linkId,
        shareUrl: link.getShareUrl(),
        amount: link.paymentAmount,
        description: link.description,
        acceptedMethods: link.acceptedPaymentMethods,
        data: link,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/payment-links/:linkToken/click
   * Track link click
   */
  static async trackClick(req, res) {
    try {
      const link = await PaymentLinkService.trackClick(req.params.linkToken);

      res.json({
        success: true,
        message: 'Click tracked',
        data: link,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/payment-links/:linkToken/record-payment
   * Record payment on link
   */
  static async recordPayment(req, res) {
    try {
      const link = await PaymentLinkService.recordPayment(req.params.linkToken, req.body);

      res.json({
        success: true,
        message: 'Payment recorded',
        linkStatus: link.status,
        data: link,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/payment-links/creator/:createdBy
   * Get links by creator
   */
  static async getLinksByCreator(req, res) {
    try {
      const links = await PaymentLinkService.getLinksByCreator(
        req.params.createdBy,
        req.query.status
      );

      res.json({
        success: true,
        count: links.length,
        data: links,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/payment-links/:linkToken/share
   * Share payment link
   */
  static async shareLink(req, res) {
    try {
      const link = await PaymentLinkService.shareLink(
        req.params.linkToken,
        req.body.shareMethod,
        req.body.sharedWith
      );

      res.json({
        success: true,
        message: `Link shared via ${req.body.shareMethod}`,
        shareUrl: link.getShareUrl(),
        data: link,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * DELETE /api/v1/payment-links/:linkToken
   * Cancel payment link
   */
  static async cancelLink(req, res) {
    try {
      const link = await PaymentLinkService.cancelLink(req.params.linkToken, req.body.reason);

      res.json({
        success: true,
        message: 'Payment link cancelled',
        data: link,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/payment-links/:linkToken/analytics
   * Get link analytics
   */
  static async getLinkAnalytics(req, res) {
    try {
      const analytics = await PaymentLinkService.getLinkAnalytics(req.params.linkToken);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/payment-links/creator/:createdBy/stats
   * Get link statistics
   */
  static async getLinkStats(req, res) {
    try {
      const stats = await PaymentLinkService.getLinkStatistics(req.params.createdBy);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = PaymentLinkController;
