/**
 * Subscription Controller - Phase 12
 * REST API endpoints for subscription management
 */

const SubscriptionService = require('../services/SubscriptionService');
const { validationResult } = require('express-validator');

class SubscriptionController {
  /**
   * POST /api/v1/subscriptions
   * Create subscription
   */
  static async createSubscription(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const subscription = await SubscriptionService.createSubscription(req.body);

      res.status(201).json({
        success: true,
        subscriptionId: subscription.subscriptionId,
        data: subscription,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/subscriptions/:subscriptionId
   * Get subscription details
   */
  static async getSubscription(req, res) {
    try {
      const subscription = await SubscriptionService.getSubscription(req.params.subscriptionId);

      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found',
        });
      }

      res.json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/subscriptions/user/:userId
   * Get user subscriptions
   */
  static async getUserSubscriptions(req, res) {
    try {
      const subscriptions = await SubscriptionService.getUserSubscriptions(
        req.params.userId,
        req.query.status
      );

      res.json({
        success: true,
        count: subscriptions.length,
        data: subscriptions,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/subscriptions/:subscriptionId/activate
   * Activate subscription
   */
  static async activateSubscription(req, res) {
    try {
      const subscription = await SubscriptionService.activateSubscription(
        req.params.subscriptionId
      );

      res.json({
        success: true,
        message: 'Subscription activated',
        data: subscription,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/subscriptions/:subscriptionId/pause
   * Pause subscription
   */
  static async pauseSubscription(req, res) {
    try {
      const subscription = await SubscriptionService.pauseSubscription(
        req.params.subscriptionId,
        req.body.reason
      );

      res.json({
        success: true,
        message: 'Subscription paused',
        data: subscription,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/subscriptions/:subscriptionId/resume
   * Resume subscription
   */
  static async resumeSubscription(req, res) {
    try {
      const subscription = await SubscriptionService.resumeSubscription(
        req.params.subscriptionId
      );

      res.json({
        success: true,
        message: 'Subscription resumed',
        data: subscription,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/subscriptions/:subscriptionId/cancel
   * Cancel subscription
   */
  static async cancelSubscription(req, res) {
    try {
      const subscription = await SubscriptionService.cancelSubscription(
        req.params.subscriptionId,
        req.body.reason
      );

      res.json({
        success: true,
        message: 'Subscription cancelled',
        data: subscription,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/subscriptions/user/:userId/stats
   * Get subscription statistics
   */
  static async getSubscriptionStats(req, res) {
    try {
      const stats = await SubscriptionService.getSubscriptionStats(req.params.userId);

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

module.exports = SubscriptionController;
