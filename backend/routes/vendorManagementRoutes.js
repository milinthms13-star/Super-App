/**
 * vendorManagementRoutes.js
 * Routes for vendor management operations
 */

const express = require('express');
const router = express.Router();
const VendorManagementService = require('../services/VendorManagementService');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
const logger = require('../config/logger');

/**
 * POST /api/ecommerce/vendors/onboard
 * Onboard new vendor (public)
 */
router.post('/onboard', async (req, res) => {
  try {
    const result = await VendorManagementService.onboardVendor(req.body);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Error onboarding vendor:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ecommerce/vendors/:vendorId/profile
 * Get vendor profile (protected)
 */
router.get('/:vendorId/profile', verifyToken, async (req, res) => {
  try {
    const result = await VendorManagementService.getVendorProfile(req.params.vendorId);
    res.status(200).json({ success: true, data: result, message: 'Profile retrieved' });
  } catch (error) {
    logger.error('Error fetching vendor profile:', error);
    res.status(404).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/ecommerce/vendors/:vendorId/profile
 * Update vendor profile (protected)
 */
router.put('/:vendorId/profile', verifyToken, async (req, res) => {
  try {
    const result = await VendorManagementService.updateVendorProfile(
      req.params.vendorId,
      req.body
    );
    res.status(200).json({ success: true, data: result, message: 'Profile updated' });
  } catch (error) {
    logger.error('Error updating vendor profile:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ecommerce/vendors/:vendorId/metrics
 * Get vendor performance metrics (protected)
 */
router.get('/:vendorId/metrics', verifyToken, async (req, res) => {
  try {
    const period = req.query.period || '30';
    const result = await VendorManagementService.getVendorMetrics(req.params.vendorId, period);
    res.status(200).json({ success: true, data: result, message: 'Metrics retrieved' });
  } catch (error) {
    logger.error('Error fetching vendor metrics:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ecommerce/vendors/:vendorId/settlement
 * Calculate settlement for vendor (admin-only)
 */
router.get('/:vendorId/settlement', verifyAdmin, async (req, res) => {
  try {
    const period = req.query.period || '30';
    const result = await VendorManagementService.calculateSettlement(req.params.vendorId, period);
    res.status(200).json({ success: true, data: result, message: 'Settlement calculated' });
  } catch (error) {
    logger.error('Error calculating settlement:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ecommerce/vendors/:vendorId/approve
 * Approve vendor application (admin-only)
 */
router.post('/:vendorId/approve', verifyAdmin, async (req, res) => {
  try {
    const result = await VendorManagementService.approveVendor(req.params.vendorId);
    res.status(200).json({ success: true, data: result, message: 'Vendor approved' });
  } catch (error) {
    logger.error('Error approving vendor:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ecommerce/vendors/:vendorId/suspend
 * Suspend vendor account (admin-only)
 */
router.post('/:vendorId/suspend', verifyAdmin, async (req, res) => {
  try {
    const reason = req.body.reason || '';
    const result = await VendorManagementService.suspendVendor(req.params.vendorId, reason);
    res.status(200).json({ success: true, data: result, message: 'Vendor suspended' });
  } catch (error) {
    logger.error('Error suspending vendor:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ecommerce/vendors/:vendorId/dashboard
 * Get vendor dashboard (protected)
 */
router.get('/:vendorId/dashboard', verifyToken, async (req, res) => {
  try {
    const result = await VendorManagementService.getVendorDashboard(req.params.vendorId);
    res.status(200).json({ success: true, data: result, message: 'Dashboard retrieved' });
  } catch (error) {
    logger.error('Error fetching vendor dashboard:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
