const ChatService = require('../services/FoodDeliveryChatService');
const NotificationService = require('../services/FoodDeliveryNotificationService');
const WebSocketManager = require('../services/WebSocketManager');

class ChatController {
  /**
   * Get or create chat for order
   */
  static async getOrCreateChat(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user?.userId;

      if (!orderId || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: orderId, user authentication',
        });
      }

      const chat = await ChatService.getOrCreateChat(orderId, userId, req.body.deliveryPersonId);

      res.status(201).json({
        success: true,
        data: chat,
        message: 'Chat retrieved or created successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Send message
   */
  static async sendMessage(req, res) {
    try {
      const { orderId } = req.params;
      const { messageType, content, location, imageUrl } = req.body;
      const userId = req.user?.userId;
      const senderName = req.user?.name || 'User';

      if (!orderId || !messageType || !content) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: messageType, content',
        });
      }

      const additionalData = {};
      if (location) additionalData.location = location;
      if (imageUrl) additionalData.imageUrl = imageUrl;

      const result = await ChatService.sendMessage(
        orderId,
        req.body.sender || 'customer', // customer or rider
        userId,
        senderName,
        messageType,
        content,
        additionalData
      );

      // Broadcast via WebSocket
      WebSocketManager._broadcastChatMessage(orderId, {
        sender: req.body.sender || 'customer',
        senderName,
        content,
        messageType,
      });

      // Send notification to other party
      await NotificationService.sendMessageNotification(
        orderId,
        senderName,
        content.substring(0, 50),
        {
          userId: req.body.recipientId,
          deviceToken: req.body.deviceToken,
        }
      );

      res.status(201).json({
        success: true,
        data: result,
        message: 'Message sent successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get chat messages
   */
  static async getMessages(req, res) {
    try {
      const { orderId } = req.params;
      const { limit = 50, skip = 0 } = req.query;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: orderId',
        });
      }

      const messages = await ChatService.getMessages(
        orderId,
        parseInt(limit),
        parseInt(skip)
      );

      res.json({
        success: true,
        data: messages,
        count: messages.length,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Mark messages as read
   */
  static async markAsRead(req, res) {
    try {
      const { orderId } = req.params;
      const { reader } = req.body; // 'customer' or 'rider'

      if (!orderId || !reader) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: reader',
        });
      }

      const updatedCount = await ChatService.markMessagesAsRead(orderId, reader);

      res.json({
        success: true,
        data: {
          orderId,
          messagesMarkedRead: updatedCount,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get unread count
   */
  static async getUnreadCount(req, res) {
    try {
      const { orderId } = req.params;
      const { reader } = req.query;

      if (!orderId || !reader) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: orderId, reader',
        });
      }

      const count = await ChatService.getUnreadCount(orderId, reader);

      res.json({
        success: true,
        data: {
          orderId,
          unreadCount: count,
          reader,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Initiate call
   */
  static async initiateCall(req, res) {
    try {
      const { orderId } = req.params;
      const { callType } = req.body; // audio or video
      const userId = req.user?.userId;

      if (!orderId || !callType) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: callType',
        });
      }

      const callRecord = await ChatService.initiateCall(
        orderId,
        callType,
        req.body.initiator || 'customer'
      );

      // Send notification to other party
      await NotificationService.sendIncomingCallNotification(
        orderId,
        req.user?.name || 'User',
        {
          userId: req.body.recipientId,
          deviceToken: req.body.deviceToken,
        }
      );

      res.status(201).json({
        success: true,
        data: callRecord,
        message: 'Call initiated',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * End call
   */
  static async endCall(req, res) {
    try {
      const { orderId } = req.params;
      const { status = 'completed' } = req.body;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: orderId',
        });
      }

      const callRecord = await ChatService.endCall(orderId, status);

      res.json({
        success: true,
        data: callRecord,
        message: 'Call ended',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get call history
   */
  static async getCallHistory(req, res) {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: orderId',
        });
      }

      const history = await ChatService.getCallHistory(orderId);

      res.json({
        success: true,
        data: history,
        count: history.length,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Send location
   */
  static async sendLocation(req, res) {
    try {
      const { orderId } = req.params;
      const { latitude, longitude, address } = req.body;
      const userId = req.user?.userId;
      const senderName = req.user?.name || 'User';

      if (!orderId || !latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: latitude, longitude',
        });
      }

      const result = await ChatService.sendLocation(
        orderId,
        req.body.sender || 'customer',
        userId,
        senderName,
        latitude,
        longitude,
        address
      );

      // Broadcast via WebSocket
      WebSocketManager._broadcastChatMessage(orderId, {
        sender: req.body.sender || 'customer',
        senderName,
        content: 'Shared location',
        messageType: 'location',
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'Location shared successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Send image
   */
  static async sendImage(req, res) {
    try {
      const { orderId } = req.params;
      const { imageUrl } = req.body;
      const userId = req.user?.userId;
      const senderName = req.user?.name || 'User';

      if (!orderId || !imageUrl) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: imageUrl',
        });
      }

      const result = await ChatService.sendImage(
        orderId,
        req.body.sender || 'customer',
        userId,
        senderName,
        imageUrl
      );

      // Broadcast via WebSocket
      WebSocketManager._broadcastChatMessage(orderId, {
        sender: req.body.sender || 'customer',
        senderName,
        content: 'Sent an image',
        messageType: 'image',
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'Image sent successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Block chat
   */
  static async blockChat(req, res) {
    try {
      const { orderId } = req.params;
      const { blockedBy } = req.body;

      if (!orderId || !blockedBy) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: blockedBy',
        });
      }

      const chat = await ChatService.blockChat(orderId, blockedBy);

      res.json({
        success: true,
        data: { orderId, isBlocked: chat.isBlocked },
        message: 'Chat blocked successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Unblock chat
   */
  static async unblockChat(req, res) {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: orderId',
        });
      }

      const chat = await ChatService.unblockChat(orderId);

      res.json({
        success: true,
        data: { orderId, isBlocked: chat.isBlocked },
        message: 'Chat unblocked successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get chat summary
   */
  static async getChatSummary(req, res) {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: orderId',
        });
      }

      const summary = await ChatService.getChatSummary(orderId);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get user chats
   */
  static async getUserChats(req, res) {
    try {
      const userId = req.user?.userId;
      const { limit = 20, skip = 0 } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const chats = await ChatService.getUserChats(
        userId,
        parseInt(limit),
        parseInt(skip)
      );

      res.json({
        success: true,
        data: chats,
        count: chats.length,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get quick replies
   */
  static async getQuickReplies(req, res) {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: orderId',
        });
      }

      const replies = await ChatService.getQuickReplies(orderId);

      res.json({
        success: true,
        data: replies,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Close chat
   */
  static async closeChat(req, res) {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: orderId',
        });
      }

      const chat = await ChatService.closeChat(orderId);

      res.json({
        success: true,
        data: { orderId, chatStatus: chat.chatStatus },
        message: 'Chat closed successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Mute notifications
   */
  static async muteNotifications(req, res) {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: orderId',
        });
      }

      const chat = await ChatService.muteNotifications(orderId);

      res.json({
        success: true,
        data: { orderId, muteNotifications: chat.muteNotifications },
        message: 'Notifications muted',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Unmute notifications
   */
  static async unmuteNotifications(req, res) {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: orderId',
        });
      }

      const chat = await ChatService.unmuteNotifications(orderId);

      res.json({
        success: true,
        data: { orderId, muteNotifications: chat.muteNotifications },
        message: 'Notifications unmuted',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = ChatController;
