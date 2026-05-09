/**
 * Social Authentication Routes
 * POST /auth/google/login - Google OAuth login
 * POST /auth/facebook/login - Facebook OAuth login
 * POST /auth/apple/login - Apple OAuth login
 * POST /auth/link-social - Link social account to user
 * DELETE /auth/unlink-social - Unlink social account
 * GET /auth/social-accounts - Get user's linked accounts
 */

const express = require('express');
const router = express.Router();
const SocialAuthService = require('../services/SocialAuthService');
const { verifyToken } = require('../middlewares/auth');

/**
 * POST /auth/google/login
 * Google OAuth login
 */
router.post('/google/login', async (req, res) => {
  try {
    const { idToken, deviceInfo = {} } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: 'idToken required'
      });
    }

    const result = await SocialAuthService.loginWithGoogle(idToken);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      data: {
        ...result,
        refreshToken: undefined
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
 * POST /auth/facebook/login
 * Facebook OAuth login
 */
router.post('/facebook/login', async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'accessToken required'
      });
    }

    const result = await SocialAuthService.loginWithFacebook(accessToken);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      data: {
        ...result,
        refreshToken: undefined
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
 * POST /auth/apple/login
 * Apple OAuth login
 */
router.post('/apple/login', async (req, res) => {
  try {
    const { identityToken } = req.body;

    if (!identityToken) {
      return res.status(400).json({
        success: false,
        error: 'identityToken required'
      });
    }

    const result = await SocialAuthService.loginWithApple(identityToken);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      data: {
        ...result,
        refreshToken: undefined
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
 * POST /auth/link-social
 * Link social account to existing user
 */
router.post('/link-social', verifyToken, async (req, res) => {
  try {
    const { provider, profileData } = req.body;
    const userId = req.user.userId;

    if (!provider || !profileData) {
      return res.status(400).json({
        success: false,
        error: 'provider and profileData required'
      });
    }

    const result = await SocialAuthService.linkSocialAccount(
      userId,
      provider,
      profileData
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
 * DELETE /auth/unlink-social/:provider
 * Unlink social account
 */
router.delete('/unlink-social/:provider', verifyToken, async (req, res) => {
  try {
    const { provider } = req.params;
    const userId = req.user.userId;

    const result = await SocialAuthService.unlinkSocialAccount(userId, provider);

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
 * GET /auth/social-accounts
 * Get user's linked social accounts
 */
router.get('/social-accounts', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const accounts = await SocialAuthService.getUserSocialAccounts(userId);

    res.status(200).json({
      success: true,
      data: accounts
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
