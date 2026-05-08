/**
 * Phase 8 Routes - Comprehensive Food Delivery Differentiation Features
 * Aggregates all Phase 8 endpoints across 5 feature categories:
 * 1. Menu Variants & Add-ons
 * 2. Scheduled Delivery
 * 3. Loyalty & Referral Programs
 * 4. AI Recommendations
 * 5. Advanced Analytics
 */

const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');

// Controllers
const MenuVariantController = require('../controllers/MenuVariantController');
const AddOnController = require('../controllers/AddOnController');
const ScheduledDeliveryController = require('../controllers/ScheduledDeliveryController');
const LoyaltyController = require('../controllers/LoyaltyController');
const RecommendationController = require('../controllers/RecommendationController');
const Phase8AnalyticsController = require('../controllers/Phase8AnalyticsController');

// Validations
const {
  createMenuVariantValidation,
  updateMenuVariantValidation,
  getMenuVariantValidation,
  createAddOnValidation,
  getAddOnValidation,
  checkAllergensValidation,
  createScheduledOrderValidation,
  getScheduledOrderValidation,
  modifyScheduledOrderValidation,
  updateScheduledOrderStatusValidation,
  cancelScheduledOrderValidation,
  rateScheduledOrderValidation,
  createLoyaltyAccountValidation,
  getLoyaltyAccountValidation,
  addPointsValidation,
  redeemPointsValidation,
  calculatePointsValidation,
  applyCashbackValidation,
  addReferralValidation,
  getRecommendationsValidation,
  trackEngagementValidation,
  generateDailyAnalyticsValidation,
  getAnalyticsRangeValidation,
  getBusinessInsightsValidation,
  getPeakHoursValidation,
} = require('../validations/Phase8Validations');

/**
 * ========================================
 * FEATURE 1: MENU VARIANTS & ADD-ONS
 * ========================================
 */

// Menu Variants Routes
router.post(
  '/api/v1/food/menu-variants',
  authenticateToken,
  createMenuVariantValidation,
  MenuVariantController.createVariant.bind(MenuVariantController)
);

router.get(
  '/api/v1/food/menu-items/:menuItemId/variants',
  authenticateToken,
  MenuVariantController.getVariantsByItem.bind(MenuVariantController)
);

router.get(
  '/api/v1/food/restaurants/:restaurantId/variants',
  authenticateToken,
  MenuVariantController.getVariantsByRestaurant.bind(MenuVariantController)
);

router.get(
  '/api/v1/food/menu-variants/:variantId',
  authenticateToken,
  getMenuVariantValidation,
  MenuVariantController.getVariant.bind(MenuVariantController)
);

router.put(
  '/api/v1/food/menu-variants/:variantId',
  authenticateToken,
  updateMenuVariantValidation,
  MenuVariantController.updateVariant.bind(MenuVariantController)
);

router.patch(
  '/api/v1/food/menu-variants/:variantId/availability',
  authenticateToken,
  updateMenuVariantValidation,
  MenuVariantController.updateAvailability.bind(MenuVariantController)
);

router.get(
  '/api/v1/food/menu-variants/:variantId/available',
  authenticateToken,
  getMenuVariantValidation,
  MenuVariantController.checkAvailability.bind(MenuVariantController)
);

router.get(
  '/api/v1/food/restaurants/:restaurantId/variants/popular',
  authenticateToken,
  MenuVariantController.getPopularVariants.bind(MenuVariantController)
);

router.delete(
  '/api/v1/food/menu-variants/:variantId',
  authenticateToken,
  getMenuVariantValidation,
  MenuVariantController.deleteVariant.bind(MenuVariantController)
);

// Add-Ons Routes
router.post(
  '/api/v1/food/add-ons',
  authenticateToken,
  createAddOnValidation,
  AddOnController.createAddOn.bind(AddOnController)
);

router.get(
  '/api/v1/food/restaurants/:restaurantId/add-ons',
  authenticateToken,
  AddOnController.getAddOnsByRestaurant.bind(AddOnController)
);

router.get(
  '/api/v1/food/restaurants/:restaurantId/add-ons/category/:category',
  authenticateToken,
  AddOnController.getAddOnsByCategory.bind(AddOnController)
);

router.get(
  '/api/v1/food/add-ons/:addOnId',
  authenticateToken,
  getAddOnValidation,
  AddOnController.getAddOn.bind(AddOnController)
);

