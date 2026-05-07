const express = require('express');
const router = express.Router();
const messageFilterService = require('../services/messageFilterService');
const authMiddleware = require('../middleware/authMiddleware');

// Create filter
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, conditions, actions } = req.body;
    const userId = req.user.id;

    const filter = await messageFilterService.createFilter(
      userId,
      name,
      conditions,
      actions
    );

    res.status(201).json({
      success: true,
      message: 'Filter created successfully',
      data: filter,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get filters for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const filters = await messageFilterService.getFilters(userId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: filters,
      count: filters.length,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Apply filters to message
router.post('/:messageId/apply', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const results = await messageFilterService.applyFilters(messageId, userId);

    res.json({
      success: true,
      message: `Applied ${results.matched.length} filters`,
      data: results,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update filter
router.patch('/:filterId', authMiddleware, async (req, res) => {
  try {
    const { filterId } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const filter = await messageFilterService.updateFilter(
      filterId,
      userId,
      updates
    );

    res.json({
      success: true,
      message: 'Filter updated successfully',
      data: filter,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete filter
router.delete('/:filterId', authMiddleware, async (req, res) => {
  try {
    const { filterId } = req.params;
    const userId = req.user.id;

    const result = await messageFilterService.deleteFilter(filterId, userId);

    res.json({
      success: true,
      message: 'Filter deleted successfully',
      data: result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get filtered messages
router.post('/messages/query', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conditions, limit = 20, offset = 0 } = req.body;

    // Would query messages based on filter conditions
    // Placeholder implementation
    res.json({
      success: true,
      data: [],
      count: 0,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get filter statistics
router.get('/stats/overview', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await messageFilterService.getFilterStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Reorder filters by priority
router.post('/priority/reorder', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { filterIds } = req.body;

    const result = await messageFilterService.reorderFilters(userId, filterIds);

    res.json({
      success: true,
      message: 'Filters reordered successfully',
      data: result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Test filter conditions against message
router.post('/:filterId/test', authMiddleware, async (req, res) => {
  try {
    const { filterId } = req.params;
    const { messageData } = req.body;

    // Would test filter conditions
    res.json({
      success: true,
      message: 'Filter test completed',
      data: {
        matches: false,
        reason: 'Message does not match filter conditions',
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
