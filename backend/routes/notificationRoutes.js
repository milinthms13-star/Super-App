/**
 * notificationRoutes.js
 * Routes for notification management
 */

const express = require('express');
const router = express.Router();
const NotificationService = require('../services/NotificationService');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// Send notification
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    const result = await NotificationService.sendNotification(userId, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Send bulk notification
router.post('/bulk', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userIds, title, message, type } = req.body;
    const result = await NotificationService.sendBulkNotification(userIds, {
      title,
      message,
      type,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get user notifications
router.get('/', verifyToken, async (req, res) => {
  try {
    const filters = {
      page: req.query.page || 1,
      limit: req.query.limit || 20,
      unreadOnly: req.query.unreadOnly === 'true',
    };
    const result = await NotificationService.getUserNotifications(
      req.user.userId,
      filters
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Mark notification as read
router.put('/:notificationId/read', verifyToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const result = await NotificationService.markAsRead(notificationId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', verifyToken, async (req, res) => {
  try {
    const result = await NotificationService.markAllAsRead(req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete notification
router.delete('/:notificationId', verifyToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const result = await NotificationService.deleteNotification(notificationId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Set notification preferences
router.put('/preferences', verifyToken, async (req, res) => {
  try {
    const result = await NotificationService.setNotificationPreferences(
      req.user.userId,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get notification preferences
router.get('/preferences', verifyToken, async (req, res) => {
  try {
    const result = await NotificationService.getNotificationPreferences(
      req.user.userId
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Send order notification
router.post('/order/:orderId/:eventType', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { orderId, eventType } = req.params;
    const result = await NotificationService.sendOrderNotification(
      orderId,
      eventType
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Send promotional notification
router.post('/promotional', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userIds, title, message, discount, code } = req.body;
    const result = await NotificationService.sendPromotionalNotification(
      userIds,
      { title, message, discount, code }
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
