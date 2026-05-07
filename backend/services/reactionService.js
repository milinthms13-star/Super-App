const logger = require('../utils/logger');
const MessageReaction = require('../models/MessageReaction');
const EditHistory = require('../models/EditHistory');
const Message = require('../models/Message');

/**
 * ReactionService
 * Manages message reactions and rich text formatting
 */
class ReactionService {
  constructor() {
    this.name = 'ReactionService';
    this.supportedEmojis = [
      '👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '🎉',
      '✨', '🚀', '👏', '💯', '🙌', '😍', '🤔', '👌'
    ];
  }

  /**
   * Add reaction to message
   */
  async addReaction(messageId, userId, emoji) {
    try {
      // Validate emoji
      if (!this.isValidEmoji(emoji)) {
        throw new Error('Invalid emoji');
      }

      // Check if reaction already exists
      const existing = await MessageReaction.findOne({
        messageId,
        userId,
        emoji,
      });

      if (existing) {
        return existing;
      }

      const reaction = new MessageReaction({
        messageId,
        userId,
        emoji,
        type: 'emoji',
      });

      await reaction.save();

      // Update message reaction count
      await this._updateMessageReactionCount(messageId);

      logger.info(`Reaction added: ${emoji} on message ${messageId}`);
      return reaction;
    } catch (error) {
      logger.error('Error adding reaction:', error);
      throw error;
    }
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(messageId, userId, emoji) {
    try {
      const reaction = await MessageReaction.findOneAndDelete({
        messageId,
        userId,
        emoji,
      });

      if (!reaction) {
        throw new Error('Reaction not found');
      }

      // Update message reaction count
      await this._updateMessageReactionCount(messageId);

      logger.info(`Reaction removed: ${emoji} from message ${messageId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error removing reaction:', error);
      throw error;
    }
  }

  /**
   * Get reactions for message
   */
  async getReactions(messageId) {
    try {
      const reactions = await MessageReaction.getReactionsSummary(messageId);
      return reactions;
    } catch (error) {
      logger.error('Error getting reactions:', error);
      throw error;
    }
  }

  /**
   * Get who reacted with specific emoji
   */
  async getReactors(messageId, emoji) {
    try {
      const reactors = await MessageReaction.getWhoReacted(messageId, emoji);
      return reactors;
    } catch (error) {
      logger.error('Error getting reactors:', error);
      throw error;
    }
  }

  /**
   * Edit message
   */
  async editMessage(messageId, newContent, userId, editReason = null) {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      if (message.senderId.toString() !== userId.toString()) {
        throw new Error('Unauthorized: Can only edit own messages');
      }

      // Check if message is too old to edit (> 24 hours)
      const messageAge = Date.now() - message.createdAt.getTime();
      if (messageAge > 24 * 60 * 60 * 1000) {
        throw new Error('Cannot edit message older than 24 hours');
      }

      // Save edit history
      const editRecord = new EditHistory({
        messageId,
        originalContent: message.content,
        newContent,
        editReason,
        isEncrypted: message.isEncrypted,
      });

      await editRecord.save();

      // Update message
      message.content = newContent;
      message.isEdited = true;
      message.editedAt = new Date();
      message.editCount = (message.editCount || 0) + 1;

      await message.save();

      logger.info(`Message edited: ${messageId}`);
      return message;
    } catch (error) {
      logger.error('Error editing message:', error);
      throw error;
    }
  }

  /**
   * Get edit history for message
   */
  async getEditHistory(messageId) {
    try {
      const history = await EditHistory.getMessageEditHistory(messageId);
      return history;
    } catch (error) {
      logger.error('Error getting edit history:', error);
      throw error;
    }
  }

  /**
   * Delete message (soft delete)
   */
  async deleteMessage(messageId, userId) {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      if (message.senderId.toString() !== userId.toString()) {
        throw new Error('Unauthorized: Can only delete own messages');
      }

      message.isDeleted = true;
      message.deletedAt = new Date();
      message.content = '[This message has been deleted]';

      await message.save();

      logger.info(`Message deleted: ${messageId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Hard delete message (admin only)
   */
  async hardDeleteMessage(messageId, userId) {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Delete message and related data
      await MessageReaction.deleteMany({ messageId });
      await EditHistory.deleteMany({ messageId });
      await Message.findByIdAndDelete(messageId);

      logger.info(`Message hard deleted: ${messageId} by ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error hard deleting message:', error);
      throw error;
    }
  }

  /**
   * Format message with markdown
   */
  formatMarkdown(content) {
    try {
      // Basic markdown formatting
      let formatted = content;

      // Bold: **text** -> <strong>text</strong>
      formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

      // Italic: *text* -> <em>text</em>
      formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');

      // Code: `text` -> <code>text</code>
      formatted = formatted.replace(/`(.+?)`/g, '<code>$1</code>');

      // Code block: ```text``` -> <pre><code>text</code></pre>
      formatted = formatted.replace(
        /```(.*?)```/gs,
        '<pre><code>$1</code></pre>'
      );

      // Links: [text](url) -> <a href="url">text</a>
      formatted = formatted.replace(
        /\[(.+?)\]\((.+?)\)/g,
        '<a href="$2">$1</a>'
      );

      // Line breaks
      formatted = formatted.replace(/\n/g, '<br>');

      return formatted;
    } catch (error) {
      logger.error('Error formatting markdown:', error);
      return content;
    }
  }

  /**
   * Extract mentions from content
   */
  extractMentions(content) {
    try {
      const mentions = [];
      const regex = /@(\w+)/g;
      let match;

      while ((match = regex.exec(content)) !== null) {
        mentions.push(match[1]);
      }

      return [...new Set(mentions)]; // Remove duplicates
    } catch (error) {
      logger.error('Error extracting mentions:', error);
      return [];
    }
  }

  /**
   * Extract hashtags from content
   */
  extractHashtags(content) {
    try {
      const hashtags = [];
      const regex = /#(\w+)/g;
      let match;

      while ((match = regex.exec(content)) !== null) {
        hashtags.push(match[1]);
      }

      return [...new Set(hashtags)]; // Remove duplicates
    } catch (error) {
      logger.error('Error extracting hashtags:', error);
      return [];
    }
  }

  /**
   * Generate preview for message
   */
  generatePreview(content, maxLength = 100) {
    try {
      let preview = content.replace(/<[^>]*>/g, ''); // Remove HTML
      if (preview.length > maxLength) {
        preview = preview.substring(0, maxLength) + '...';
      }
      return preview;
    } catch (error) {
      logger.error('Error generating preview:', error);
      return content.substring(0, 100);
    }
  }

  /**
   * Validate emoji
   */
  isValidEmoji(emoji) {
    // Check if it's a valid emoji (simple check)
    return emoji && emoji.length > 0 && emoji.length <= 10;
  }

  /**
   * Update message reaction count
   */
  async _updateMessageReactionCount(messageId) {
    try {
      const message = await Message.findById(messageId);
      if (message) {
        const reactionCounts = await MessageReaction.getReactionCounts(messageId);
        message.reactionCount = reactionCounts.reduce((sum, r) => sum + r.count, 0);
        await message.save();
      }
    } catch (error) {
      logger.error('Error updating reaction count:', error);
    }
  }

  /**
   * Get popular reactions
   */
  async getPopularReactions(timeRangeMs = 7 * 24 * 60 * 60 * 1000, limit = 10) {
    try {
      const startDate = new Date(Date.now() - timeRangeMs);

      const popular = await MessageReaction.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: '$emoji',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: limit },
      ]);

      return popular;
    } catch (error) {
      logger.error('Error getting popular reactions:', error);
      throw error;
    }
  }
}

module.exports = new ReactionService();
