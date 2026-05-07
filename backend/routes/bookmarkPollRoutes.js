const express = require('express');
const router = express.Router();
const bookmarkPollService = require('../services/bookmarkPollService');
const authMiddleware = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

// All routes require authentication
router.use(authMiddleware);

// ============ BOOKMARK ENDPOINTS ============

/**
 * POST /api/messaging/v4/bookmarks
 * Bookmark a message
 */
router.post('/', async (req, res) => {
  try {
    const { messageId, tag } = req.body;

    if (!messageId) {
      return res.status(400).json({ error: 'messageId is required' });
    }

    const bookmark = await bookmarkPollService.bookmarkMessage(
      req.user._id,
      messageId,
      tag || 'general'
    );

    res.status(201).json({
      message: 'Message bookmarked successfully',
      data: bookmark,
    });
  } catch (error) {
    logger.error('Error bookmarking message:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/messaging/v4/bookmarks/:messageId
 * Remove a bookmark
 */
router.delete('/:messageId', async (req, res) => {
  try {
    const bookmark = await bookmarkPollService.unbookmarkMessage(
      req.user._id,
      req.params.messageId
    );

    res.json({
      message: 'Bookmark removed successfully',
      data: bookmark,
    });
  } catch (error) {
    logger.error('Error removing bookmark:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/messaging/v4/bookmarks
 * Get user's bookmarks
 */
router.get('/', async (req, res) => {
  try {
    const { tag, folder, star, page, limit } = req.query;

    const result = await bookmarkPollService.getBookmarks(req.user._id, {
      tag,
      folder,
      star: star === 'true',
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });

    res.json(result);
  } catch (error) {
    logger.error('Error retrieving bookmarks:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/messaging/v4/bookmarks/search
 * Search bookmarks
 */
router.get('/search/:query', async (req, res) => {
  try {
    const { page, limit, tag } = req.query;
    const { query } = req.params;

    const result = await bookmarkPollService.searchBookmarks(req.user._id, query, {
      tag,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });

    res.json(result);
  } catch (error) {
    logger.error('Error searching bookmarks:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/messaging/v4/bookmarks/:messageId
 * Update bookmark
 */
router.put('/:messageId', async (req, res) => {
  try {
    const { tag, notes, folder, star } = req.body;

    const bookmark = await bookmarkPollService.updateBookmark(
      req.user._id,
      req.params.messageId,
      { tag, notes, folder, star }
    );

    res.json({
      message: 'Bookmark updated successfully',
      data: bookmark,
    });
  } catch (error) {
    logger.error('Error updating bookmark:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ POLL ENDPOINTS ============

/**
 * POST /api/messaging/v4/polls
 * Create a poll
 */
router.post('/polls', async (req, res) => {
  try {
    const { chatId, question, options, pollConfig } = req.body;

    if (!chatId || !question || !options) {
      return res.status(400).json({
        error: 'Missing required fields: chatId, question, options',
      });
    }

    const poll = await bookmarkPollService.createPoll(
      chatId,
      req.user._id,
      question,
      options,
      pollConfig
    );

    res.status(201).json({
      message: 'Poll created successfully',
      data: poll,
    });
  } catch (error) {
    logger.error('Error creating poll:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/messaging/v4/polls/:id/vote
 * Vote on a poll
 */
router.post('/polls/:id/vote', async (req, res) => {
  try {
    const { selectedOptions } = req.body;

    if (!selectedOptions || !Array.isArray(selectedOptions)) {
      return res.status(400).json({
        error: 'selectedOptions must be an array',
      });
    }

    const vote = await bookmarkPollService.votePoll(
      req.params.id,
      req.user._id,
      selectedOptions
    );

    res.status(201).json({
      message: 'Vote recorded successfully',
      data: vote,
    });
  } catch (error) {
    logger.error('Error voting on poll:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/messaging/v4/polls/:id/results
 * Get poll results
 */
router.get('/polls/:id/results', async (req, res) => {
  try {
    const results = await bookmarkPollService.getPollResults(req.params.id);

    res.json({
      message: 'Poll results retrieved successfully',
      data: results,
    });
  } catch (error) {
    logger.error('Error retrieving poll results:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/messaging/v4/polls/:id
 * Delete a poll
 */
router.delete('/polls/:id', async (req, res) => {
  try {
    const poll = await bookmarkPollService.deletePoll(req.params.id);

    res.json({
      message: 'Poll deleted successfully',
      data: poll,
    });
  } catch (error) {
    logger.error('Error deleting poll:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/messaging/v4/chats/:chatId/polls
 * Get polls for a chat
 */
router.get('/chats/:chatId/polls', async (req, res) => {
  try {
    const { page, limit, status } = req.query;

    const result = await bookmarkPollService.getChatPolls(req.params.chatId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      status,
    });

    res.json(result);
  } catch (error) {
    logger.error('Error retrieving chat polls:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
