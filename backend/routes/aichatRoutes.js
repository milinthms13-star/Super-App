const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const AIChatService = require('../services/AIChatService');
const logger = require('../utils/logger');

/**
 * Phase 3: AI-Powered Chat Support Routes
 * Handles customer support, product Q&A, order tracking, returns/refunds, escalations
 */

/**
 * POST /api/ecommerce/ai-chat/init
 * Initialize a new AI chat session for user
 */
router.post('/init', auth, async (req, res) => {
  try {
    const { userId } = req;
    
    const result = await AIChatService.initializeChatSession(userId);
    
    res.json({
      success: true,
      data: result,
      message: 'Chat session initialized',
    });
  } catch (error) {
    logger.error('Error initializing chat:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/ecommerce/ai-chat/message
 * Send message to AI and get response
 */
router.post('/message', auth, async (req, res) => {
  try {
    const { sessionId, message, context = {} } = req.body;
    const { userId } = req;

    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        message: 'sessionId and message are required',
      });
    }

    const result = await AIChatService.sendMessage(
      sessionId,
      userId,
      message,
      context
    );

    res.json({
      success: true,
      data: result,
      message: 'Message processed',
    });
  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/ai-chat/history/:sessionId
 * Retrieve chat history for a session
 */
router.get('/history/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await AIChatService.getChatHistory(sessionId);

    res.json({
      success: true,
      data: result,
      message: 'Chat history retrieved',
    });
  } catch (error) {
    logger.error('Error fetching chat history:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/ecommerce/ai-chat/close
 * Close a chat session
 */
router.post('/close', auth, async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'sessionId is required',
      });
    }

    const result = await AIChatService.closeChatSession(sessionId);

    res.json({
      success: true,
      data: result,
      message: 'Chat session closed',
    });
  } catch (error) {
    logger.error('Error closing chat:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/ecommerce/ai-chat/rate
 * Rate the AI chat quality
 */
router.post('/rate', auth, async (req, res) => {
  try {
    const { sessionId, rating, feedback = '' } = req.body;

    if (!sessionId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'sessionId and rating are required',
      });
    }

    const result = await AIChatService.rateChatSession(
      sessionId,
      rating,
      feedback
    );

    res.json({
      success: true,
      data: result,
      message: 'Chat session rated',
    });
  } catch (error) {
    logger.error('Error rating chat:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
