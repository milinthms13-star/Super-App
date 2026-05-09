const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const LoyaltyPointsService = require('../services/LoyaltyPointsService');
const logger = require('../utils/logger');

/**
 * Phase 3: Loyalty Points & Rewards Routes
 * Handles points calculation, redemption, tier progression, referrals
 */

/**
 * POST /api/ecommerce/loyalty/calculate
 * Calculate points for a transaction
 */
router.post('/calculate', auth, async (req, res) => {
  try {
    const { userId } = req;
    const { amount, transactionType = 'purchase' } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'amount is required',
      });
    }

    const result = await LoyaltyPointsService.calculatePoints(
      userId,
      amount,
      transactionType
    );

    res.json({
      success: true,
      data: result,
      message: 'Points calculated',
    });
  } catch (error) {
    logger.error('Error calculating points:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/ecommerce/loyalty/add
 * Add points to user account
 */
router.post('/add', auth, async (req, res) => {
  try {
    const { userId } = req;
    const { points, reason, orderId } = req.body;

    if (!points || !reason) {
      return res.status(400).json({
        success: false,
        message: 'points and reason are required',
      });
    }

    const result = await LoyaltyPointsService.addPoints(
      userId,
      points,
      reason,
      orderId
    );

    res.json({
      success: true,
      data: result,
      message: 'Points added',
    });
  } catch (error) {
    logger.error('Error adding points:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/ecommerce/loyalty/redeem
 * Redeem points for discount
 */
router.post('/redeem', auth, async (req, res) => {
  try {
    const { userId } = req;
    const { pointsToRedeem } = req.body;

    if (!pointsToRedeem) {
      return res.status(400).json({
        success: false,
        message: 'pointsToRedeem is required',
      });
    }

    const result = await LoyaltyPointsService.redeemPoints(userId, pointsToRedeem);

    res.json({
      success: true,
      data: result,
      message: 'Points redeemed',
    });
  } catch (error) {
    logger.error('Error redeeming points:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/loyalty/tier
 * Get user's loyalty tier
 */
router.get('/tier', auth, async (req, res) => {
  try {
    const { userId } = req;

    const result = await LoyaltyPointsService._getUserTier(userId);

    res.json({
      success: true,
      data: result,
      message: 'Tier information retrieved',
    });
  } catch (error) {
    logger.error('Error fetching tier:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/loyalty/dashboard
 * Get user's loyalty dashboard
 */
router.get('/dashboard', auth, async (req, res) => {
  try {
    const { userId } = req;

    const result = await LoyaltyPointsService.getLoyaltyDashboard(userId);

    res.json({
      success: true,
      data: result,
      message: 'Loyalty dashboard retrieved',
    });
  } catch (error) {
    logger.error('Error fetching loyalty dashboard:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/ecommerce/loyalty/referral
 * Track referral
 */
router.post('/referral', auth, async (req, res) => {
  try {
    const { referrerId } = req;
    const { refereeId, amount } = req.body;

    if (!refereeId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'refereeId and amount are required',
      });
    }

    const result = await LoyaltyPointsService.trackReferral(
      referrerId,
      refereeId,
      amount
    );

    res.json({
      success: true,
      data: result,
      message: 'Referral tracked',
    });
  } catch (error) {
    logger.error('Error tracking referral:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/loyalty/referral-link
 * Get user's referral link
 */
router.get('/referral-link', auth, async (req, res) => {
  try {
    const { userId } = req;

    const result = await LoyaltyPointsService.getReferralLink(userId);

    res.json({
      success: true,
      data: result,
      message: 'Referral link generated',
    });
  } catch (error) {
    logger.error('Error generating referral link:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/ecommerce/loyalty/birthday-points
 * Award birthday points
 */
router.post('/birthday-points', auth, async (req, res) => {
  try {
    const { userId } = req;

    const result = await LoyaltyPointsService.awardBirthdayPoints(userId);

    res.json({
      success: true,
      data: result,
      message: 'Birthday points awarded',
    });
  } catch (error) {
    logger.error('Error awarding birthday points:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/loyalty/catalog
 * Get reward catalog
 */
router.get('/catalog', auth, async (req, res) => {
  try {
    const result = await LoyaltyPointsService.getRewardCatalog();

    res.json({
      success: true,
      data: result,
      message: 'Reward catalog retrieved',
    });
  } catch (error) {
    logger.error('Error fetching reward catalog:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
