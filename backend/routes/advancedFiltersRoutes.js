/**
 * advancedFiltersRoutes.js
 * API endpoints for advanced product filtering
 */

const express = require('express');
const router = express.Router();
const AdvancedFilterService = require('../services/AdvancedFilterService');
const { verifyToken } = require('../middlewares/authMiddleware');
const logger = require('../config/logger');

/**
 * POST /api/filters/search
 * Search products with advanced filters
 */
router.post('/search', async (req, res) => {
  try {
    const {
      query = '',
      filters = {},
      page = 1,
      pageSize = 20,
      sortBy = 'relevance',
    } = req.body;

    const result = await AdvancedFilterService.searchWithFilters(
      query,
      filters,
      { page, pageSize, sortBy }
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Search with filters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search with filters',
      error: error.message,
    });
  }
});

/**
 * GET /api/filters/aggregations
 * Get available filter options and counts
 */
router.get('/aggregations', async (req, res) => {
  try {
    const { category, subcategory } = req.query;

    const aggregations = await AdvancedFilterService.getFilterAggregations(
      category,
      subcategory
    );

    res.json({
      success: true,
      data: aggregations,
    });
  } catch (error) {
    logger.error('Get filter aggregations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get filter aggregations',
      error: error.message,
    });
  }
});

/**
 * GET /api/filters/suggestions
 * Get personalized filter suggestions for user
 */
router.get('/suggestions', verifyToken, async (req, res) => {
  try {
    const suggestions = await AdvancedFilterService.getFilterSuggestions(
      req.userId
    );

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    logger.error('Get filter suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get filter suggestions',
      error: error.message,
    });
  }
});

/**
 * POST /api/filters/preferences
 * Save user filter preferences
 */
router.post('/preferences', verifyToken, async (req, res) => {
  try {
    const { filters } = req.body;

    await AdvancedFilterService.saveFilterPreferences(req.userId, filters);

    res.json({
      success: true,
      message: 'Filter preferences saved successfully',
    });
  } catch (error) {
    logger.error('Save filter preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save filter preferences',
      error: error.message,
    });
  }
});

/**
 * GET /api/filters/preferences
 * Get user saved filter preferences
 */
router.get('/preferences', verifyToken, async (req, res) => {
  try {
    const savedFilters = await AdvancedFilterService.getSavedFilters(
      req.userId
    );

    res.json({
      success: true,
      data: savedFilters,
    });
  } catch (error) {
    logger.error('Get saved filters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get saved filters',
      error: error.message,
    });
  }
});

module.exports = router;
