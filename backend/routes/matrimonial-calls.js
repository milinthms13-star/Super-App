/**
 * Video/Voice Call Routes
 * Handles call initiation, management, and history
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { ensureMatrimonialProfileContext, checkBlockStatus } = require('../middleware/matrimonialIntegration');
const commFeatures = require('../utils/communicationFeatures');
const videoCallService = require('../services/videoCallService');
const websocketService = require('../services/websocketService');
const MatrimonialProfile = require('../models/MatrimonialProfile');
const logger = require('../utils/logger');

router.use(authenticate, ensureMatrimonialProfileContext);

/**
 * POST /api/matrimonial/calls/voice/initiate
 * Initiate voice call
 */
router.post('/voice/initiate', checkBlockStatus, async (req, res) => {
  try {
    const { toProfileId } = req.body;
    const fromProfileId = req.matrimonialProfileId;

    if (!toProfileId) {
      return res.status(400).json({ 
        success: false,
        error: 'Recipient profile ID required' 
      });
    }

    const callRecord = await commFeatures.initiateVoiceCall(fromProfileId, toProfileId);

    // Notify recipient via WebSocket
    const toProfile = await MatrimonialProfile.findById(toProfileId).select('userId');
    if (toProfile?.userId) {
      websocketService.sendToClient(toProfile.userId.toString(), {
        type: 'incoming_call',
        payload: {
          callId: callRecord.id,
          callType: 'voice',
          fromProfileId,
          roomData: callRecord.roomData
        }
      });
    }

    logger.info(`Voice call initiated: ${callRecord.id}`);

    res.json({
      success: true,
      call: callRecord,
      message: 'Voice call initiated'
    });
  } catch (error) {
    logger.error('Error initiating voice call:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to initiate voice call' 
    });
  }
});

/**
 * POST /api/matrimonial/calls/video/initiate
 * Initiate video call
 */
router.post('/video/initiate', checkBlockStatus, async (req, res) => {
  try {
    const { toProfileId, provider = 'jitsi' } = req.body;
    const fromProfileId = req.matrimonialProfileId;

    if (!toProfileId) {
      return res.status(400).json({ 
        success: false,
        error: 'Recipient profile ID required' 
      });
    }

    const callRecord = await commFeatures.initiateVideoCall(
      fromProfileId,
      toProfileId,
      provider
    );

    // Notify recipient via WebSocket
    const toProfile = await MatrimonialProfile.findById(toProfileId).select('userId');
    if (toProfile?.userId) {
      websocketService.sendToClient(toProfile.userId.toString(), {
        type: 'incoming_call',
        payload: {
          callId: callRecord.id,
          callType: 'video',
          fromProfileId,
          roomData: callRecord.roomData
        }
      });
    }

    logger.info(`Video call initiated: ${callRecord.id}`);

    res.json({
      success: true,
      call: callRecord,
      roomUrl: callRecord.roomData?.roomUrl,
      roomData: callRecord.roomData,
      message: 'Video call initiated'
    });
  } catch (error) {
    logger.error('Error initiating video call:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to initiate video call' 
    });
  }
});

/**
 * POST /api/matrimonial/calls/:callId/accept
 * Accept incoming call
 */
router.post('/:callId/accept', async (req, res) => {
  try {
    const { callId } = req.params;

    const update = await commFeatures.updateCallStatus(callId, 'connected');

    // Notify caller via WebSocket
    websocketService.broadcast({
      type: 'call_accepted',
      payload: {
        callId,
        status: 'connected'
      }
    });

    res.json({
      success: true,
      data: update,
      message: 'Call accepted'
    });
  } catch (error) {
    logger.error('Error accepting call:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to accept call' 
    });
  }
});

/**
 * POST /api/matrimonial/calls/:callId/reject
 * Reject incoming call
 */
router.post('/:callId/reject', async (req, res) => {
  try {
    const { callId } = req.params;
    const { reason } = req.body;

    const update = await commFeatures.updateCallStatus(callId, 'rejected', {
      rejectionReason: reason
    });

    // Notify caller via WebSocket
    websocketService.broadcast({
      type: 'call_rejected',
      payload: {
        callId,
        status: 'rejected',
        reason
      }
    });

    res.json({
      success: true,
      data: update,
      message: 'Call rejected'
    });
  } catch (error) {
    logger.error('Error rejecting call:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to reject call' 
    });
  }
});

/**
 * POST /api/matrimonial/calls/:callId/end
 * End active call
 */
router.post('/:callId/end', async (req, res) => {
  try {
    const { callId } = req.params;
    const { duration, callQuality, startTime } = req.body;

    const update = await commFeatures.updateCallStatus(callId, 'ended', {
      duration,
      callQuality,
      startTime
    });

    // Notify participants via WebSocket
    websocketService.broadcast({
      type: 'call_ended',
      payload: {
        callId,
        status: 'ended',
        duration
      }
    });

    res.json({
      success: true,
      data: update,
      message: 'Call ended'
    });
  } catch (error) {
    logger.error('Error ending call:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to end call' 
    });
  }
});

/**
 * PATCH /api/matrimonial/calls/:callId/status
 * Update call status
 */
router.patch('/:callId/status', async (req, res) => {
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
    logger.error('Error updating call status:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update call status' 
    });
  }
});

/**
 * POST /api/matrimonial/calls/schedule
 * Schedule a call
 */
router.post('/schedule', async (req, res) => {
  try {
    const { toProfileId, scheduledTime, callType = 'video' } = req.body;
    const fromProfileId = req.matrimonialProfileId;

    if (!toProfileId || !scheduledTime) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields' 
      });
    }

    const scheduled = await commFeatures.scheduleCall(
      fromProfileId,
      toProfileId,
      scheduledTime,
      callType
    );

    res.json({
      success: true,
      data: scheduled,
      message: 'Call scheduled successfully'
    });
  } catch (error) {
    logger.error('Error scheduling call:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to schedule call' 
    });
  }
});

/**
 * GET /api/matrimonial/calls/history
 * Get call history
 */
router.get('/history', async (req, res) => {
  try {
    const profileId = req.matrimonialProfileId;
    const limit = parseInt(req.query.limit) || 20;

    const history = await commFeatures.getCallHistory(profileId, limit);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Error fetching call history:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch call history' 
    });
  }
});

/**
 * GET /api/matrimonial/calls/stats
 * Get call statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const profileId = req.matrimonialProfileId;
    const stats = await commFeatures.getCallStatistics(profileId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching call statistics:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch call statistics' 
    });
  }
});

/**
 * POST /api/matrimonial/calls/token
 * Generate access token for Twilio
 */
router.post('/token', async (req, res) => {
  try {
    const { roomName, identity } = req.body;

    if (!roomName || !identity) {
      return res.status(400).json({ 
        success: false,
        error: 'roomName and identity required' 
      });
    }

    const token = videoCallService.generateTwilioAccessToken(identity, roomName);

    res.json({
      success: true,
      token
    });
  } catch (error) {
    logger.error('Error generating token:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate access token' 
    });
  }
});

/**
 * GET /api/matrimonial/calls/config
 * Get call service configuration
 */
router.get('/config', async (req, res) => {
  try {
    const config = videoCallService.isConfigured();

    res.json({
      success: true,
      config: {
        twilioEnabled: config.twilio,
        jitsiEnabled: config.jitsi,
        jitsiDomain: config.jitsi ? videoCallService.jitsiDomain : null
      }
    });
  } catch (error) {
    logger.error('Error fetching call config:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch configuration' 
    });
  }
});

module.exports = router;
