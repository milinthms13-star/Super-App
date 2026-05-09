const mongoose = require('mongoose');
const MessageReaction = require('../models/MessageReaction');
const Message = require('../models/Message');
const logger = require('../utils/logger');

/**
 * Message Reaction Service
 * Handles emoji and custom reactions on messages with batching support
 * Singleton pattern for memory efficiency
 */

class MessageReactionService {
  constructor() {
    if (MessageReactionService.instance) {
      return MessageReactionService.instance;
    }
    this.reactionCache = new Map();
    this.batchSize = 100;
    this.maxReactions = 50; // Max unique reactions per message
    MessageReactionService.instance = this;
  }

  /**
   * Add reaction to message
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID reacting
   * @param {string} emoji - Emoji to add
   * @param {Object} options - Additional options (type, animated, metadata)
   * @returns {Promise<Object>} Created reaction
   */
  async addReaction(messageId, userId, emoji, options = {}) {
    try {
      // Validate message exists
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      // Check reaction uniqueness
      const existing = await MessageReaction.findOne({
        messageId,
        userId,
        emoji,
      });

      if (existing) {
        logger.warn(
          `User ${userId} already reacted with ${emoji} to message ${messageId}`
        );
        return existing;
      }

      // Check max reactions limit
      const reactionCount = await MessageReaction.countDocuments({
        messageId,
        emoji: { $ne: emoji },
      });

      if (reactionCount >= this.maxReactions) {
        throw new Error(
          `Message has reached maximum unique reactions (${this.maxReactions})`
        );
      }

      const reaction = await MessageReaction.create({
        messageId,
        userId,
        emoji,
        type: options.type || 'emoji',
        isAnimated: options.isAnimated || false,
        customReactionId: options.customReactionId || null,
        metadata: options.metadata || null,
      });

      // Update cache
      this.updateReactionCache(messageId);

      logger.info(
        `Reaction added: ${emoji} by ${userId} on message ${messageId}`
      );
      return reaction;
    } catch (error) {
      logger.error('Error adding reaction', { error, messageId, userId });
      throw error;
    }
  }

  /**
   * Remove reaction from message
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID who reacted
   * @param {string} emoji - Emoji to remove
   * @returns {Promise<void>}
   */
  async removeReaction(messageId, userId, emoji) {
    try {
      const result = await MessageReaction.deleteOne({
        messageId,
        userId,
        emoji,
      });

      if (result.deletedCount === 0) {
        throw new Error(`Reaction not found for user ${userId} on ${emoji}`);
      }

      // Update cache
      this.updateReactionCache(messageId);

      logger.info(`Reaction removed: ${emoji} by ${userId}`);
    } catch (error) {
      logger.error('Error removing reaction', { error, messageId, userId });
      throw error;
    }
  }

  /**
   * Get all reactions on a message
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Reactions summary with counts
   */
  async getMessageReactions(messageId) {
    try {
      // Check cache first
      if (this.reactionCache.has(messageId)) {
        return this.reactionCache.get(messageId);
      }

      const reactions = await MessageReaction.find({ messageId })
        .select('emoji userId type createdAt')
        .lean();

      const summary = {};
      reactions.forEach((reaction) => {
        if (!summary[reaction.emoji]) {
          summary[reaction.emoji] = {
            count: 0,
            type: reaction.type,
            users: [],
            firstAddedAt: reaction.createdAt,
          };
        }
        summary[reaction.emoji].count += 1;
        summary[reaction.emoji].users.push(reaction.userId);
      });

      // Cache for 5 minutes
      this.reactionCache.set(messageId, summary);
      const cacheExpiryTimer = setTimeout(
        () => this.reactionCache.delete(messageId),
        5 * 60 * 1000
      );
      cacheExpiryTimer.unref?.();

      return summary;
    } catch (error) {
      logger.error('Error getting message reactions', { error, messageId });
      throw error;
    }
  }

  /**
   * Get reaction count by emoji
   * @param {string} messageId - Message ID
   * @param {string} emoji - Emoji to count
   * @returns {Promise<number>} Count of reactions
   */
  async getReactionCount(messageId, emoji) {
    try {
      const count = await MessageReaction.countDocuments({
        messageId,
        emoji,
      });
      return count;
    } catch (error) {
      logger.error('Error getting reaction count', { error, messageId });
      throw error;
    }
  }

  /**
   * Get who reacted with specific emoji
   * @param {string} messageId - Message ID
   * @param {string} emoji - Emoji to check
   * @returns {Promise<Array>} Array of user objects who reacted
   */
  async getWhoReacted(messageId, emoji) {
    try {
      const reactions = await MessageReaction.find({
        messageId,
        emoji,
      })
        .populate('userId', 'username avatar status')
        .select('userId createdAt')
        .lean();

      return reactions.map((r) => ({
        user: r.userId,
        reactedAt: r.createdAt,
      }));
    } catch (error) {
      logger.error('Error getting who reacted', { error, messageId, emoji });
      throw error;
    }
  }

