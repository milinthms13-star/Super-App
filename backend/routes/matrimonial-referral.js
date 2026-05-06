/**
 * Referral & Affiliate System Routes
 * GET /api/matrimonial/referral/*
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const referralService = require('../utils/referralSystemService');

/**
 * POST /api/matrimonial/referral/generate
 * Generate new referral code for user
 */
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { tier, expiryDays } = req.body;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiryDays || 30));

    const referral = await referralService.createReferralCode(userId, {
      tier: tier || 'bronze',
      expiresAt
    });

    res.json({
      success: true,
      referralCode: referral.referralCode,
      link: `${process.env.FRONTEND_URL}/signup?ref=${referral.referralCode}`,
      expiresAt: referral.expiresAt,
      rewardTier: referral.rewardTier
    });
  } catch (error) {
    console.error('Error generating referral code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/matrimonial/referral/validate/:code
 * Validate referral code
 */
router.get('/validate/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const validation = await referralService.validateReferralCode(code);

    res.json(validation);
  } catch (error) {
    console.error('Error validating referral code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/matrimonial/referral/apply
 * Apply referral code at signup
 */
router.post('/apply', authenticateToken, async (req, res) => {
  try {
    const { referralCode } = req.body;
    const newUserId = req.user._id;
    const newUserEmail = req.user.email;

    const result = await referralService.processReferralConversion(
      referralCode,
      newUserId,
      newUserEmail
    );

    res.json(result);
  } catch (error) {
    console.error('Error applying referral code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/matrimonial/referral/stats
 * Get referrer statistics and rewards
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const stats = await referralService.getReferrerStats(userId);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching referrer stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/matrimonial/referral/:referralId/claim
 * Claim referral reward
 */
router.post('/:referralId/claim', authenticateToken, async (req, res) => {
  try {
    const { referralId } = req.params;
    const result = await referralService.claimReferralReward(referralId);

    if (result.success) {
      // TODO: Add reward to user's wallet
      res.json({
        success: true,
        message: result.message,
        rewardAmount: result.rewardAmount
      });
    } else {
      res.status(400).json({ error: result.reason });
    }
  } catch (error) {
    console.error('Error claiming referral reward:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/matrimonial/referral/leaderboard
 * Get top referrers leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const leaderboard = await referralService.getTopReferrers(limit);

    res.json({
      success: true,
      leaderboard,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/matrimonial/referral/campaign-performance
 * Get referral campaign performance
 */
router.get('/campaign-performance', authenticateToken, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const performance = await referralService.getCampaignPerformance(days);

    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    console.error('Error fetching campaign performance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/matrimonial/referral/my-codes
 * Get all referral codes created by user
 */
router.get('/my-codes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const codes = await referralService.Referral.find({ referrerId: userId })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      codes: codes.map(code => ({
        code: code.referralCode,
        status: code.status,
        createdAt: code.createdAt,
        expiresAt: code.expiresAt,
        conversions: code.status === 'used' ? 1 : 0,
        reward: code.rewardAmount,
        link: `${process.env.FRONTEND_URL}/signup?ref=${code.referralCode}`
      }))
    });
  } catch (error) {
    console.error('Error fetching referral codes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