router.get(
  '/api/v1/food/menu-items/:menuItemId/compatible-add-ons',
  authenticateToken,
  AddOnController.getCompatibleAddOns.bind(AddOnController)
);

router.put(
  '/api/v1/food/add-ons/:addOnId',
  authenticateToken,
  updateMenuVariantValidation,
  AddOnController.updateAddOn.bind(AddOnController)
);

router.patch(
  '/api/v1/food/add-ons/:addOnId/availability',
  authenticateToken,
  updateMenuVariantValidation,
  AddOnController.updateAvailability.bind(AddOnController)
);

router.get(
  '/api/v1/food/restaurants/:restaurantId/add-ons/popular',
  authenticateToken,
  AddOnController.getPopularAddOns.bind(AddOnController)
);

router.post(
  '/api/v1/food/add-ons/:addOnId/check-allergens',
  authenticateToken,
  checkAllergensValidation,
  AddOnController.checkAllergens.bind(AddOnController)
);

router.delete(
  '/api/v1/food/add-ons/:addOnId',
  authenticateToken,
  getAddOnValidation,
  AddOnController.deleteAddOn.bind(AddOnController)
);

/**
 * ========================================
 * FEATURE 2: SCHEDULED DELIVERY
 * ========================================
 */

router.post(
  '/api/v1/food/scheduled-orders',
  authenticateToken,
  createScheduledOrderValidation,
  ScheduledDeliveryController.createScheduledOrder.bind(ScheduledDeliveryController)
);

router.get(
  '/api/v1/food/users/:userId/scheduled-orders',
  authenticateToken,
  ScheduledDeliveryController.getUserScheduledOrders.bind(ScheduledDeliveryController)
);

router.get(
  '/api/v1/food/restaurants/:restaurantId/upcoming-orders',
  authenticateToken,
  ScheduledDeliveryController.getUpcomingOrders.bind(ScheduledDeliveryController)
);

router.get(
  '/api/v1/food/scheduled-orders/:scheduledOrderId',
  authenticateToken,
  getScheduledOrderValidation,
  ScheduledDeliveryController.getScheduledOrder.bind(ScheduledDeliveryController)
);

router.get(
  '/api/v1/food/scheduled-orders/:scheduledOrderId/can-modify',
  authenticateToken,
  getScheduledOrderValidation,
  ScheduledDeliveryController.checkCanModify.bind(ScheduledDeliveryController)
);

router.patch(
  '/api/v1/food/scheduled-orders/:scheduledOrderId',
  authenticateToken,
  modifyScheduledOrderValidation,
  ScheduledDeliveryController.modifyOrder.bind(ScheduledDeliveryController)
);

router.put(
  '/api/v1/food/scheduled-orders/:scheduledOrderId/status',
  authenticateToken,
  updateScheduledOrderStatusValidation,
  ScheduledDeliveryController.updateStatus.bind(ScheduledDeliveryController)
);

router.delete(
  '/api/v1/food/scheduled-orders/:scheduledOrderId',
  authenticateToken,
  cancelScheduledOrderValidation,
  ScheduledDeliveryController.cancelOrder.bind(ScheduledDeliveryController)
);

router.get(
  '/api/v1/food/scheduled-orders/statistics',
  authenticateToken,
  ScheduledDeliveryController.getStatistics.bind(ScheduledDeliveryController)
);

router.post(
  '/api/v1/food/scheduled-orders/:scheduledOrderId/rate',
  authenticateToken,
  rateScheduledOrderValidation,
  ScheduledDeliveryController.rateOrder.bind(ScheduledDeliveryController)
);

/**
 * ========================================
 * FEATURE 3: LOYALTY & REFERRAL PROGRAMS
 * ========================================
 */

router.post(
  '/api/v1/loyalty/accounts',
  authenticateToken,
  createLoyaltyAccountValidation,
  LoyaltyController.createLoyaltyAccount.bind(LoyaltyController)
);

router.get(
  '/api/v1/loyalty/accounts/:userId',
  authenticateToken,
  getLoyaltyAccountValidation,
  LoyaltyController.getLoyaltyAccount.bind(LoyaltyController)
);

router.post(
  '/api/v1/loyalty/points',
  authenticateToken,
  addPointsValidation,
  LoyaltyController.addPoints.bind(LoyaltyController)
);

