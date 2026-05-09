/**
 * Badge & Gamification Controller - Phase 9 Feature C
 * REST endpoints for badges, achievements, and gamification
 */

const BadgeService = require('../services/BadgeService');

class BadgeController {
  /**
   * POST /api/phase9/badges/initialize
   * Initialize gamification account
   */
  static async initializeUserBadges(req, res) {
    try {
      const userId = req.user?._id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const result = await BadgeService.initializeUserBadges(userId);
      res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/phase9/badges/check-unlock
   * Check and unlock badges
   */
  static async checkAndUnlockBadges(req, res) {
    try {
      const userId = req.user?._id;
      const orderData = req.body;

      if (!userId || !orderData) {
        return res.status(400).json({
          success: false,
          message: 'User ID and order data are required',
        });
      }

      const result = await BadgeService.checkAndUnlockBadges(userId, orderData);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/phase9/badges/experience
   * Add experience and level up
   */
  static async addExperience(req, res) {
    try {
      const userId = req.user?._id;
      const { amount, reason } = req.body;

      if (!userId || !amount) {
        return res.status(400).json({
          success: false,
          message: 'User ID and amount are required',
        });
      }

      const result = await BadgeService.addExperience(userId, amount, reason);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /api/phase9/badges/streak
   * Update streaks
   */
  static async updateStreaks(req, res) {
    try {
      const userId = req.user?._id;
      const { streakType } = req.body;

      if (!userId || !streakType) {
        return res.status(400).json({
          success: false,
          message: 'User ID and streakType are required',
        });
      }

      const result = await BadgeService.updateStreaks(userId, streakType);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/badges/user
   * Get user badges
   */
  static async getUserBadges(req, res) {
    try {
      const userId = req.user?._id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const result = await BadgeService.getUserBadges(userId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/phase9/badges/achievement
   * Record achievement
   */
  static async recordAchievement(req, res) {
    try {
      const userId = req.user?._id;
      const { achievementType, title, reward } = req.body;

      if (!userId || !achievementType || !title) {
        return res.status(400).json({
          success: false,
          message: 'User ID, achievementType, and title are required',
        });
      }

      const result = await BadgeService.recordAchievement(userId, achievementType, title, reward);
      res.status(result.success ? 201 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/badges/achievement-summary
   * Get achievement summary
   */
  static async getAchievementSummary(req, res) {
    try {
      const userId = req.user?._id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const result = await BadgeService.getAchievementSummary(userId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = BadgeController;
