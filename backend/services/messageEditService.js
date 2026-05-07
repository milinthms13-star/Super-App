const Message = require('../models/Message');
const EditHistory = require('../models/EditHistory');
const Chat = require('../models/Chat');
const logger = require('../utils/logger');
const crypto = require('crypto');
const mongoose = require('mongoose');

/**
 * Message Editing Service
 * Handles message edits with full history tracking and rollback support
 * Singleton pattern
 */

class MessageEditService {
  constructor() {
    if (MessageEditService.instance) {
      return MessageEditService.instance;
    }
    this.maxEditCount = 50; // Max edit history records
    this.editTimeout = 15 * 60 * 1000; // 15 minutes for quick edit
    MessageEditService.instance = this;
  }

  /**
   * Edit message with history tracking
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID editing (must be message owner)
   * @param {Object} updates - Updated content
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Updated message with edit info
   */
  async editMessage(messageId, userId, updates, options = {}) {
    try {
      const { newContent, media, editReason, metadata } = updates;

      // Validate inputs
      if (!newContent && !media) {
        throw new Error('newContent or media must be provided');
      }

      // Fetch message
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      // Verify ownership
      if (message.senderId.toString() !== userId.toString()) {
        throw new Error('Only message owner can edit');
      }

      // Check if message is too old (beyond quick edit window)
      const messageAge = Date.now() - message.createdAt.getTime();
      const isQuickEdit = messageAge < this.editTimeout;

      // Create edit history record
      const editRecord = await EditHistory.create({
        messageId,
        chatId: message.chatId,
        editedBy: userId,
        originalContent: message.content,
        newContent: newContent || message.content,
        originalMedia: message.media || [],
        newMedia: media || message.media || [],
        editReason: editReason || 'other',
        changeType: newContent && media ? 'both' : newContent ? 'content' : 'media',
        charsAdded: newContent ? Math.max(0, newContent.length - message.content.length) : 0,
        charsRemoved: newContent ? Math.max(0, message.content.length - newContent.length) : 0,
        tags: options.tags || [],
      });

      // Update message
      const updateData = {
        content: newContent || message.content,
        media: media || message.media,
        isEdited: true,
        editedAt: new Date(),
        editCount: (message.editCount || 0) + 1,
        lastEditedBy: userId,
        metadata: {
          ...message.metadata,
          lastEditReason: editReason,
          ...metadata,
        },
      };

      const updatedMessage = await Message.findByIdAndUpdate(
        messageId,
        updateData,
        { new: true }
      ).populate('senderId', 'username avatar');

      // Log edit activity
      logger.info(`Message ${messageId} edited by ${userId}`, {
        editReason,
        contentLength: newContent?.length || 0,
        isQuickEdit,
      });

      return {
        message: updatedMessage,
        editRecord,
        isQuickEdit,
        editCount: updatedMessage.editCount,
      };
    } catch (error) {
      logger.error('Error editing message', { error, messageId, userId });
      throw error;
    }
  }

