/**
 * userProfileRoutes.js
 * User profile endpoints
 */

const express = require('express');
const router = express.Router();
const UserProfileService = require('../services/UserProfileService');
const { verifyToken } = require('../middleware/auth');

// Middleware
const validatePhone = (req, res, next) => {
  if (req.body.phoneNumber && !/^[6-9]\d{9}$/.test(req.body.phoneNumber)) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }
  next();
};

// GET /api/user/profile - Get user profile
router.get('/', verifyToken, async (req, res) => {
  try {
    const profile = await UserProfileService.getProfile(req.user.id);
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/user/profile/public/:userId - Get public profile
router.get('/public/:userId', async (req, res) => {
  try {
    const profile = await UserProfileService.getPublicProfile(req.params.userId);
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(404).json({ error: 'Profile not found' });
  }
});

// POST /api/user/profile - Create or update profile
router.post('/', verifyToken, validatePhone, async (req, res) => {
  try {
    const profile = await UserProfileService.createOrUpdateProfile(req.user.id, req.body);
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/user/profile - Update profile
router.put('/', verifyToken, validatePhone, async (req, res) => {
  try {
    const profile = await UserProfileService.createOrUpdateProfile(req.user.id, req.body);
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/user/profile/avatar - Update avatar
router.post('/avatar', verifyToken, async (req, res) => {
  try {
    const { avatarUrl, publicId } = req.body;

    if (!avatarUrl) {
      return res.status(400).json({ error: 'Avatar URL required' });
    }

    const profile = await UserProfileService.updateAvatar(req.user.id, avatarUrl, publicId);
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/user/profile/avatar - Remove avatar
router.delete('/avatar', verifyToken, async (req, res) => {
  try {
    const profile = await UserProfileService.removeAvatar(req.user.id);
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/user/profile/phone/verify - Request phone verification
router.post('/phone/verify', verifyToken, validatePhone, async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number required' });
    }

    const result = await UserProfileService.verifyPhoneNumber(req.user.id, phoneNumber);

    if (process.env.NODE_ENV === 'development') {
      result.code; // Log for testing
    }

    res.json({
      success: true,
      data: {
        message: 'Verification code sent',
        expiresAt: result.expiresAt
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/user/profile/phone/confirm - Confirm phone verification
router.post('/phone/confirm', verifyToken, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Verification code required' });
    }

    const result = await UserProfileService.confirmPhoneVerification(req.user.id, code);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/user/profile/referral - Generate referral code
router.post('/referral/generate', verifyToken, async (req, res) => {
  try {
    const referralCode = await UserProfileService.generateReferralCode(req.user.id);
    res.json({ success: true, data: { referralCode } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/user/profile/referral/apply - Apply referral code
router.post('/referral/apply', verifyToken, async (req, res) => {
  try {
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({ error: 'Referral code required' });
    }

    const result = await UserProfileService.applyReferralCode(req.user.id, referralCode);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/user/profile/referral/stats - Get referral stats
router.get('/referral/stats', verifyToken, async (req, res) => {
  try {
    const stats = await UserProfileService.getReferralStats(req.user.id);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/user/profile/completeness - Get profile completeness
router.get('/completeness', verifyToken, async (req, res) => {
  try {
    const completeness = await UserProfileService.getProfileCompleteness(req.user.id);
    res.json({ success: true, data: completeness });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/user/profile/search - Search profiles
router.get('/search', async (req, res) => {
  try {
    const { q, limit } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const profiles = await UserProfileService.searchProfiles(q, limit || 20);
    res.json({ success: true, data: profiles });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/user/profile - Delete profile (soft delete)
router.delete('/', verifyToken, async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await UserProfileService.deleteProfile(req.user.id, reason);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
