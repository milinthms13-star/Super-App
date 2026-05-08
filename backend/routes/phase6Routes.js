const express = require('express');
const AnalyticsController = require('../controllers/AnalyticsController');
const ReportController = require('../controllers/ReportController');
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  analyticsQueryValidation,
  createReportValidation,
  updateReportValidation,
  generateReportValidation,
  sendReportValidation,
  reviewFraudCaseValidation,
  exportAnalyticsValidation,
  trendingMetricsValidation,
  getReportsValidation,
  fraudRiskQueryValidation,
} = require('../middleware/Phase6Validations');

const router = express.Router();

// Analytics Endpoints - Public (admin only)
router.get(
  '/analytics/payment/dashboard',
  authenticateToken,
  analyticsQueryValidation,
  AnalyticsController.getPaymentDashboard
);

router.get(
  '/analytics/wallet/dashboard',
  authenticateToken,
  analyticsQueryValidation,
  AnalyticsController.getWalletDashboard
);

router.get(
  '/analytics/refund/dashboard',
  authenticateToken,
  analyticsQueryValidation,
  AnalyticsController.getRefundDashboard
);

router.get(
  '/analytics/fraud/dashboard',
  authenticateToken,
  fraudRiskQueryValidation,
  AnalyticsController.getFraudDashboard
);

router.get(
  '/analytics/executive-summary',
  authenticateToken,
  analyticsQueryValidation,
  AnalyticsController.getExecutiveSummary
);

router.get(
  '/analytics/trending',
  authenticateToken,
  trendingMetricsValidation,
  AnalyticsController.getTrendingMetrics
);

router.get(
  '/analytics/export',
  authenticateToken,
  exportAnalyticsValidation,
  AnalyticsController.exportAnalytics
);

// Fraud Cases Endpoints
router.get(
  '/fraud/cases',
  authenticateToken,
  fraudRiskQueryValidation,
  AnalyticsController.getFraudCases
);

router.post(
  '/fraud/cases/:caseId/review',
  authenticateToken,
  reviewFraudCaseValidation,
  AnalyticsController.reviewFraudCase
);

// Custom Report Endpoints
router.post(
  '/reports',
  authenticateToken,
  createReportValidation,
  ReportController.createReport
);

router.get(
  '/reports',
  authenticateToken,
  getReportsValidation,
  ReportController.getReports
);

router.get(
  '/reports/templates',
  authenticateToken,
  ReportController.getTemplates
);

router.get(
  '/reports/:reportId',
  authenticateToken,
  ReportController.getReportById
);

router.put(
  '/reports/:reportId',
  authenticateToken,
  updateReportValidation,
  ReportController.updateReport
);

router.post(
  '/reports/:reportId/generate',
  authenticateToken,
  generateReportValidation,
  ReportController.generateReport
);

router.get(
  '/reports/:reportId/data',
  authenticateToken,
  ReportController.getReportData
);

router.post(
  '/reports/:reportId/send',
  authenticateToken,
  sendReportValidation,
  ReportController.sendReport
);

router.delete(
  '/reports/:reportId',
  authenticateToken,
  ReportController.deleteReport
);

module.exports = router;
