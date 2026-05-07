const Message = require('../models/Message');
const Chat = require('../models/Chat');
const logger = require('../utils/logger');

class MessageForwardingService {
  constructor() {
    if (MessageForwardingService.instance) {
      return MessageForwardingService.instance;
    }

    this.forwardCache = new Map();
    MessageForwardingService.instance = this;
  }

  normalizeForwardArgs(messageIdOrPayload, userId, targetChatIds, options = {}) {
    if (
      messageIdOrPayload &&
      typeof messageIdOrPayload === 'object' &&
      !Array.isArray(messageIdOrPayload)
    ) {
      return {
        messageId: messageIdOrPayload.messageId,
        userId: messageIdOrPayload.userId,
        targetChatIds: messageIdOrPayload.targetChatIds || [],
        options: {
          ...options,
          metadata: messageIdOrPayload.metadata,
        },
      };
    }

    return {
      messageId: messageIdOrPayload,
      userId,
      targetChatIds: targetChatIds || [],
      options,
    };
  }

  async forwardMessage(messageIdOrPayload, userId, targetChatIds, options = {}) {
    try {
      const normalized = this.normalizeForwardArgs(
        messageIdOrPayload,
        userId,
        targetChatIds,
        options
      );
      const { messageId, targetChatIds: chatIds, options: resolvedOptions } = normalized;

      if (!messageId) {
        throw new Error('messageId is required');
      }

      if (!Array.isArray(chatIds) || chatIds.length === 0) {
        throw new Error('targetChatIds must contain at least one chat');
      }

      const originalMessage = await Message.findById(messageId).lean();
      if (!originalMessage) {
        throw new Error(`Message ${messageId} not found`);
      }

      if (originalMessage.isDeleted) {
        throw new Error('Cannot forward deleted message');
      }

      const forwardedMessages = [];

      for (const chatId of chatIds) {
        const chat = await Chat.findOne({ _id: chatId }).lean();
        if (!chat) {
          continue;
        }

        const participants = Array.isArray(chat.participants) ? chat.participants : [];
        const hasAccess = participants.some((participant) => {
          if (participant && typeof participant === 'object') {
            return String(participant.userId || participant._id) === String(normalized.userId);
          }
          return String(participant) === String(normalized.userId);
        });

        if (!hasAccess && chat.owner && String(chat.owner) !== String(normalized.userId)) {
          logger.warn(`User ${normalized.userId} does not have access to chat ${chatId}`);
          continue;
        }

        const originalSender = originalMessage.senderId;
        const originalSenderId =
          originalSender && typeof originalSender === 'object'
            ? originalSender._id || originalSender.userId || originalSender.id
            : originalSender;
        const originalSenderName =
          originalSender && typeof originalSender === 'object'
            ? originalSender.username || originalSender.name || 'Unknown'
            : 'Unknown';

        const forwarded = await Message.create({
          senderId: normalized.userId,
          chatId,
          content: originalMessage.content,
          type: originalMessage.type || originalMessage.messageType || 'text',
          messageType: originalMessage.messageType || originalMessage.type || 'text',
          media: originalMessage.media || null,
          attachments: originalMessage.attachments || [],
          metadata: {
            ...(originalMessage.metadata || {}),
            ...(resolvedOptions.metadata || {}),
            isForwarded: true,
            forwardedBy: normalized.userId,
          },
          forwardedFrom: {
            originalMessageId: originalMessage._id,
            originalSenderId,
            originalSenderName,
            originalChatId: originalMessage.chatId,
            forwardedAt: new Date(),
            forwardedBy: normalized.userId,
          },
          forwardCount: 0,
          createdAt: new Date(),
        });

        await Message.findByIdAndUpdate(originalMessage._id, {
          $inc: { forwardCount: 1 },
        });

        forwardedMessages.push({
          chatId,
          forwardedMessage: forwarded,
        });
      }

      this.forwardCache.delete(`chain:${messageId}`);
      this.forwardCache.delete(`stats:${messageId}`);

      return forwardedMessages;
    } catch (error) {
      logger.error('Error forwarding message', { error, messageId: messageIdOrPayload });
      throw error;
    }
  }

