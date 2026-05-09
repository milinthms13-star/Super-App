/**
 * Phase 9 Routes - Food Delivery Platform Enhancement
 * Comprehensive routing for 5 major feature categories:
 * A: Real-time Order Tracking
 * B: Order Quality & Reviews
 * C: Gamification & Engagement
 * D: Dynamic Pricing & Promotions
 * E: Vendor & Supply Chain
 */

const express = require('express');
const router = express.Router();
const { validateRequest, handleValidationErrors } = require('../validations/Phase9Validations');
const { authenticateToken } = require('../middleware/authMiddleware');

// Controllers
const OrderTrackingController = require('../controllers/OrderTrackingController');
const DeliveryLocationController = require('../controllers/DeliveryLocationController');
const ReviewModerationController = require('../controllers/ReviewModerationController');
const FoodSafetyController = require('../controllers/FoodSafetyController');
const BadgeController = require('../controllers/BadgeController');
const LeaderboardController = require('../controllers/LeaderboardController');
const DynamicPriceController = require('../controllers/DynamicPriceController');
const PromotionController = require('../controllers/PromotionController');
const VendorController = require('../controllers/VendorController');
const InventoryController = require('../controllers/InventoryController');

/**
 * FEATURE A: Real-time Order Tracking
 */

// Order Tracking
router.post('/api/phase9/tracking/initialize', authenticateToken, OrderTrackingController.initializeTracking.bind(OrderTrackingController));
router.put('/api/phase9/tracking/:trackingId/status', authenticateToken, OrderTrackingController.updateOrderStatus.bind(OrderTrackingController));
router.put('/api/phase9/tracking/:trackingId/location', authenticateToken, OrderTrackingController.updateLocation.bind(OrderTrackingController));
router.post('/api/phase9/tracking/:trackingId/notification', authenticateToken, OrderTrackingController.addNotification.bind(OrderTrackingController));
router.put('/api/phase9/tracking/:trackingId/notification/:notificationId/read', authenticateToken, OrderTrackingController.markNotificationRead.bind(OrderTrackingController));
router.post('/api/phase9/tracking/:trackingId/issue', authenticateToken, OrderTrackingController.reportIssue.bind(OrderTrackingController));
router.get('/api/phase9/tracking/:trackingId', authenticateToken, OrderTrackingController.getTrackingDetails.bind(OrderTrackingController));
router.get('/api/phase9/tracking/order/:orderId', authenticateToken, OrderTrackingController.getTrackingByOrderId.bind(OrderTrackingController));
router.post('/api/phase9/tracking/estimate', authenticateToken, OrderTrackingController.calculateDeliveryEstimate.bind(OrderTrackingController));
router.delete('/api/phase9/tracking/:trackingId/cancel', authenticateToken, OrderTrackingController.cancelOrder.bind(OrderTrackingController));

// Delivery Location
router.post('/api/phase9/location/initialize', authenticateToken, DeliveryLocationController.initializeTracking.bind(DeliveryLocationController));
router.put('/api/phase9/location/:deliveryPartnerId/update', authenticateToken, DeliveryLocationController.updateLocation.bind(DeliveryLocationController));
router.post('/api/phase9/location/:deliveryPartnerId/stop', authenticateToken, DeliveryLocationController.recordStop.bind(DeliveryLocationController));
router.put('/api/phase9/location/:deliveryPartnerId/status', authenticateToken, DeliveryLocationController.updateOnlineStatus.bind(DeliveryLocationController));
router.get('/api/phase9/location/nearby', authenticateToken, DeliveryLocationController.getAvailablePartnersNearby.bind(DeliveryLocationController));
router.get('/api/phase9/location/:deliveryPartnerId/efficiency', authenticateToken, DeliveryLocationController.calculateEfficiencyScore.bind(DeliveryLocationController));
router.get('/api/phase9/location/:deliveryPartnerId/history', authenticateToken, DeliveryLocationController.getLocationHistory.bind(DeliveryLocationController));
router.get('/api/phase9/location/:deliveryPartnerId/geofence', authenticateToken, DeliveryLocationController.getGeofenceAlerts.bind(DeliveryLocationController));
router.put('/api/phase9/location/:deliveryPartnerId/metrics', authenticateToken, DeliveryLocationController.updateTodayMetrics.bind(DeliveryLocationController));
router.get('/api/phase9/location/:deliveryPartnerId/connectivity', authenticateToken, DeliveryLocationController.getConnectivityStatus.bind(DeliveryLocationController));

