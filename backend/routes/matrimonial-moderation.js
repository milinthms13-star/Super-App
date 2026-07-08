const express = require('express');
const router = express.Router();
const { contentModerationService } = require('../services/contentModerationService');
const { errorTrackingService } = require('../services/errorTrackingService');
const auth = require('../middleware/auth');

// Admin middleware
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Test content moderation (for admins and users)
router.post('/test', auth, async (req, res) => {
  try {
    const { text, context = 'general' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await contentModerationService.moderateText(text, context);

    res.json(result);
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'moderation-test' });
    res.status(500).json({ error: 'Moderation test failed' });
  }
});

// Moderate profile content
router.post('/profile', auth, async (req, res) => {
  try {
    const profileData = req.body;

    const result = await contentModerationService.moderateProfile(profileData);

    res.json(result);
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'profile-moderation' });
    res.status(500).json({ error: 'Profile moderation failed' });
  }
});

// Moderate message content
router.post('/message', auth, async (req, res) => {
  try {
    const { message, receiverId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await contentModerationService.moderateMessage(message, {
      senderId: req.user.id,
      receiverId
    });

    res.json(result);
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'message-moderation' });
    res.status(500).json({ error: 'Message moderation failed' });
  }
});

// Moderate image (admin only)
router.post('/image', auth, isAdmin, async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    const result = await contentModerationService.moderateImage(imageUrl);

    res.json(result);
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'image-moderation' });
    res.status(500).json({ error: 'Image moderation failed' });
  }
});

// Batch moderate multiple texts (admin only)
router.post('/batch', auth, isAdmin, async (req, res) => {
  try {
    const { texts, context = 'general' } = req.body;

    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ error: 'Texts array is required' });
    }

    if (texts.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 texts per batch' });
    }

    const results = await contentModerationService.batchModerate(texts, context);

    res.json({ results, count: results.length });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'batch-moderation' });
    res.status(500).json({ error: 'Batch moderation failed' });
  }
});

// Get moderation statistics (admin only)
router.get('/stats', auth, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await contentModerationService.getModerationStats(start, end);

    res.json(stats);
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'moderation-stats' });
    res.status(500).json({ error: 'Failed to get moderation statistics' });
  }
});

// Check if user is rate limited (admin only)
router.get('/check-rate-limit/:userId', auth, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { action = 'message' } = req.query;

    const isSpamming = await contentModerationService.checkSpamRate(userId, action);

    res.json({ isSpamming, action });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'check-rate-limit' });
    res.status(500).json({ error: 'Failed to check rate limit' });
  }
});

// Get flagged content for review (admin only)
router.get('/flagged-content', auth, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, severity } = req.query;

    // This would query a database of flagged content
    // For now, return placeholder data
    const flaggedContent = {
      items: [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        pages: 0
      }
    };

    res.json(flaggedContent);
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'flagged-content' });
    res.status(500).json({ error: 'Failed to get flagged content' });
  }
});

// Review and take action on flagged content (admin only)
router.post('/review/:contentId', auth, isAdmin, async (req, res) => {
  try {
    const { contentId } = req.params;
    const { action, reason } = req.body;

    if (!['approve', 'reject', 'delete'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Log the admin action
    await errorTrackingService.logAudit('content_review', {
      adminId: req.user.id,
      contentId,
      action,
      reason
    });

    res.json({ success: true, contentId, action });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'content-review' });
    res.status(500).json({ error: 'Failed to review content' });
  }
});

// Update moderation settings (admin only)
router.patch('/settings', auth, isAdmin, async (req, res) => {
  try {
    const { autoBlockThreshold, flagThreshold, moderationEnabled } = req.body;

    // Update settings
    if (autoBlockThreshold !== undefined) {
      contentModerationService.autoBlockThreshold = parseFloat(autoBlockThreshold);
    }
    if (flagThreshold !== undefined) {
      contentModerationService.flagThreshold = parseFloat(flagThreshold);
    }
    if (moderationEnabled !== undefined) {
      contentModerationService.moderationEnabled = Boolean(moderationEnabled);
    }

    await errorTrackingService.logAudit('moderation_settings_updated', {
      adminId: req.user.id,
      settings: { autoBlockThreshold, flagThreshold, moderationEnabled }
    });

    res.json({
      success: true,
      settings: {
        autoBlockThreshold: contentModerationService.autoBlockThreshold,
        flagThreshold: contentModerationService.flagThreshold,
        moderationEnabled: contentModerationService.moderationEnabled
      }
    });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'update-moderation-settings' });
    res.status(500).json({ error: 'Failed to update moderation settings' });
  }
});

// Get current moderation settings (admin only)
router.get('/settings', auth, isAdmin, async (req, res) => {
  try {
    res.json({
      autoBlockThreshold: contentModerationService.autoBlockThreshold,
      flagThreshold: contentModerationService.flagThreshold,
      moderationEnabled: contentModerationService.moderationEnabled,
      perspectiveApiEnabled: !!contentModerationService.perspectiveApiKey,
      openaiApiEnabled: !!contentModerationService.openaiApiKey
    });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'get-moderation-settings' });
    res.status(500).json({ error: 'Failed to get moderation settings' });
  }
});

module.exports = router;
