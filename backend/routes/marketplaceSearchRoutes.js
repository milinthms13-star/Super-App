/**
 * marketplaceSearchRoutes.js
 * Routes for advanced marketplace search
 */

const express = require('express');
const router = express.Router();
const MarketplaceSearchService = require('../services/MarketplaceSearchService');
const { verifyToken } = require('../middleware/authMiddleware');
const logger = require('../config/logger');

/**
 * GET /api/ecommerce/search
 * Perform advanced product search (public)
 */
router.get('/', async (req, res) => {
  try {
    const query = req.query.q || '';
    const filters = {
      category: req.query.category,
      minPrice: req.query.minPrice ? parseInt(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? parseInt(req.query.maxPrice) : undefined,
      rating: req.query.rating ? parseInt(req.query.rating) : undefined,
      inStock: req.query.inStock === 'true',
      seller: req.query.seller,
    };

    const options = {
      page: req.query.page ? parseInt(req.query.page) : 1,
      limit: req.query.limit ? parseInt(req.query.limit) : 20,
      sortBy: req.query.sortBy || 'relevance',
      userId: req.user?.userId,
    };

    const result = await MarketplaceSearchService.searchProducts(query, filters, options);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error searching products:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ecommerce/search/suggestions
 * Get search suggestions/autocomplete (public)
 */
router.get('/suggestions', async (req, res) => {
  try {
    const query = req.query.q || '';
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const result = await MarketplaceSearchService.getSearchSuggestions(query, limit);
    res.status(200).json({ success: true, data: result, message: 'Suggestions retrieved' });
  } catch (error) {
    logger.error('Error getting search suggestions:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ecommerce/search/facets
 * Get faceted search results (public)
 */
router.get('/facets', async (req, res) => {
  try {
    const query = req.query.q || '';
    const filters = {
      category: req.query.category,
      minPrice: req.query.minPrice ? parseInt(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? parseInt(req.query.maxPrice) : undefined,
    };

    const result = await MarketplaceSearchService.getFacetedResults(query, filters);
    res.status(200).json({ success: true, data: result, message: 'Facets retrieved' });
  } catch (error) {
    logger.error('Error getting faceted results:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ecommerce/search/trending
 * Get trending searches (public)
 */
router.get('/trending', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const period = req.query.period || '7';
    const result = await MarketplaceSearchService.getTrendingSearches(limit, period);
    res.status(200).json({ success: true, data: result, message: 'Trending searches' });
  } catch (error) {
    logger.error('Error getting trending searches:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ecommerce/search/sellers
 * Search sellers/vendors (public)
 */
router.get('/sellers', async (req, res) => {
  try {
    const query = req.query.q || '';
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const result = await MarketplaceSearchService.searchSellers(query, limit);
    res.status(200).json({ success: true, data: result, message: 'Sellers retrieved' });
  } catch (error) {
    logger.error('Error searching sellers:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ecommerce/search/advanced-filter
 * Advanced filter search (public)
 */
router.post('/advanced-filter', async (req, res) => {
  try {
    const result = await MarketplaceSearchService.advancedFilter(req.body);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error in advanced filter:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ecommerce/search/personalized
 * Personalized search results (protected)
 */
router.get('/personalized', verifyToken, async (req, res) => {
  try {
    const query = req.query.q || '';
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const result = await MarketplaceSearchService.getPersonalizedSearch(
      req.user.userId,
      query,
      limit
    );
    res.status(200).json({ success: true, data: result, message: 'Personalized results' });
  } catch (error) {
    logger.error('Error getting personalized search:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
