const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const searchService = require('../services/searchService');
const logger = require('../utils/logger');

/**
 * Feature 8: Message Search & Indexing Routes
 * Endpoints for searching messages with advanced filters
 */

/**
 * @route GET /api/messaging/v3/search
 * @desc Search messages
 * @access Private
 * @query q - search query
 * @query conversationId - filter by conversation
 * @query senderId - filter by sender
 * @query fromDate - date range start
 * @query toDate - date range end
 * @query type - message type (text, media, etc)
 * @query limit - results per page (default 50)
 * @query offset - pagination offset (default 0)
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { q, conversationId, senderId, fromDate, toDate, type, limit, offset } =
      req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }

    const filters = {
      conversationId,
      senderId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      messageType: type,
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
    };

    const results = await searchService.searchMessages(req.user._id, q, filters);

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Error searching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
    });
  }
});

/**
 * @route GET /api/messaging/v3/search/advanced
 * @desc Advanced search with syntax support
 * @access Private
 * @query q - search string with syntax (e.g., "from:user date:2024-01-01 keyword")
 */
router.get('/advanced', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }

    const results = await searchService.advancedSearch(req.user._id, q);

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Error in advanced search:', error);
    res.status(500).json({
      success: false,
      error: 'Advanced search failed',
    });
  }
});

/**
 * @route GET /api/messaging/v3/search/fuzzy
 * @desc Fuzzy search for typo tolerance
 * @access Private
 * @query q - search query
 * @query limit - results limit
 */
router.get('/fuzzy', authMiddleware, async (req, res) => {
  try {
    const { q, limit } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }

    const results = await searchService.fuzzySearch(req.user._id, q, parseInt(limit) || 50);

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Error in fuzzy search:', error);
    res.status(500).json({
      success: false,
      error: 'Fuzzy search failed',
    });
  }
});

/**
 * @route GET /api/messaging/v3/search/by-sender/:senderId
 * @desc Search messages from a specific sender
 * @access Private
 */
router.get('/by-sender/:senderId', authMiddleware, async (req, res) => {
  try {
    const { senderId } = req.params;
    const { limit } = req.query;

    const results = await searchService.searchBySender(
      req.user._id,
      senderId,
      parseInt(limit) || 50
    );

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Error searching by sender:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
    });
  }
});

/**
 * @route GET /api/messaging/v3/search/by-date
 * @desc Search messages by date range
 * @access Private
 * @query fromDate - start date
 * @query toDate - end date
 * @query limit - results limit
 */
router.get('/by-date', authMiddleware, async (req, res) => {
  try {
    const { fromDate, toDate, limit } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        error: 'fromDate and toDate are required',
      });
    }

    const results = await searchService.searchByDateRange(
      req.user._id,
      new Date(fromDate),
      new Date(toDate),
      parseInt(limit) || 50
    );

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Error searching by date:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
    });
  }
});

/**
 * @route GET /api/messaging/v3/search/trending-keywords
 * @desc Get trending keywords/hashtags
 * @access Public
 * @query timeRange - time range in days (default 7)
 * @query limit - results limit (default 20)
 */
router.get('/trending-keywords', async (req, res) => {
  try {
    const { timeRange = '7', limit = '20' } = req.query;
    const timeRangeMs = parseInt(timeRange) * 24 * 60 * 60 * 1000;

    const keywords = await searchService.getPopularKeywords(timeRangeMs, parseInt(limit));

    res.status(200).json({
      success: true,
      data: keywords,
    });
  } catch (error) {
    logger.error('Error fetching trending keywords:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending keywords',
    });
  }
});

/**
 * @route GET /api/messaging/v3/search/history
 * @desc Get user's search history
 * @access Private
 * @query limit - number of history items
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { limit } = req.query;

    const history = await searchService.getSearchHistory(req.user._id, parseInt(limit) || 10);

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    logger.error('Error fetching search history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch search history',
    });
  }
});

/**
 * @route POST /api/messaging/v3/search/save
 * @desc Save a search for later
 * @access Private
 * @body searchName - name for the saved search
 * @body query - search query
 * @body filters - search filters
 */
router.post('/save', authMiddleware, async (req, res) => {
  try {
    const { searchName, query, filters } = req.body;

    if (!searchName || !query) {
      return res.status(400).json({
        success: false,
        error: 'searchName and query are required',
      });
    }

    const saved = await searchService.saveSearch(req.user._id, searchName, query, filters);

    res.status(201).json({
      success: true,
      data: saved,
    });
  } catch (error) {
    logger.error('Error saving search:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save search',
    });
  }
});

/**
 * @route GET /api/messaging/v3/search/export
 * @desc Export search results as CSV
 * @access Private
 * @query q - search query
 */
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const { q, conversationId, senderId, limit } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }

    const filters = {
      conversationId,
      senderId,
      limit: parseInt(limit) || 1000,
      offset: 0,
    };

    const results = await searchService.searchMessages(req.user._id, q, filters);
    const csv = await searchService.exportResults(req.user._id, results.results);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="search-results.csv"');
    res.send(csv);
  } catch (error) {
    logger.error('Error exporting search results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export results',
    });
  }
});

module.exports = router;
