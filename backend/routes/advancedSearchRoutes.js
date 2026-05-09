/**
 * advancedSearchRoutes.js
 * Routes for full-text search, filters, facets, auto-complete
 */

const express = require('express');
const router = express.Router();
const AdvancedSearchService = require('../services/AdvancedSearchService');
const { verifyToken } = require('../middleware/authMiddleware');

// Product search
router.get('/products', async (req, res) => {
  try {
    const { query, minPrice, maxPrice, category, vendor, minRating, inStock, page, limit } = req.query;
    
    if (req.user?.userId) {
      await AdvancedSearchService.trackSearchQuery(req.user.userId, query);
    }

    const filters = { minPrice, maxPrice, category, vendor, minRating, inStock };
    const result = await AdvancedSearchService.searchProducts(
      query,
      filters,
      parseInt(page) || 1,
      parseInt(limit) || 20
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Search with facets
router.get('/facets', async (req, res) => {
  try {
    const { query } = req.query;
    const result = await AdvancedSearchService.searchWithFacets(query);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Autocomplete
router.get('/autocomplete', async (req, res) => {
  try {
    const { query, type = 'product', limit = 10 } = req.query;
    const result = await AdvancedSearchService.getAutocompleteSuggestions(
      query,
      type,
      parseInt(limit)
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Order search
router.get('/orders', verifyToken, async (req, res) => {
  try {
    const { status, minAmount, maxAmount, dateFrom, dateTo, page, limit } = req.query;
    const filters = { status, minAmount, maxAmount, dateFrom, dateTo };
    const result = await AdvancedSearchService.searchOrders(
      req.user.userId,
      filters,
      parseInt(page) || 1,
      parseInt(limit) || 20
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Saved searches
router.post('/saved', verifyToken, async (req, res) => {
  try {
    const { name, query, filters } = req.body;
    const result = await AdvancedSearchService.saveSearch(
      req.user.userId,
      name,
      query,
      filters
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/saved', verifyToken, async (req, res) => {
  try {
    const result = await AdvancedSearchService.getSavedSearches(req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/saved/:searchId', verifyToken, async (req, res) => {
  try {
    const result = await AdvancedSearchService.deleteSavedSearch(
      req.user.userId,
      req.params.searchId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Trending searches
router.get('/trending', async (req, res) => {
  try {
    const result = await AdvancedSearchService.getTrendingSearches();
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
