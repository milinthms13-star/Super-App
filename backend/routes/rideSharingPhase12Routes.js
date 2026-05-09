/**
 * rideSharingPhase12Routes.js
 * Phase 12 Routes: Payment Splitting, Notifications, Analytics, Scalability
 * 35+ endpoints for advanced features and optimization
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');

// Services
const PaymentSplittingService = require('../services/ridesharing/PaymentSplittingService');
const RealTimeNotificationService = require('../services/ridesharing/RealTimeNotificationService');
const AnalyticsOptimizationService = require('../services/ridesharing/AnalyticsOptimizationService');
const SystemScalabilityService = require('../services/ridesharing/SystemScalabilityService');

// ===================== PAYMENT SPLITTING (9 endpoints) =====================

// Create split configuration
router.post('/payment-splitting/config', async (req, res) => {
  try {
    const result = await PaymentSplittingService.createSplitConfiguration(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Process payment split
router.post('/payment-splitting/process', async (req, res) => {
  try {
    const result = await PaymentSplittingService.processPaymentSplit(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Calculate commission
router.post('/payment-splitting/commission/calculate', async (req, res) => {
  try {
    const result = await PaymentSplittingService.calculateCommission(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get settlement details
router.get('/payment-splitting/settlement/:settlementId', async (req, res) => {
  try {
    const result = await PaymentSplittingService.getSettlementDetails(req.params.settlementId);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user settlements
router.get('/payment-splitting/settlements', auth, async (req, res) => {
  try {
    const result = await PaymentSplittingService.getUserSettlements(req.user.id, req.query);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Process settlement batch
router.post('/payment-splitting/settlement/batch', async (req, res) => {
  try {
    const result = await PaymentSplittingService.processSettlementBatch(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get commission reports
router.get('/payment-splitting/commission/reports', async (req, res) => {
  try {
    const result = await PaymentSplittingService.getCommissionReports(req.query);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get split performance metrics
router.get('/payment-splitting/performance/:splitConfigId', async (req, res) => {
  try {
    const result = await PaymentSplittingService.getSplitPerformanceMetrics(
      req.params.splitConfigId,
      req.query
    );
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reconcile payments and splits
router.post('/payment-splitting/reconcile', async (req, res) => {
  try {
    const result = await PaymentSplittingService.reconcilePaymentsAndSplits(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===================== REAL-TIME NOTIFICATIONS (9 endpoints) =====================

// Send notification
router.post('/notifications/send', auth, async (req, res) => {
  try {
    const result = await RealTimeNotificationService.sendPaymentNotification(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send bulk notifications
router.post('/notifications/bulk', async (req, res) => {
  try {
    const result = await RealTimeNotificationService.sendBulkNotifications(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user notifications
router.get('/notifications', auth, async (req, res) => {
  try {
    const result = await RealTimeNotificationService.getUserNotifications(req.user.id, req.query);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark notification as read
router.post('/notifications/:notificationId/read', auth, async (req, res) => {
  try {
    const result = await RealTimeNotificationService.markNotificationAsRead(
      req.params.notificationId,
      req.user.id
    );
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark all notifications as read
router.post('/notifications/read-all', auth, async (req, res) => {
  try {
    const result = await RealTimeNotificationService.markAllNotificationsAsRead(req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create notification preference
router.post('/notifications/preferences', auth, async (req, res) => {
  try {
    const result = await RealTimeNotificationService.createNotificationPreference(
      req.user.id,
      req.body
    );
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get notification preference
router.get('/notifications/preferences', auth, async (req, res) => {
  try {
    const result = await RealTimeNotificationService.getNotificationPreference(req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get notification statistics
router.get('/notifications/statistics', async (req, res) => {
  try {
    const result = await RealTimeNotificationService.getNotificationStatistics(req.query);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===================== ANALYTICS OPTIMIZATION (6 endpoints) =====================

// Get executive dashboard
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const result = await AnalyticsOptimizationService.getExecutiveDashboardMetrics(req.query);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get real-time payment flow
router.get('/analytics/payment-flow', async (req, res) => {
  try {
    const result = await AnalyticsOptimizationService.getRealTimePaymentFlow(req.query);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get fraud risk heatmap
router.get('/analytics/fraud-heatmap', async (req, res) => {
  try {
    const result = await AnalyticsOptimizationService.getFraudRiskHeatmap(req.query);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get payment method trends
router.get('/analytics/payment-trends', async (req, res) => {
  try {
    const result = await AnalyticsOptimizationService.getPaymentMethodTrends(req.query);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get customer segmentation
router.get('/analytics/customer-segmentation', async (req, res) => {
  try {
    const result = await AnalyticsOptimizationService.getCustomerSegmentation(req.query);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get anomaly detection report
router.get('/analytics/anomalies', async (req, res) => {
  try {
    const result = await AnalyticsOptimizationService.getAnomalyDetectionReport(req.query);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===================== SYSTEM SCALABILITY (9 endpoints) =====================

// Apply rate limiting
router.post('/system/rate-limit', async (req, res) => {
  try {
    const result = await SystemScalabilityService.applyRateLimit(
      req.body.userId,
      req.body.endpoint,
      req.body.limit,
      req.body.windowSeconds
    );
    res.status(result.success ? 200 : 429).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get API performance metrics
router.get('/system/api-performance', async (req, res) => {
  try {
    const result = await SystemScalabilityService.getAPIPerformanceMetrics(req.query);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get database performance metrics
router.get('/system/database-performance', async (req, res) => {
  try {
    const result = await SystemScalabilityService.getDatabasePerformanceMetrics();
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get system resource utilization
router.get('/system/resources', async (req, res) => {
  try {
    const result = await SystemScalabilityService.getSystemResourceUtilization();
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get cache statistics
router.get('/system/cache', async (req, res) => {
  try {
    const result = await SystemScalabilityService.getCacheStatistics();
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Optimize database indexes
router.post('/system/optimize-indexes', async (req, res) => {
  try {
    const result = await SystemScalabilityService.optimizeDatabaseIndexes();
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get request queue info
router.get('/system/queue-info', async (req, res) => {
  try {
    const result = await SystemScalabilityService.getRequestQueueInfo();
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get scalability recommendations
router.get('/system/recommendations', async (req, res) => {
  try {
    const result = await SystemScalabilityService.getScalabilityRecommendations();
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