/**
 * FEATURE B: Order Quality & Reviews
 */

// Review Moderation
router.post('/api/phase9/reviews', authenticateToken, ReviewModerationController.submitReview.bind(ReviewModerationController));
router.post('/api/phase9/reviews/:reviewId/media', authenticateToken, ReviewModerationController.addMedia.bind(ReviewModerationController));
router.put('/api/phase9/reviews/:reviewId/helpful', authenticateToken, ReviewModerationController.markHelpful.bind(ReviewModerationController));
router.put('/api/phase9/reviews/:reviewId/flag', authenticateToken, ReviewModerationController.flagReview.bind(ReviewModerationController));
router.put('/api/phase9/reviews/:reviewId/moderate', authenticateToken, ReviewModerationController.moderateReview.bind(ReviewModerationController));
router.post('/api/phase9/reviews/:reviewId/vendor-response', authenticateToken, ReviewModerationController.addVendorResponse.bind(ReviewModerationController));
router.get('/api/phase9/reviews/:reviewId/trust-score', authenticateToken, ReviewModerationController.calculateTrustScore.bind(ReviewModerationController));
router.get('/api/phase9/reviews/restaurant/:restaurantId/pending', authenticateToken, ReviewModerationController.getPendingReviews.bind(ReviewModerationController));
router.get('/api/phase9/reviews/restaurant/:restaurantId/verified', authenticateToken, ReviewModerationController.getVerifiedReviews.bind(ReviewModerationController));
router.get('/api/phase9/reviews/restaurant/:restaurantId/stats', authenticateToken, ReviewModerationController.getReviewStats.bind(ReviewModerationController));

// Food Safety
router.post('/api/phase9/safety', authenticateToken, FoodSafetyController.createSafetyRecord.bind(FoodSafetyController));
router.put('/api/phase9/safety/:restaurantId/fssai', authenticateToken, FoodSafetyController.updateFSSAI.bind(FoodSafetyController));
router.post('/api/phase9/safety/:restaurantId/hygiene-inspection', authenticateToken, FoodSafetyController.recordHygieneInspection.bind(FoodSafetyController));
router.put('/api/phase9/safety/:restaurantId/staff-training', authenticateToken, FoodSafetyController.updateStaffTraining.bind(FoodSafetyController));
router.post('/api/phase9/safety/:restaurantId/quality-test', authenticateToken, FoodSafetyController.recordQualityTest.bind(FoodSafetyController));
router.post('/api/phase9/safety/:restaurantId/complaint', authenticateToken, FoodSafetyController.recordComplaint.bind(FoodSafetyController));
router.get('/api/phase9/safety/:restaurantId/compliance-score', authenticateToken, FoodSafetyController.calculateComplianceScore.bind(FoodSafetyController));
router.get('/api/phase9/safety/:restaurantId/details', authenticateToken, FoodSafetyController.getComplianceDetails.bind(FoodSafetyController));
router.get('/api/phase9/safety/:restaurantId/is-compliant', authenticateToken, FoodSafetyController.isCompliant.bind(FoodSafetyController));

/**
 * FEATURE C: Gamification & Engagement
 */