  /**
   * Get message edit history
   * @param {string} messageId - Message ID
   * @param {Object} options - Query options (limit, offset)
   * @returns {Promise<Array>} Edit history records
   */
  async getEditHistory(messageId, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;

      const history = await EditHistory.find({ messageId })
        .populate('editedBy', 'username avatar status')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean();

      return history;
    } catch (error) {
      logger.error('Error getting edit history', { error, messageId });
      throw error;
    }
  }

  /**
   * Get specific version of message
   * @param {string} messageId - Message ID
   * @param {string} editHistoryId - Edit history record ID
   * @returns {Promise<Object>} Message version with content
   */
  async getMessageVersion(messageId, editHistoryId) {
    try {
      const editRecord = await EditHistory.findOne({
        _id: editHistoryId,
        messageId,
      }).lean();

      if (!editRecord || String(editRecord._id) !== String(editHistoryId)) {
        throw new Error('Edit history record not found');
      }

      return {
        versionId: editRecord._id,
        content: editRecord.originalContent,
        media: editRecord.originalMedia,
        editedBy: editRecord.editedBy,
        editedAt: editRecord.createdAt,
        changeType: editRecord.changeType,
        editReason: editRecord.editReason,
      };
    } catch (error) {
      logger.error('Error getting message version', { error, messageId });
      throw error;
    }
  }

  /**
   * Rollback message to previous version
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID (must be original sender)
   * @param {string} editHistoryId - Edit history ID to rollback to
   * @returns {Promise<Object>} Restored message
   */
  async rollbackMessage(messageId, userId, editHistoryId) {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      if (message.senderId.toString() !== userId.toString()) {
        throw new Error('Only message owner can rollback edits');
      }

      const editRecord = await EditHistory.findOne({
        _id: editHistoryId,
        messageId,
      });

      if (!editRecord) {
        throw new Error('Edit history record not found');
      }

      // Create audit record of rollback
      await EditHistory.create({
        messageId,
        chatId: message.chatId,
        editedBy: userId,
        originalContent: message.content,
        newContent: editRecord.originalContent,
        editReason: 'rollback',
        changeType: 'content',
        tags: ['rollback'],
      });

      // Restore message to previous version
      const restored = await Message.findByIdAndUpdate(
        messageId,
        {
          content: editRecord.originalContent,
          media: editRecord.originalMedia,
          editCount: (message.editCount || 0) + 1,
          lastEditedBy: userId,
          editedAt: new Date(),
          metadata: {
            ...message.metadata,
            rollbackedAt: new Date(),
            rollbackedToEdit: editHistoryId,
          },
        },
        { new: true }
      ).populate('senderId', 'username avatar');

      logger.info(`Message ${messageId} rolled back to version ${editHistoryId}`);

      return restored;
    } catch (error) {
      logger.error('Error rolling back message', { error, messageId });
      throw error;
    }
  }

  /**
   * Get edit count for message
   * @param {string} messageId - Message ID
   * @returns {Promise<number>} Edit count
   */
  async getEditCount(messageId) {
    try {
      const count = await EditHistory.countDocuments({ messageId });
      return count;
    } catch (error) {
      logger.error('Error getting edit count', { error, messageId });
      throw error;
    }
  }

  /**
   * Compare two message versions
   * @param {string} messageId - Message ID
   * @param {string} versionId1 - First edit history ID
   * @param {string} versionId2 - Second edit history ID
   * @returns {Promise<Object>} Diff comparison
   */
  async compareVersions(messageId, versionId1, versionId2) {
    try {
      const v1 = await EditHistory.findOne({
        _id: versionId1,
        messageId,
      }).lean();

      const v2 = await EditHistory.findOne({
        _id: versionId2,
        messageId,
      }).lean();

      if (!v1 || !v2) {
        throw new Error('One or both versions not found');
      }

      // Calculate diff
      const content1 = v1.originalContent || '';
      const content2 = v2.originalContent || '';

      const diff = {
        version1: {
          versionId: v1._id,
          editedAt: v1.createdAt,
          editedBy: v1.editedBy,
        },
        version2: {
          versionId: v2._id,
          editedAt: v2.createdAt,
          editedBy: v2.editedBy,
        },
        contentChanged: content1 !== content2,
        mediaChanged: JSON.stringify(v1.newMedia) !== JSON.stringify(v2.newMedia),
        charsDiff: content2.length - content1.length,
      };

      return diff;
    } catch (error) {
      logger.error('Error comparing versions', { error, messageId });
      throw error;
    }
  }

  /**
   * Get editor statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Edit statistics
   */
  async getEditorStats(userId) {
    try {
      const stats = await EditHistory.aggregate([
        { $match: { editedBy: new mongoose.Types.ObjectId(userId) } },
      ]);

      const first = stats[0];
      if (!first) {
        return {
          totalEdits: 0,
          uniqueMessagesCount: 0,
          totalCharsChanged: 0,
        };
      }

      return {
        totalEdits: first.totalEdits || 0,
        uniqueMessagesCount:
          first.uniqueMessagesCount ||
          first.uniqueMessages ||
          (Array.isArray(first.uniqueMessages) ? first.uniqueMessages.length : 0),
        totalCharsChanged: first.totalCharsChanged || 0,
        editReasons: first.editReasons || [],
      };
    } catch (error) {
      logger.error('Error getting editor stats', { error, userId });
      throw error;
    }
  }

  async clearEditHistory(messageId) {
    try {
      return await EditHistory.deleteMany({ messageId });
    } catch (error) {
      logger.error('Error clearing edit history', { error, messageId });
      throw error;
    }
  }

  /**
   * Clean up old edit history (admin only)
   * @param {number} daysOld - Delete records older than X days
   * @returns {Promise<Object>} Deletion result
   */
  async cleanupOldEdits(daysOld = 730) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      const result = await EditHistory.deleteMany({
        createdAt: { $lt: cutoffDate },
      });

      logger.info(`Cleaned up ${result.deletedCount} old edit records`);
      return result;
    } catch (error) {
      logger.error('Error cleaning up old edits', { error });
      throw error;
    }
  }

  /**
   * Get edit timeline for chat
   * @param {string} chatId - Chat ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Edit timeline
   */
  async getChatEditTimeline(chatId, options = {}) {
    try {
      const { limit = 50, offset = 0, startDate, endDate } = options;

      const query = { chatId };
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = startDate;
        if (endDate) query.createdAt.$lte = endDate;
      }

      const timeline = await EditHistory.find(query)
        .populate('editedBy', 'username avatar')
        .populate('messageId', 'content')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean();

      return timeline;
    } catch (error) {
      logger.error('Error getting edit timeline', { error, chatId });
      throw error;
    }
  }

  /**
   * Validate edit is allowed
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Validation result
   */
  async validateEditAllowed(messageId, userId) {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        return { allowed: false, reason: 'Message not found' };
      }

      if (message.senderId.toString() !== userId.toString()) {
        return { allowed: false, reason: 'Not message owner' };
      }

      if (message.isDeleted) {
        return { allowed: false, reason: 'Message is deleted' };
      }

      // Check if message is very old (optional: disable edits after X days)
      const messageAge = Date.now() - message.createdAt.getTime();
      const maxEditAge = 90 * 24 * 60 * 60 * 1000; // 90 days

      if (messageAge > maxEditAge) {
        return { allowed: false, reason: 'Message too old to edit (90+ days)' };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error validating edit', { error });
      throw error;
    }
  }
}

module.exports = new MessageEditService();
