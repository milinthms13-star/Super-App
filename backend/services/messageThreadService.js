const Message = require('../models/Message');
const logger = require('../utils/logger');

class MessageThreadService {
  constructor() {
    if (MessageThreadService.instance) {
      return MessageThreadService.instance;
    }

    this.threadCache = new Map();
    this.cacheTTL = 5 * 60 * 1000;
    MessageThreadService.instance = this;
  }

  async createReply(parentMessageIdOrData, senderId, content, options = {}) {
    const normalized = this.normalizeReplyArgs(
      parentMessageIdOrData,
      senderId,
      content,
      options
    );

    try {
      if (!normalized.parentMessageId || !normalized.userId || !normalized.content.trim()) {
        throw new Error('parentMessageId, userId and content are required');
      }

      const parentMessage = await Message.findById(normalized.parentMessageId);
      if (!parentMessage) {
        throw new Error(`Parent message ${normalized.parentMessageId} not found`);
      }

      if (parentMessage.isDeleted) {
        throw new Error('Cannot reply to deleted message');
      }

      const reply = await Message.create({
        senderId: normalized.userId,
        chatId: parentMessage.chatId,
        parentMessageId: normalized.parentMessageId,
        content: normalized.content.trim(),
        type: normalized.type || 'reply',
        messageType: normalized.messageType || 'text',
        attachments: normalized.attachments || [],
        media: normalized.media || null,
        mentions: normalized.mentions || [],
        metadata: {
          ...(parentMessage.metadata || {}),
          ...(normalized.metadata || {}),
          isReply: true,
          threadDepth: Number(parentMessage.metadata?.threadDepth || 0) + 1,
        },
        replyCount: 0,
        createdAt: new Date(),
      });

      await Message.findByIdAndUpdate(normalized.parentMessageId, {
        $inc: { replyCount: 1 },
        $set: { lastReplyAt: new Date() },
      });

      this.invalidateThread(normalized.parentMessageId);

      logger.info(`Reply created for message ${normalized.parentMessageId}`, {
        replyId: reply._id,
        senderId: normalized.userId,
      });

      return reply.populate ? await reply.populate('senderId', 'username avatar') : reply;
    } catch (error) {
      logger.error('Error creating reply', { error, parentMessageId: normalized.parentMessageId });
      throw error;
    }
  }

