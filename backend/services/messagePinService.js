const Message = require('../models/Message');
const logger = require('../utils/logger');

class MessagePinService {
  constructor() {
    if (MessagePinService.instance) {
      return MessagePinService.instance;
    }

    this.maxPinnedPerChat = 10;
    this.pinCache = new Map();
    MessagePinService.instance = this;
  }

  normalizePinArgs(messageIdOrPayload, userId, chatId, options = {}) {
    if (
      messageIdOrPayload &&
      typeof messageIdOrPayload === 'object' &&
      !Array.isArray(messageIdOrPayload)
    ) {
      return {
        messageId: messageIdOrPayload.messageId,
        chatId: messageIdOrPayload.chatId,
        userId: messageIdOrPayload.userId,
        options: {
          reason: messageIdOrPayload.reason,
          notes: messageIdOrPayload.notes,
          ...options,
        },
      };
    }

    return {
      messageId: messageIdOrPayload,
      userId,
      chatId,
      options,
    };
  }

  async pinMessage(messageIdOrPayload, userId, chatId, options = {}) {
    try {
      const normalized = this.normalizePinArgs(messageIdOrPayload, userId, chatId, options);
      if (!normalized.messageId) {
        throw new Error('messageId is required');
      }
      if (!normalized.chatId) {
        throw new Error('chatId is required');
      }

      const message = await Message.findById(normalized.messageId);
      if (!message) {
        throw new Error(`Message ${normalized.messageId} not found`);
      }

      if (message.isDeleted) {
        throw new Error('Cannot pin deleted message');
      }

      if (message.isPinned) {
        return message;
      }

      const pinnedCount = await Message.countDocuments({
        chatId: normalized.chatId,
        isPinned: true,
      });

      if (pinnedCount >= this.maxPinnedPerChat) {
        throw new Error(`Chat has reached maximum pinned messages (${this.maxPinnedPerChat})`);
      }

      const pinned = await Message.findByIdAndUpdate(
        normalized.messageId,
        {
          isPinned: true,
          pinnedAt: new Date(),
          pinnedBy: normalized.userId,
          pinnedReason: normalized.options.reason,
          metadata: {
            ...(message.metadata || {}),
            pinnedNotes: normalized.options.notes,
          },
        },
        { new: true }
      );

      this.pinCache.delete(normalized.chatId);
      logger.info(`Message ${normalized.messageId} pinned in chat ${normalized.chatId}`);
      return pinned;
    } catch (error) {
      logger.error('Error pinning message', { error });
      throw error;
    }
  }

  async unpinMessage(messageId, chatIdOrUserId, userIdOrChatId) {
    try {
      const chatId = String(chatIdOrUserId).startsWith('chat') ? chatIdOrUserId : userIdOrChatId;
      const unpinned = await Message.findByIdAndUpdate(
        messageId,
        {
          isPinned: false,
          pinnedAt: null,
          pinnedBy: null,
          pinnedReason: null,
          metadata: {},
        },
        { new: true }
      );

      this.pinCache.delete(chatId);
      return unpinned;
    } catch (error) {
      logger.error('Error unpinning message', { error });
      throw error;
    }
  }

  async getPinnedMessages(chatId, options = {}) {
    try {
      const cacheKey = `${chatId}:${options.limit || 'all'}:${options.offset || 0}`;
      if (this.pinCache.has(cacheKey)) {
        return this.pinCache.get(cacheKey);
      }

      const pinned = await Message.find({
        chatId,
        isPinned: true,
        isDeleted: { $ne: true },
      })
        .sort({ pinnedAt: -1 })
        .lean();

      const start = Number(options.offset || 0);
      const end = options.limit ? start + Number(options.limit) : undefined;
      const result = pinned.slice(start, end);

      this.pinCache.set(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Error getting pinned messages', { error });
      throw error;
    }
  }

  async getPinHistory(messageId) {
    try {
      const message = await Message.findById(messageId).lean();
      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      return [
        {
          messageId,
          isPinned: Boolean(message.isPinned),
          pinnedAt: message.pinnedAt || null,
          pinnedBy: message.pinnedBy || null,
          pinnedReason: message.pinnedReason || null,
        },
      ];
    } catch (error) {
      logger.error('Error getting pin history', { error });
      throw error;
    }
  }

  async autocleanupOldPins(chatId, daysOld = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      const pinned = await Message.find({
        chatId,
        isPinned: true,
      }).lean();

      let cleaned = 0;
      for (const message of pinned) {
        if (message.pinnedAt && new Date(message.pinnedAt) < cutoffDate) {
          await Message.findByIdAndUpdate(message._id, {
            isPinned: false,
            pinnedAt: null,
            pinnedBy: null,
            pinnedReason: null,
          });
          cleaned += 1;
        }
      }

      this.clearChatCache(chatId);
      return { cleaned };
    } catch (error) {
      logger.error('Error in autopin cleanup', { error });
      throw error;
    }
  }

  async getPinStats(chatId) {
    try {
      const pinned = await Message.find({
        chatId,
        isPinned: true,
        isDeleted: { $ne: true },
      }).lean();

      const pinsByUserMap = new Map();
      pinned.forEach((message) => {
        const key = message.pinnedBy || 'unknown';
        pinsByUserMap.set(key, (pinsByUserMap.get(key) || 0) + 1);
      });

      return {
        totalPins: pinned.length,
        totalPinned: pinned.length,
        pinsByUser: [...pinsByUserMap.entries()].map(([userId, count]) => ({
          userId,
          count,
        })),
        mostPinned: pinned
          .slice()
          .sort((left, right) => new Date(right.pinnedAt || 0) - new Date(left.pinnedAt || 0))
          .slice(0, 5),
      };
    } catch (error) {
      logger.error('Error getting pin stats', { error });
      throw error;
    }
  }

  async reorderPins(messageId, direction, chatId) {
    try {
      if (!['up', 'down'].includes(direction)) {
        throw new Error('Invalid direction');
      }

      const pinned = await this.getPinnedMessages(chatId);
      const index = pinned.findIndex((message) => String(message._id) === String(messageId));
      if (index === -1) {
        throw new Error('Message not found in pinned');
      }

      let newIndex = index;
      if (direction === 'up' && index > 0) {
        newIndex = index - 1;
      }
      if (direction === 'down' && index < pinned.length - 1) {
        newIndex = index + 1;
      }

      const reordered = pinned.slice();
      const [selected] = reordered.splice(index, 1);
      reordered.splice(newIndex, 0, selected);

      const baseTime = Date.now();
      for (let offset = 0; offset < reordered.length; offset += 1) {
        await Message.findByIdAndUpdate(reordered[offset]._id, {
          pinnedAt: new Date(baseTime - offset * 1000),
        });
      }

      this.clearChatCache(chatId);
      return this.getPinnedMessages(chatId);
    } catch (error) {
      logger.error('Error reordering pin', { error });
      throw error;
    }
  }

  async reorderPin(messageId, direction, chatId) {
    return this.reorderPins(messageId, direction, chatId);
  }

  clearChatCache(chatId) {
    for (const key of this.pinCache.keys()) {
      if (key.startsWith(`${chatId}:`)) {
        this.pinCache.delete(key);
      }
    }
  }

  clearCache() {
    this.pinCache.clear();
    logger.info('Pin cache cleared');
  }
}

module.exports = new MessagePinService();
