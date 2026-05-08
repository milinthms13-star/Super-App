/**
 * LoyaltyController
 * HTTP endpoints for loyalty program management
 */

const LoyaltyService = require('../services/LoyaltyService');

class LoyaltyController {
  /**
   * Create loyalty account
   * POST /api/v1/loyalty/accounts
   */
  static async createLoyaltyAccount(req, res) {
    try {
      const { userId } = req.body;

      const result = await LoyaltyService.createLoyaltyAccount(userId);

      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Get loyalty account
   * GET /api/v1/loyalty/accounts/:userId
   */
  static async getLoyaltyAccount(req, res) {
    try {
      const { userId } = req.params;

      const result = await LoyaltyService.getLoyaltyAccount(userId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Add points
   * POST /api/v1/loyalty/points
   */
  static async addPoints(req, res) {
    try {
      const { userId, amount, source, orderId } = req.body;

      const result = await LoyaltyService.addPoints(userId, amount, source, orderId);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Redeem points
   * POST /api/v1/loyalty/redeem
   */
  static async redeemPoints(req, res) {
    try {
      const { userId, pointsToRedeem, rewardId, rewardName } = req.body;

      const result = await LoyaltyService.redeemPoints(userId, pointsToRedeem, rewardId, rewardName);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Get available rewards
   * GET /api/v1/loyalty/rewards/:userId
   */
  static async getAvailableRewards(req, res) {
    try {
      const { userId } = req.params;

      const result = await LoyaltyService.getAvailableRewards(userId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Calculate points for order
   * POST /api/v1/loyalty/calculate-points
   */
  static async calculatePoints(req, res) {
    try {
      const { userId, orderValue } = req.body;

      const result = await LoyaltyService.calculatePointsForOrder(userId, orderValue);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Apply cashback
   * POST /api/v1/loyalty/cashback
   */
  static async applyCashback(req, res) {
    try {
      const { userId, orderValue } = req.body;

      const result = await LoyaltyService.applyCashback(userId, orderValue);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Get membership status
   * GET /api/v1/loyalty/membership/:userId
   */
  static async getMembershipStatus(req, res) {
    try {
      const { userId } = req.params;

      const result = await LoyaltyService.getMembershipStatus(userId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Get transaction history
   * GET /api/v1/loyalty/transactions/:userId
   */
  static async getTransactionHistory(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 20 } = req.query;

      const result = await LoyaltyService.getTransactionHistory(userId, parseInt(limit));

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Add referral
   * POST /api/v1/loyalty/referrals
   */
  static async addReferral(req, res) {
    try {
      const { userId, referredUserId, referredEmail } = req.body;

      const result = await LoyaltyService.addReferral(userId, referredUserId, referredEmail);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Get loyalty statistics
   * GET /api/v1/loyalty/stats/:userId
   */
  static async getLoyaltyStats(req, res) {
    try {
      const { userId } = req.params;

      const result = await LoyaltyService.getLoyaltyStats(userId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }
}

module.exports = LoyaltyController;
