const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { createModerateRateLimiter } = require('../middleware/rateLimiter');
const RideSharingAuthService = require('../services/RideSharingAuthService');

const authLimiter = createModerateRateLimiter(); // Limit to 10 requests per minute

/**
 * POST /api/ridesharing/auth/otp-send
 * Send OTP to phone number
 */
router.post('/otp-send', authLimiter, async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    const result = await RideSharingAuthService.sendOTP(phone);

    res.status(200).json(result);
  } catch (error) {
    console.error('OTP send error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to send OTP',
    });
  }
});

/**
 * POST /api/ridesharing/auth/otp-verify
 * Verify OTP and authenticate user
 */
router.post('/otp-verify', authLimiter, async (req, res) => {
  try {
    const { phone, otp, role = 'rider' } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone and OTP are required',
      });
    }

    // Verify OTP first
    await RideSharingAuthService.verifyOTP(phone, otp);

    // Authenticate user
    const result = await RideSharingAuthService.authenticateWithOTP(phone, role);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(200).json({
      success: true,
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    console.error('OTP verify error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'OTP verification failed',
    });
  }
});

/**
 * POST /api/ridesharing/auth/google
 * Authenticate with Google OAuth token
 */
router.post('/google', authLimiter, async (req, res) => {
  try {
    const { googleToken, role = 'rider' } = req.body;

    if (!googleToken) {
      return res.status(400).json({
        success: false,
        message: 'Google token is required',
      });
    }

    const result = await RideSharingAuthService.authenticateWithGoogle(
      googleToken,
      role
    );

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Google authentication failed',
    });
  }
});

/**
 * POST /api/ridesharing/auth/apple
 * Authenticate with Apple OAuth token
 */
router.post('/apple', authLimiter, async (req, res) => {
  try {
    const { appleToken, role = 'rider' } = req.body;

    if (!appleToken) {
      return res.status(400).json({
        success: false,
        message: 'Apple token is required',
      });
    }

    const result = await RideSharingAuthService.authenticateWithApple(
      appleToken,
      role
    );

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    console.error('Apple auth error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Apple authentication failed',
    });
  }
});

/**
 * POST /api/ridesharing/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    const result = await RideSharingAuthService.refreshAccessToken(
      refreshToken
    );

    // Update refresh token cookie if needed
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      accessToken: result.accessToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: error.message || 'Token refresh failed',
    });
  }
});

/**
 * GET /api/ridesharing/auth/profile
 * Get current user profile
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let profile;

    if (role === 'rider') {
      profile = await RideSharingAuthService.getRiderProfile(userId);
    } else if (role === 'driver') {
      profile = await RideSharingAuthService.getDriverProfile(userId);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid role',
      });
    }

    res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to get profile',
    });
  }
});

/**
 * PUT /api/ridesharing/auth/profile
 * Update user profile
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const profileData = req.body;

    const result = await RideSharingAuthService.updateProfile(
      userId,
      profileData,
      role
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update profile',
    });
  }
});

/**
 * POST /api/ridesharing/auth/logout
 * Logout user
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    const result = await RideSharingAuthService.logout(req.user.id);

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.status(200).json(result);
  } catch (error) {
    console.error('Logout error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Logout failed',
    });
  }
});

module.exports = router;
