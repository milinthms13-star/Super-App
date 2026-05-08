/**
 * RecommendationController
 * HTTP endpoints for AI-powered recommendations
 */

const RecommendationEngine = require('../services/RecommendationEngine');

class RecommendationController {
  /**
   * Get personalized recommendations
   * GET /api/v1/recommendations/personalized/:userId
   */
  static async getPersonalizedRecommendations(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 10 } = req.query;

      const result = await RecommendationEngine.getPersonalizedRecommendations(userId, parseInt(limit));

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
   * Get collaborative filtering recommendations
   * GET /api/v1/recommendations/collaborative/:userId
   */
  static async getCollaborativeRecommendations(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 10 } = req.query;

      const result = await RecommendationEngine.getCollaborativeRecommendations(userId, parseInt(limit));

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
   * Get content-based recommendations
   * GET /api/v1/recommendations/content/:userId
   */
  static async getContentBasedRecommendations(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 10 } = req.query;

      const result = await RecommendationEngine.getContentBasedRecommendations(userId, parseInt(limit));

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
   * Get popular recommendations
   * GET /api/v1/recommendations/popular
   */
  static async getPopularRecommendations(req, res) {
    try {
      const { limit = 10 } = req.query;

      const result = await RecommendationEngine.getPopularRecommendations(parseInt(limit));

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
   * Get healthy recommendations
   * GET /api/v1/recommendations/healthy/:userId
   */
  static async getHealthyRecommendations(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 10 } = req.query;

      const result = await RecommendationEngine.getHealthyRecommendations(userId, parseInt(limit));

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
   * Get restaurant recommendations
   * GET /api/v1/recommendations/restaurants/:userId
   */
  static async getRestaurantRecommendations(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 10 } = req.query;

      const result = await RecommendationEngine.getRestaurantRecommendations(userId, parseInt(limit));

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
   * Get time-based recommendations
   * GET /api/v1/recommendations/time/:userId
   */
  static async getTimeBasedRecommendations(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 10 } = req.query;

      const result = await RecommendationEngine.getTimeBasedRecommendations(userId, parseInt(limit));

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
   * Track recommendation engagement
   * POST /api/v1/recommendations/track
   */
  static async trackEngagement(req, res) {
    try {
      const { userId, recommendedItemId, action = 'viewed' } = req.body;

      const result = await RecommendationEngine.trackEngagement(userId, recommendedItemId, action);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }
}

module.exports = RecommendationController;
