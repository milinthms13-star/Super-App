/**
 * Saved Searches Routes
 * Save search filters and get notifications for new matches
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const SavedSearch = require('../models/SavedSearch');
const MatrimonialProfile = require('../models/MatrimonialProfile');
const logger = require('../utils/logger');

const router = express.Router();

router.use(authenticate);

// Get all saved searches
router.get('/', async (req, res) => {
  try {
    const profile = await MatrimonialProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    const searches = await SavedSearch.find({ 
      userId: req.user._id,
      isActive: true,
    }).sort({ lastUsed: -1, createdAt: -1 });

    res.json({
      success: true,
      data: searches,
    });
  } catch (error) {
    logger.error('Get saved searches failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch saved searches',
    });
  }
});

// Create saved search
router.post('/', async (req, res) => {
  try {
    const profile = await MatrimonialProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    const { name, description, filters, sortBy, notifyOnNewMatches, notificationFrequency } = req.body;

    if (!name || !filters) {
      return res.status(400).json({
        success: false,
        message: 'Name and filters are required',
      });
    }

    const savedSearch = await SavedSearch.create({
      userId: req.user._id,
      profileId: profile._id,
      name,
      description,
      filters,
      sortBy: sortBy || 'best-match',
      notifyOnNewMatches: notifyOnNewMatches !== false,
      notificationFrequency: notificationFrequency || 'daily',
    });

    res.json({
      success: true,
      message: 'Search saved successfully',
      data: savedSearch,
    });
  } catch (error) {
    logger.error('Save search failed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to save search',
    });
  }
});

// Update saved search
router.put('/:searchId', async (req, res) => {
  try {
    const { name, description, filters, sortBy, notifyOnNewMatches, notificationFrequency } = req.body;

    const savedSearch = await SavedSearch.findOneAndUpdate(
      { _id: req.params.searchId, userId: req.user._id },
      {
        name,
        description,
        filters,
        sortBy,
        notifyOnNewMatches,
        notificationFrequency,
      },
      { new: true }
    );

    if (!savedSearch) {
      return res.status(404).json({
        success: false,
        message: 'Saved search not found',
      });
    }

    res.json({
      success: true,
      message: 'Search updated successfully',
      data: savedSearch,
    });
  } catch (error) {
    logger.error('Update saved search failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update search',
    });
  }
});

// Use saved search (increment use count)
router.post('/:searchId/use', async (req, res) => {
  try {
    const savedSearch = await SavedSearch.findOneAndUpdate(
      { _id: req.params.searchId, userId: req.user._id },
      {
        $inc: { useCount: 1 },
        lastUsed: new Date(),
      },
      { new: true }
    );

    if (!savedSearch) {
      return res.status(404).json({
        success: false,
        message: 'Saved search not found',
      });
    }

    res.json({
      success: true,
      data: savedSearch,
    });
  } catch (error) {
    logger.error('Use saved search failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to use search',
    });
  }
});

// Delete saved search
router.delete('/:searchId', async (req, res) => {
  try {
    const result = await SavedSearch.findOneAndUpdate(
      { _id: req.params.searchId, userId: req.user._id },
      { isActive: false },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Saved search not found',
      });
    }

    res.json({
      success: true,
      message: 'Search deleted successfully',
    });
  } catch (error) {
    logger.error('Delete saved search failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete search',
    });
  }
});

module.exports = router;
