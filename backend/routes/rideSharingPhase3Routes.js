/**
 * rideSharingPhase3Routes.js
 * Phase 3: Wallet & Payments - Routes for wallet, referral, and coupon endpoints
 * 
 * Endpoints:
 * - Wallet: 8 endpoints
 * - Referral: 7 endpoints
 * - Coupon: 6 endpoints
 * Total: 21 endpoints
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const rateLimitMiddleware = require('../middleware/rateLimitMiddleware');
const WalletService = require('../services/WalletService');
const ReferralProgramService = require('../services/ReferralProgramService');
const CouponService = require('../services/CouponService');

// ==================== WALLET ENDPOINTS ====================

/**
 * GET /api/ridesharing/phase3/wallet/balance
 * Get wallet balance for current user
 */
router.get('/wallet/balance', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await WalletService.getWalletBalance(userId);
    res.json(result);
  } catch (error) {
    console.error('Error getting wallet balance:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get wallet balance',
      error: error.message
    });
  }
});

/**
 * POST /api/ridesharing/phase3/wallet/add-money-initiate
 * Initiate add money transaction
 * Body: { amount }
 */
router.post('/wallet/add-money-initiate', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required'
      });
    }

    const result = await WalletService.addMoneyInitiate(userId, amount);
    res.json(result);
  } catch (error) {
    console.error('Error initiating add money:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/ridesharing/phase3/wallet/add-money-complete
 * Complete add money payment
 * Body: { amount, paymentId }
 */
router.post('/wallet/add-money-complete', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, paymentId } = req.body;

    if (!amount || !paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Amount and paymentId are required'
      });
    }

    const result = await WalletService.addMoneyComplete(userId, amount, paymentId);
    res.json(result);
  } catch (error) {
    console.error('Error completing add money:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/ridesharing/phase3/wallet/transactions
 * Get transaction history with pagination
 * Query: { limit: 20, skip: 0 }
 */
router.get('/wallet/transactions', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;

    const result = await WalletService.getTransactionHistory(userId, limit, skip);
    res.json(result);
  } catch (error) {
    console.error('Error getting transactions:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction history',
      error: error.message
    });
  }
});

/**
 * POST /api/ridesharing/phase3/wallet/set-pin
 * Set wallet PIN for security
 * Body: { pin }
 */
router.post('/wallet/set-pin', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({
        success: false,
        message: 'PIN is required'
      });
    }

    const result = await WalletService.setWalletPin(userId, pin);
    res.json(result);
  } catch (error) {
    console.error('Error setting wallet PIN:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/ridesharing/phase3/wallet/verify-pin
 * Verify wallet PIN
 * Body: { pin }
 */
router.post('/wallet/verify-pin', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({
        success: false,
        message: 'PIN is required'
      });
    }

    const result = await WalletService.verifyWalletPin(userId, pin);
    res.json(result);
  } catch (error) {
    console.error('Error verifying wallet PIN:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/ridesharing/phase3/wallet/summary
 * Get wallet summary with statistics
 */
router.get('/wallet/summary', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await WalletService.getWalletSummary(userId);
    res.json(result);
  } catch (error) {
    console.error('Error getting wallet summary:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get wallet summary',
      error: error.message
    });
  }
});

/**
 * GET /api/ridesharing/phase3/wallet/stats
 * Get wallet statistics
 */
router.get('/wallet/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await WalletService.getWalletStats(userId);
    res.json(result);
  } catch (error) {
    console.error('Error getting wallet stats:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get wallet stats',
      error: error.message
    });
  }
});

// ==================== REFERRAL ENDPOINTS ====================

/**
 * GET /api/ridesharing/phase3/referral/code
 * Get or create referral code
 */
router.get('/referral/code', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await ReferralProgramService.getReferralCode(userId);
    res.json(result);
  } catch (error) {
    console.error('Error getting referral code:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get referral code',
      error: error.message
    });
  }
});

/**
 * POST /api/ridesharing/phase3/referral/validate
 * Validate referral code and get referrer info
 * Body: { referralCode }
 */
router.post('/referral/validate', async (req, res) => {
  try {
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({
        success: false,
        message: 'Referral code is required'
      });
    }

    const result = await ReferralProgramService.validateReferralCode(referralCode);
    res.json(result);
  } catch (error) {
    console.error('Error validating referral code:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to validate referral code',
      error: error.message
    });
  }
});

/**
 * GET /api/ridesharing/phase3/referral/stats
 * Get referral statistics for current user
 */
