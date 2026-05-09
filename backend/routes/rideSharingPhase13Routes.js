/**
 * rideSharingPhase13Routes.js
 * Consolidated REST API routes for Phase 13: Marketplace Features, Ratings & Compliance
 * 38+ endpoints across 4 service domains
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Import services
const RatingAndReviewService = require('../services/ridesharing/RatingAndReviewService');
const ReputationSystemService = require('../services/ridesharing/ReputationSystemService');
const MarketplaceAnalyticsService = require('../services/ridesharing/MarketplaceAnalyticsService');
const ComplianceReportingService = require('../services/ridesharing/ComplianceReportingService');

// ============================================
// RATING AND REVIEW ENDPOINTS (8 endpoints)
// ============================================

/**
 * Submit rating and review for a ride
 * POST /api/ridesharing/phase13/rating/submit
 */
router.post('/rating/submit', auth, async (req, res) => {
  try {
    const result = await RatingAndReviewService.submitRating(req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get all ratings for a user
 * GET /api/ridesharing/phase13/rating/:userId?page=1&limit=20
 */
router.get('/rating/:userId', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type = 'driver' } = req.query;
    const result = await RatingAndReviewService.getUserRatings(req.params.userId, type, parseInt(page), parseInt(limit));
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get rating statistics for a user
 * GET /api/ridesharing/phase13/rating/:userId/stats
 */
router.get('/rating/:userId/stats', auth, async (req, res) => {
  try {
    const { type = 'driver' } = req.query;
    const result = await RatingAndReviewService.getUserRatingStats(req.params.userId, type);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Moderate review (approve/reject)
 * POST /api/ridesharing/phase13/rating/:ratingId/moderate
 */
router.post('/rating/:ratingId/moderate', auth, async (req, res) => {
  try {
    const { action, reason } = req.body;
    const result = await RatingAndReviewService.moderateReview(req.params.ratingId, action, reason);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Mark review as helpful/unhelpful
 * POST /api/ridesharing/phase13/rating/:ratingId/helpful
 */
router.post('/rating/:ratingId/helpful', auth, async (req, res) => {
  try {
    const { helpful = true } = req.body;
    const result = await RatingAndReviewService.markHelpful(req.params.ratingId, helpful);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get detailed ride review
 * GET /api/ridesharing/phase13/rating/ride/:rideId
 */
router.get('/rating/ride/:rideId', auth, async (req, res) => {
  try {
    const result = await RatingAndReviewService.getRideReview(req.params.rideId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get trending tags
 * GET /api/ridesharing/phase13/rating/trending?period=weekly&limit=20
 */
router.get('/rating/trending/tags', auth, async (req, res) => {
  try {
    const { period = 'weekly', limit = 20 } = req.query;
    const result = await RatingAndReviewService.getTrendingTags(period, parseInt(limit));
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Respond to review
 * POST /api/ridesharing/phase13/rating/:ratingId/respond
 */
router.post('/rating/:ratingId/respond', auth, async (req, res) => {
  try {
    const { responseText } = req.body;
    const result = await RatingAndReviewService.respondToReview(req.params.ratingId, req.user.id, responseText);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Flag review as inappropriate
 * POST /api/ridesharing/phase13/rating/:ratingId/flag
 */
router.post('/rating/:ratingId/flag', auth, async (req, res) => {
  try {
    const { reason, description } = req.body;
    const result = await RatingAndReviewService.flagReview(req.params.ratingId, req.user.id, reason, description);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// REPUTATION SYSTEM ENDPOINTS (7 endpoints)
// ============================================

/**
 * Calculate reputation score
 * POST /api/ridesharing/phase13/reputation/calculate
 */
router.post('/reputation/calculate', auth, async (req, res) => {
  try {
    const { userId, userType } = req.body;
    const result = await ReputationSystemService.calculateReputationScore(userId, userType);
    if (result.success) {
      await ReputationSystemService.saveReputationProfile(result.data);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get user reputation profile
 * GET /api/ridesharing/phase13/reputation/:userId
 */
router.get('/reputation/:userId', auth, async (req, res) => {
  try {
    const result = await ReputationSystemService.getUserReputationProfile(req.params.userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get trust metrics percentile
 * GET /api/ridesharing/phase13/reputation/:userId/percentile
 */
router.get('/reputation/:userId/percentile', auth, async (req, res) => {
  try {
    const { userType } = req.query;
    const result = await ReputationSystemService.getTrustMetricsPercentile(req.params.userId, userType);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get reputation history
 * GET /api/ridesharing/phase13/reputation/:userId/history?days=90
 */
router.get('/reputation/:userId/history', auth, async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const result = await ReputationSystemService.getReputationHistory(req.params.userId, parseInt(days));
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get low reputation users for intervention
 * GET /api/ridesharing/phase13/reputation/low-users?threshold=50&limit=50
 */
router.get('/reputation/low-users/list', auth, async (req, res) => {
  try {
    const { threshold = 50, limit = 50 } = req.query;
    const result = await ReputationSystemService.getLowReputationUsers(parseInt(threshold), parseInt(limit));
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Recalculate all reputations
 * POST /api/ridesharing/phase13/reputation/recalculate-all
 */
router.post('/reputation/recalculate-all', auth, async (req, res) => {
  try {
    const { userType } = req.body;
    const result = await ReputationSystemService.recalculateAllReputations(userType);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// MARKETPLACE ANALYTICS ENDPOINTS (7 endpoints)
// ============================================

/**
 * Get trending routes
 * GET /api/ridesharing/phase13/marketplace/trending-routes?period=daily&limit=20
 */
router.get('/marketplace/trending-routes', auth, async (req, res) => {
  try {
    const { period = 'daily', limit = 20 } = req.query;
    const result = await MarketplaceAnalyticsService.getTrendingRoutes(period, parseInt(limit));
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get peak demand times
 * GET /api/ridesharing/phase13/marketplace/peak-demand?days=7
 */
router.get('/marketplace/peak-demand', auth, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const result = await MarketplaceAnalyticsService.getPeakDemandTimes(parseInt(days));
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get marketplace health
 * GET /api/ridesharing/phase13/marketplace/health
 */
router.get('/marketplace/health', auth, async (req, res) => {
  try {
    const result = await MarketplaceAnalyticsService.getMarketplaceHealth();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get user segmentation
 * GET /api/ridesharing/phase13/marketplace/segmentation?metric=rides
 */
router.get('/marketplace/segmentation', auth, async (req, res) => {
  try {
    const { metric = 'rides' } = req.query;
    const result = await MarketplaceAnalyticsService.getUserSegmentation(metric);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get geographic metrics
 * GET /api/ridesharing/phase13/marketplace/geographic
 */
router.get('/marketplace/geographic', auth, async (req, res) => {
  try {
    const result = await MarketplaceAnalyticsService.getGeographicMetrics();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get revenue trends
 * GET /api/ridesharing/phase13/marketplace/revenue-trends?days=30
 */
router.get('/marketplace/revenue-trends', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const result = await MarketplaceAnalyticsService.getRevenueTrends(parseInt(days));
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get driver availability metrics
 * GET /api/ridesharing/phase13/marketplace/driver-availability
 */
router.get('/marketplace/driver-availability', auth, async (req, res) => {
  try {
    const result = await MarketplaceAnalyticsService.getDriverAvailabilityMetrics();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get marketplace comparison
 * GET /api/ridesharing/phase13/marketplace/comparison?period1Days=7&period2Days=14
 */
router.get('/marketplace/comparison', auth, async (req, res) => {
  try {
    const { period1Days = 7, period2Days = 14 } = req.query;
    const result = await MarketplaceAnalyticsService.getMarketplaceComparison(parseInt(period1Days), parseInt(period2Days));
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// COMPLIANCE REPORTING ENDPOINTS (9 endpoints)
// ============================================

/**
 * Generate tax report
 * POST /api/ridesharing/phase13/compliance/tax-report
 */
router.post('/compliance/tax-report', auth, async (req, res) => {
  try {
    const { userId, year, month } = req.body;
    const result = await ComplianceReportingService.generateTaxReport(userId, year, month);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get audit trail
 * GET /api/ridesharing/phase13/compliance/audit-trail?page=1&limit=50
 */
router.get('/compliance/audit-trail', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const filters = req.query.filters ? JSON.parse(req.query.filters) : {};
    const result = await ComplianceReportingService.getAuditTrail(filters, parseInt(page), parseInt(limit));
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Log compliance event
 * POST /api/ridesharing/phase13/compliance/log-event
 */
router.post('/compliance/log-event', auth, async (req, res) => {
  try {
    const result = await ComplianceReportingService.logComplianceEvent(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Generate regulatory report
 * POST /api/ridesharing/phase13/compliance/regulatory-report
 */
router.post('/compliance/regulatory-report', auth, async (req, res) => {
  try {
    const { startDate, endDate, reportType = 'all' } = req.body;
    const result = await ComplianceReportingService.generateRegulatoryReport(
      new Date(startDate),
      new Date(endDate),
      reportType
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Generate KYC report
 * POST /api/ridesharing/phase13/compliance/kyc-report
 */
router.post('/compliance/kyc-report', auth, async (req, res) => {
  try {
    const result = await ComplianceReportingService.generateKYCReport();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get user compliance status
 * GET /api/ridesharing/phase13/compliance/user-status/:userId
 */
router.get('/compliance/user-status/:userId', auth, async (req, res) => {
  try {
    const result = await ComplianceReportingService.getUserComplianceStatus(req.params.userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get compliance dashboard
 * GET /api/ridesharing/phase13/compliance/dashboard
 */
router.get('/compliance/dashboard', auth, async (req, res) => {
  try {
    const result = await ComplianceReportingService.getComplianceDashboard();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
