/**
 * rideSharingPhase8Routes.js
 * Phase 8: Safety, Insurance, Premium, Analytics Routes
 * 40+ endpoints for safety, insurance, premium features, and analytics
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const SafetyAndEmergencyService = require('../services/ridesharing/SafetyAndEmergencyService');
const InsuranceAndClaimsService = require('../services/ridesharing/InsuranceAndClaimsService');
const PremiumFeaturesService = require('../services/ridesharing/PremiumFeaturesService');
const UserAnalyticsService = require('../services/ridesharing/UserAnalyticsService');

// ==================== SAFETY & EMERGENCY ENDPOINTS ====================

/**
 * POST /api/ridesharing/phase8/safety/emergency-contact
 * Add emergency contact
 */
router.post('/safety/emergency-contact', auth, async (req, res) => {
  try {
    const result = await SafetyAndEmergencyService.addEmergencyContact(
      req.user.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase8/safety/emergency-contacts
 * Get emergency contacts
 */
router.get('/safety/emergency-contacts', auth, async (req, res) => {
  try {
    const result = await SafetyAndEmergencyService.getEmergencyContacts(
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/ridesharing/phase8/safety/emergency-contact/:contactId
 * Update emergency contact
 */
router.put('/safety/emergency-contact/:contactId', auth, async (req, res) => {
  try {
    const result = await SafetyAndEmergencyService.updateEmergencyContact(
      req.params.contactId,
      req.user.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/ridesharing/phase8/safety/emergency-contact/:contactId
 * Delete emergency contact
 */
router.delete('/safety/emergency-contact/:contactId', auth, async (req, res) => {
  try {
    const result = await SafetyAndEmergencyService.deleteEmergencyContact(
      req.params.contactId,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase8/safety/sos-alert
 * Trigger SOS alert
 */
router.post('/safety/sos-alert', auth, async (req, res) => {
  try {
    const result = await SafetyAndEmergencyService.triggerSOSAlert(
      req.user.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase8/safety/sos-alert/:alertId
 * Get SOS alert status
 */
router.get('/safety/sos-alert/:alertId', auth, async (req, res) => {
  try {
    const result = await SafetyAndEmergencyService.getSOSAlertStatus(
      req.params.alertId,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase8/safety/sos-alert/:alertId/close
 * Close SOS alert
 */
router.post('/safety/sos-alert/:alertId/close', auth, async (req, res) => {
  try {
    const result = await SafetyAndEmergencyService.closeSOSAlert(
      req.params.alertId,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase8/safety/rate-user
 * Rate user safety
 */
router.post('/safety/rate-user', auth, async (req, res) => {
  try {
    const result = await SafetyAndEmergencyService.rateUserSafety(
      req.user.id,
      req.body.ratedUserId,
      req.body.rideId,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase8/safety/ratings/:userId
 * Get user safety ratings
 */
router.get('/safety/ratings/:userId', async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const result = await SafetyAndEmergencyService.getUserSafetyRatings(
      req.params.userId,
      page,
      limit
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase8/safety/trusted-contact
 * Add trusted contact
 */
router.post('/safety/trusted-contact', auth, async (req, res) => {
  try {
    const result = await SafetyAndEmergencyService.addTrustedContact(
      req.user.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase8/safety/overview
 * Get safety overview
 */
router.get('/safety/overview', auth, async (req, res) => {
  try {
    const result = await SafetyAndEmergencyService.getSafetyOverview(
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase8/safety/report-violation
 * Report safety violation
 */
router.post('/safety/report-violation', auth, async (req, res) => {
  try {
    const result = await SafetyAndEmergencyService.reportSafetyViolation(
      req.user.id,
      req.body.reportedUserId,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== INSURANCE & CLAIMS ENDPOINTS ====================

/**
 * GET /api/ridesharing/phase8/insurance/plans
 * Get available insurance plans
 */
router.get('/insurance/plans', async (req, res) => {
  try {
    const filters = {
      coverage: req.query.coverage,
      maxPrice: req.query.maxPrice,
    };
    const result = await InsuranceAndClaimsService.getAvailableInsurancePlans(filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase8/insurance/plan/:planId
 * Get insurance plan details
 */
router.get('/insurance/plan/:planId', async (req, res) => {
  try {
    const result = await InsuranceAndClaimsService.getInsurancePlanDetails(
      req.params.planId
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase8/insurance/policy
 * Purchase insurance policy
 */
router.post('/insurance/policy', auth, async (req, res) => {
  try {
    const result = await InsuranceAndClaimsService.purchaseInsurancePolicy(
      req.user.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase8/insurance/policy
 * Get user insurance policy
 */
router.get('/insurance/policy', auth, async (req, res) => {
  try {
    const result = await InsuranceAndClaimsService.getUserInsurancePolicy(
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase8/insurance/policies
 * Get all user insurance policies
 */
router.get('/insurance/policies', auth, async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const result = await InsuranceAndClaimsService.getUserInsurancePolicies(
      req.user.id,
      page,
      limit
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase8/insurance/claim
 * File insurance claim
 */
router.post('/insurance/claim', auth, async (req, res) => {
  try {
    const result = await InsuranceAndClaimsService.fileInsuranceClaim(
      req.user.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase8/insurance/claim/:claimId
 * Get claim details
 */
router.get('/insurance/claim/:claimId', auth, async (req, res) => {
  try {
    const result = await InsuranceAndClaimsService.getClaimDetails(
      req.params.claimId,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase8/insurance/claims
 * Get user claims
 */
router.get('/insurance/claims', auth, async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const status = req.query.status;
    const result = await InsuranceAndClaimsService.getUserClaims(
      req.user.id,
      page,
      limit,
      status
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase8/insurance/claim/:claimId/document
 * Upload claim document
 */
router.post('/insurance/claim/:claimId/document', auth, async (req, res) => {
  try {
    const result = await InsuranceAndClaimsService.uploadClaimDocument(
      req.params.claimId,
      req.user.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase8/insurance/predefined-plans
 * Get predefined plans
 */
router.get('/insurance/predefined-plans', (req, res) => {
  try {
    const plans = InsuranceAndClaimsService.getPredefinedPlans();
    res.json({ success: true, data: plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase8/insurance/statistics
 * Get insurance statistics
 */
router.get('/insurance/statistics', auth, async (req, res) => {
  try {
    const result = await InsuranceAndClaimsService.getInsuranceStatistics(
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== PREMIUM FEATURES ENDPOINTS ====================

/**
 * GET /api/ridesharing/phase8/premium/tiers
 * Get premium tiers
 */
router.get('/premium/tiers', async (req, res) => {
  try {
    const result = await PremiumFeaturesService.getAvailablePremiumTiers();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase8/premium/subscribe
 * Subscribe to premium tier
 */
router.post('/premium/subscribe', auth, async (req, res) => {
  try {
    const result = await PremiumFeaturesService.subscribeToPremiumTier(
      req.user.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase8/premium/subscription
 * Get user premium subscription
 */
router.get('/premium/subscription', auth, async (req, res) => {
  try {
    const result = await PremiumFeaturesService.getUserPremiumSubscription(
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase8/premium/vip-ride
 * Book VIP ride
 */
router.post('/premium/vip-ride', auth, async (req, res) => {
  try {
    const result = await PremiumFeaturesService.bookVIPRide(
      req.user.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase8/premium/vip-ride/:rideId
 * Get VIP ride details
 */
router.get('/premium/vip-ride/:rideId', auth, async (req, res) => {
  try {
    const result = await PremiumFeaturesService.getVIPRideDetails(
      req.params.rideId,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase8/premium/vip-rides
 * Get user VIP rides
 */
router.get('/premium/vip-rides', auth, async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const result = await PremiumFeaturesService.getUserVIPRides(
      req.user.id,
      page,
      limit
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase8/premium/concierge
 * Use concierge service
 */
router.post('/premium/concierge', auth, async (req, res) => {
  try {
    const result = await PremiumFeaturesService.useConciergeService(
      req.user.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase8/premium/cancel-subscription
 * Cancel premium subscription
 */
router.post('/premium/cancel-subscription', auth, async (req, res) => {
  try {
    const result = await PremiumFeaturesService.cancelPremiumSubscription(
      req.user.id,
      req.body.reason
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase8/premium/overview
 * Get premium features overview
 */
router.get('/premium/overview', auth, async (req, res) => {
  try {
    const result = await PremiumFeaturesService.getPremiumFeaturesOverview(
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase8/premium/predefined-tiers
 * Get predefined premium tiers
 */
router.get('/premium/predefined-tiers', (req, res) => {
  try {
    const tiers = PremiumFeaturesService.getPredefinedTiers();
    res.json({ success: true, data: tiers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== USER ANALYTICS ENDPOINTS ====================

/**
 * POST /api/ridesharing/phase8/analytics/track-ride
 * Track ride event
 */
router.post('/analytics/track-ride', auth, async (req, res) => {
  try {
    const result = await UserAnalyticsService.trackRideEvent(
      req.user.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase8/analytics/dashboard
 * Get analytics dashboard
 */
router.get('/analytics/dashboard', auth, async (req, res) => {
  try {
    const result = await UserAnalyticsService.getUserAnalyticsDashboard(
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase8/analytics/spending
 * Get spending analysis
 */
router.get('/analytics/spending', auth, async (req, res) => {
  try {
    const timeframe = req.query.timeframe || 'monthly';
    const result = await UserAnalyticsService.getSpendingAnalysis(
      req.user.id,
      timeframe
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase8/analytics/patterns
 * Get ride pattern insights
 */
router.get('/analytics/patterns', auth, async (req, res) => {
  try {
    const result = await UserAnalyticsService.getRidePatternInsights(
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase8/analytics/recommendations
 * Get personalized recommendations
 */
router.get('/analytics/recommendations', auth, async (req, res) => {
  try {
    const result = await UserAnalyticsService.getPersonalizedRecommendations(
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase8/analytics/comparison
 * Compare with similar users
 */
router.get('/analytics/comparison', auth, async (req, res) => {
  try {
    const result = await UserAnalyticsService.compareWithSimilarUsers(
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase8/analytics/report
 * Get monthly report
 */
router.get('/analytics/report', auth, async (req, res) => {
  try {
    const month = req.query.month || new Date().getMonth() + 1;
    const year = req.query.year || new Date().getFullYear();
    const result = await UserAnalyticsService.getMonthlyReport(
      req.user.id,
      month,
      year
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase8/analytics/export
 * Export analytics data
 */
router.get('/analytics/export', auth, async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const result = await UserAnalyticsService.exportAnalyticsData(
      req.user.id,
      format
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
