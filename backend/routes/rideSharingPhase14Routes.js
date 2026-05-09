/**
 * rideSharingPhase14Routes.js
 * Phase 14: Advanced Personalization, Dynamic Pricing & Predictive Analytics
 * 
 * Consolidated REST API routes across 4 domains: 42+ endpoints
 * Domains: Personalization, Dynamic Pricing, Predictive Analytics, Loyalty & Rewards
 */

const express = require('express');
const auth = require('../../middleware/auth');

// Import services
const PersonalizationService = require('../../services/ridesharing/PersonalizationService');
const DynamicPricingService = require('../../services/ridesharing/DynamicPricingService');
const PredictiveAnalyticsService = require('../../services/ridesharing/PredictiveAnalyticsService');
const LoyaltyRewardsService = require('../../services/ridesharing/LoyaltyRewardsService');

const router = express.Router();

// ============================================================
// PERSONALIZATION ENDPOINTS (7)
// ============================================================

/**
 * GET /api/ridesharing/phase14/personalization/ride-recommendations
 * Get personalized ride recommendations for user
 */
router.get('/personalization/ride-recommendations', auth, async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    const result = await PersonalizationService.getPersonalizedRideRecommendations(
      req.user.id,
      limit
    );
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase14/personalization/driver-matching/:rideId
 * Get driver matching recommendations for ride request
 */
router.get('/personalization/driver-matching/:rideId', auth, async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    const result = await PersonalizationService.getDriverMatchingRecommendations(
      req.params.rideId,
      limit
    );
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase14/personalization/preferences
 * Get user communication and experience preferences
 */
router.get('/personalization/preferences', auth, async (req, res) => {
  try {
    const result = await PersonalizationService.getUserPreferences(req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/ridesharing/phase14/personalization/preferences
 * Update user preferences
 */
router.put('/personalization/preferences', auth, async (req, res) => {
  try {
    const result = await PersonalizationService.updateUserPreferences(
      req.user.id,
      req.body
    );
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase14/personalization/offers
 * Get personalized offers and promotions
 */
router.get('/personalization/offers', auth, async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const result = await PersonalizationService.getPersonalizedOffers(req.user.id, limit);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase14/personalization/engagement-score
 * Get user engagement score
 */
router.get('/personalization/engagement-score', auth, async (req, res) => {
  try {
    const userType = req.query.userType || 'rider';
    const result = await PersonalizationService.getUserEngagementScore(req.user.id, userType);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase14/personalization/recommended-connections
 * Get recommended connections/contacts
 */
router.get('/personalization/recommended-connections', auth, async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const result = await PersonalizationService.getRecommendedConnections(req.user.id, limit);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase14/personalization/ui-config
 * Get personalized UI configuration
 */
router.get('/personalization/ui-config', auth, async (req, res) => {
  try {
    const result = await PersonalizationService.getPersonalizedUIConfig(req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// DYNAMIC PRICING ENDPOINTS (6)
// ============================================================

/**
 * POST /api/ridesharing/phase14/pricing/calculate-surge
 * Calculate surge pricing for location
 */
router.post('/pricing/calculate-surge', auth, async (req, res) => {
  try {
    const result = await DynamicPricingService.calculateSurgePricing(
      req.body.location,
      req.body.timeSlot || 'peak'
    );
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase14/pricing/calculate-dynamic
 * Calculate dynamic price for ride
 */
router.post('/pricing/calculate-dynamic', auth, async (req, res) => {
  try {
    const result = await DynamicPricingService.calculateDynamicPrice({
      ...req.body,
      userId: req.user.id
    });
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase14/pricing/price-comparison
 * Get price comparison for different ride types
 */
router.post('/pricing/price-comparison', auth, async (req, res) => {
  try {
    const result = await DynamicPricingService.getPriceComparison(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase14/pricing/driver-earnings/:driverId
 * Get driver earnings optimization recommendations
 */
router.get('/pricing/driver-earnings/:driverId', auth, async (req, res) => {
  try {
    const result = await DynamicPricingService.driverEarningsOptimization(req.params.driverId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase14/pricing/elasticity-analysis
 * Analyze pricing elasticity
 */
router.post('/pricing/elasticity-analysis', auth, async (req, res) => {
  try {
    const result = await DynamicPricingService.analyzePricingElasticity(req.body.location);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase14/pricing/dashboard
 * Get real-time pricing dashboard (admin)
 */
router.get('/pricing/dashboard', auth, async (req, res) => {
  try {
    const result = await DynamicPricingService.getRealTimePricingDashboard();
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase14/pricing/price-alert
 * Get price change alerts for user
 */
router.post('/pricing/price-alert', auth, async (req, res) => {
  try {
    const result = await DynamicPricingService.getPriceChangeAlert(
      req.user.id,
      req.body.location
    );
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// PREDICTIVE ANALYTICS ENDPOINTS (6)
// ============================================================

/**
 * POST /api/ridesharing/phase14/analytics/demand-forecast
 * Forecast demand for location
 */
router.post('/analytics/demand-forecast', auth, async (req, res) => {
  try {
    const hoursAhead = req.body.hoursAhead || 24;
    const result = await PredictiveAnalyticsService.forecastDemand(
      req.body.location,
      hoursAhead
    );
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase14/analytics/churn-prediction/:userId
 * Predict user churn probability
 */
router.get('/analytics/churn-prediction/:userId', auth, async (req, res) => {
  try {
    const userType = req.query.userType || 'rider';
    const result = await PredictiveAnalyticsService.predictUserChurn(
      req.params.userId,
      userType
    );
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase14/analytics/driver-availability/:driverId
 * Predict driver availability patterns
 */
router.get('/analytics/driver-availability/:driverId', auth, async (req, res) => {
  try {
    const daysAhead = req.query.daysAhead || 7;
    const result = await PredictiveAnalyticsService.predictDriverAvailability(
      req.params.driverId,
      daysAhead
    );
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase14/analytics/optimal-pricing
 * Recommend optimal pricing
 */
router.post('/analytics/optimal-pricing', auth, async (req, res) => {
  try {
    const result = await PredictiveAnalyticsService.recommendOptimalPricing(
      req.body.location,
      req.body.timeSlot
    );
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase14/analytics/revenue-forecast
 * Predict revenue trends
 */
router.get('/analytics/revenue-forecast', auth, async (req, res) => {
  try {
    const daysAhead = req.query.daysAhead || 30;
    const result = await PredictiveAnalyticsService.predictRevenuetrends(daysAhead);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase14/analytics/churn-cohort
 * Get users at churn risk
 */
router.get('/analytics/churn-cohort', auth, async (req, res) => {
  try {
    const userType = req.query.userType || 'rider';
    const limit = req.query.limit || 100;
    const result = await PredictiveAnalyticsService.getChurnRiskCohort(userType, limit);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase14/analytics/user-ltv/:userId
 * Predict user lifetime value
 */
router.get('/analytics/user-ltv/:userId', auth, async (req, res) => {
  try {
    const result = await PredictiveAnalyticsService.predictUserLTV(req.params.userId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// LOYALTY & REWARDS ENDPOINTS (9)
// ============================================================

/**
 * GET /api/ridesharing/phase14/loyalty/account
 * Get loyalty account details
 */
router.get('/loyalty/account', auth, async (req, res) => {
  try {
    const result = await LoyaltyRewardsService.getLoyaltyAccount(req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase14/loyalty/award-points
 * Award loyalty points for completed ride
 */
router.post('/loyalty/award-points', auth, async (req, res) => {
  try {
    const result = await LoyaltyRewardsService.awardRidePoints(req.body.rideId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase14/loyalty/redeem-points
 * Redeem loyalty points
 */
router.post('/loyalty/redeem-points', auth, async (req, res) => {
  try {
    const result = await LoyaltyRewardsService.redeemPoints(req.user.id, req.body.points);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase14/loyalty/tier-benefits
 * Get loyalty tier benefits
 */
router.get('/loyalty/tier-benefits', auth, async (req, res) => {
  try {
    const account = await LoyaltyRewardsService.getLoyaltyAccount(req.user.id);
    if (!account.success) return res.status(400).json(account);

    const benefits = LoyaltyRewardsService.getTierBenefits(account.data.tier);
    res.status(200).json({
      success: true,
      message: 'Tier benefits retrieved',
      data: benefits
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase14/loyalty/achievements
 * Get user achievements
 */
router.get('/loyalty/achievements', auth, async (req, res) => {
  try {
    const result = await LoyaltyRewardsService.getUserAchievements(req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase14/loyalty/leaderboard
 * Get leaderboard rankings
 */
router.get('/loyalty/leaderboard', auth, async (req, res) => {
  try {
    const metric = req.query.metric || 'points';
    const limit = req.query.limit || 100;
    const period = req.query.period || '30days';
    const result = await LoyaltyRewardsService.getLeaderboard(metric, limit, period);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase14/loyalty/challenges
 * Get seasonal challenges
 */
router.get('/loyalty/challenges', auth, async (req, res) => {
  try {
    const result = await LoyaltyRewardsService.getSeasonalChallenges();
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase14/loyalty/referral-rewards
 * Get referral program details
 */
router.get('/loyalty/referral-rewards', auth, async (req, res) => {
  try {
    const result = await LoyaltyRewardsService.getReferralRewards(req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase14/loyalty/dashboard
 * Get complete loyalty dashboard
 */
router.get('/loyalty/dashboard', auth, async (req, res) => {
  try {
    const result = await LoyaltyRewardsService.getLoyaltyDashboard(req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
