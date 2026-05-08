const Chat = require('../models/FoodDeliveryChat');
const FoodDeliveryOrder = require('../models/FoodDeliveryOrder');

class ChatService {
  /**
   * Get or create chat for order
   */
  static async getOrCreateChat(orderId, userId, deliveryPersonId) {
    try {
      let chat = await Chat.findOne({ orderId });

      if (!chat) {
        // Create new chat
        chat = new Chat({
          orderId,
          userId,
          deliveryPersonId,
          chatStatus: 'active',
          participants: [
            {
              userId,
              name: 'Customer',
              role: 'customer',
              joinedAt: new Date(),
            },
            {
              userId: deliveryPersonId,
              name: 'Rider',
              role: 'rider',
              joinedAt: new Date(),
            },
          ],
          quickReplies: [
            {
              label: 'Thanks!',
              message: 'Thanks for the delivery!',
              emoji: '🙏',
            },
            {
              label: 'Hurry',
              message: 'Can you hurry up please?',
              emoji: '⏱️',
            },
            {
              label: 'Wrong address',
              message: 'I think you have the wrong address',
              emoji: '📍',
            },
            {
              label: 'Call me',
              message: 'Please call me when you arrive',
              emoji: '📞',
            },
          ],
        });

        await chat.save();
      }

      return chat;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send message
   */
  static async sendMessage(orderId, sender, senderId, senderName, messageType, content, additionalData = {}) {
    try {
      const chat = await Chat.findOne({ orderId });
      if (!chat) {
        throw new Error('Chat not found');
      }

      // Check if chat is blocked
      if (chat.isBlocked && chat.blockedBy === sender) {
        throw new Error('You have blocked this chat');
      }

      let messageData = {
        messageType,
        content,
      };

      // Add location data if applicable
      if (messageType === 'location' && additionalData.location) {
        messageData.location = additionalData.location;
      }

      // Add call data if applicable
      if (messageType === 'call' && additionalData.callData) {
        messageData.callData = additionalData.callData;
      }

      // Add image URL if applicable
      if (messageType === 'image' && additionalData.imageUrl) {
        messageData.imageUrl = additionalData.imageUrl;
      }

      const messageId = chat.addMessage(sender, senderId, senderName, messageType, content);

      await chat.save();

      // Emit WebSocket event to notify other party
      // Will be handled by WebSocketManager

      return {
        messageId,
        message: chat.messages[chat.messages.length - 1],
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get chat messages
   */
  static async getMessages(orderId, limit = 50, skip = 0) {
    try {
      const chat = await Chat.findOne({ orderId }).select('messages');
      if (!chat) {
        throw new Error('Chat not found');
      }

      if (!chat.messages) {
        return [];
      }

      // Get recent messages
      const startIdx = Math.max(0, chat.messages.length - skip - limit);
      const endIdx = chat.messages.length - skip;

      return chat.messages.slice(startIdx, endIdx);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  static async markMessagesAsRead(orderId, reader) {
    try {
      const chat = await Chat.findOne({ orderId });
      if (!chat) {
        throw new Error('Chat not found');
      }

      const updatedCount = chat.markAsRead(reader);
      await chat.save();

      return updatedCount;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get unread messages
   */
  static async getUnreadMessages(orderId, reader) {
    try {
      const chat = await Chat.findOne({ orderId });
      if (!chat) {
        throw new Error('Chat not found');
      }

      return chat.getUnreadMessages(reader);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get unread count
   */
  static async getUnreadCount(orderId, reader) {
    try {
      const chat = await Chat.findOne({ orderId });
      if (!chat) {
        throw new Error('Chat not found');
      }

      const unreadMessages = chat.getUnreadMessages(reader);
      return unreadMessages.length;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Initiate call
   */
  static async initiateCall(orderId, callType, initiator) {
    try {
      const chat = await Chat.findOne({ orderId });
      if (!chat) {
        throw new Error('Chat not found');
      }

      const callRecord = chat.initiateCall(callType, initiator);
      await chat.save();

      return callRecord;
    } catch (error) {
      throw error;
    }
  }

  /**
   * End call
   */
  static async endCall(orderId, status = 'completed') {
    try {
      const chat = await Chat.findOne({ orderId });
      if (!chat) {
        throw new Error('Chat not found');
      }

      const callRecord = chat.endCall(status);
      await chat.save();

      return callRecord;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get call history
   */
  static async getCallHistory(orderId) {
    try {
      const chat = await Chat.findOne({ orderId }).select('callHistory');
      if (!chat) {
        throw new Error('Chat not found');
      }

      return chat.callHistory || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send location
   */
  static async sendLocation(orderId, sender, senderId, senderName, latitude, longitude, address) {
    try {
      return await this.sendMessage(
        orderId,
        sender,
        senderId,
        senderName,
        'location',
        null,
        {
          location: {
            latitude,
            longitude,
            address,
          },
        }
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send image
   */
  static async sendImage(orderId, sender, senderId, senderName, imageUrl) {
    try {
      return await this.sendMessage(
        orderId,
        sender,
        senderId,
        senderName,
        'image',
        'Sent an image',
        { imageUrl }
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Block chat
   */
  static async blockChat(orderId, blockedBy) {
    try {
      const chat = await Chat.findOne({ orderId });
      if (!chat) {
        throw new Error('Chat not found');
      }

      chat.blockChat(blockedBy);
      await chat.save();

      return chat;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Unblock chat
   */
  static async unblockChat(orderId) {
    try {
      const chat = await Chat.findOne({ orderId });
      if (!chat) {
        throw new Error('Chat not found');
      }

      chat.unblockChat();
      await chat.save();

      return chat;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get chat summary
   */
  static async getChatSummary(orderId) {
    try {
      const chat = await Chat.findOne({ orderId });
      if (!chat) {
        throw new Error('Chat not found');
      }

      return chat.getSummary();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all chats for user
   */
  static async getUserChats(userId, limit = 20, skip = 0) {
    try {
      const chats = await Chat.find({ userId, chatStatus: { $ne: 'archived' } })
        .select('orderId lastMessage unreadCountCustomer unreadCountRider chatStatus createdAt')
        .sort({ updatedAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      return chats;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all chats for delivery person
   */
  static async getDeliveryPersonChats(deliveryPersonId, limit = 20, skip = 0) {
    try {
      const chats = await Chat.find({ deliveryPersonId, chatStatus: { $ne: 'archived' } })
        .select('orderId lastMessage unreadCountCustomer unreadCountRider chatStatus createdAt')
        .sort({ updatedAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      return chats;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Close chat
   */
  static async closeChat(orderId) {
    try {
      const chat = await Chat.findOne({ orderId });
      if (!chat) {
        throw new Error('Chat not found');
      }

      chat.chatStatus = 'closed';
      await chat.save();

      return chat;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Archive chat
   */
  static async archiveChat(orderId) {
    try {
      const chat = await Chat.findOne({ orderId });
      if (!chat) {
        throw new Error('Chat not found');
      }

      chat.chatStatus = 'archived';
      await chat.save();

      return chat;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add quick reply
   */
  static async addQuickReply(orderId, label, message, emoji = '👍') {
    try {
      const chat = await Chat.findOne({ orderId });
      if (!chat) {
        throw new Error('Chat not found');
      }

      chat.addQuickReply(label, message, emoji);
      await chat.save();

      return chat.quickReplies;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get quick replies
   */
  static async getQuickReplies(orderId) {
    try {
      const chat = await Chat.findOne({ orderId }).select('quickReplies');
      if (!chat) {
        throw new Error('Chat not found');
      }

      return chat.quickReplies || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mute notifications
   */
  static async muteNotifications(orderId) {
    try {
      const chat = await Chat.findOne({ orderId });
      if (!chat) {
        throw new Error('Chat not found');
      }

      chat.muteNotifications = true;
      await chat.save();

      return chat;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Unmute notifications
   */
  static async unmuteNotifications(orderId) {
    try {
      const chat = await Chat.findOne({ orderId });
      if (!chat) {
        throw new Error('Chat not found');
      }

      chat.muteNotifications = false;
      await chat.save();

      return chat;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get chat statistics (for admin)
   */
  static async getChatStats(startDate, endDate) {
    try {
      const stats = await Chat.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            totalChats: { $sum: 1 },
            totalMessages: {
              $sum: { $cond: [{ $isArray: ['$messages'] }, { $size: '$messages' }, 0] },
            },
            blockedChats: {
              $sum: { $cond: ['$isBlocked', 1, 0] },
            },
            avgMessagesPerChat: {
              $avg: { $cond: [{ $isArray: ['$messages'] }, { $size: '$messages' }, 0] },
            },
          },
        },
      ]);

      return stats[0] || {};
    } catch (error) {
      throw error;
    }
  }

  /**
   * Export chat (for customer support)
   */
  static async exportChat(orderId) {
    try {
      const chat = await Chat.findOne({ orderId });
      if (!chat) {
        throw new Error('Chat not found');
      }

      const messages = chat.getRecentMessages(1000); // All messages

      return {
        orderId: chat.orderId,
        participants: chat.participants,
        messageCount: messages.length,
        messages: messages.map((msg) => ({
          sender: msg.sender,
          senderName: msg.senderName,
          content: msg.content,
          timestamp: msg.timestamp,
          type: msg.messageType,
        })),
        duration: chat.updatedAt - chat.createdAt,
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ChatService;
