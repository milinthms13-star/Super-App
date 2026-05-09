/**
 * multiChannelNotificationRoutes.js
 * API endpoints for multi-channel notifications
 */

const express = require('express');
const router = express.Router();
const MultiChannelNotificationService = require('../services/MultiChannelNotificationService');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');
const logger = require('../config/logger');

/**
 * POST /api/multi-notifications/send
 * Send notification through multiple channels
 */
router.post('/send', verifyToken, async (req, res) => {
  try {
    const { userId, title, message, type, channels, data } = req.body;

    // Only admins can send to other users
    if (userId !== req.userId && !req.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!title || !message || !channels || channels.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Title, message, and channels are required',
      });
    }

    const results = await MultiChannelNotificationService.sendMultiChannelNotification(
      userId || req.userId,
      {
        title,
        message,
        type: type || 'general',
        channels,
        data,
      }
    );

    res.json({
      success: true,
      message: 'Notification sent',
      data: results,
    });
  } catch (error) {
    logger.error('Send multi-channel notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message,
    });
  }
});

/**
 * POST /api/multi-notifications/bulk-send
 * Send bulk notifications to user segment (Admin only)
 */
router.post('/bulk-send', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userIds, title, message, type, channels, data } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'UserIds array is required',
      });
    }

    if (!title || !message || !channels || channels.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Title, message, and channels are required',
      });
    }

    const results = await MultiChannelNotificationService.sendBulkNotification(
      userIds,
      {
        title,
        message,
        type: type || 'general',
        channels,
        data,
      }
    );

    res.json({
      success: true,
      message: `Notification sent to ${userIds.length} users`,
      data: results,
    });
  } catch (error) {
    logger.error('Send bulk notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send bulk notification',
      error: error.message,
    });
  }
});

/**
 * GET /api/multi-notifications/preferences
 * Get user notification preferences
 */
router.get('/preferences', verifyToken, async (req, res) => {
  try {
    const preferences = await MultiChannelNotificationService.getNotificationPreferences(
      req.userId
    );

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    logger.error('Get notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification preferences',
      error: error.message,
    });
  }
});

/**
 * PUT /api/multi-notifications/preferences
 * Update user notification preferences
 */
router.put('/preferences', verifyToken, async (req, res) => {
  try {
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Preferences object is required',
      });
    }

    const updated = await MultiChannelNotificationService.updateNotificationPreferences(
      req.userId,
      preferences
    );

    res.json({
      success: true,
      message: 'Notification preferences updated',
      data: updated,
    });
  } catch (error) {
    logger.error('Update notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences',
      error: error.message,
    });
  }
});

/**
 * POST /api/multi-notifications/push-subscription
 * Register push notification subscription
 */
router.post('/push-subscription', verifyToken, async (req, res) => {
  try {
    const { subscription, deviceToken, deviceName } = req.body;

    if (!deviceToken) {
      return res.status(400).json({
        success: false,
        message: 'Device token is required',
      });
    }

    const pushSubscription = await MultiChannelNotificationService.registerPushSubscription(
      req.userId,
      {
        subscription,
        deviceToken,
        deviceName,
      }
    );

    res.json({
      success: true,
      message: 'Push subscription registered',
      data: pushSubscription,
    });
  } catch (error) {
    logger.error('Register push subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register push subscription',
      error: error.message,
    });
  }
});

/**
 * POST /api/multi-notifications/test
 * Send test notification
 */
router.post('/test', verifyToken, async (req, res) => {
  try {
    const { channels } = req.body;

    if (!channels || channels.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Channels are required',
      });
    }

    const results = await MultiChannelNotificationService.sendMultiChannelNotification(
      req.userId,
      {
        title: 'Test Notification',
        message: 'This is a test notification from Malabara Bazaar',
        type: 'test',
        channels,
        data: {
          testFlag: true,
        },
      }
    );

    res.json({
      success: true,
      message: 'Test notification sent',
      data: results,
    });
  } catch (error) {
    logger.error('Send test notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: error.message,
    });
  }
});

module.exports = router;