// Badges & Achievements
router.post('/api/phase9/badges/initialize', authenticateToken, BadgeController.initializeUserBadges.bind(BadgeController));
router.post('/api/phase9/badges/check-unlock', authenticateToken, BadgeController.checkAndUnlockBadges.bind(BadgeController));
router.post('/api/phase9/badges/experience', authenticateToken, BadgeController.addExperience.bind(BadgeController));
router.put('/api/phase9/badges/streak', authenticateToken, BadgeController.updateStreaks.bind(BadgeController));
router.get('/api/phase9/badges/user', authenticateToken, BadgeController.getUserBadges.bind(BadgeController));
router.post('/api/phase9/badges/achievement', authenticateToken, BadgeController.recordAchievement.bind(BadgeController));
router.get('/api/phase9/badges/achievement-summary', authenticateToken, BadgeController.getAchievementSummary.bind(BadgeController));

// Leaderboard
router.get('/api/phase9/leaderboard/global', authenticateToken, LeaderboardController.getGlobalLeaderboard.bind(LeaderboardController));
router.get('/api/phase9/leaderboard/city/:city', authenticateToken, LeaderboardController.getCityLeaderboard.bind(LeaderboardController));
router.get('/api/phase9/leaderboard/category/:category', authenticateToken, LeaderboardController.getCategoryLeaderboard.bind(LeaderboardController));
router.get('/api/phase9/leaderboard/user/rank', authenticateToken, LeaderboardController.getUserRank.bind(LeaderboardController));
router.get('/api/phase9/leaderboard/friends', authenticateToken, LeaderboardController.getFriendsLeaderboard.bind(LeaderboardController));
router.get('/api/phase9/leaderboard/seasonal/:season', authenticateToken, LeaderboardController.getSeasonalLeaderboard.bind(LeaderboardController));
router.put('/api/phase9/leaderboard/update-rankings', authenticateToken, LeaderboardController.updateLeaderboardRankings.bind(LeaderboardController));
router.get('/api/phase9/leaderboard/top-performers', authenticateToken, LeaderboardController.getTopPerformers.bind(LeaderboardController));

/**
 * FEATURE D: Dynamic Pricing & Promotions
 */

// Dynamic Pricing
router.post('/api/phase9/pricing/rule', authenticateToken, DynamicPriceController.createPricingRule.bind(DynamicPriceController));
router.post('/api/phase9/pricing/calculate', authenticateToken, DynamicPriceController.calculatePriceModifier.bind(DynamicPriceController));
router.put('/api/phase9/pricing/surge/:restaurantId', authenticateToken, DynamicPriceController.activateSurgePricing.bind(DynamicPriceController));
router.get('/api/phase9/pricing/segment/:restaurantId/:userSegment', authenticateToken, DynamicPriceController.getPricingForSegment.bind(DynamicPriceController));
router.get('/api/phase9/pricing/competitor/:restaurantId/:itemId', authenticateToken, DynamicPriceController.getCompetitorPrices.bind(DynamicPriceController));
router.put('/api/phase9/pricing/analytics/:pricingRuleId', authenticateToken, DynamicPriceController.updatePricingAnalytics.bind(DynamicPriceController));
router.post('/api/phase9/pricing/test', authenticateToken, DynamicPriceController.testPricingRule.bind(DynamicPriceController));
router.get('/api/phase9/pricing/active/:restaurantId', authenticateToken, DynamicPriceController.getActivePricingRules.bind(DynamicPriceController));

// Promotions
router.post('/api/phase9/promotions', authenticateToken, PromotionController.createPromotion.bind(PromotionController));
router.post('/api/phase9/promotions/validate-coupon', authenticateToken, PromotionController.validateCoupon.bind(PromotionController));
router.post('/api/phase9/promotions/apply', authenticateToken, PromotionController.applyPromotion.bind(PromotionController));
router.get('/api/phase9/promotions/restaurant/:restaurantId', authenticateToken, PromotionController.getActivePromotions.bind(PromotionController));
router.get('/api/phase9/promotions/category/:category', authenticateToken, PromotionController.getPromotionsByCategory.bind(PromotionController));
router.get('/api/phase9/promotions/featured', authenticateToken, PromotionController.getFeaturedPromotions.bind(PromotionController));
router.get('/api/phase9/promotions/personalized', authenticateToken, PromotionController.getPersonalizedPromotions.bind(PromotionController));
router.get('/api/phase9/promotions/:promotionId/performance', authenticateToken, PromotionController.trackPromotionPerformance.bind(PromotionController));
router.delete('/api/phase9/promotions/:promotionId', authenticateToken, PromotionController.deactivatePromotion.bind(PromotionController));