  /**
   * Get user's reactions in chat/conversation
   * @param {string} userId - User ID
   * @param {Array<string>} messageIds - Message IDs to check
   * @returns {Promise<Object>} Reactions by message
   */
  async getUserReactions(userId, messageIds) {
    try {
      const reactions = await MessageReaction.find({
        userId,
        messageId: { $in: messageIds },
      })
        .select('messageId emoji')
        .lean();

      const userReactions = {};
      reactions.forEach((reaction) => {
        if (!userReactions[reaction.messageId]) {
          userReactions[reaction.messageId] = [];
        }
        userReactions[reaction.messageId].push(reaction.emoji);
      });

      return userReactions;
    } catch (error) {
      logger.error('Error getting user reactions', { error, userId });
      throw error;
    }
  }

  /**
   * Batch add reactions (for bulk operations)
   * @param {Array<Object>} reactionBatch - Array of {messageId, userId, emoji}
   * @returns {Promise<Array>} Created reactions
   */
  async batchAddReactions(reactionBatch) {
    try {
      if (reactionBatch.length === 0) {
        return [];
      }

      // Process in chunks
      const results = [];
      for (let i = 0; i < reactionBatch.length; i += this.batchSize) {
        const chunk = reactionBatch.slice(i, i + this.batchSize);
        const created = await MessageReaction.insertMany(chunk, {
          ordered: false,
        }).catch((err) => {
          logger.warn('Some reactions failed to insert (duplicates)', {
            error: err.message,
          });
          return [];
        });
        results.push(...created);
      }

      // Update caches
      reactionBatch.forEach((r) => this.updateReactionCache(r.messageId));

      logger.info(`Batch added ${results.length} reactions`);
      return results;
    } catch (error) {
      logger.error('Error batch adding reactions', { error });
      throw error;
    }
  }

  /**
   * Get popular reactions across messages
   * @param {Array<string>} messageIds - Message IDs to analyze
   * @returns {Promise<Array>} Popular reactions with counts
   */
  async getPopularReactions(messageIds) {
    try {
      const popular = await MessageReaction.aggregate([
        {
          $match: {
            messageId: {
              $in: messageIds.map((id) => new mongoose.Types.ObjectId(id)),
            },
          },
        },
        { $group: { _id: '$emoji', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      return popular;
    } catch (error) {
      logger.error('Error getting popular reactions', { error });
      throw error;
    }
  }

  /**
   * Get reaction stats for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Reaction statistics
   */
  async getUserReactionStats(userId) {
    try {
      const stats = await MessageReaction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalReactions: { $sum: 1 },
            uniqueEmojis: { $addToSet: '$emoji' },
            mostUsedEmoji: { $push: '$emoji' },
          },
        },
        {
          $project: {
            _id: 0,
            totalReactions: 1,
            uniqueEmojisCount: { $size: '$uniqueEmojis' },
            mostUsedEmoji: {
              $arrayElemAt: [
                {
                  $map: {
                    input: {
                      $objectToArray: {
                        $arrayToObject: {
                          $map: {
                            input: '$mostUsedEmoji',
                            as: 'emoji',
                            in: ['$$emoji', 1],
                          },
                        },
                      },
                    },
                    as: 'item',
                    in: '$$item.k',
                  },
                },
                0,
              ],
            },
          },
        },
      ]);

      return stats[0] || { totalReactions: 0, uniqueEmojisCount: 0 };
    } catch (error) {
      logger.error('Error getting user reaction stats', { error, userId });
      throw error;
    }
  }

  /**
   * Clear all reactions on message (admin only)
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Delete result
   */
  async clearMessageReactions(messageId) {
    try {
      const result = await MessageReaction.deleteMany({ messageId });
      this.reactionCache.delete(messageId);
      logger.info(`Cleared ${result.deletedCount} reactions from message`);
      return result;
    } catch (error) {
      logger.error('Error clearing reactions', { error, messageId });
      throw error;
    }
  }

  /**
   * Validate emoji format
   * @param {string} emoji - Emoji to validate
   * @returns {boolean}
   */
  validateEmoji(emoji) {
    // Unicode emoji regex
    const emojiRegex =
      /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})+$/u;
    return emojiRegex.test(emoji) && emoji.length <= 10;
  }

  /**
   * Update reaction cache
   * @param {string} messageId
   * @private
   */
  updateReactionCache(messageId) {
    this.reactionCache.delete(messageId);
  }

  /**
   * Clear cache (for cleanup)
   */
  clearCache() {
    this.reactionCache.clear();
    logger.info('Message reaction cache cleared');
  }
}

module.exports = new MessageReactionService();
