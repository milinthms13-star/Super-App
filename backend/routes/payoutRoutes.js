const express = require('express');
const router = express.Router();
const PayoutManagementService = require('../services/PayoutManagementService');
const { authenticateToken, isAdmin } = require('../middleware/auth');

/**
 * SELLER ROUTES
 */

/**
 * @route   GET /api/payouts/my-payouts
 * @desc    Get seller's payout history
 * @access  Private (Seller)
 */
router.get('/my-payouts', authenticateToken, async (req, res) => {
  try {
    const result = await PayoutManagementService.getSellerPayouts(req.user.id, req.query);
    res.json(result);
  } catch (error) {
    console.error('Get payouts error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/payouts/:payoutId
 * @desc    Get payout details
 * @access  Private (Seller)
 */
router.get('/:payoutId', authenticateToken, async (req, res) => {
  try {
    const result = await PayoutManagementService.getPayoutDetails(
      req.params.payoutId,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    console.error('Get payout details error:', error);
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/payouts/summary
 * @desc    Get seller payout summary
 * @access  Private (Seller)
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const summary = await PayoutManagementService.getPayoutSummary(req.user.id);
    res.json({ success: true, summary });
  } catch (error) {
    console.error('Get payout summary error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/payouts/request
 * @desc    Request payout
 * @access  Private (Seller)
 */
router.post('/request', authenticateToken, async (req, res) => {
  try {
    const result = await PayoutManagementService.requestPayout(req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Request payout error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/payouts/:payoutId/invoice
 * @desc    Generate payout invoice
 * @access  Private (Seller)
 */
router.get('/:payoutId/invoice', authenticateToken, async (req, res) => {
  try {
    const invoice = await PayoutManagementService.generatePayoutInvoice(
      req.params.payoutId,
      req.user.id
    );
    res.json({ success: true, invoice });
  } catch (error) {
    console.error('Generate invoice error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * ADMIN ROUTES
 */

/**
 * @route   GET /api/payouts/admin/pending
 * @desc    Get pending payout requests
 * @access  Private (Admin)
 */
router.get('/admin/pending', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await PayoutManagementService.getPendingPayoutRequests(req.query);
    res.json(result);
  } catch (error) {
    console.error('Get pending payouts error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/payouts/admin/:payoutId/approve
 * @desc    Approve payout
 * @access  Private (Admin)
 */
router.post('/admin/:payoutId/approve', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { approvalNotes } = req.body;
    const result = await PayoutManagementService.approvePayout(
      req.params.payoutId,
      req.user.id,
      approvalNotes
    );
    res.json(result);
  } catch (error) {
    console.error('Approve payout error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/payouts/admin/:payoutId/reject
 * @desc    Reject payout
 * @access  Private (Admin)
 */
router.post('/admin/:payoutId/reject', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const result = await PayoutManagementService.rejectPayout(
      req.params.payoutId,
      req.user.id,
      rejectionReason
    );
    res.json(result);
  } catch (error) {
    console.error('Reject payout error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/payouts/admin/:payoutId/complete
 * @desc    Mark payout as completed
 * @access  Private (Admin)
 */
router.post('/admin/:payoutId/complete', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { paymentDetails } = req.body;
    const result = await PayoutManagementService.completePayout(
      req.params.payoutId,
      req.user.id,
      paymentDetails
    );
    res.json(result);
  } catch (error) {
    console.error('Complete payout error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/payouts/admin/statistics
 * @desc    Get payout statistics
 * @access  Private (Admin)
 */
router.get('/admin/statistics', authenticateToken, isAdmin, async (req, res) => {
  try {
    const stats = await PayoutManagementService.getPayoutStatistics(req.query);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
