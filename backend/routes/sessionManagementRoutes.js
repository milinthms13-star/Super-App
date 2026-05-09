/**
 * Session Management Routes
 * GET /auth/sessions - Get user's active sessions
 * DELETE /auth/sessions/:sessionId - Logout specific session
 * DELETE /auth/sessions/all - Logout from all devices
 * POST /auth/sessions/:sessionId/verify - Verify suspicious session
 * POST /auth/sessions/:sessionId/trust - Mark session as trusted
 * POST /auth/refresh-token - Refresh access token
 */

const express = require('express');
const router = express.Router();
const SessionManagementService = require('../services/SessionManagementService');
const { verifyToken } = require('../middlewares/auth');

/**
 * GET /auth/sessions
 * Get active sessions for user
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const sessions = await SessionManagementService.getActiveSessions(userId);

    // Mark current session as current
    const sessionId = req.sessionId;
    const sessionsWithCurrent = sessions.map(session => ({
      ...session,
      isCurrentDevice: session.sessionId === sessionId
    }));

    res.status(200).json({
      success: true,
      data: {
        totalActiveSessions: sessionsWithCurrent.length,
        sessions: sessionsWithCurrent
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /auth/sessions/:sessionId
 * Logout specific session
 */
router.delete('/:sessionId', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    const result = await SessionManagementService.logoutSession(sessionId, userId);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /auth/sessions/all
 * Logout from all devices
 */
router.delete('/all', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await SessionManagementService.logoutAllSessions(userId);

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /auth/sessions/:sessionId/verify
 * Verify suspicious session with MFA
 */
router.post('/:sessionId/verify', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    const result = await SessionManagementService.verifySuspiciousDevice(
      sessionId,
      userId
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /auth/sessions/:sessionId/trust
 * Mark session as trusted
 */
router.post('/:sessionId/trust', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    const result = await SessionManagementService.markDeviceAsTrusted(
      sessionId,
      userId
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /auth/refresh-token
 * Refresh access token
 */
router.post('/refresh-token', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    const { sessionId } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token required'
      });
    }

    // Decode refresh token to get userId
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'refresh-secret-key'
    );

    const result = await SessionManagementService.refreshAccessToken(
      sessionId,
      decoded.userId
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message.includes('Refresh token expired')) {
      res.clearCookie('refreshToken');
    }

    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
