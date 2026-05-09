/**
 * recommendationsRoutes.js
 * API endpoints for AI-powered product recommendations
 */

const express = require('express');
const router = express.Router();
const RecommendationService = require('../services/RecommendationService');
const { verifyToken } = require('../middlewares/authMiddleware');
const logger = require('../config/logger');

/**
 * GET /api/recommendations/frequently-bought-together
 * Get frequently bought together products
 */
router.get('/frequently-bought-together', async (req, res) => {
  try {
    const { productId, limit = 5 } = req.query;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
    }

    const recommendations = await RecommendationService.getFrequentlyBoughtTogether(
      productId,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    logger.error('Get frequently bought together error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations',
      error: error.message,
    });
  }
});

/**
 * GET /api/recommendations/personalized
 * Get personalized recommendations for user
 */
router.get('/personalized', verifyToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const recommendations = await RecommendationService.getPersonalizedRecommendations(
      req.userId,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    logger.error('Get personalized recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get personalized recommendations',
      error: error.message,
    });
  }
});

/**
 * GET /api/recommendations/similar
 * Get similar products
 */
router.get('/similar', async (req, res) => {
  try {
    const { productId, limit = 8 } = req.query;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
    }

    const similar = await RecommendationService.getSimilarProducts(
      productId,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: similar,
    });
  } catch (error) {
    logger.error('Get similar products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get similar products',
      error: error.message,
    });
  }
});

/**
 * GET /api/recommendations/trending
 * Get trending products
 */
router.get('/trending', async (req, res) => {
  try {
    const { limit = 10, days = 30 } = req.query;

    const trending = await RecommendationService.getTrendingProducts(
      parseInt(limit),
      parseInt(days)
    );

    res.json({
      success: true,
      data: trending,
    });
  } catch (error) {
    logger.error('Get trending products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trending products',
      error: error.message,
    });
  }
});

/**
 * GET /api/recommendations/upsell
 * Get smart upsell recommendations
 */
router.get('/upsell', async (req, res) => {
  try {
    const { productId, limit = 5 } = req.query;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
    }

    const upsells = await RecommendationService.getSmartUpsell(
      productId,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: upsells,
    });
  } catch (error) {
    logger.error('Get smart upsell error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get upsell recommendations',
      error: error.message,
    });
  }
});

/**
 * GET /api/recommendations/cross-sell
 * Get smart cross-sell recommendations
 */
router.get('/cross-sell', async (req, res) => {
  try {
    const { productId, limit = 5 } = req.query;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
    }

    const crossSells = await RecommendationService.getSmartCrossSell(
      productId,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: crossSells,
    });
  } catch (error) {
    logger.error('Get smart cross-sell error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cross-sell recommendations',
      error: error.message,
    });
  }
});

/**
 * GET /api/recommendations/category
 * Get category-specific recommendations
 */
router.get('/category', verifyToken, async (req, res) => {
  try {
    const { category, limit = 10 } = req.query;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required',
      });
    }

    const recommendations = await RecommendationService.getCategoryRecommendations(
      category,
      req.userId,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    logger.error('Get category recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get category recommendations',
      error: error.message,
    });
  }
});

/**
 * GET /api/recommendations/discount
 * Get discount-based recommendations
 */
router.get('/discount', verifyToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const recommendations = await RecommendationService.getDiscountRecommendations(
      req.userId,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    logger.error('Get discount recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get discount recommendations',
      error: error.message,
    });
  }
});

/**
 * POST /api/recommendations/track-view
 * Track user product view
 */
router.post('/track-view', verifyToken, async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
    }

    await RecommendationService.trackUserView(req.userId, productId);

    res.json({
      success: true,
      message: 'View tracked',
    });
  } catch (error) {
    logger.error('Track view error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track view',
      error: error.message,
    });
  }
});

/**
 * GET /api/recommendations/comprehensive
 * Get comprehensive recommendations (multiple strategies)
 */
router.get('/comprehensive', verifyToken, async (req, res) => {
  try {
    const {
      includePersonalized = true,
      includeTrending = true,
      includeDiscount = true,
      limit = 20,
    } = req.query;

    const recommendations = await RecommendationService.getComprehensiveRecommendations(
      req.userId,
      {
        includePersonalized: includePersonalized === 'true',
        includeTrending: includeTrending === 'true',
        includeDiscount: includeDiscount === 'true',
        limit: parseInt(limit),
      }
    );

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    logger.error('Get comprehensive recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get comprehensive recommendations',
      error: error.message,
    });
  }
});

module.exports = router;
