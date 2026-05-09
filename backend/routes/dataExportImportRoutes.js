/**
 * dataExportImportRoutes.js
 * Routes for CSV/Excel export, bulk import, data migration
 */

const express = require('express');
const router = express.Router();
const DataExportImportService = require('../services/DataExportImportService');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// Export products
router.get('/export/products', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { vendorId, category } = req.query;
    const filters = { vendorId, category };
    const result = await DataExportImportService.exportProductsToCSV(filters);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Export orders
router.get('/export/orders', verifyToken, async (req, res) => {
  try {
    const { status, dateFrom } = req.query;
    const filters = { status, dateFrom };
    const result = await DataExportImportService.exportOrdersToCSV(
      req.user.userId,
      filters
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Export user data (GDPR)
router.get('/export/user-data', verifyToken, async (req, res) => {
  try {
    const result = await DataExportImportService.exportUserData(req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Import products
router.post('/import/products', verifyToken, async (req, res) => {
  try {
    const { csvContent } = req.body;
    const result = await DataExportImportService.importProductsFromCSV(
      csvContent,
      req.user.userId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Import orders
router.post('/import/orders', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { csvContent } = req.body;
    const result = await DataExportImportService.importOrdersFromCSV(
      csvContent,
      req.user.userId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Validate import
router.post('/validate-import', verifyToken, async (req, res) => {
  try {
    const { csvContent, type } = req.body;
    const result = await DataExportImportService.validateImportData(csvContent, type);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Schedule export
router.post('/schedule-export', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { type, schedule } = req.body;
    const result = await DataExportImportService.scheduleExport(
      type,
      req.user.userId,
      schedule
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const { type } = req.query;
    const result = await DataExportImportService.getDataHistory(req.user.userId, type);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
