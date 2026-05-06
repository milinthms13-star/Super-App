/**
 * Communication Features Routes
 * POST/GET /api/matrimonial/communication/*
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkBlockStatus } = require('../middleware/matrimonialIntegration');
const commFeatures = require('../utils/communicationFeatures');
const { moderateMessage } = require('../utils/chatModerationService');

/**
 * POST /api/matrimonial/communication/typing
 * Update typing indicator
 */
router.post('/typing', authenticateToken, checkBlockStatus, async (req, res) => {
  try {
    const { toProfileId, isTyping } = req.body;
    const fromProfileId = req.user?.matrimonialProfileId;

    if (!fromProfileId || !toProfileId) {
      return res.status(400).json({ error: 'Missing profile IDs' });
    }

    const indicator = await commFeatures.updateTypingIndicator(
      fromProfileId,
      toProfileId,
      isTyping
    );

    // TODO: Emit WebSocket event to recipient
    res.json({
      success: true,
      data: indicator
    });
  } catch (error) {
    console.error('Error updating typing indicator:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/matrimonial/communication/read-receipt
 * Mark message as read
 */
router.post('/read-receipt', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.body;
    const readerId = req.user?._id;

    if (!messageId) {
      return res.status(400).json({ error: 'Message ID required' });
    }

    const receipt = await commFeatures.markMessageAsRead(messageId, readerId);

    res.json({
      success: true,
      data: receipt
    });
  } catch (error) {
    console.error('Error sending read receipt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/matrimonial/communication/voice-call
 * Initiate voice call
 */
router.post('/voice-call', authenticateToken, checkBlockStatus, async (req, res) => {
  try {
    const { toProfileId } = req.body;
    const fromProfileId = req.user?.matrimonialProfileId;

    if (!toProfileId) {
      return res.status(400).json({ error: 'Recipient profile ID required' });
    }

    const callRecord = await commFeatures.initiateVoiceCall(fromProfileId, toProfileId);

    // TODO: Send WebSocket notification to recipient
    res.json({
      success: true,
      call: callRecord,
      message: 'Voice call initiated. Waiting for response...'
    });
  } catch (error) {
    console.error('Error initiating voice call:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/matrimonial/communication/video-call
 * Initiate video call
 */
router.post('/video-call', authenticateToken, checkBlockStatus, async (req, res) => {
  try {
    const { toProfileId } = req.body;
    const fromProfileId = req.user?.matrimonialProfileId;

    if (!toProfileId) {
      return res.status(400).json({ error: 'Recipient profile ID required' });
    }

    // TODO: Generate Jitsi/Twilio meeting room
    const roomUrl = `${process.env.MEETING_SERVER}/rooms/${require('crypto').randomUUID()}`;

    const callRecord = await commFeatures.initiateVideoCall(
      fromProfileId,
      toProfileId,
      roomUrl
    );

    res.json({
      success: true,
      call: callRecord,
      roomUrl,
      message: 'Video call initiated'
    });
  } catch (error) {
    console.error('Error initiating video call:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/matrimonial/communication/call/:callId/status
 * Update call status
 */
router.patch('/call/:callId/status', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const { status, duration, rejectionReason, callQuality } = req.body;

    const update = await commFeatures.updateCallStatus(callId, status, {
      duration,
      rejectionReason,
      callQuality
    });

    res.json({
      success: true,
      data: update
    });
  } catch (error) {
    console.error('Error updating call status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/matrimonial/communication/schedule-call
 * Schedule a call for later
 */
router.post('/schedule-call', authenticateToken, async (req, res) => {
  try {
    const { toProfileId, scheduledTime, callType } = req.body;
    const fromProfileId = req.user?.matrimonialProfileId;

    if (!toProfileId || !scheduledTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const scheduled = await commFeatures.scheduleCall(
      fromProfileId,
      toProfileId,
      scheduledTime,
      callType || 'video'
    );

    res.json({
      success: true,
      data: scheduled,
      message: 'Call scheduled successfully'
    });
  } catch (error) {
    console.error('Error scheduling call:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/matrimonial/communication/voice-note
 * Upload voice note
 */
router.post('/voice-note', authenticateToken, checkBlockStatus, async (req, res) => {
  try {
    const { toProfileId, audioUrl, duration } = req.body;
    const fromProfileId = req.user?.matrimonialProfileId;

    if (!toProfileId || !audioUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const voiceNote = await commFeatures.saveVoiceNote(
      fromProfileId,
      toProfileId,
      audioUrl,
      duration
    );

    res.json({
      success: true,
      data: voiceNote,
      message: 'Voice note sent'
    });
  } catch (error) {
    console.error('Error saving voice note:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/matrimonial/communication/whatsapp-link
 * Get WhatsApp integration link
 */
router.get('/whatsapp-link', authenticateToken, async (req, res) => {
  try {
    const { phoneNumber, message } = req.query;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number required' });
    }

    const link = await commFeatures.sendWhatsAppMessage(phoneNumber, message || '');

    res.json({
      success: true,
      data: link
    });
  } catch (error) {
    console.error('Error generating WhatsApp link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/matrimonial/communication/features
 * Get available communication features for user
 */
router.get('/features', authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user?.email;
    const features = await commFeatures.getCommunicationFeatures(userEmail);

    res.json({
      success: true,
      features
    });
  } catch (error) {
    console.error('Error fetching communication features:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/matrimonial/communication/call-history
 * Get user's call history
 */
router.get('/call-history', authenticateToken, async (req, res) => {
  try {
    const profileId = req.user?.matrimonialProfileId;
    const limit = parseInt(req.query.limit) || 20;

    const history = await commFeatures.getCallHistory(profileId, limit);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching call history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/matrimonial/communication/call-stats
 * Get call statistics
 */
router.get('/call-stats', authenticateToken, async (req, res) => {
  try {
    const profileId = req.user?.matrimonialProfileId;
    const stats = await commFeatures.getCallStatistics(profileId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching call statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
