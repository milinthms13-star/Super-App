/**
 * rideSharingPhase15Routes.js
 * Purpose: Consolidated REST API for Phase 15 features
 * Endpoints: 50+ across 5 domains
 * Phase 15 - Advanced Analytics, ML v2, Marketplace, Notifications, Mobile Optimization
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');

// Import services
const AdvancedAnalyticsService = require('../../services/ridesharing/AdvancedAnalyticsService');
const MachineLearningV2Service = require('../../services/ridesharing/MachineLearningV2Service');
const MarketplaceIntegrationService = require('../../services/ridesharing/MarketplaceIntegrationService');
const NotificationsService = require('../../services/ridesharing/NotificationsService');
const MobileOptimizationService = require('../../services/ridesharing/MobileOptimizationService');

// ===== ADVANCED ANALYTICS ENDPOINTS (8 endpoints) =====

/**
 * GET /api/ridesharing/phase15/analytics/executive-dashboard
 * Get executive dashboard with KPIs
 */
router.get('/analytics/executive-dashboard', auth, async (req, res) => {
  try {
    const { dateRange } = req.query;
    const result = await AdvancedAnalyticsService.getExecutiveDashboard(dateRange);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase15/analytics/financial-report
 * Get detailed financial report
 */
router.get('/analytics/financial-report', auth, async (req, res) => {
  try {
    const { period } = req.query;
    const result = await AdvancedAnalyticsService.getFinancialReport(period);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase15/analytics/user-segmentation
 * Get user segmentation analysis
 */
router.get('/analytics/user-segmentation', auth, async (req, res) => {
  try {
    const result = await AdvancedAnalyticsService.getUserSegmentation();
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase15/analytics/driver-leaderboard
 * Get driver performance leaderboard
 */
router.get('/analytics/driver-leaderboard', auth, async (req, res) => {
  try {
    const { metric, limit } = req.query;
    const result = await AdvancedAnalyticsService.getDriverLeaderboard(metric, parseInt(limit) || 50);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase15/analytics/geographic-analysis
 * Get geographic performance analysis
 */
router.get('/analytics/geographic-analysis', auth, async (req, res) => {
  try {
    const { period } = req.query;
    const result = await AdvancedAnalyticsService.getGeographicAnalysis(period);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase15/analytics/custom-report
 * Generate custom report with filters
 */
router.post('/analytics/custom-report', auth, async (req, res) => {
  try {
    const result = await AdvancedAnalyticsService.getCustomReport(req.body);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase15/analytics/kpi-dashboard
 * Get KPI tracking dashboard
 */
router.get('/analytics/kpi-dashboard', auth, async (req, res) => {
  try {
    const result = await AdvancedAnalyticsService.getKPIDashboard();
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase15/analytics/export-report
 * Export report in CSV format
 */
router.post('/analytics/export-report', auth, async (req, res) => {
  try {
    const { reportType, period } = req.body;
    const result = await AdvancedAnalyticsService.exportReport(reportType, period);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== MACHINE LEARNING V2 ENDPOINTS (6 endpoints) =====

/**
 * GET /api/ridesharing/phase15/ml/detect-anomalies
 * Detect anomalies in real-time data
 */
router.get('/ml/detect-anomalies', auth, async (req, res) => {
  try {
    const { dataType } = req.query;
    const result = await MachineLearningV2Service.detectAnomalies(dataType);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase15/ml/forecast-demand-v2
 * Advanced demand forecasting with ML
 */
router.post('/ml/forecast-demand-v2', auth, async (req, res) => {
  try {
    const { location, daysAhead } = req.body;
    const result = await MachineLearningV2Service.forecastDemandV2(location, daysAhead);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase15/ml/identify-patterns
 * Identify behavioral patterns
 */
router.get('/ml/identify-patterns', auth, async (req, res) => {
  try {
    const { dataType } = req.query;
    const result = await MachineLearningV2Service.identifyPatterns(dataType);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase15/ml/churn-prediction-v2
 * Improved churn prediction with feature importance
 */
router.get('/ml/churn-prediction-v2', auth, async (req, res) => {
  try {
    const { userId } = req.query;
    const result = await MachineLearningV2Service.predictChurnV2(userId);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase15/ml/detect-fraud
 * Fraud detection and prevention
 */
router.get('/ml/detect-fraud', auth, async (req, res) => {
  try {
    const result = await MachineLearningV2Service.detectFraud();
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase15/ml/predictive-maintenance
 * Predictive maintenance alerts for drivers
 */
router.get('/ml/predictive-maintenance', auth, async (req, res) => {
  try {
    const result = await MachineLearningV2Service.predictiveMaintenanceAlerts();
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase15/ml/learn-price-elasticity
 * Learn price elasticity from historical data
 */
router.post('/ml/learn-price-elasticity', auth, async (req, res) => {
  try {
    const { location } = req.body;
    const result = await MachineLearningV2Service.learnPriceElasticity(location);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== MARKETPLACE INTEGRATION ENDPOINTS (8 endpoints) =====

/**
 * POST /api/ridesharing/phase15/marketplace/register-vendor
 * Register new marketplace vendor
 */
router.post('/marketplace/register-vendor', async (req, res) => {
  try {
    const result = await MarketplaceIntegrationService.registerVendor(req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase15/marketplace/submit-review
 * Submit review for vendor/service
 */
router.post('/marketplace/submit-review', auth, async (req, res) => {
  try {
    const result = await MarketplaceIntegrationService.submitReview(req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase15/marketplace/vendor-profile/:vendorId
 * Get vendor profile with metrics
 */
router.get('/marketplace/vendor-profile/:vendorId', auth, async (req, res) => {
  try {
    const result = await MarketplaceIntegrationService.getVendorProfile(req.params.vendorId);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase15/marketplace/vendor-reviews/:vendorId
 * Get vendor reviews with pagination
 */
router.get('/marketplace/vendor-reviews/:vendorId', async (req, res) => {
  try {
    const { page, limit, sortBy } = req.query;
    const result = await MarketplaceIntegrationService.getVendorReviews(
      req.params.vendorId,
      parseInt(page) || 1,
      parseInt(limit) || 10,
      sortBy
    );
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase15/marketplace/vendor-analytics/:vendorId
 * Get vendor analytics dashboard
 */
router.get('/marketplace/vendor-analytics/:vendorId', auth, async (req, res) => {
  try {
    const { period } = req.query;
    const result = await MarketplaceIntegrationService.getVendorAnalytics(req.params.vendorId, period);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase15/marketplace/leaderboard
 * Get marketplace leaderboard
 */
router.get('/marketplace/leaderboard', async (req, res) => {
  try {
    const { metric, limit } = req.query;
    const result = await MarketplaceIntegrationService.getMarketplaceLeaderboard(metric, parseInt(limit) || 20);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase15/marketplace/vendor-response
 * Submit vendor response to review
 */
router.post('/marketplace/vendor-response', auth, async (req, res) => {
  try {
    const { reviewId, vendorId, response } = req.body;
    const result = await MarketplaceIntegrationService.submitVendorResponse(reviewId, vendorId, response);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase15/marketplace/vendor-settlement/:vendorId
 * Get vendor settlement details
 */
router.get('/marketplace/vendor-settlement/:vendorId', auth, async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await MarketplaceIntegrationService.getVendorSettlement(
      req.params.vendorId,
      parseInt(page) || 1,
      parseInt(limit) || 10
    );
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== NOTIFICATIONS ENDPOINTS (9 endpoints) =====

/**
 * POST /api/ridesharing/phase15/notifications/send
 * Send notification
 */
router.post('/notifications/send', auth, async (req, res) => {
  try {
    const result = await NotificationsService.sendNotification(req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase15/notifications/list
 * Get user notifications
 */
router.get('/notifications/list', auth, async (req, res) => {
  try {
    const { page, limit, filter } = req.query;
    const result = await NotificationsService.getUserNotifications(
      req.user.id,
      parseInt(page) || 1,
      parseInt(limit) || 20,
      filter
    );
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/ridesharing/phase15/notifications/mark-read/:notificationId
 * Mark notification as read
 */
router.put('/notifications/mark-read/:notificationId', auth, async (req, res) => {
  try {
    const result = await NotificationsService.markAsRead(req.params.notificationId, req.user.id);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/ridesharing/phase15/notifications/mark-all-read
 * Mark all notifications as read
 */
router.put('/notifications/mark-all-read', auth, async (req, res) => {
  try {
    const result = await NotificationsService.markAllAsRead(req.user.id);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase15/notifications/send-message
 * Send in-app message
 */
router.post('/notifications/send-message', auth, async (req, res) => {
  try {
    const messageData = { ...req.body, fromUserId: req.user.id };
    const result = await NotificationsService.sendMessage(messageData);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase15/notifications/conversation/:conversationId
 * Get conversation thread
 */
router.get('/notifications/conversation/:conversationId', auth, async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await NotificationsService.getConversation(
      req.params.conversationId,
      req.user.id,
      parseInt(page) || 1,
      parseInt(limit) || 50
    );
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase15/notifications/conversations
 * Get conversations list
 */
router.get('/notifications/conversations', auth, async (req, res) => {
  try {
    const { limit } = req.query;
    const result = await NotificationsService.getConversationsList(req.user.id, parseInt(limit) || 20);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase15/notifications/bulk-send
 * Send bulk notifications
 */
router.post('/notifications/bulk-send', auth, async (req, res) => {
  try {
    const result = await NotificationsService.sendBulkNotification(req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase15/notifications/delivery-status/:notificationId
 * Get notification delivery status
 */
router.get('/notifications/delivery-status/:notificationId', auth, async (req, res) => {
  try {
    const result = await NotificationsService.getDeliveryStatus(req.params.notificationId);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase15/notifications/preferences
 * Get notification preferences
 */
router.get('/notifications/preferences', auth, async (req, res) => {
  try {
    const result = await NotificationsService.getNotificationPreferences(req.user.id);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/ridesharing/phase15/notifications/preferences
 * Update notification preferences
 */
router.put('/notifications/preferences', auth, async (req, res) => {
  try {
    const result = await NotificationsService.updateNotificationPreferences(req.user.id, req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== MOBILE OPTIMIZATION ENDPOINTS (8 endpoints) =====

/**
 * GET /api/ridesharing/phase15/mobile/app-config
 * Get mobile app configuration
 */
router.get('/mobile/app-config', auth, async (req, res) => {
  try {
    const result = await MobileOptimizationService.getMobileAppConfig(req.user.id, req.body);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase15/mobile/offline-data
 * Get offline-ready data
 */
router.get('/mobile/offline-data', auth, async (req, res) => {
  try {
    const result = await MobileOptimizationService.getOfflineData(req.user.id);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase15/mobile/sync-changes
 * Sync offline changes
 */
router.post('/mobile/sync-changes', auth, async (req, res) => {
  try {
    const result = await MobileOptimizationService.syncOfflineChanges(req.user.id, req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase15/mobile/ride-data/:rideId
 * Get optimized ride data
 */
router.get('/mobile/ride-data/:rideId', auth, async (req, res) => {
  try {
    const { optimizationLevel } = req.query;
    const result = await MobileOptimizationService.getOptimizedRideData(req.params.rideId, optimizationLevel);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase15/mobile/analytics
 * Get mobile-optimized analytics
 */
router.get('/mobile/analytics', auth, async (req, res) => {
  try {
    const result = await MobileOptimizationService.getMobileAnalytics(req.user.id);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase15/mobile/register-device-token
 * Register device for push notifications
 */
router.post('/mobile/register-device-token', auth, async (req, res) => {
  try {
    const result = await MobileOptimizationService.registerDeviceToken(
      req.user.id,
      req.body.deviceToken,
      req.body.deviceInfo
    );
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase15/mobile/version-info
 * Get app version and feature flags
 */
router.get('/mobile/version-info', async (req, res) => {
  try {
    const { currentVersion, deviceType } = req.query;
    const result = await MobileOptimizationService.getAppVersionInfo(currentVersion, deviceType);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase15/mobile/optimized-images
 * Get bandwidth-optimized images
 */
router.post('/mobile/optimized-images', async (req, res) => {
  try {
    const { imageIds, screenSize } = req.body;
    const result = await MobileOptimizationService.getOptimizedImages(imageIds, screenSize);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase15/mobile/log-session
 * Log mobile app session
 */
router.post('/mobile/log-session', auth, async (req, res) => {
  try {
    const result = await MobileOptimizationService.logMobileSession(req.user.id, req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
