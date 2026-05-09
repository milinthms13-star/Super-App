/**
 * OTP Authentication Routes
 * POST /auth/otp/request-code - Request OTP via SMS/WhatsApp
 * POST /auth/otp/verify-code-login - Verify OTP and login
 * POST /auth/otp/resend-code - Resend OTP
 * GET /auth/otp/status - Get OTP session status
 * DELETE /auth/otp/cancel - Cancel OTP session
 */

const express = require('express');
const router = express.Router();
const OTPAuthService = require('../services/OTPAuthService');
const { validatePhone } = require('../middlewares/validation');

/**
 * POST /auth/otp/request-code
 * Request OTP via SMS or WhatsApp
 */
router.post('/request-code', validatePhone, async (req, res) => {
  try {
    const { phoneNumber, medium = 'sms', deviceInfo = {} } = req.body;

    const result = await OTPAuthService.requestOTP(phoneNumber, medium, deviceInfo);

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
 * POST /auth/otp/verify-code-login
 * Verify OTP and login user
 */
router.post('/verify-code-login', async (req, res) => {
  try {
    const { sessionId, otpCode, deviceInfo = {} } = req.body;

    if (!sessionId || !otpCode) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and otpCode required'
      });
    }

    const result = await OTPAuthService.verifyOTPAndLogin(
      sessionId,
      otpCode,
      deviceInfo
    );

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.status(200).json({
      success: true,
      data: {
        ...result,
        refreshToken: undefined // Don't send in response
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
 * POST /auth/otp/resend-code
 * Resend OTP with rate limiting
 */
router.post('/resend-code', async (req, res) => {
  try {
    const { sessionId, medium = 'sms' } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId required'
      });
    }

    const result = await OTPAuthService.resendOTP(sessionId, medium);

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
 * GET /auth/otp/status
 * Get OTP session status
 */
router.get('/status', async (req, res) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId required'
      });
    }

    const status = await OTPAuthService.getSessionStatus(sessionId);

    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /auth/otp/cancel
 * Cancel OTP session
 */
router.delete('/cancel', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId required'
      });
    }

    const result = await OTPAuthService.cancelSession(sessionId);

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

module.exports = router;