  async getThread(messageId, options = {}) {
    try {
      const cacheKey = this.getCacheKey(messageId, options);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      const limit = Number(options.limit || 50);
      const offset = Number(options.offset || 0);

      const parentMessage = await Message.findById(messageId)
        .populate('senderId', 'username avatar')
        .lean();

      if (!parentMessage) {
        throw new Error(`Message ${messageId} not found`);
      }

      const allReplies = await Message.find({
        parentMessageId: messageId,
        isDeleted: { $ne: true },
      })
        .populate('senderId', 'username avatar')
        .populate('mentions.userId', 'username')
        .lean();

      const replies = this.sortByCreatedAt(allReplies).slice(offset, offset + limit);
      const thread = {
        parent: parentMessage,
        replies,
        totalReplies: allReplies.length,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < allReplies.length,
        },
      };

      this.setCache(cacheKey, thread);
      return thread;
    } catch (error) {
      logger.error('Error getting thread', { error, messageId });
      throw error;
    }
  }

  async getConversationChain(messageId) {
    try {
      const chain = [];
      const visited = new Set();

      let current = await Message.findById(messageId).lean();
      if (!current) {
        throw new Error(`Message ${messageId} not found`);
      }

      while (current && current.parentMessageId) {
        if (visited.has(String(current._id))) {
          break;
        }

        visited.add(String(current._id));
        const parent = await Message.findById(current.parentMessageId).lean();
        if (!parent) {
          break;
        }

        chain.unshift(parent);
        current = parent;
      }

      const rootMessage = chain[0] || (await Message.findById(messageId).lean());
      if (rootMessage && !chain.some((item) => String(item._id) === String(rootMessage._id))) {
        chain.push(rootMessage);
      }

      const descendants = await this.getAllDescendants(rootMessage?._id || messageId);
      const combined = [...chain, ...descendants];
      return this.sortByCreatedAt(
        combined.filter(
          (item, index, array) =>
            item && array.findIndex((candidate) => String(candidate._id) === String(item._id)) === index
        )
      );
    } catch (error) {
      logger.error('Error getting conversation chain', { error, messageId });
      throw error;
    }
  }

  async getThreadChain(messageId) {
    return this.getConversationChain(messageId);
  }

  async getAllDescendants(messageId, depth = 0, maxDepth = 10, visited = new Set()) {
    if (!messageId || depth > maxDepth || visited.has(String(messageId))) {
      return [];
    }

    visited.add(String(messageId));

    const replies = await Message.find({
      parentMessageId: messageId,
      isDeleted: { $ne: true },
    }).lean();

    const sortedReplies = this.sortByCreatedAt(replies);
    let descendants = [...sortedReplies];

    for (const reply of sortedReplies) {
      const nested = await this.getAllDescendants(reply._id, depth + 1, maxDepth, visited);
      descendants = descendants.concat(nested);
    }

    return descendants;
  }

  async getThreadDescendants(messageId, limit = 50, offset = 0) {
    const descendants = await this.getAllDescendants(messageId);
    return descendants.slice(Number(offset), Number(offset) + Number(limit));
  }

  async getThreadStats(messageId) {
    try {
      const parent = await Message.findById(messageId).lean();
      if (!parent) {
        throw new Error(`Message ${messageId} not found`);
      }

      const replies = await this.getAllDescendants(messageId);
      const allMessages = [parent, ...replies];
      const participants = Array.from(
        new Set(allMessages.map((message) => String(message.senderId)).filter(Boolean))
      );
      const lastReplyAt = replies.length
        ? this.sortByCreatedAt(replies)[replies.length - 1].createdAt
        : parent.lastReplyAt || parent.createdAt;

      return {
        totalMessages: allMessages.length,
        replyCount: replies.length,
        lastReplyAt,
        lastReplyTime: lastReplyAt,
        participants,
        uniqueSendersCount: participants.length,
        avgContentLength:
          allMessages.length > 0
            ? allMessages.reduce((sum, message) => sum + String(message.content || '').length, 0) /
              allMessages.length
            : 0,
        mediaCount: allMessages.filter((message) => message.media || (message.attachments || []).length > 0)
          .length,
      };
    } catch (error) {
      logger.error('Error getting thread stats', { error, messageId });
      throw error;
    }
  }

  async deleteThread(messageId, userId) {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      if (String(message.senderId) !== String(userId)) {
        throw new Error('Only message owner can delete thread');
      }

      const allMessages = [message, ...(await this.getAllDescendants(messageId))];
      const result = await Message.updateMany(
        { _id: { $in: allMessages.map((item) => item._id) } },
        {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: userId,
          },
        }
      );

      this.invalidateThread(messageId);
      logger.info(`Thread deleted: ${allMessages.length} messages`);
      return result.modifiedCount;
    } catch (error) {
      logger.error('Error deleting thread', { error, messageId });
      throw error;
    }
  }

  async getPopularThreads(chatId, options = {}) {
    try {
      const limit = Number(options.limit || 20);
      const daysBack = Number(options.daysBack || 7);
      const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      const messages = await Message.find({
        chatId,
        isDeleted: { $ne: true },
      }).lean();

      const roots = messages.filter(
        (message) =>
          !message.parentMessageId &&
          (!message.createdAt || new Date(message.createdAt) >= startDate)
      );

      const threads = roots.map((root) => {
        const replies = messages.filter((message) => String(message.parentMessageId) === String(root._id));
        return {
          ...root,
          replies,
          replyCount: replies.length,
          activity: replies.length + Number(root.reactionCount || 0),
        };
      });

      return threads
        .sort((left, right) => right.activity - left.activity || right.replyCount - left.replyCount)
        .slice(0, limit);
    } catch (error) {
      logger.error('Error getting popular threads', { error, chatId });
      throw error;
    }
  }

  async markThreadResolved(messageId, userId) {
    try {
      const message = await Message.findByIdAndUpdate(messageId, {
        $set: {
          'metadata.threadResolved': true,
          'metadata.resolvedAt': new Date(),
          'metadata.resolvedBy': userId,
        },
      });

      this.invalidateThread(messageId);
      logger.info(`Thread marked as resolved: ${messageId}`);
      return message;
    } catch (error) {
      logger.error('Error resolving thread', { error, messageId });
      throw error;
    }
  }

  normalizeReplyArgs(parentMessageIdOrData, senderId, content, options = {}) {
    if (parentMessageIdOrData && typeof parentMessageIdOrData === 'object' && !Array.isArray(parentMessageIdOrData)) {
      return {
        parentMessageId: parentMessageIdOrData.parentMessageId,
        userId: parentMessageIdOrData.userId || parentMessageIdOrData.senderId,
        content: parentMessageIdOrData.content || '',
        type: parentMessageIdOrData.type,
        messageType: parentMessageIdOrData.messageType,
        attachments: parentMessageIdOrData.attachments,
        media: parentMessageIdOrData.media,
        mentions: parentMessageIdOrData.mentions,
        metadata: parentMessageIdOrData.metadata,
      };
    }

    return {
      parentMessageId: parentMessageIdOrData,
      userId: senderId,
      content: content || '',
      ...options,
    };
  }

  sortByCreatedAt(messages) {
    return [...messages].sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));
  }

  getCacheKey(messageId, options) {
    return JSON.stringify({ messageId, options });
  }

  getFromCache(cacheKey) {
    const cached = this.threadCache.get(cacheKey);
    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.threadCache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  setCache(cacheKey, value) {
    this.threadCache.set(cacheKey, {
      data: value,
      timestamp: Date.now(),
    });
  }

  invalidateThread(messageId) {
    const normalized = String(messageId);
    Array.from(this.threadCache.keys()).forEach((cacheKey) => {
      if (cacheKey.includes(normalized)) {
        this.threadCache.delete(cacheKey);
      }
    });
  }

  clearCache() {
    this.threadCache.clear();
    logger.info('Thread cache cleared');
  }
}

module.exports = new MessageThreadService();
