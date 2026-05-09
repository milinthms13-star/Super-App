/**
 * subscriptionRoutes.js
 * Subscription and membership plan endpoints
 */

const express = require('express');
const router = express.Router();
const SubscriptionService = require('../services/SubscriptionService');
const { verifyToken } = require('../middleware/auth');

// GET /api/subscriptions/plans - Get all active plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await SubscriptionService.getAllPlans();
    res.json({ success: true, data: plans });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/subscriptions/plans/:planId - Get plan by ID
router.get('/plans/:planId', async (req, res) => {
  try {
    const plan = await SubscriptionService.getPlanById(req.params.planId);
    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(404).json({ error: 'Plan not found' });
  }
});

// GET /api/subscriptions/plans/tier/:tier - Get plan by tier
router.get('/plans/tier/:tier', async (req, res) => {
  try {
    const plan = await SubscriptionService.getPlanByTier(req.params.tier);
    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(404).json({ error: 'Plan not found' });
  }
});

// GET /api/subscriptions/plans/recommended - Get recommended plan
router.get('/plans/recommended', async (req, res) => {
  try {
    const plan = await SubscriptionService.getRecommendedPlan();

    if (!plan) {
      return res.status(404).json({ error: 'No recommended plan' });
    }

    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/subscriptions/plans/popular - Get popular plans
router.get('/plans/popular', async (req, res) => {
  try {
    const { limit } = req.query;
    const plans = await SubscriptionService.getPopularPlans(limit || 5);
    res.json({ success: true, data: plans });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/subscriptions/compare - Compare plans
router.post('/compare', async (req, res) => {
  try {
    const { planIds } = req.body;

    if (!Array.isArray(planIds) || planIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 plan IDs required' });
    }

    const plans = await SubscriptionService.comparePlans(planIds);
    res.json({ success: true, data: plans });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/subscriptions/subscribe - Subscribe to plan
router.post('/subscribe', verifyToken, async (req, res) => {
  try {
    const { planId, billingCycle, paymentMethodId } = req.body;

    if (!planId) {
      return res.status(400).json({ error: 'Plan ID required' });
    }

    const subscription = await SubscriptionService.subscribeToPlan(
      req.user.id,
      planId,
      billingCycle || 'monthly',
      paymentMethodId
    );

    res.status(201).json({ success: true, data: subscription });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/subscriptions/active - Get active subscription
router.get('/active', verifyToken, async (req, res) => {
  try {
    const subscription = await SubscriptionService.getActiveSubscription(req.user.id);

    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription' });
    }

    res.json({ success: true, data: subscription });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/subscriptions/history - Get subscription history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const history = await SubscriptionService.getSubscriptionHistory(req.user.id);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/subscriptions/upgrade - Upgrade subscription
router.post('/upgrade', verifyToken, async (req, res) => {
  try {
    const { newPlanId } = req.body;

    if (!newPlanId) {
      return res.status(400).json({ error: 'New plan ID required' });
    }

    const result = await SubscriptionService.upgradePlan(req.user.id, newPlanId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/subscriptions/downgrade - Downgrade subscription
router.post('/downgrade', verifyToken, async (req, res) => {
  try {
    const { newPlanId } = req.body;

    if (!newPlanId) {
      return res.status(400).json({ error: 'New plan ID required' });
    }

    const result = await SubscriptionService.downgradePlan(req.user.id, newPlanId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/subscriptions/cancel - Cancel subscription
router.post('/cancel', verifyToken, async (req, res) => {
  try {
    const { reason } = req.body;

    const result = await SubscriptionService.cancelSubscription(req.user.id, reason);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/subscriptions/benefits - Calculate subscription benefits
router.get('/benefits', verifyToken, async (req, res) => {
  try {
    const { orderAmount, ordersPerMonth } = req.query;

    const benefits = await SubscriptionService.calculateBenefits(
      req.user.id,
      orderAmount || 0,
      ordersPerMonth || 1
    );

    res.json({ success: true, data: benefits });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/subscriptions/eligibility - Check order eligibility
router.get('/eligibility', verifyToken, async (req, res) => {
  try {
    const { orderAmount } = req.query;

    if (!orderAmount) {
      return res.status(400).json({ error: 'Order amount required' });
    }

    const eligibility = await SubscriptionService.checkOrderEligibility(
      req.user.id,
      parseFloat(orderAmount)
    );

    res.json({ success: true, data: eligibility });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