router.post(
  '/api/v1/loyalty/redeem',
  authenticateToken,
  redeemPointsValidation,
  LoyaltyController.redeemPoints.bind(LoyaltyController)
);

router.get(
  '/api/v1/loyalty/rewards/:userId',
  authenticateToken,
  getLoyaltyAccountValidation,
  LoyaltyController.getAvailableRewards.bind(LoyaltyController)
);

router.post(
  '/api/v1/loyalty/calculate-points',
  authenticateToken,
  calculatePointsValidation,
  LoyaltyController.calculatePoints.bind(LoyaltyController)
);

router.post(
  '/api/v1/loyalty/cashback',
  authenticateToken,
  applyCashbackValidation,
  LoyaltyController.applyCashback.bind(LoyaltyController)
);

router.get(
  '/api/v1/loyalty/membership/:userId',
  authenticateToken,
  getLoyaltyAccountValidation,
  LoyaltyController.getMembershipStatus.bind(LoyaltyController)
);

router.get(
  '/api/v1/loyalty/transactions/:userId',
  authenticateToken,
  getLoyaltyAccountValidation,
  LoyaltyController.getTransactionHistory.bind(LoyaltyController)
);

router.post(
  '/api/v1/loyalty/referrals',
  authenticateToken,
  addReferralValidation,
  LoyaltyController.addReferral.bind(LoyaltyController)
);

router.get(
  '/api/v1/loyalty/stats/:userId',
  authenticateToken,
  getLoyaltyAccountValidation,
  LoyaltyController.getLoyaltyStats.bind(LoyaltyController)
);

/**
 * ========================================
 * FEATURE 4: AI RECOMMENDATIONS
 * ========================================
 */

router.get(
  '/api/v1/recommendations/personalized/:userId',
  authenticateToken,
  getRecommendationsValidation,
  RecommendationController.getPersonalizedRecommendations.bind(RecommendationController)
);

router.get(
  '/api/v1/recommendations/collaborative/:userId',
  authenticateToken,
  getRecommendationsValidation,
  RecommendationController.getCollaborativeRecommendations.bind(RecommendationController)
);

router.get(
  '/api/v1/recommendations/content/:userId',
  authenticateToken,
  getRecommendationsValidation,
  RecommendationController.getContentBasedRecommendations.bind(RecommendationController)
);

router.get(
  '/api/v1/recommendations/popular',
  authenticateToken,
  getRecommendationsValidation,
  RecommendationController.getPopularRecommendations.bind(RecommendationController)
);

router.get(
  '/api/v1/recommendations/healthy/:userId',
  authenticateToken,
  getRecommendationsValidation,
  RecommendationController.getHealthyRecommendations.bind(RecommendationController)
);

router.get(
  '/api/v1/recommendations/restaurants/:userId',
  authenticateToken,
  getRecommendationsValidation,
  RecommendationController.getRestaurantRecommendations.bind(RecommendationController)
);

router.get(
  '/api/v1/recommendations/time/:userId',
  authenticateToken,
  getRecommendationsValidation,
  RecommendationController.getTimeBasedRecommendations.bind(RecommendationController)
);

router.post(
  '/api/v1/recommendations/track',
  authenticateToken,
  trackEngagementValidation,
  RecommendationController.trackEngagement.bind(RecommendationController)
);

/**
 * ========================================
 * FEATURE 5: ADVANCED ANALYTICS
 * ========================================
 */

router.post(
  '/api/v1/analytics/generate-daily',
  authenticateToken,
  generateDailyAnalyticsValidation,
  Phase8AnalyticsController.generateDailyAnalytics.bind(Phase8AnalyticsController)
);

router.get(
  '/api/v1/analytics/range',
  authenticateToken,
  getAnalyticsRangeValidation,
  Phase8AnalyticsController.getAnalyticsRange.bind(Phase8AnalyticsController)
);

router.get(
  '/api/v1/analytics/insights',
  authenticateToken,
  getBusinessInsightsValidation,
  Phase8AnalyticsController.getBusinessInsights.bind(Phase8AnalyticsController)
);

router.get(
  '/api/v1/analytics/peak-hours',
  authenticateToken,
  getPeakHoursValidation,
  Phase8AnalyticsController.getPeakHoursAnalysis.bind(Phase8AnalyticsController)
);

module.exports = router;
