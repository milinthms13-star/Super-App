/**
 * Matrimonial Subscription & Entitlement Routes
 */

const express = require('express');
const router = express.Router();
const MatrimonialSubscription = require('../models/MatrimonialSubscription');
const { authenticate } = require('../middleware/auth');
const { subscriptionService } = require('../utils/subscriptionService');
const logger = require('../utils/logger');

/**
 * POST /api/matrimonial/subscription/create
 * Create/upgrade subscription
 */
router.post('/subscription/create', authenticate, async (req, res) => {
  try {
    const { profileId, tier, billingCycle } = req.body;
    const userEmail = req.user?.email;

    if (!profileId || !tier) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const subscription = await subscriptionService.createSubscription(
      profileId,
      userEmail,
      tier,
      billingCycle
    );

    // TODO: Integrate payment gateway here
    // For now, just create pending subscription

    return res.json({
      success: true,
      message: `${tier} subscription created`,
      data: subscription,
      paymentRequired: tier !== 'free',
    });
  } catch (error) {
    logger.error(`Error creating subscription: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/matrimonial/subscription/current
 * Get current subscription details
 */
router.get('/subscription/current', authenticate, async (req, res) => {
  try {
    const userEmail = req.user?.email;

    const subscription = await subscriptionService.getUserSubscription(userEmail);

    if (!subscription) {
      return res.json({
        success: true,
        data: {
          tier: 'free',
          isActive: true,
          entitlements: subscriptionService.SUBSCRIPTION_TIERS.free,
        },
      });
    }

    // Check if expired
    if (new Date() > subscription.endDate) {
      subscription.isActive = false;
    }

    return res.json({
      success: true,
      data: {
        tier: subscription.tier,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        daysRemaining: Math.ceil((subscription.endDate - new Date()) / (1000 * 60 * 60 * 24)),
        isActive: subscription.isActive,
        autoRenew: subscription.autoRenew,
        entitlements: subscription.entitlements,
      },
    });
  } catch (error) {
    logger.error(`Error fetching subscription: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/matrimonial/subscription/check-entitlement
 * Check if user has specific entitlement
 */
router.post('/subscription/check-entitlement', authenticate, async (req, res) => {
  try {
    const { entitlement } = req.body;
    const userEmail = req.user?.email;

    const hasAccess = await subscriptionService.hasEntitlement(userEmail, entitlement);

    return res.json({
      success: true,
      hasAccess,
      entitlement,
    });
  } catch (error) {
    logger.error(`Error checking entitlement: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/matrimonial/subscription/consume
 * Consume entitlement (e.g., profile view)
 */
router.post('/subscription/consume', authenticate, async (req, res) => {
  try {
    const { entitlement } = req.body;
    const userEmail = req.user?.email;

    await subscriptionService.consumeEntitlement(userEmail, entitlement);

    return res.json({
      success: true,
      message: `${entitlement} consumed`,
    });
  } catch (error) {
    logger.error(`Error consuming entitlement: ${error.message}`);
    return res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /api/matrimonial/subscription/:subscriptionId/cancel
 * Cancel subscription
 */
router.patch('/subscription/:subscriptionId/cancel', authenticate, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { reason } = req.body;

    const subscription = await MatrimonialSubscription.findByIdAndUpdate(
      subscriptionId,
      {
        isActive: false,
        tier: 'free',
        cancelledAt: new Date(),
        cancellationReason: reason,
        cancelledBy: 'user',
      },
      { new: true }
    );

    // TODO: Process refund if applicable

    return res.json({
      success: true,
      message: 'Subscription cancelled',
      data: subscription,
    });
  } catch (error) {
    logger.error(`Error cancelling subscription: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /api/matrimonial/subscription/:subscriptionId/refund
 * Admin: Process refund
 */
router.patch('/subscription/:subscriptionId/refund', authenticate, async (req, res) => {
  try {
    // TODO: Check if user is admin
    const { subscriptionId } = req.params;
    const { amount, reason } = req.body;

    const subscription = await subscriptionService.processRefund(
      subscriptionId,
      amount,
      reason,
      req.user?.email
    );

    return res.json({
      success: true,
      message: 'Refund processed',
      data: subscription,
    });
  } catch (error) {
    logger.error(`Error processing refund: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