/**
 * FEATURE E: Vendor & Supply Chain
 */

// Vendor Management
router.post('/api/phase9/vendors', authenticateToken, VendorController.createVendor.bind(VendorController));
router.put('/api/phase9/vendors/:vendorId/ratings', authenticateToken, VendorController.updateRatings.bind(VendorController));
router.get('/api/phase9/vendors/:vendorId/is-open', authenticateToken, VendorController.isVendorOpen.bind(VendorController));
router.get('/api/phase9/vendors/nearby', authenticateToken, VendorController.getVendorsNearby.bind(VendorController));
router.get('/api/phase9/vendors/search/cuisine/:cuisine', authenticateToken, VendorController.searchByCuisine.bind(VendorController));
router.get('/api/phase9/vendors/search/:searchTerm', authenticateToken, VendorController.searchByName.bind(VendorController));
router.get('/api/phase9/vendors/featured', authenticateToken, VendorController.getFeaturedVendors.bind(VendorController));
router.post('/api/phase9/vendors/:vendorId/delivery-check', authenticateToken, VendorController.canDeliverTo.bind(VendorController));
router.get('/api/phase9/vendors/:vendorId/details', authenticateToken, VendorController.getVendorDetails.bind(VendorController));
router.put('/api/phase9/vendors/:vendorId/compliance', authenticateToken, VendorController.verifyCompliance.bind(VendorController));

// Inventory Management
router.post('/api/phase9/inventory', authenticateToken, InventoryController.createInventoryItem.bind(InventoryController));
router.put('/api/phase9/inventory/:inventoryId/stock', authenticateToken, InventoryController.updateStock.bind(InventoryController));
router.get('/api/phase9/inventory/:inventoryId/reorder-check', authenticateToken, InventoryController.checkReorderNeeded.bind(InventoryController));
router.post('/api/phase9/inventory/:inventoryId/waste', authenticateToken, InventoryController.recordWaste.bind(InventoryController));
router.get('/api/phase9/inventory/restaurant/:restaurantId/low-stock', authenticateToken, InventoryController.getLowStockItems.bind(InventoryController));
router.get('/api/phase9/inventory/restaurant/:restaurantId/value', authenticateToken, InventoryController.getInventoryValue.bind(InventoryController));
router.get('/api/phase9/inventory/:inventoryId/audit-log', authenticateToken, InventoryController.getAuditLog.bind(InventoryController));
router.get('/api/phase9/inventory/restaurant/:restaurantId/expiring', authenticateToken, InventoryController.getExpiringItems.bind(InventoryController));
router.get('/api/phase9/inventory/restaurant/:restaurantId/forecast', authenticateToken, InventoryController.getForecastSummary.bind(InventoryController));
router.get('/api/phase9/inventory/restaurant/:restaurantId/waste-report', authenticateToken, InventoryController.getWasteReport.bind(InventoryController));

/**
 * Route Summary
 * 
 * Feature A (Order Tracking):
 * - OrderTracking: 10 endpoints
 * - DeliveryLocation: 10 endpoints
 * Total: 20 endpoints
 * 
 * Feature B (Quality & Reviews):
 * - Reviews: 10 endpoints
 * - FoodSafety: 9 endpoints
 * Total: 19 endpoints
 * 
 * Feature C (Gamification):
 * - Badges: 7 endpoints
 * - Leaderboard: 8 endpoints
 * Total: 15 endpoints
 * 
 * Feature D (Pricing & Promotions):
 * - DynamicPricing: 8 endpoints
 * - Promotions: 9 endpoints
 * Total: 17 endpoints
 * 
 * Feature E (Vendor & Supply Chain):
 * - Vendors: 10 endpoints
 * - Inventory: 10 endpoints
 * Total: 20 endpoints
 * 
 * TOTAL: 91 endpoints
 */

module.exports = router;
