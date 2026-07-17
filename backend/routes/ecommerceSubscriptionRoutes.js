/**
 * Ecommerce Subscription Routes
 * API endpoints for seller subscription management
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const EcommerceSubscriptionService = require('../services/EcommerceSubscriptionService');
const EcommerceSellerProfile = require('../models/EcommerceSellerProfile');
const logger = require('../utils/logger');

/**
 * GET /api/ecommerce/subscription/plans
 * Get all available subscription plans
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await EcommerceSubscriptionService.getAvailablePlans();

    res.json({
      success: true,
      plans: plans.map((plan) => ({
        id: plan._id,
        planId: plan.planId,
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        tagline: plan.tagline,
        pricing: plan.pricing,
        features: plan.features,
        commission: plan.commission,
        trial: plan.trial,
        isRecommended: plan.isRecommended,
        displayOrder: plan.displayOrder,
        benefits: plan.benefits,
      })),
    });
  } catch (error) {
    logger.error('Error fetching subscription plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans',
      error: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/subscription/plans/:slug
 * Get specific plan details
 */
router.get('/plans/:slug', async (req, res) => {
  try {
    const plan = await EcommerceSubscriptionService.getPlanBySlug(req.params.slug);

    res.json({
      success: true,
      plan,
    });
  } catch (error) {
    logger.error('Error fetching plan details:', error);
    res.status(404).json({
      success: false,
      message: 'Plan not found',
      error: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/subscription/status
 * Get current subscription status for authenticated seller
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const seller = await EcommerceSellerProfile.findOne({ sellerEmail: req.user.email });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found',
      });
    }

    const status = await EcommerceSubscriptionService.getSubscriptionStatus(seller._id);

    res.json({
      success: true,
      ...status,
    });
  } catch (error) {
    logger.error('Error fetching subscription status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription status',
      error: error.message,
    });
  }
});

/**
 * POST /api/ecommerce/subscription/upgrade
 * Upgrade seller subscription
 */
router.post('/upgrade', authenticate, async (req, res) => {
  try {
    const { planSlug, duration, paymentDetails } = req.body;

    if (!planSlug || !duration || !paymentDetails) {
      return res.status(400).json({
        success: false,
        message: 'Plan slug, duration, and payment details are required',
      });
    }

    const seller = await EcommerceSellerProfile.findOne({ sellerEmail: req.user.email });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found',
      });
    }

    const result = await EcommerceSubscriptionService.upgradeSubscription(
      seller._id,
      planSlug,
      duration,
      paymentDetails
    );

    res.json({
      success: true,
      message: 'Subscription upgraded successfully',
      ...result,
    });
  } catch (error) {
    logger.error('Error upgrading subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upgrade subscription',
      error: error.message,
    });
  }
});

/**
 * POST /api/ecommerce/subscription/cancel
 * Cancel subscription (remains active until end of period)
 */
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const { reason } = req.body;

    const seller = await EcommerceSellerProfile.findOne({ sellerEmail: req.user.email });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found',
      });
    }

    const result = await EcommerceSubscriptionService.cancelSubscription(seller._id, reason);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
      error: error.message,
    });
  }
});

/**
 * POST /api/ecommerce/subscription/downgrade
 * Downgrade to free plan
 */
router.post('/downgrade', authenticate, async (req, res) => {
  try {
    const seller = await EcommerceSellerProfile.findOne({ sellerEmail: req.user.email });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found',
      });
    }

    const result = await EcommerceSubscriptionService.downgradeToFree(seller._id);

    res.json({
      success: true,
      message: 'Downgraded to free plan successfully',
      ...result,
    });
  } catch (error) {
    logger.error('Error downgrading subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to downgrade subscription',
      error: error.message,
    });
  }
});

/**
 * POST /api/ecommerce/subscription/calculate-change
 * Calculate cost for plan change
 */
router.post('/calculate-change', authenticate, async (req, res) => {
  try {
    const { newPlanSlug, duration } = req.body;

    if (!newPlanSlug || !duration) {
      return res.status(400).json({
        success: false,
        message: 'New plan slug and duration are required',
      });
    }

    const seller = await EcommerceSellerProfile.findOne({ sellerEmail: req.user.email });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found',
      });
    }

    const calculation = await EcommerceSubscriptionService.calculatePlanChange(
      seller._id,
      newPlanSlug,
      duration
    );

    res.json({
      success: true,
      ...calculation,
    });
  } catch (error) {
    logger.error('Error calculating plan change:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate plan change',
      error: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/subscription/payment-history
 * Get payment history for seller
 */
router.get('/payment-history', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const seller = await EcommerceSellerProfile.findOne({ sellerEmail: req.user.email });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found',
      });
    }

    const history = await EcommerceSubscriptionService.getPaymentHistory(seller._id, limit);

    res.json({
      success: true,
      paymentHistory: history,
    });
  } catch (error) {
    logger.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
      error: error.message,
    });
  }
});

/**
 * POST /api/ecommerce/subscription/renew
 * Manually renew subscription
 */
router.post('/renew', authenticate, async (req, res) => {
  try {
    const { paymentDetails } = req.body;

    if (!paymentDetails) {
      return res.status(400).json({
        success: false,
        message: 'Payment details are required',
      });
    }

    const seller = await EcommerceSellerProfile.findOne({ sellerEmail: req.user.email });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found',
      });
    }

    const result = await EcommerceSubscriptionService.renewSubscription(seller._id, paymentDetails);

    res.json({
      success: true,
      message: 'Subscription renewed successfully',
      ...result,
    });
  } catch (error) {
    logger.error('Error renewing subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to renew subscription',
      error: error.message,
    });
  }
});

/**
 * POST /api/ecommerce/subscription/toggle-auto-renew
 * Toggle auto-renewal setting
 */
router.post('/toggle-auto-renew', authenticate, async (req, res) => {
  try {
    const seller = await EcommerceSellerProfile.findOne({ sellerEmail: req.user.email });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found',
      });
    }

    seller.subscription.autoRenew = !seller.subscription.autoRenew;
    await seller.save();

    res.json({
      success: true,
      message: `Auto-renewal ${seller.subscription.autoRenew ? 'enabled' : 'disabled'}`,
      autoRenew: seller.subscription.autoRenew,
    });
  } catch (error) {
    logger.error('Error toggling auto-renewal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle auto-renewal',
      error: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/subscription/compare
 * Compare subscription plans
 */
router.get('/compare', async (req, res) => {
  try {
    const plans = await EcommerceSubscriptionService.getAvailablePlans();

    const comparison = plans.map((plan) => ({
      name: plan.name,
      slug: plan.slug,
      pricing: plan.pricing,
      features: plan.features,
      commission: plan.commission,
      isRecommended: plan.isRecommended,
    }));

    res.json({
      success: true,
      comparison,
    });
  } catch (error) {
    logger.error('Error comparing plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compare plans',
      error: error.message,
    });
  }
});

module.exports = router;
