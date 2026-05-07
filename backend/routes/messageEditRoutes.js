const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const messageEditService = require('../services/messageEditService');
const logger = require('../utils/logger');

/**
 * Message Edit Routes
 * All routes require authentication
 */

router.use(authMiddleware);

/**
 * PUT /:messageId
 * Edit message content
 * Body: { newContent, media?, editReason?, metadata? }
 */
router.put('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;
    const { newContent, media, editReason, metadata } = req.body;

    // Validate ownership
    const validation = await messageEditService.validateEditAllowed(
      messageId,
      userId
    );
    if (!validation.allowed) {
      return res.status(403).json({
        status: 'error',
        message: validation.reason,
      });
    }

    const result = await messageEditService.editMessage(
      messageId,
      userId,
      { newContent, media, editReason, metadata }
    );

    res.status(200).json({
      status: 'success',
      message: 'Message edited successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Error editing message', { error });
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * GET /:messageId/history
 * Get edit history for message
 * Query: ?limit=20&offset=0
 */
router.get('/:messageId/history', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const history = await messageEditService.getEditHistory(messageId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.status(200).json({
      status: 'success',
      message: 'Edit history retrieved',
      data: history,
    });
  } catch (error) {
    logger.error('Error getting edit history', { error });
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * GET /:messageId/version/:versionId
 * Get specific version of message
 */
router.get('/:messageId/version/:versionId', async (req, res) => {
  try {
    const { messageId, versionId } = req.params;

    const version = await messageEditService.getMessageVersion(
      messageId,
      versionId
    );

    res.status(200).json({
      status: 'success',
      message: 'Message version retrieved',
      data: version,
    });
  } catch (error) {
    logger.error('Error getting message version', { error });
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * POST /:messageId/rollback/:versionId
 * Rollback message to previous version
 */
router.post('/:messageId/rollback/:versionId', async (req, res) => {
  try {
    const { messageId, versionId } = req.params;
    const userId = req.user._id;

    const restored = await messageEditService.rollbackMessage(
      messageId,
      userId,
      versionId
    );

    res.status(200).json({
      status: 'success',
      message: 'Message rolled back successfully',
      data: restored,
    });
  } catch (error) {
    logger.error('Error rolling back message', { error });
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * GET /:messageId/count
 * Get edit count for message
 */
router.get('/:messageId/count', async (req, res) => {
  try {
    const { messageId } = req.params;

    const count = await messageEditService.getEditCount(messageId);

    res.status(200).json({
      status: 'success',
      message: 'Edit count retrieved',
      data: { messageId, editCount: count },
    });
  } catch (error) {
    logger.error('Error getting edit count', { error });
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * POST /compare
 * Compare two message versions
 * Body: { messageId, versionId1, versionId2 }
 */
router.post('/compare', async (req, res) => {
  try {
    const { messageId, versionId1, versionId2 } = req.body;

    if (!messageId || !versionId1 || !versionId2) {
      return res.status(400).json({
        status: 'error',
        message: 'messageId, versionId1, and versionId2 are required',
      });
    }

    const diff = await messageEditService.compareVersions(
      messageId,
      versionId1,
      versionId2
    );

    res.status(200).json({
      status: 'success',
      message: 'Versions compared',
      data: diff,
    });
  } catch (error) {
    logger.error('Error comparing versions', { error });
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * GET /stats/user
 * Get current user's edit statistics
 */
router.get('/stats/user', async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await messageEditService.getEditorStats(userId);

    res.status(200).json({
      status: 'success',
      message: 'User stats retrieved',
      data: stats,
    });
  } catch (error) {
    logger.error('Error getting user stats', { error });
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * GET /chat/:chatId/timeline
 * Get edit timeline for chat
 * Query: ?limit=50&offset=0&startDate=&endDate=
 */
router.get('/chat/:chatId/timeline', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 50, offset = 0, startDate, endDate } = req.query;

    const timeline = await messageEditService.getChatEditTimeline(chatId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    res.status(200).json({
      status: 'success',
      message: 'Edit timeline retrieved',
      data: timeline,
    });
  } catch (error) {
    logger.error('Error getting edit timeline', { error });
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * POST /validate/:messageId
 * Validate if edit is allowed
 */
router.post('/validate/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const validation = await messageEditService.validateEditAllowed(
      messageId,
      userId
    );

    res.status(200).json({
      status: 'success',
      message: 'Validation complete',
      data: validation,
    });
  } catch (error) {
    logger.error('Error validating edit', { error });
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

module.exports = router;
