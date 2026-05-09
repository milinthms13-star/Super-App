/**
 * Leaderboard Controller - Phase 9 Feature C
 * REST endpoints for leaderboard rankings and competitive features
 */

const LeaderboardService = require('../services/LeaderboardService');

class LeaderboardController {
  /**
   * GET /api/phase9/leaderboard/global
   * Get global leaderboard
   */
  static async getGlobalLeaderboard(req, res) {
    try {
      const { limit } = req.query;

      const result = await LeaderboardService.getGlobalLeaderboard(parseInt(limit) || 100);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/leaderboard/city/:city
   * Get city leaderboard
   */
  static async getCityLeaderboard(req, res) {
    try {
      const { city } = req.params;
      const { limit } = req.query;

      if (!city) {
        return res.status(400).json({
          success: false,
          message: 'City is required',
        });
      }

      const result = await LeaderboardService.getCityLeaderboard(city, parseInt(limit) || 50);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/leaderboard/category/:category
   * Get leaderboard by category
   */
  static async getCategoryLeaderboard(req, res) {
    try {
      const { category } = req.params;
      const { limit } = req.query;

      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Category is required',
        });
      }

      const result = await LeaderboardService.getCategoryLeaderboard(category, parseInt(limit) || 50);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/leaderboard/user/rank
   * Get user rank
   */
  static async getUserRank(req, res) {
    try {
      const userId = req.user?._id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const result = await LeaderboardService.getUserRank(userId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/leaderboard/friends
   * Get friends leaderboard
   */
  static async getFriendsLeaderboard(req, res) {
    try {
      const userId = req.user?._id;
      const { limit } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const result = await LeaderboardService.getFriendsLeaderboard(userId, parseInt(limit) || 20);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/leaderboard/seasonal/:season
   * Get seasonal leaderboard
   */
  static async getSeasonalLeaderboard(req, res) {
    try {
      const { season } = req.params;
      const { limit } = req.query;

      if (!season) {
        return res.status(400).json({
          success: false,
          message: 'Season is required',
        });
      }

      const result = await LeaderboardService.getSeasonalLeaderboard(season, parseInt(limit) || 50);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /api/phase9/leaderboard/update-rankings
   * Update leaderboard rankings
   */
  static async updateLeaderboardRankings(req, res) {
    try {
      const result = await LeaderboardService.updateLeaderboardRankings();
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/leaderboard/top-performers
   * Get top performers
   */
  static async getTopPerformers(req, res) {
    try {
      const { category, limit } = req.query;

      const result = await LeaderboardService.getTopPerformers(category || 'experience', parseInt(limit) || 10);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = LeaderboardController;
