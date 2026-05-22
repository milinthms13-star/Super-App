const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const NilaAIHubService = require('../services/NilaAIHubService');
const logger = require('../utils/logger');

router.get('/recommendations/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 6;
    const recommendations = await NilaAIHubService.getTrendingRecommendations(limit);
    res.status(200).json({ success: true, data: recommendations, message: 'Trending recommendations retrieved' });
  } catch (error) {
    logger.error('Error getting trending recommendations:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/recommendations/personalized', auth.authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 6;
    const recommendations = await NilaAIHubService.getPersonalizedRecommendations(req.user?.id, limit);
    res.status(200).json({ success: true, data: recommendations, message: 'Personalized recommendations retrieved' });
  } catch (error) {
    logger.error('Error getting personalized recommendations:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/ai-chat/init', auth.optionalToken, async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const result = await NilaAIHubService.initializeChatSession(userId);
    res.status(200).json({ success: true, data: result, message: 'Chat session initialized' });
  } catch (error) {
    logger.error('Error initializing NilaAIHub chat session:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/ai-chat/message', auth.optionalToken, async (req, res) => {
  try {
    const { sessionId, message, context = {} } = req.body;
    const userId = req.user?.id || null;

    if (!sessionId || !message) {
      return res.status(400).json({ success: false, message: 'sessionId and message are required' });
    }

    const result = await NilaAIHubService.sendMessage(sessionId, userId, message, context);
    res.status(200).json({ success: true, data: result, message: 'Message processed' });
  } catch (error) {
    logger.error('Error sending NilaAIHub message:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/ai-chat/history/:sessionId', auth.optionalToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await NilaAIHubService.getChatHistory(sessionId);
    res.status(200).json({ success: true, data: result, message: 'Chat history retrieved' });
  } catch (error) {
    logger.error('Error fetching NilaAIHub chat history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/ai-chat/close', auth.optionalToken, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'sessionId is required' });
    }

    const result = await NilaAIHubService.closeChatSession(sessionId);
    res.status(200).json({ success: true, data: result, message: 'Chat session closed' });
  } catch (error) {
    logger.error('Error closing NilaAIHub chat session:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/ai-chat/rate', auth.authenticate, async (req, res) => {
  try {
    const { sessionId, rating, feedback = '' } = req.body;
    if (!sessionId || typeof rating !== 'number') {
      return res.status(400).json({ success: false, message: 'sessionId and numeric rating are required' });
    }

    const result = await NilaAIHubService.rateChatSession(sessionId, rating, feedback);
    res.status(200).json({ success: true, data: result, message: 'Chat session rated' });
  } catch (error) {
    logger.error('Error rating NilaAIHub chat session:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
