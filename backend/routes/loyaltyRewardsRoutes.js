/**
 * loyaltyRewardsRoutes.js
 * Routes for points system, tier system, referral bonuses
 */

const express = require('express');
const router = express.Router();
const LoyaltyRewardsService = require('../services/LoyaltyRewardsService');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// Initialize account
router.post('/account/initialize', verifyToken, async (req, res) => {
  try {
    const result = await LoyaltyRewardsService.initializeLoyaltyAccount(req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get loyalty status
router.get('/account/status', verifyToken, async (req, res) => {
  try {
    const result = await LoyaltyRewardsService.getLoyaltyStatus(req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Award points for purchase
router.post('/points/award', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userId, amount } = req.body;
    const result = await LoyaltyRewardsService.awardPointsForPurchase(userId, amount);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Redeem points
router.post('/redeem', verifyToken, async (req, res) => {
  try {
    const { rewardId } = req.body;
    const result = await LoyaltyRewardsService.redeemPoints(req.user.userId, rewardId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Generate referral code
router.post('/referral/generate', verifyToken, async (req, res) => {
  try {
    const result = await LoyaltyRewardsService.generateReferralCode(req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Process referral signup
router.post('/referral/process', async (req, res) => {
  try {
    const { referralCode, newUserId } = req.body;
    const result = await LoyaltyRewardsService.processReferralSignup(referralCode, newUserId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get referral stats
router.get('/referral/stats', verifyToken, async (req, res) => {
  try {
    const result = await LoyaltyRewardsService.getReferralStats(req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get rewards catalog
router.get('/rewards/catalog', verifyToken, async (req, res) => {
  try {
    const { tier } = req.query;
    const result = await LoyaltyRewardsService.getRewardsCatalog(tier);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Anniversary bonus
router.post('/points/anniversary', verifyToken, async (req, res) => {
  try {
    const result = await LoyaltyRewardsService.giveAnniversaryBonus(req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Create reward (admin)
router.post('/rewards/create', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name, pointsRequired, discount, tiers } = req.body;
    const result = await LoyaltyRewardsService.createReward(
      name,
      pointsRequired,
      discount,
      tiers
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
