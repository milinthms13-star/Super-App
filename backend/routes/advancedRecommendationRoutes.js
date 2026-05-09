/**
 * advancedRecommendationRoutes.js
 * Routes for advanced recommendation engine
 */

const express = require('express');
const router = express.Router();
const AdvancedRecommendationEngine = require('../services/AdvancedRecommendationEngine');
const { verifyToken } = require('../middleware/authMiddleware');
const logger = require('../config/logger');

/**
 * GET /api/ecommerce/recommendations/personalized
 * Get personalized recommendations for user (protected)
 */
router.get('/personalized', verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const result = await AdvancedRecommendationEngine.getPersonalizedRecommendations(
      req.user.userId,
      limit
    );
    res.status(200).json({ success: true, data: result, message: 'Recommendations retrieved' });
  } catch (error) {
    logger.error('Error getting personalized recommendations:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ecommerce/recommendations/collaborative
 * Get collaborative filtering recommendations (protected)
 */
router.get('/collaborative', verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const result = await AdvancedRecommendationEngine.getCollaborativeRecommendations(
      req.user.userId,
      limit
    );
    res.status(200).json({ success: true, data: result, message: 'Recommendations retrieved' });
  } catch (error) {
    logger.error('Error getting collaborative recommendations:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ecommerce/recommendations/trending
 * Get trending products (public)
 */
router.get('/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const period = req.query.period || '7';
    const result = await AdvancedRecommendationEngine.getTrendingProducts(limit, period);
    res.status(200).json({ success: true, data: result, message: 'Trending products retrieved' });
  } catch (error) {
    logger.error('Error getting trending products:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ecommerce/recommendations/also-like/:productId
 * Get "you may also like" recommendations (public)
 */
router.get('/also-like/:productId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const result = await AdvancedRecommendationEngine.getAlsoLikeRecommendations(
      req.params.productId,
      limit
    );
    res.status(200).json({ success: true, data: result, message: 'Recommendations retrieved' });
  } catch (error) {
    logger.error('Error getting also-like recommendations:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ecommerce/recommendations/frequently-bought/:productId
 * Get frequently bought together (public)
 */
router.get('/frequently-bought/:productId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const result = await AdvancedRecommendationEngine.getFrequentlyBoughtTogether(
      req.params.productId,
      limit
    );
    res.status(200).json({ success: true, data: result, message: 'Recommendations retrieved' });
  } catch (error) {
    logger.error('Error getting frequently bought together:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ecommerce/recommendations/seasonal
 * Get seasonal recommendations (public)
 */
router.get('/seasonal', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const result = await AdvancedRecommendationEngine.getSeasonalRecommendations(limit);
    res.status(200).json({ success: true, data: result, message: 'Seasonal recommendations' });
  } catch (error) {
    logger.error('Error getting seasonal recommendations:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