  async getForwardChain(messageId) {
    try {
      const cacheKey = `chain:${messageId}`;
      if (this.forwardCache.has(cacheKey)) {
        return this.forwardCache.get(cacheKey);
      }

      const chain = [];
      let current = await Message.findById(messageId).lean();
      const seen = new Set();

      while (current && !seen.has(String(current._id))) {
        seen.add(String(current._id));
        chain.push({
          messageId: current._id,
          chatId: current.chatId,
          forwardedAt: current.forwardedFrom?.forwardedAt || null,
          forwardedBy: current.forwardedFrom?.forwardedBy || null,
          isOriginal: !current.forwardedFrom,
        });

        if (!current.forwardedFrom?.originalMessageId) {
          break;
        }

        current = await Message.findById(current.forwardedFrom.originalMessageId).lean();
      }

      const result = chain.reverse();
      this.forwardCache.set(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Error getting forward chain', { error });
      throw error;
    }
  }

  async getForwardStats(messageId) {
    try {
      const cacheKey = `stats:${messageId}`;
      if (this.forwardCache.has(cacheKey)) {
        return this.forwardCache.get(cacheKey);
      }

      const message = await Message.findById(messageId).lean();
      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      const forwards = await Message.find({
        'forwardedFrom.originalMessageId': messageId,
      }).lean();

      const forwardedTo = [...new Set(forwards.map((item) => item.chatId).filter(Boolean))];
      const result = {
        originalMessageId: messageId,
        forwardCount: message.forwardCount || forwards.length,
        totalForwards: message.forwardCount || forwards.length,
        forwardedTo,
        uniqueChats: forwardedTo.length,
        forwards,
      };

      this.forwardCache.set(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Error getting forward stats', { error });
      throw error;
    }
  }

  async getMostForwarded(chatId, options = {}) {
    try {
      const { limit = 20 } = options;
      const messages = await Message.find({
        chatId,
        isDeleted: { $ne: true },
      })
        .sort({ forwardCount: -1, createdAt: -1 })
        .lean();

      return messages.filter((message) => (message.forwardCount || 0) > 0).slice(0, limit);
    } catch (error) {
      logger.error('Error getting most forwarded', { error });
      throw error;
    }
  }

  async getMostForwardedInChat(chatId, options = {}) {
    return this.getMostForwarded(chatId, options);
  }

  async isMessageForwarded(messageId) {
    try {
      const message = await Message.findById(messageId).lean();
      return Boolean(message && message.forwardedFrom);
    } catch (error) {
      logger.error('Error checking if forwarded', { error });
      throw error;
    }
  }

  async batchForwardMessages(messageIdsOrPayload, userId, targetChatIds) {
    try {
      const payload =
        messageIdsOrPayload &&
        typeof messageIdsOrPayload === 'object' &&
        !Array.isArray(messageIdsOrPayload)
          ? messageIdsOrPayload
          : { messageIds: messageIdsOrPayload, userId, targetChatIds };

      const results = [];
      for (const messageId of payload.messageIds || []) {
        try {
          const forwarded = await this.forwardMessage(
            messageId,
            payload.userId,
            payload.targetChatIds
          );
          results.push(forwarded[0] || { messageId, forwardedMessage: null });
        } catch (error) {
          logger.warn(`Failed to forward message ${messageId}`, { error });
          results.push({ messageId, error: error.message });
        }
      }

      return results;
    } catch (error) {
      logger.error('Error batch forwarding', { error });
      throw error;
    }
  }

  clearCache() {
    this.forwardCache.clear();
    logger.info('Forward cache cleared');
  }
}

module.exports = new MessageForwardingService();