router.get('/referral/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await ReferralProgramService.getReferralStats(userId);
    res.json(result);
  } catch (error) {
    console.error('Error getting referral stats:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get referral stats',
      error: error.message
    });
  }
});

/**
 * GET /api/ridesharing/phase3/referral/list
 * Get paginated list of referrals
 * Query: { limit: 10, skip: 0 }
 */
router.get('/referral/list', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const skip = parseInt(req.query.skip) || 0;

    const result = await ReferralProgramService.getReferralList(userId, limit, skip);
    res.json(result);
  } catch (error) {
    console.error('Error getting referral list:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get referral list',
      error: error.message
    });
  }
});

/**
 * POST /api/ridesharing/phase3/referral/claim-bonus
 * Claim available referral bonus
 */
router.post('/referral/claim-bonus', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await ReferralProgramService.claimReferralBonus(userId);
    res.json(result);
  } catch (error) {
    console.error('Error claiming referral bonus:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/ridesharing/phase3/referral/dashboard
 * Get referral dashboard with all info
 */
router.get('/referral/dashboard', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await ReferralProgramService.getReferralDashboard(userId);
    res.json(result);
  } catch (error) {
    console.error('Error getting referral dashboard:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get referral dashboard',
      error: error.message
    });
  }
});

/**
 * GET /api/ridesharing/phase3/referral/active
 * Get active referrals with recent activity
 * Query: { limit: 10 }
 */
router.get('/referral/active', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    const result = await ReferralProgramService.getActiveReferrals(userId, limit);
    res.json(result);
  } catch (error) {
    console.error('Error getting active referrals:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get active referrals',
      error: error.message
    });
  }
});

// ==================== COUPON ENDPOINTS ====================

/**
 * POST /api/ridesharing/phase3/coupon/validate
 * Validate coupon and calculate discount
 * Body: { code, rideType, rideAmount }
 */
router.post('/coupon/validate', async (req, res) => {
  try {
    const { code, rideType, rideAmount } = req.body;

    if (!code || !rideType || !rideAmount) {
      return res.status(400).json({
        success: false,
        message: 'Code, rideType, and rideAmount are required'
      });
    }

    const result = await CouponService.validateCoupon(code, rideType, rideAmount);
    res.json(result);
  } catch (error) {
    console.error('Error validating coupon:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to validate coupon',
      error: error.message
    });
  }
});

/**
 * POST /api/ridesharing/phase3/coupon/apply
 * Apply coupon to ride
 * Body: { code, rideId, rideAmount, rideType }
 */
router.post('/coupon/apply', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { code, rideId, rideAmount, rideType } = req.body;

    if (!code || !rideId || !rideAmount || !rideType) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const result = await CouponService.applyCoupon(userId, code, rideId, rideAmount, rideType);
    res.json(result);
  } catch (error) {
    console.error('Error applying coupon:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/ridesharing/phase3/coupon/available
 * Get available coupons for ride type
 * Query: { rideType }
 */
router.get('/coupon/available', async (req, res) => {
  try {
    const { rideType } = req.query;

    if (!rideType) {
      return res.status(400).json({
        success: false,
        message: 'Ride type is required'
      });
    }

    const result = await CouponService.getAvailableCoupons(null, rideType);
    res.json(result);
  } catch (error) {
    console.error('Error getting available coupons:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get available coupons',
      error: error.message
    });
  }
});

/**
 * GET /api/ridesharing/phase3/coupon/details/:code
 * Get coupon details
 */
router.get('/coupon/details/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const result = await CouponService.getCouponDetails(code);
    res.json(result);
  } catch (error) {
    console.error('Error getting coupon details:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get coupon details',
      error: error.message
    });
  }
});

/**
 * GET /api/ridesharing/phase3/coupon/active
 * Get all active coupons
 * Query: { limit: 20 }
 */
router.get('/coupon/active', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const result = await CouponService.getActiveCoupons(limit);
    res.json(result);
  } catch (error) {
    console.error('Error getting active coupons:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get active coupons',
      error: error.message
    });
  }
});

/**
 * GET /api/ridesharing/phase3/coupon/history
 * Get user's coupon usage history
 * Query: { limit: 10 }
 */
router.get('/coupon/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    const result = await CouponService.getUserCouponHistory(userId, limit);
    res.json(result);
  } catch (error) {
    console.error('Error getting coupon history:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get coupon history',
      error: error.message
    });
  }
});

module.exports = router;
