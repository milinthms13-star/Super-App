const express = require('express');
const router = express.Router();
const { authenticate: authMiddleware } = require('../middleware/auth');
const readReceiptService = require('../services/readReceiptService');
const logger = require('../utils/logger');

/**
 * Read Receipt Routes
 * Delivery and read tracking with analytics
 * All routes require authentication
 */

// Middleware
router.use(authMiddleware);

/**
 * POST /read/:messageId
 * Mark message as read
 * Body: { metadata? { platform, deviceId } }
 */
router.post('/read/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;
    const { metadata } = req.body;

    const receipt = await readReceiptService.markAsRead(messageId, userId, metadata);

    res.status(201).json({
      status: 'success',
      message: 'Message marked as read',
      data: receipt,
    });
  } catch (error) {
    logger.error('Error marking as read', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to mark as read',
      error: error.message,
    });
  }
});

/**
 * POST /read-batch
 * Batch mark messages as read
 * Body: { messageIds[], metadata? }
 */
router.post('/read-batch', async (req, res) => {
  try {
    const { messageIds, metadata } = req.body;
    const userId = req.user._id;

    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({
        status: 'error',
        message: 'messageIds array is required',
      });
    }

    const results = await readReceiptService.batchMarkAsRead(messageIds, userId, metadata);

    res.status(201).json({
      status: 'success',
      message: 'Messages marked as read',
      data: results,
      count: results.length,
    });
  } catch (error) {
    logger.error('Error batch marking as read', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to batch mark as read',
      error: error.message,
    });
  }
});

/**
 * POST /delivered
 * Mark messages as delivered
 * Body: { messageIds[], metadata? }
 */
router.post('/delivered', async (req, res) => {
  try {
    const { messageIds, metadata } = req.body;
    const userId = req.user._id;

    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({
        status: 'error',
        message: 'messageIds array is required',
      });
    }

    const results = await readReceiptService.markAsDelivered(messageIds, userId, metadata);

    res.status(201).json({
      status: 'success',
      message: 'Messages marked as delivered',
      data: results,
      count: results.length,
    });
  } catch (error) {
    logger.error('Error marking as delivered', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to mark as delivered',
      error: error.message,
    });
  }
});

/**
 * GET /:messageId
 * Get read receipt info for message
 */
router.get('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    const receipt = await readReceiptService.getReadReceipt(messageId);

    res.status(200).json({
      status: 'success',
      data: receipt,
      messageId,
    });
  } catch (error) {
    logger.error('Error getting read receipt', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get read receipt',
      error: error.message,
    });
  }
});

/**
 * GET /batch/receipts
 * Get read receipts for multiple messages
 * Query: messageIds[]
 */
router.get('/batch/receipts', async (req, res) => {
  try {
    const { messageIds } = req.query;

    if (!messageIds) {
      return res.status(400).json({
        status: 'error',
        message: 'messageIds are required',
      });
    }

    const idArray = Array.isArray(messageIds) ? messageIds : [messageIds];
    const receipts = await readReceiptService.getBatchReadReceipts(idArray);

    res.status(200).json({
      status: 'success',
      data: receipts,
      count: receipts.length,
    });
  } catch (error) {
    logger.error('Error getting batch receipts', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get batch receipts',
      error: error.message,
    });
  }
});

/**
 * GET /unread/:chatId
 * Get unread messages in chat
 * Query: limit, offset
 */
router.get('/unread/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;
    const { limit = 50, offset = 0 } = req.query;

    const messages = await readReceiptService.getUnreadMessages(chatId, userId);

    res.status(200).json({
      status: 'success',
      data: messages.slice(offset, offset + limit),
      chatId,
      count: messages.length,
    });
  } catch (error) {
    logger.error('Error getting unread messages', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get unread messages',
      error: error.message,
    });
  }
});

/**
 * GET /unread-count
 * Get unread message count across chats
 * Query: chatIds[]
 */
router.get('/unread-count', async (req, res) => {
  try {
    const { chatIds } = req.query;
    const userId = req.user._id;

    if (!chatIds) {
      return res.status(400).json({
        status: 'error',
        message: 'chatIds are required',
      });
    }

    const idArray = Array.isArray(chatIds) ? chatIds : [chatIds];
    const count = await readReceiptService.getUnreadCount(userId, idArray);

    res.status(200).json({
      status: 'success',
      unreadCount: count,
    });
  } catch (error) {
    logger.error('Error getting unread count', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get unread count',
      error: error.message,
    });
  }
});

/**
 * GET /:chatId/progress
 * Get read progress for chat
 */
router.get('/:chatId/progress', async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const progress = await readReceiptService.getReadProgress(chatId, userId);

    res.status(200).json({
      status: 'success',
      data: progress,
      chatId,
    });
  } catch (error) {
    logger.error('Error getting read progress', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get read progress',
      error: error.message,
    });
  }
});

/**
 * GET /:chatId/stats
 * Get read statistics for chat
 */
router.get('/:chatId/stats', async (req, res) => {
  try {
    const { chatId } = req.params;

    const stats = await readReceiptService.getChatReadStats(chatId);

    res.status(200).json({
      status: 'success',
      data: stats,
      chatId,
    });
  } catch (error) {
    logger.error('Error getting read stats', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get read stats',
      error: error.message,
    });
  }
});

/**
 * GET /:messageId/readers
 * Get list of users who read message
 */
router.get('/:messageId/readers', async (req, res) => {
  try {
    const { messageId } = req.params;

    const readers = await readReceiptService.getReaders(messageId);

    res.status(200).json({
      status: 'success',
      data: readers,
      messageId,
      count: readers.length,
    });
  } catch (error) {
    logger.error('Error getting readers', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get readers',
      error: error.message,
    });
  }
});

/**
 * GET /:chatId/typing
 * Get typing status in chat
 */
router.get('/:chatId/typing', async (req, res) => {
  try {
    const { chatId } = req.params;

    const typingUsers = await readReceiptService.getTypingStatus(chatId);

    res.status(200).json({
      status: 'success',
      data: typingUsers,
      chatId,
    });
  } catch (error) {
    logger.error('Error getting typing status', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get typing status',
      error: error.message,
    });
  }
});

module.exports = router;
