const express = require('express');
const router = express.Router();
const otpService = require('../services/otpService');
const authenticateToken = require('../middleware/authenticateToken');

/**
 * OTP Routes
 * Handles OTP generation, sending, verification, and device trust
 */

/**
 * POST /api/messaging/otp/send
 * Generate and send OTP
 * Body: { deviceId, medium: 'sms'|'email', phoneNumber?, email? }
 */
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { deviceId, medium = 'sms', phoneNumber, email } = req.body;
    const userId = req.user.id;

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    // Generate OTP
    const { session, code, message } = await otpService.generateOtp(
      userId,
      deviceId,
      {
        otpType: 'device_verification',
        medium,
        phoneNumber,
        email,
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    );

    // Send OTP via specified medium
    const sendResult = await otpService.sendOtp(session._id);

    res.status(201).json({
      success: true,
      message: sendResult.message,
      sessionId: session._id,
      medium: session.medium,
      expiresIn: 900, // 15 minutes in seconds
      timeUntilExpiration: session.getTimeUntilExpiration()
    });
  } catch (error) {
    console.error('[OTP Send Route] Error:', error.message);
    
    const statusCode = error.message === 'OTP_ALREADY_SENT' ? 429 : 400;
    res.status(statusCode).json({
      error: error.message,
      message: 'Failed to send OTP'
    });
  }
});

/**
 * POST /api/messaging/otp/verify
 * Verify OTP code
 * Body: { deviceId, code: '123456' }
 */
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const { deviceId, code } = req.body;
    const userId = req.user.id;

    if (!deviceId || !code) {
      return res.status(400).json({ error: 'Device ID and OTP code are required' });
    }

    // Verify OTP
    const result = await otpService.verifyOtp(userId, deviceId, code);

    res.status(200).json({
      success: true,
      message: result.message,
      device: {
        _id: result.device._id,
        deviceName: result.device.deviceName,
        isVerified: result.device.isVerified,
        isTrusted: result.device.isTrusted,
        trustedUntil: result.device.trustedUntil
      }
    });
  } catch (error) {
    console.error('[OTP Verify Route] Error:', error.message);
    
    const statusCode = error.message === 'OTP_INVALID' ? 401 : 400;
    res.status(statusCode).json({
      error: error.message,
      message: 'OTP verification failed'
    });
  }
});

/**
 * POST /api/messaging/otp/resend
 * Resend OTP (invalidate old, create new)
 * Body: { deviceId, medium?: 'sms'|'email' }
 */
router.post('/resend', authenticateToken, async (req, res) => {
  try {
    const { deviceId, medium = 'sms' } = req.body;
    const userId = req.user.id;

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    // Resend OTP
    const { session, message } = await otpService.resendOtp(userId, deviceId);

    // Send OTP
    const sendResult = await otpService.sendOtp(session._id);

    res.status(200).json({
      success: true,
      message: sendResult.message,
      sessionId: session._id,
      expiresIn: 900,
      timeUntilExpiration: session.getTimeUntilExpiration()
    });
  } catch (error) {
    console.error('[OTP Resend Route] Error:', error.message);
    res.status(400).json({
      error: error.message,
      message: 'Failed to resend OTP'
    });
  }
});

/**
 * GET /api/messaging/otp/status
 * Check OTP status (validity, attempts remaining, time left)
 * Query: { deviceId }
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.query;
    const userId = req.user.id;

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    const status = await otpService.getOtpStatus(userId, deviceId);

    res.status(200).json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('[OTP Status Route] Error:', error.message);
    res.status(400).json({
      error: error.message,
      message: 'Failed to get OTP status'
    });
  }
});

/**
 * DELETE /api/messaging/otp/cancel
 * Cancel OTP verification (user initiated)
 * Body: { deviceId }
 */
router.delete('/cancel', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.body;
    const userId = req.user.id;

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    const cancelled = await otpService.cancelOtp(userId, deviceId);

    if (!cancelled) {
      return res.status(404).json({
        error: 'NO_ACTIVE_OTP',
        message: 'No active OTP found to cancel'
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP verification cancelled'
    });
  } catch (error) {
    console.error('[OTP Cancel Route] Error:', error.message);
    res.status(400).json({
      error: error.message,
      message: 'Failed to cancel OTP'
    });
  }
});

/**
 * GET /api/messaging/otp/is-trusted
 * Check if device is currently trusted
 * Query: { deviceId }
 */
router.get('/is-trusted', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.query;
    const userId = req.user.id;

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    const isTrusted = await otpService.isDeviceTrusted(userId, deviceId);

    res.status(200).json({
      success: true,
      isTrusted
    });
  } catch (error) {
    console.error('[OTP Is-Trusted Route] Error:', error.message);
    res.status(400).json({
      error: error.message,
      message: 'Failed to check device trust status'
    });
  }
});

/**
 * POST /api/messaging/otp/revoke-trust
 * Revoke device trust (force re-verification)
 * Body: { deviceId }
 */
router.post('/revoke-trust', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    await otpService.revokeTrust(deviceId);

    res.status(200).json({
      success: true,
      message: 'Device trust revoked. Re-verification required.'
    });
  } catch (error) {
    console.error('[OTP Revoke-Trust Route] Error:', error.message);
    res.status(400).json({
      error: error.message,
      message: 'Failed to revoke device trust'
    });
  }
});

/**
 * GET /api/messaging/otp/stats
 * Get OTP statistics (admin only)
 * Query: { hours: 24 }
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // In production, add admin check here
    // if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const { hours = 24 } = req.query;
    const stats = await otpService.getOtpStats({ hours: parseInt(hours) });

    res.status(200).json({
      success: true,
      ...stats
    });
  } catch (error) {
    console.error('[OTP Stats Route] Error:', error.message);
    res.status(400).json({
      error: error.message,
      message: 'Failed to get OTP statistics'
    });
  }
});

module.exports = router;
