const logger = require('../utils/logger');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const fs = require('fs').promises;
const path = require('path');
const { createReadStream, createWriteStream } = require('fs');

class MessageBackupService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
    this.maxBackups = 10;
  }

  /**
   * Export chat messages
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @param {Object} options - Export options
   * @returns {Object} Export metadata
   */
  async exportChat(chatId, userId, options = {}) {
    try {
      if (!chatId || !userId) {
        throw new Error('Missing required fields');
      }

      const {
        format = 'json',
        includeAttachments = false,
        startDate = null,
        endDate = null,
      } = options;

      // Verify user has access
      const chat = await Chat.findById(chatId);
      if (!chat || !chat.participants.includes(userId)) {
        throw new Error('Not authorized to export this chat');
      }

      const query = { chatId };
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const messages = await Message.find(query).sort({ createdAt: 1 }).exec();

      // Prepare export data
      const exportData = {
        chat: {
          id: chat._id,
          name: chat.name,
          description: chat.description,
          type: chat.type,
          participants: chat.participants.length,
          createdAt: chat.createdAt,
        },
        messageCount: messages.length,
        messages: messages.map((msg) => ({
          id: msg._id,
          senderId: msg.senderId,
          content: msg.content,
          attachments: includeAttachments ? msg.attachments : [],
          reactions: msg.reactions || {},
          createdAt: msg.createdAt,
          editedAt: msg.editedAt,
        })),
        exportedAt: new Date(),
        format,
      };

      // Save export file
      const backupFileName = `backup_${chatId}_${Date.now()}.${format}`;
      const backupPath = path.join('backups', backupFileName);

      await fs.mkdir('backups', { recursive: true });

      if (format === 'json') {
        await fs.writeFile(backupPath, JSON.stringify(exportData, null, 2));
      } else if (format === 'csv') {
        const csv = this.convertToCSV(messages);
        await fs.writeFile(backupPath, csv);
      }

      logger.info(`Chat exported: ${chatId} (${messages.length} messages)`);

      return {
        chatId,
        backupId: backupFileName,
        messageCount: messages.length,
        fileSize: (await fs.stat(backupPath)).size,
        format,
        exportedAt: new Date(),
        path: backupPath,
      };
    } catch (error) {
      logger.error(`Error exporting chat: ${error.message}`);
      throw error;
    }
  }

  /**
   * Import messages from backup
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @param {Buffer} fileBuffer - Backup file
   * @returns {Object} Import result
   */
  async importMessages(chatId, userId, fileBuffer) {
    try {
      if (!chatId || !userId || !fileBuffer) {
        throw new Error('Missing required fields');
      }

      // Verify authorization
      const chat = await Chat.findById(chatId);
      if (!chat || chat.owner !== userId) {
        throw new Error('Not authorized to import to this chat');
      }

      let importData;
      try {
        importData = JSON.parse(fileBuffer.toString());
      } catch {
        throw new Error('Invalid backup file format');
      }

      if (!importData.messages || !Array.isArray(importData.messages)) {
        throw new Error('Invalid backup structure');
      }

      let importedCount = 0;
      const errors = [];

      for (const msgData of importData.messages) {
        try {
          // Check if message already exists
          const exists = await Message.findOne({
            _id: msgData.id,
            chatId,
          });

          if (!exists) {
            const message = new Message({
              _id: msgData.id,
              chatId,
              senderId: msgData.senderId,
              content: msgData.content,
              attachments: msgData.attachments || [],
              reactions: msgData.reactions || {},
              createdAt: new Date(msgData.createdAt),
              editedAt: msgData.editedAt ? new Date(msgData.editedAt) : null,
            });

            await message.save();
            importedCount++;
          }
        } catch (err) {
          errors.push({
            messageId: msgData.id,
            error: err.message,
          });
        }
      }

      logger.info(`Messages imported to chat ${chatId}: ${importedCount} messages`);

      return {
        chatId,
        importedCount,
        skippedCount: importData.messages.length - importedCount,
        errors,
        importedAt: new Date(),
      };
    } catch (error) {
      logger.error(`Error importing messages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Archive chat
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @returns {Object} Archive metadata
   */
  async archiveChat(chatId, userId) {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat || chat.owner !== userId) {
        throw new Error('Not authorized');
      }

      // Export before archiving
      const backup = await this.exportChat(chatId, userId, {
        format: 'json',
        includeAttachments: true,
      });

      // Archive in database
      chat.archived = true;
      chat.archivedAt = new Date();
      await chat.save();

      this.invalidateCache(chatId);
      logger.info(`Chat archived: ${chatId}`);

      return {
        chatId,
        backup,
        archivedAt: new Date(),
      };
    } catch (error) {
      logger.error(`Error archiving chat: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get chat backups
   * @param {string} chatId - Chat ID
   * @returns {Array} Backup list
   */
  async getBackups(chatId) {
    try {
      const cacheKey = `backups:${chatId}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }

      const backupDir = 'backups';
      let files = [];

      try {
        const fileList = await fs.readdir(backupDir);
        files = fileList.filter((f) => f.includes(chatId)).map((f) => ({
          filename: f,
          path: path.join(backupDir, f),
        }));
      } catch {
        // Directory doesn't exist yet
      }

      // Get file stats
      const backups = [];
      for (const file of files) {
        try {
          const stat = await fs.stat(file.path);
          backups.push({
            filename: file.filename,
            size: stat.size,
            createdAt: stat.mtime,
          });
        } catch (err) {
          logger.warn(`Could not stat backup file: ${file.path}`);
        }
      }

      this.cache.set(cacheKey, { data: backups, timestamp: Date.now() });
      return backups;
    } catch (error) {
      logger.error(`Error getting backups: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete old backups
   * @param {string} chatId - Chat ID
   * @param {number} keepCount - Number of backups to keep
   * @returns {number} Deleted count
   */
  async cleanupOldBackups(chatId, keepCount = 5) {
    try {
      const backups = await this.getBackups(chatId);

      if (backups.length > keepCount) {
        // Sort by date, newest first
        backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        let deletedCount = 0;
        for (let i = keepCount; i < backups.length; i++) {
          try {
            const filePath = path.join('backups', backups[i].filename);
            await fs.unlink(filePath);
            deletedCount++;
          } catch (err) {
            logger.warn(`Could not delete backup: ${backups[i].filename}`);
          }
        }

        this.invalidateCache(chatId);
        logger.info(`Cleaned up ${deletedCount} old backups for chat ${chatId}`);
        return deletedCount;
      }

      return 0;
    } catch (error) {
      logger.error(`Error cleaning up backups: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get backup statistics
   * @param {string} userId - User ID
   * @returns {Object} Statistics
   */
  async getBackupStats(userId) {
    try {
      const userChats = await Chat.find({ owner: userId });
      let totalBackups = 0;
      let totalSize = 0;

      for (const chat of userChats) {
        const backups = await this.getBackups(chat._id);
        totalBackups += backups.length;
        totalSize += backups.reduce((sum, b) => sum + b.size, 0);
      }

      return {
        totalBackups,
        totalSize,
        averageSize: totalBackups > 0 ? Math.round(totalSize / totalBackups) : 0,
        userChats: userChats.length,
      };
    } catch (error) {
      logger.error(`Error getting backup stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Restore from backup
   * @param {string} backupFile - Backup filename
   * @param {string} chatId - Target chat ID
   * @returns {Object} Restore result
   */
  async restoreFromBackup(backupFile, chatId) {
    try {
      const backupPath = path.join('backups', backupFile);

      // Verify file exists
      await fs.stat(backupPath);

      const fileContent = await fs.readFile(backupPath, 'utf-8');
      const backupData = JSON.parse(fileContent);

      if (backupData.messageCount === 0) {
        return { chatId, messagesRestored: 0, message: 'Backup is empty' };
      }

      let restoredCount = 0;
      const errors = [];

      for (const msgData of backupData.messages) {
        try {
          const message = new Message({
            chatId,
            senderId: msgData.senderId,
            content: msgData.content,
            attachments: msgData.attachments || [],
            createdAt: new Date(msgData.createdAt),
          });

          await message.save();
          restoredCount++;
        } catch (err) {
          errors.push({ error: err.message });
        }
      }

      logger.info(`Restored ${restoredCount} messages to chat ${chatId}`);

      return {
        chatId,
        messagesRestored: restoredCount,
        errors,
        restoredAt: new Date(),
      };
    } catch (error) {
      logger.error(`Error restoring backup: ${error.message}`);
      throw error;
    }
  }

  // Helper methods
  convertToCSV(messages) {
    if (messages.length === 0) return 'No messages';

    const headers = ['ID', 'Sender', 'Content', 'Created At'];
    const rows = messages.map((msg) => [
      msg._id,
      msg.senderId,
      `"${msg.content.replace(/"/g, '""')}"`,
      msg.createdAt.toISOString(),
    ]);

    return (
      headers.join(',') +
      '\n' +
      rows.map((row) => row.join(',')).join('\n')
    );
  }

  invalidateCache(chatId) {
    this.cache.delete(`backups:${chatId}`);
  }

  clearCache() {
    this.cache.clear();
    logger.info('Backup cache cleared');
  }
}

module.exports = new MessageBackupService();
