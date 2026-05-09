/**
 * realtimeCollaborationRoutes.js
 * Routes for real-time updates, presence tracking, collaborative editing
 */

const express = require('express');
const router = express.Router();
const RealtimeCollaborationService = require('../services/RealtimeCollaborationService');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// User presence
router.post('/presence/:status', verifyToken, async (req, res) => {
  try {
    const result = await RealtimeCollaborationService.setUserPresence(
      req.user.userId,
      req.params.status
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/active-users', async (req, res) => {
  try {
    const result = await RealtimeCollaborationService.getActiveUsers();
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Collaborative editing
router.post('/sessions', verifyToken, async (req, res) => {
  try {
    const result = await RealtimeCollaborationService.createEditingSession(
      req.body.productId,
      req.user.userId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/sessions/:sessionId/join', verifyToken, async (req, res) => {
  try {
    const result = await RealtimeCollaborationService.joinEditingSession(
      req.params.sessionId,
      req.user.userId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/sessions/:sessionId/edit', verifyToken, async (req, res) => {
  try {
    const { field, oldValue, newValue } = req.body;
    const result = await RealtimeCollaborationService.recordEdit(
      req.params.sessionId,
      req.user.userId,
      field,
      oldValue,
      newValue
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/sessions/:sessionId/end', verifyToken, async (req, res) => {
  try {
    const result = await RealtimeCollaborationService.endEditingSession(
      req.params.sessionId,
      req.user.userId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/sessions/:sessionId/history', verifyToken, async (req, res) => {
  try {
    const result = await RealtimeCollaborationService.getSessionChangeHistory(
      req.params.sessionId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/sessions/:sessionId/typing', verifyToken, async (req, res) => {
  try {
    const result = await RealtimeCollaborationService.notifyTyping(
      req.params.sessionId,
      req.user.userId,
      req.body.field
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
