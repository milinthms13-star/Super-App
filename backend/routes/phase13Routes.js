/**
 * Phase 13 - Analytics Routes
 * Routes for all analytics, reports, and dashboard endpoints
 */

const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/AnalyticsController');
const Phase13Validations = require('../validations/Phase13Validations');
const { validationResult } = require('express-validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// ==================== PAYMENT ANALYTICS ROUTES ====================

// POST /api/v1/analytics/payment - Generate payment report
router.post(
  '/analytics/payment',
  Phase13Validations.validateReportGeneration(),
  handleValidationErrors,
  AnalyticsController.generatePaymentReport
);

// GET /api/v1/analytics/payment/:analyticsId - Get payment report
router.get(
  '/analytics/payment/:analyticsId',
  AnalyticsController.getPaymentReport
);

// GET /api/v1/analytics/payment/list - List all payment reports
router.get(
  '/analytics/payment-reports/list',
  AnalyticsController.listPaymentReports
);

// ==================== COMMISSION ANALYTICS ROUTES ====================

// POST /api/v1/analytics/commission - Generate commission report
router.post(
  '/analytics/commission',
  Phase13Validations.validateReportGeneration(),
  handleValidationErrors,
  AnalyticsController.generateCommissionReport
);

// GET /api/v1/analytics/commission/:reportId - Get commission report
router.get(
  '/analytics/commission/:reportId',
  AnalyticsController.getCommissionReport
);

// GET /api/v1/analytics/commission/list - List all commission reports
router.get(
  '/analytics/commission-reports/list',
  AnalyticsController.listCommissionReports
);

// ==================== INVOICE ANALYTICS ROUTES ====================

// POST /api/v1/analytics/invoice - Generate invoice report
router.post(
  '/analytics/invoice',
  Phase13Validations.validateReportGeneration(),
  handleValidationErrors,
  AnalyticsController.generateInvoiceReport
);

// GET /api/v1/analytics/invoice/:analyticsId - Get invoice report
router.get(
  '/analytics/invoice/:analyticsId',
  AnalyticsController.getInvoiceReport
);

// ==================== SETTLEMENT ANALYTICS ROUTES ====================

// POST /api/v1/analytics/settlement - Generate settlement report
router.post(
  '/analytics/settlement',
  Phase13Validations.validateReportGeneration(),
  handleValidationErrors,
  AnalyticsController.generateSettlementReport
);

// GET /api/v1/analytics/settlement/:reportId - Get settlement report
router.get(
  '/analytics/settlement/:reportId',
  AnalyticsController.getSettlementReport
);

// ==================== DASHBOARD ROUTES ====================

// GET /api/v1/dashboards/executive - Get executive dashboard
router.get(
  '/dashboards/executive',
  AnalyticsController.getExecutiveDashboard
);

// GET /api/v1/dashboards/restaurant/:restaurantId - Get restaurant dashboard
router.get(
  '/dashboards/restaurant/:restaurantId',
  AnalyticsController.getRestaurantDashboard
);

// GET /api/v1/dashboards/admin - Get admin dashboard
router.get(
  '/dashboards/admin',
  AnalyticsController.getAdminDashboard
);

// ==================== METRICS ROUTES ====================

// GET /api/v1/metrics/payments - Get payment metrics
router.get(
  '/metrics/payments',
  Phase13Validations.validateMetricsQuery(),
  handleValidationErrors,
  AnalyticsController.getPaymentMetrics
);

// GET /api/v1/metrics/commissions - Get commission metrics
router.get(
  '/metrics/commissions',
  Phase13Validations.validateMetricsQuery(),
  handleValidationErrors,
  AnalyticsController.getCommissionMetrics
);

// GET /api/v1/metrics/invoices - Get invoice metrics
router.get(
  '/metrics/invoices',
  Phase13Validations.validateMetricsQuery(),
  handleValidationErrors,
  AnalyticsController.getInvoiceMetrics
);

// GET /api/v1/metrics/settlements - Get settlement metrics
router.get(
  '/metrics/settlements',
  Phase13Validations.validateMetricsQuery(),
  handleValidationErrors,
  AnalyticsController.getSettlementMetrics
);

// GET /api/v1/metrics/business - Get business metrics
router.get(
  '/metrics/business',
  Phase13Validations.validateMetricsQuery(),
  handleValidationErrors,
  AnalyticsController.getBusinessMetrics
);

// GET /api/v1/metrics/trends - Get trend data
router.get(
  '/metrics/trends',
  Phase13Validations.validateTrendQuery(),
  handleValidationErrors,
  AnalyticsController.getTrendData
);

// GET /api/v1/metrics/comparison - Get period comparison
router.get(
  '/metrics/comparison',
  Phase13Validations.validateComparisonQuery(),
  handleValidationErrors,
  AnalyticsController.getPeriodComparison
);

// GET /api/v1/metrics/kpi-snapshot - Get KPI snapshot
router.get(
  '/metrics/kpi-snapshot',
  AnalyticsController.getKPISnapshot
);

// ==================== EXPORT ROUTES ====================

// GET /api/v1/reports/export - Export report
router.get(
  '/reports/export',
  Phase13Validations.validateExport(),
  handleValidationErrors,
  AnalyticsController.exportReport
);

module.exports = router;
