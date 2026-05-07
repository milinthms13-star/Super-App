// Phase 3: Feature 9 - Message Reactions, Editing, and Rich Text Support
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const reactionService = require('../services/reactionService');
const Message = require('../models/Message');
const EditHistory = require('../models/EditHistory');
const MessageReaction = require('../models/MessageReaction');

/**
 * Add reaction to message
 * POST /api/messaging/v3/reactions
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { messageId, emoji } = req.body;
    const userId = req.user.userId;

    if (!messageId || !emoji) {
      return res.status(400).json({ error: 'Message ID and emoji are required' });
    }

    // Verify message exists and user has access
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const reaction = await reactionService.addReaction(messageId, userId, emoji);
    
    res.status(201).json({
      success: true,
      data: reaction,
      message: 'Reaction added successfully'
    });
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ 
      error: 'Failed to add reaction',
      details: error.message 
    });
  }
});

/**
 * Remove reaction from message
 * DELETE /api/messaging/v3/reactions/:reactionId
 */
router.delete('/:reactionId', authMiddleware, async (req, res) => {
  try {
    const { reactionId } = req.params;
    const userId = req.user.userId;

    // Verify ownership or admin
    const reaction = await MessageReaction.findById(reactionId);
    if (!reaction) {
      return res.status(404).json({ error: 'Reaction not found' });
    }

    if (reaction.userId.toString() !== userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this reaction' });
    }

    await reactionService.removeReaction(reactionId);

    res.json({
      success: true,
      message: 'Reaction removed successfully'
    });
  } catch (error) {
    console.error('Error removing reaction:', error);
    res.status(500).json({ 
      error: 'Failed to remove reaction',
      details: error.message 
    });
  }
});

/**
 * Get all reactions for a message
 * GET /api/messaging/v3/messages/:messageId/reactions
 */
router.get('/messages/:messageId/reactions', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;

    // Verify message exists
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const reactions = await reactionService.getReactions(messageId);
    const summary = await MessageReaction.getReactionsSummary(messageId);

    res.json({
      success: true,
      data: {
        reactions,
        summary: summary || {}
      }
    });
  } catch (error) {
    console.error('Error fetching reactions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch reactions',
      details: error.message 
    });
  }
});

/**
 * Get who reacted with specific emoji
 * GET /api/messaging/v3/reactions/reactors/:messageId?emoji=:emoji
 */
router.get('/reactors/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.query;

    if (!emoji) {
      return res.status(400).json({ error: 'Emoji query parameter is required' });
    }

    const reactors = await MessageReaction.getWhoReacted(messageId, emoji);

    res.json({
      success: true,
      data: reactors,
      emoji
    });
  } catch (error) {
    console.error('Error fetching reactors:', error);
    res.status(500).json({ 
      error: 'Failed to fetch reactors',
      details: error.message 
    });
  }
});

/**
 * Edit message
 * PUT /api/messaging/v3/messages/:messageId
 */
router.put('/messages/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content, reason } = req.body;
    const userId = req.user.userId;

    if (!content) {
      return res.status(400).json({ error: 'New content is required' });
    }

    // Verify message belongs to user
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.senderId.toString() !== userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to edit this message' });
    }

    const editedMessage = await reactionService.editMessage(
      messageId, 
      content, 
      userId,
      reason || 'Message edited'
    );

    res.json({
      success: true,
      data: editedMessage,
      message: 'Message edited successfully'
    });
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ 
      error: 'Failed to edit message',
      details: error.message 
    });
  }
});

/**
 * Delete message (soft delete)
 * DELETE /api/messaging/v3/messages/:messageId
 */
router.delete('/messages/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    // Verify message belongs to user
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.senderId.toString() !== userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    await reactionService.deleteMessage(messageId);

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ 
      error: 'Failed to delete message',
      details: error.message 
    });
  }
});

/**
 * Hard delete message (admin only)
 * DELETE /api/messaging/v3/messages/:messageId/permanent
 */
router.delete('/messages/:messageId/permanent', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can permanently delete messages' });
    }

    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    await reactionService.hardDeleteMessage(messageId);

    res.json({
      success: true,
      message: 'Message permanently deleted'
    });
  } catch (error) {
    console.error('Error permanently deleting message:', error);
    res.status(500).json({ 
      error: 'Failed to permanently delete message',
      details: error.message 
    });
  }
});

/**
 * Get message edit history
 * GET /api/messaging/v3/messages/:messageId/edit-history
 */
router.get('/messages/:messageId/edit-history', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;

    // Verify message exists
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const editHistory = await EditHistory.getMessageEditHistory(messageId);

    res.json({
      success: true,
      data: editHistory,
      editCount: editHistory.length
    });
  } catch (error) {
    console.error('Error fetching edit history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch edit history',
      details: error.message 
    });
  }
});

/**
 * Get markdown preview
 * POST /api/messaging/v3/messages/format-preview
 */
router.post('/format-preview', authMiddleware, async (req, res) => {
  try {
    const { content, maxLength } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const preview = reactionService.generatePreview(content, maxLength || 200);
    const formatted = reactionService.formatMarkdown(content);
    const mentions = reactionService.extractMentions(content);
    const hashtags = reactionService.extractHashtags(content);

    res.json({
      success: true,
      data: {
        preview,
        formatted,
        mentions,
        hashtags,
        isEmpty: content.trim().length === 0
      }
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({ 
      error: 'Failed to generate preview',
      details: error.message 
    });
  }
});

/**
 * Get trending reactions (last N days)
 * GET /api/messaging/v3/trending-reactions?timeRange=7&limit=20
 */
router.get('/trending-reactions', authMiddleware, async (req, res) => {
  try {
    const { timeRange = 7, limit = 20 } = req.query;
    const timeRangeMs = parseInt(timeRange) * 24 * 60 * 60 * 1000; // Convert days to ms

    const trendingReactions = await reactionService.getPopularReactions(
      timeRangeMs, 
      parseInt(limit)
    );

    res.json({
      success: true,
      data: trendingReactions,
      timeRange: parseInt(timeRange),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching trending reactions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch trending reactions',
      details: error.message 
    });
  }
});

/**
 * Get reaction counts summary
 * GET /api/messaging/v3/reactions/counts/:messageId
 */
router.get('/counts/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;

    // Verify message exists
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const counts = await MessageReaction.getReactionCounts(messageId);

    res.json({
      success: true,
      data: counts,
      totalReactions: counts.reduce((sum, r) => sum + r.count, 0)
    });
  } catch (error) {
    console.error('Error fetching reaction counts:', error);
    res.status(500).json({ 
      error: 'Failed to fetch reaction counts',
      details: error.message 
    });
  }
});

module.exports = router;
