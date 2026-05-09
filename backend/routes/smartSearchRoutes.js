/**
 * smartSearchRoutes.js
 * API endpoints for advanced search with typo correction and fuzzy matching
 */

const express = require('express');
const router = express.Router();
const SmartSearchService = require('../services/SmartSearchService');
const { verifyToken } = require('../middlewares/authMiddleware');
const logger = require('../config/logger');

/**
 * GET /api/search/smart
 * Search with fuzzy matching and typo correction
 */
router.get('/smart', async (req, res) => {
  try {
    const { query, limit = 20, page = 1 } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    const results = await SmartSearchService.fuzzySearch(query, {
      limit: parseInt(limit),
      page: parseInt(page),
    });

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Smart search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message,
    });
  }
});

/**
 * GET /api/search/auto-suggestions
 * Get auto-suggestions for search query
 */
router.get('/auto-suggestions', async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const suggestions = await SmartSearchService.getAutoSuggestions(
      query,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    logger.error('Get auto suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get suggestions',
      error: error.message,
    });
  }
});

/**
 * GET /api/search/trending
 * Get trending search terms
 */
router.get('/trending', async (req, res) => {
  try {
    const { limit = 10, days = 7 } = req.query;

    const trending = await SmartSearchService.getTrendingSearches(
      parseInt(limit),
      parseInt(days)
    );

    res.json({
      success: true,
      data: trending,
    });
  } catch (error) {
    logger.error('Get trending searches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trending searches',
      error: error.message,
    });
  }
});

/**
 * POST /api/search/advanced
 * Advanced search with filters
 */
router.post('/advanced', async (req, res) => {
  try {
    const { query, filters = {}, page = 1, pageSize = 20, sortBy = 'relevance' } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    const results = await SmartSearchService.advancedSearch(
      query,
      filters,
      {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        sortBy,
      }
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Advanced search error:', error);
    res.status(500).json({
      success: false,
      message: 'Advanced search failed',
      error: error.message,
    });
  }
});

/**
 * POST /api/search/track
 * Track search query
 */
router.post('/track', verifyToken, async (req, res) => {
  try {
    const { query, resultCount = 0 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query is required',
      });
    }

    await SmartSearchService.trackSearch(query, req.userId, resultCount);

    res.json({
      success: true,
      message: 'Search tracked',
    });
  } catch (error) {
    logger.error('Track search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track search',
      error: error.message,
    });
  }
});

/**
 * GET /api/search/recent
 * Get recently searched items for user
 */
router.get('/recent', verifyToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const searches = await SmartSearchService.getRecentSearches(
      req.userId,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: searches,
    });
  } catch (error) {
    logger.error('Get recent searches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recent searches',
      error: error.message,
    });
  }
});

/**
 * GET /api/search/regional-keywords
 * Get regional language keywords
 */
router.get('/regional-keywords', async (req, res) => {
  try {
    const { language = 'en' } = req.query;

    const keywords = await SmartSearchService.getRegionalKeywords(language);

    res.json({
      success: true,
      data: keywords,
    });
  } catch (error) {
    logger.error('Get regional keywords error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get regional keywords',
      error: error.message,
    });
  }
});

/**
 * POST /api/search/voice
 * Voice search (audio to text)
 */
router.post('/voice', verifyToken, async (req, res) => {
  try {
    const { query, limit = 20, page = 1 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query is required',
      });
    }

    const results = await SmartSearchService.voiceSearch(query, req.userId, {
      limit: parseInt(limit),
      page: parseInt(page),
    });

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Voice search error:', error);
    res.status(500).json({
      success: false,
      message: 'Voice search failed',
      error: error.message,
    });
  }
});

module.exports = router;
