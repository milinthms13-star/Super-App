const express = require('express');
const router = express.Router();
const SearchHistory = require('../models/SearchHistory');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// Get user's search history
router.get('/me', auth, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    let history = await SearchHistory.getOrCreate(req.user.id, req.user.email);

    const recentSearches = history.getRecentSearches(parseInt(limit));

    res.json({
      success: true,
      data: {
        totalSearches: history.totalSearches,
        recentSearches,
        favoriteSearches: history.favoriteSearchQueries,
        trendingSearches: history.trendingSearches,
      },
    });
  } catch (error) {
    console.error('Error fetching search history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch search history' });
  }
});

// Record a search
router.post('/record', auth, async (req, res) => {
  try {
    const {
      query,
      filters = {},
      resultsCount = 0,
      clickedProductId = null,
      deviceType = 'mobile',
      language = 'english',
      executionTimeMs = 0,
    } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Search query required' });
    }

    let history = await SearchHistory.getOrCreate(req.user.id, req.user.email);

    history.addSearch(query, filters, resultsCount, {
      clickedProductId,
      deviceType,
      language,
      executionTimeMs,
    });

    await history.save();

    res.status(201).json({
      success: true,
      message: 'Search recorded',
      data: {
        totalSearches: history.totalSearches,
      },
    });
  } catch (error) {
    console.error('Error recording search:', error);
    res.status(500).json({ success: false, error: 'Failed to record search' });
  }
});

// Get trending searches (public or user-specific)
router.get('/trending', auth, async (req, res) => {
  try {
    let history = await SearchHistory.findByEmail(req.user.email);

    if (!history) {
      return res.json({
        success: true,
        data: {
          trending: [],
        },
      });
    }

    const trending = history.getTrendingQueries();

    res.json({
      success: true,
      data: {
        trending,
      },
    });
  } catch (error) {
    console.error('Error fetching trending searches:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch trending searches' });
  }
});

// Save a search
router.post('/save', auth, async (req, res) => {
  try {
    const { name, query, filters = {} } = req.body;

    if (!name || !query) {
      return res.status(400).json({ success: false, error: 'Name and query required' });
    }

    let history = await SearchHistory.getOrCreate(req.user.id, req.user.email);

    history.saveSearch(name, query, filters);
    await history.save();

    res.status(201).json({
      success: true,
      message: 'Search saved',
      data: {
        savedSearchesCount: history.savedSearches.length,
      },
    });
  } catch (error) {
    console.error('Error saving search:', error);
    res.status(500).json({ success: false, error: 'Failed to save search' });
  }
});

// Get saved searches
router.get('/saved', auth, async (req, res) => {
  try {
    let history = await SearchHistory.findByEmail(req.user.email);

    if (!history) {
      return res.json({
        success: true,
        data: {
          savedSearches: [],
        },
      });
    }

    res.json({
      success: true,
      data: {
        savedSearches: history.savedSearches,
      },
    });
  } catch (error) {
    console.error('Error fetching saved searches:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch saved searches' });
  }
});

// Get saved search by ID
router.get('/saved/:searchId', auth, async (req, res) => {
  try {
    const history = await SearchHistory.findByEmail(req.user.email);

    if (!history) {
      return res.status(404).json({ success: false, error: 'Search history not found' });
    }

    const savedSearch = history.savedSearches.find((s) => s.searchId === req.params.searchId);

    if (!savedSearch) {
      return res.status(404).json({ success: false, error: 'Saved search not found' });
    }

    res.json({
      success: true,
      data: savedSearch,
    });
  } catch (error) {
    console.error('Error fetching saved search:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch saved search' });
  }
});

// Remove saved search
router.delete('/saved/:searchId', auth, async (req, res) => {
  try {
    const history = await SearchHistory.findByEmail(req.user.email);

    if (!history) {
      return res.status(404).json({ success: false, error: 'Search history not found' });
    }

    history.removeSavedSearch(req.params.searchId);
    await history.save();

    res.json({
      success: true,
      message: 'Saved search removed',
    });
  } catch (error) {
    console.error('Error removing saved search:', error);
    res.status(500).json({ success: false, error: 'Failed to remove saved search' });
  }
});

// Get search analytics
router.get('/analytics', auth, async (req, res) => {
  try {
    let history = await SearchHistory.findByEmail(req.user.email);

    if (!history) {
      return res.json({
        success: true,
        data: {
          totalSearches: 0,
          uniqueSearchQueries: 0,
          favoriteSearches: [],
          averageResultsPerSearch: 0,
          lastSearchedAt: null,
          savedSearchesCount: 0,
        },
      });
    }

    const analytics = history.getSearchAnalytics();

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch search analytics' });
  }
});

// Clear search history
router.delete('/clear', auth, async (req, res) => {
  try {
    let history = await SearchHistory.findByEmail(req.user.email);

    if (!history) {
      return res.json({
        success: true,
        message: 'No search history to clear',
      });
    }

    history.searches = [];
    history.totalSearches = 0;
    history.favoriteSearchQueries = [];
    await history.save();

    res.json({
      success: true,
      message: 'Search history cleared',
    });
  } catch (error) {
    console.error('Error clearing search history:', error);
    res.status(500).json({ success: false, error: 'Failed to clear search history' });
  }
});

// Remove specific search from history
router.delete('/:index', auth, async (req, res) => {
  try {
    const history = await SearchHistory.findByEmail(req.user.email);

    if (!history) {
      return res.status(404).json({ success: false, error: 'Search history not found' });
    }

    const index = parseInt(req.params.index);

    if (index < 0 || index >= history.searches.length) {
      return res.status(400).json({ success: false, error: 'Invalid search index' });
    }

    history.searches.splice(index, 1);
    history.updateFavoriteSearches();
    await history.save();

    res.json({
      success: true,
      message: 'Search removed from history',
    });
  } catch (error) {
    console.error('Error removing search:', error);
    res.status(500).json({ success: false, error: 'Failed to remove search' });
  }
});

// Get search suggestions based on history and popular searches
router.get('/suggestions/:query', auth, async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 10 } = req.query;

    if (!query || query.trim().length === 0) {
      return res.json({
        success: true,
        data: {
          suggestions: [],
        },
      });
    }

    // Get user's search history
    let history = await SearchHistory.findByEmail(req.user.email);

    const suggestions = [];

    // Add matching searches from user's history
    if (history) {
      const matching = history.searches
        .filter(
          (search) =>
            search.query.includes(query.toLowerCase()) &&
            !suggestions.includes(search.query)
        )
        .map((s) => s.query)
        .slice(0, limit / 2);

      suggestions.push(...matching);
    }

    // Add trending searches if available (placeholder - would query trending collection)
    const trendingMatching = [
      'iphone 15',
      'samsung galaxy',
      'airpods',
      'laptop under 50000',
      'smartwatch',
    ]
      .filter((s) => s.includes(query.toLowerCase()) && !suggestions.includes(s))
      .slice(0, limit - suggestions.length);

    suggestions.push(...trendingMatching);

    res.json({
      success: true,
      data: {
        suggestions: suggestions.slice(0, parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch suggestions' });
  }
});

module.exports = router;
