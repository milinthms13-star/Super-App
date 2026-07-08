/**
 * Real-Time Communication Routes
 * WebSocket connection management and real-time features
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const websocketService = require('../services/websocketService');
const logger = require('../utils/logger');

/**
 * GET /api/matrimonial/realtime/online-users
 * Get list of currently online users
 */
router.get('/online-users', authenticate, async (req, res) => {
  try {
    const onlineUsers = websocketService.getOnlineUsers();
    
    res.json({
      success: true,
      data: {
        count: onlineUsers.length,
        users: onlineUsers
      }
    });
  } catch (error) {
    logger.error('Error fetching online users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch online users'
    });
  }
});

/**
 * GET /api/matrimonial/realtime/user-status/:userId
 * Check if a specific user is online
 */
router.get('/user-status/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const isOnline = websocketService.isUserOnline(userId);
    
    res.json({
      success: true,
      data: {
        userId,
        status: isOnline ? 'online' : 'offline',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error checking user status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check user status'
    });
  }
});

/**
 * POST /api/matrimonial/realtime/broadcast
 * Admin endpoint to broadcast message to all connected users
 */
router.post('/broadcast', authenticate, async (req, res) => {
  try {
    const user = req.user;
    
    if (user.role !== 'admin' && user.registrationType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { message, type = 'announcement' } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    websocketService.broadcast({
      type,
      payload: {
        message,
        from: 'admin',
        timestamp: new Date().toISOString()
      }
    });

    res.json({
      success: true,
      message: 'Broadcast sent successfully'
    });
  } catch (error) {
    logger.error('Error broadcasting message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to broadcast message'
    });
  }
});

/**
 * POST /api/matrimonial/realtime/notify-user
 * Send notification to specific user
 */
router.post('/notify-user', authenticate, async (req, res) => {
  try {
    const { userId, message, type = 'notification' } = req.body;

    if (!userId || !message) {
      return res.status(400).json({
        success: false,
        message: 'userId and message are required'
      });
    }

    const sent = websocketService.sendToClient(userId, {
      type,
      payload: {
        message,
        from: req.user._id || req.user.id,
        timestamp: new Date().toISOString()
      }
    });

    res.json({
      success: sent,
      message: sent ? 'Notification sent' : 'User is offline'
    });
  } catch (error) {
    logger.error('Error sending notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification'
    });
  }
});

module.exports = router;
