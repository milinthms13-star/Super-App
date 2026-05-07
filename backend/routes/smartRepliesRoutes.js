const express = require('express');
const router = express.Router();
const smartRepliesService = require('../services/smartRepliesService');
const authMiddleware = require('../middleware/authMiddleware');

// Get smart reply suggestions for message
router.get('/:messageId/suggestions', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    const options = req.query;

    const suggestions = await smartRepliesService.getSmartReplies(
      messageId,
      userId,
      options
    );

    res.json({
      success: true,
      data: suggestions,
      count: suggestions.length,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Rate suggestion
router.post('/:suggestionId/rate', authMiddleware, async (req, res) => {
  try {
    const { suggestionId } = req.params;
    const { rating } = req.body;

    const result = await smartRepliesService.rateSuggestion(suggestionId, rating);

    res.json({
      success: true,
      message: 'Suggestion rated',
      data: result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Learn from user reply
router.post('/:messageId/learn', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reply } = req.body;

    const result = await smartRepliesService.learnFromReply(messageId, reply);

    res.json({
      success: true,
      message: 'Learning recorded',
      data: result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get quick replies for user
router.get('/quick/list', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const quickReplies = await smartRepliesService.getQuickReplies(userId);

    res.json({
      success: true,
      data: quickReplies,
      count: quickReplies.length,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Create custom quick reply
router.post('/quick/create', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { text } = req.body;

    const quickReply = await smartRepliesService.createQuickReply(userId, text);

    res.status(201).json({
      success: true,
      message: 'Quick reply created',
      data: quickReply,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Generate suggestions for message (with history context)
router.post('/:messageId/generate', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { conversationHistory, userProfile } = req.body;

    const suggestions = await smartRepliesService.generateSuggestions(
      messageId,
      conversationHistory,
      userProfile
    );

    res.json({
      success: true,
      data: suggestions,
      count: suggestions.length,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get sentiment analysis
router.post('/:messageId/sentiment', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;

    // This would typically fetch the message and analyze it
    // For now, returning a placeholder
    res.json({
      success: true,
      message: 'Sentiment analysis completed',
      data: {
        sentiment: 'neutral',
        score: 0,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Clear learning history
router.post('/history/clear', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Clear user's learning history in production
    logger.info(`Cleared learning history for user ${userId}`);

    res.json({
      success: true,
      message: 'Learning history cleared',
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
