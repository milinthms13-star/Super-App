/**
 * disputeResolutionRoutes.js
 * Routes for dispute handling and resolution
 */

const express = require('express');
const router = express.Router();
const DisputeResolutionService = require('../services/DisputeResolutionService');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// Create dispute
router.post('/', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.body;
    const result = await DisputeResolutionService.createDispute(
      req.user.userId,
      orderId,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get dispute details
router.get('/:disputeId', verifyToken, async (req, res) => {
  try {
    const { disputeId } = req.params;
    const result = await DisputeResolutionService.getDisputeDetails(
      disputeId,
      req.user.userId
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Submit seller response
router.post('/:disputeId/seller-response', verifyToken, async (req, res) => {
  try {
    const { disputeId } = req.params;
    const result = await DisputeResolutionService.submitSellerResponse(
      disputeId,
      req.user.userId,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Submit buyer reply
router.post('/:disputeId/buyer-reply', verifyToken, async (req, res) => {
  try {
    const { disputeId } = req.params;
    const result = await DisputeResolutionService.submitBuyerReply(
      disputeId,
      req.user.userId,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Auto-resolve dispute
router.post('/:disputeId/auto-resolve', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { disputeId } = req.params;
    const result = await DisputeResolutionService.autoResolveDispute(disputeId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Escalate dispute
router.post('/:disputeId/escalate', verifyToken, async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { reason } = req.body;
    const result = await DisputeResolutionService.escalateDispute(disputeId, reason);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Admin decision
router.post('/:disputeId/admin-decision', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { disputeId } = req.params;
    const result = await DisputeResolutionService.adminDecision(
      disputeId,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get user disputes
router.get('/user/disputes', verifyToken, async (req, res) => {
  try {
    const { role = 'buyer' } = req.query;
    const result = await DisputeResolutionService.getUserDisputes(
      req.user.userId,
      role
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get open disputes (admin)
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const result = await DisputeResolutionService.getOpenDisputes(limit);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
