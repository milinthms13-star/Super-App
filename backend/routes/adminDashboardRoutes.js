/**
 * adminDashboardRoutes.js
 * Routes for admin dashboard and oversight
 */

const express = require('express');
const router = express.Router();
const AdminDashboardService = require('../services/AdminDashboardService');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// Get dashboard overview
router.get('/overview', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const result = await AdminDashboardService.getDashboardOverview(period);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get vendor management data
router.get('/vendors', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const filters = {
      status: req.query.status || null,
      page: req.query.page || 1,
      limit: req.query.limit || 20,
    };
    const result = await AdminDashboardService.getVendorManagement(filters);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get order management data
router.get('/orders', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const filters = {
      status: req.query.status || null,
      page: req.query.page || 1,
      limit: req.query.limit || 20,
    };
    const result = await AdminDashboardService.getOrderManagement(filters);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get financial analytics
router.get('/financials', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const result = await AdminDashboardService.getFinancialAnalytics(period);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get user management data
router.get('/users', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const filters = {
      page: req.query.page || 1,
      limit: req.query.limit || 20,
    };
    const result = await AdminDashboardService.getUserManagement(filters);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get product inventory data
router.get('/inventory', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const filters = {
      lowStockOnly: req.query.lowStockOnly === 'true',
      page: req.query.page || 1,
      limit: req.query.limit || 20,
    };
    const result = await AdminDashboardService.getProductInventory(filters);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get system health
router.get('/health', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await AdminDashboardService.getSystemHealth();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get compliance alerts
router.get('/alerts', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const result = await AdminDashboardService.getComplianceAlerts(limit);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Export dashboard data
router.post('/export', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { reportType, format = 'csv' } = req.body;
    const result = await AdminDashboardService.exportDashboardData(reportType, format);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
