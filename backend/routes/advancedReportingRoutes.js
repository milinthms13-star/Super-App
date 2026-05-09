/**
 * advancedReportingRoutes.js
 * Routes for custom reports, PDF generation, scheduling
 */

const express = require('express');
const router = express.Router();
const AdvancedReportingService = require('../services/AdvancedReportingService');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// Generate sales report
router.post('/sales', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'daily' } = req.body;
    const result = await AdvancedReportingService.generateSalesReport(
      startDate,
      endDate,
      groupBy
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Generate vendor performance report
router.post('/vendor-performance', verifyToken, async (req, res) => {
  try {
    const { vendorId, startDate, endDate } = req.body;
    const result = await AdvancedReportingService.generateVendorPerformanceReport(
      vendorId || req.user.userId,
      startDate,
      endDate
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Generate customer analytics report
router.post('/customer-analytics', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const result = await AdvancedReportingService.generateCustomerAnalyticsReport(
      startDate,
      endDate
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Generate PDF report
router.get('/:reportId/pdf', verifyToken, async (req, res) => {
  try {
    const result = await AdvancedReportingService.generatePDFReport(req.params.reportId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Export report as CSV
router.get('/:reportId/csv', verifyToken, async (req, res) => {
  try {
    const result = await AdvancedReportingService.exportReportAsCSV(req.params.reportId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Schedule report
router.post('/schedule', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { reportType, schedule, recipients } = req.body;
    const result = await AdvancedReportingService.scheduleReportGeneration(
      reportType,
      schedule,
      recipients
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get report history
router.get('/', verifyToken, async (req, res) => {
  try {
    const { type, limit } = req.query;
    const result = await AdvancedReportingService.getReportHistory(type, parseInt(limit) || 50);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Create custom report
router.post('/custom', verifyToken, async (req, res) => {
  try {
    const { name, metrics, filters } = req.body;
    const result = await AdvancedReportingService.createCustomReport(name, metrics, filters);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Email report
router.post('/:reportId/email', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await AdvancedReportingService.emailReport(
      req.params.reportId,
      req.body.recipients
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
