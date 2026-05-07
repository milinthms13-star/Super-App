const logger = require('../utils/logger');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const fs = require('fs').promises;
const path = require('path');

class MessageBackupService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000;
    this.backupRegistry = new Map();
  }

  async exportChat(chatId, userId, formatOrOptions = {}, maybeOptions = {}) {
    try {
      if (!chatId || !userId) {
        throw new Error('Missing required fields');
      }

      const options =
        typeof formatOrOptions === 'string'
          ? { ...maybeOptions, format: formatOrOptions }
          : { ...(formatOrOptions || {}) };
      const format = options.format || 'json';
      const includeAttachments = Boolean(options.includeAttachments);
      const startDate = options.startDate ? new Date(options.startDate) : null;
      const endDate = options.endDate ? new Date(options.endDate) : null;

      if (!['json', 'csv'].includes(format)) {
        throw new Error('Only json and csv export formats are supported');
      }

      const chat = await Chat.findById(chatId);
      if (!chat || !this.canAccessChat(chat, userId)) {
        throw new Error('Not authorized to export this chat');
      }

      let messages = await Message.find({ chatId }).sort({ createdAt: 1 }).exec();
      if (startDate || endDate) {
        messages = messages.filter((message) => {
          const createdAt = new Date(message.createdAt || Date.now());
          if (startDate && createdAt < startDate) {
            return false;
          }
          if (endDate && createdAt > endDate) {
            return false;
          }
          return true;
        });
      }

      const exportData = messages.map((message) => ({
        id: message._id,
        messageId: message._id,
        senderId: message.senderId,
        content: message.content,
        attachments: includeAttachments ? message.attachments || [] : [],
        reactions: message.reactions || [],
        createdAt: message.createdAt || new Date(),
        editedAt: message.editedAt || null,
      }));

      const backupId = `backup_${chatId}_${Date.now()}.${format}`;
      const backupPath = path.join('backups', backupId);
      await fs.mkdir('backups', { recursive: true });

      const fileContents =
        format === 'csv'
          ? this.convertToCSV(exportData)
          : JSON.stringify(
              {
                chatId,
                userId,
                format,
                messages: exportData,
                exportedAt: new Date(),
              },
              null,
              2
            );

      await fs.writeFile(backupPath, fileContents);
      const fileSize = (await fs.stat(backupPath)).size;
      const exportedAt = new Date();

      const metadata = {
        _id: backupId,
        backupId,
        filename: backupId,
        path: backupPath,
        chatId,
        userId,
        format,
        messageCount: exportData.length,
        size: fileSize,
        createdAt: exportedAt,
        payload: exportData,
      };
      this.backupRegistry.set(backupId, metadata);
      this.invalidateCache(chatId);

      logger.info(`Chat exported: ${chatId} (${exportData.length} messages)`);

      return {
        _id: backupId,
        backupId,
        chatId,
        format,
        data: format === 'csv' ? fileContents : exportData,
        messageCount: exportData.length,
        exportedAt,
        createdAt: exportedAt,
        fileSize,
        path: backupPath,
      };
    } catch (error) {
      logger.error(`Error exporting chat: ${error.message}`);
      throw error;
    }
  }

  async importMessages(chatId, userId, fileBufferOrObject) {
    try {
      if (!chatId || !userId || !fileBufferOrObject) {
        throw new Error('Missing required fields');
      }

      const chat = await Chat.findById(chatId);
      if (!chat || !this.canManageChat(chat, userId)) {
        throw new Error('Not authorized to import to this chat');
      }

      const importData = this.parseImportData(fileBufferOrObject);
      if (!importData.messages || !Array.isArray(importData.messages)) {
        throw new Error('Invalid backup structure');
      }

      let importedCount = 0;
      let skippedCount = 0;
      const errors = [];

      for (const messageData of importData.messages) {
        try {
          const messageId =
            messageData.messageId || messageData.id || messageData._id || `imported-${Date.now()}-${importedCount}`;
          const existing = await Message.findOne({ _id: messageId, chatId });
          if (existing) {
            skippedCount += 1;
            continue;
          }

          await Message.create({
            _id: messageId,
            chatId,
            senderId: messageData.senderId,
            content: messageData.content,
            attachments: messageData.attachments || [],
            reactions: messageData.reactions || [],
            createdAt: messageData.createdAt ? new Date(messageData.createdAt) : new Date(),
            editedAt: messageData.editedAt ? new Date(messageData.editedAt) : null,
            messageType: messageData.messageType || 'text',
            type: messageData.type || messageData.messageType || 'text',
          });
          importedCount += 1;
        } catch (innerError) {
          errors.push({
            messageId: messageData.messageId || messageData.id || messageData._id || null,
            error: innerError.message,
          });
        }
      }

      this.invalidateCache(chatId);
      logger.info(`Messages imported to chat ${chatId}: ${importedCount} messages`);

      return {
        chatId,
        importedCount,
        skippedCount,
        errors,
        importedAt: new Date(),
      };
    } catch (error) {
      logger.error(`Error importing messages: ${error.message}`);
      throw error;
    }
  }

  async archiveChat(chatId, userId) {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat || !this.canManageChat(chat, userId)) {
        throw new Error('Not authorized');
      }

      await this.exportChat(chatId, userId, { format: 'json', includeAttachments: true });
      chat.archived = true;
      chat.archivedAt = new Date();
      if (typeof chat.save === 'function') {
        await chat.save();
      }

      this.invalidateCache(chatId);
      logger.info(`Chat archived: ${chatId}`);
      return true;
    } catch (error) {
      logger.error(`Error archiving chat: ${error.message}`);
      throw error;
    }
  }

  async getBackups(chatId, userId, options = {}) {
    try {
      const limit = Number(options.limit || 20);
      const cacheKey = `backups:${chatId}:${userId || 'all'}:${limit}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      const backups = Array.from(this.backupRegistry.values())
        .filter((backup) => backup.chatId === chatId && (!userId || backup.userId === userId))
        .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
        .slice(0, limit)
        .map((backup) => ({
          _id: backup._id,
          filename: backup.filename,
          createdAt: backup.createdAt,
          messageCount: backup.messageCount,
          size: backup.size,
          format: backup.format,
        }));

      this.setCache(cacheKey, backups);
      return backups;
    } catch (error) {
      logger.error(`Error getting backups: ${error.message}`);
      throw error;
    }
  }

  async cleanupOldBackups(targetId, keepCountOrRetention = 5) {
    try {
      if (keepCountOrRetention < 0) {
        throw new Error('Retention days must be non-negative');
      }

      const chatBackups = Array.from(this.backupRegistry.values()).filter(
        (backup) => backup.chatId === targetId
      );

      if (chatBackups.length > 0) {
        const keepCount = Number(keepCountOrRetention);
        const sorted = chatBackups.sort(
          (left, right) => new Date(right.createdAt) - new Date(left.createdAt)
        );
        const toDelete = sorted.slice(keepCount);

        for (const backup of toDelete) {
          await this.deleteBackupRecord(backup);
        }

        this.invalidateCache(targetId);
        logger.info(`Cleaned up ${toDelete.length} old backups for chat ${targetId}`);
        return toDelete.length;
      }

      const retentionDays = Number(keepCountOrRetention);
      const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
      const userBackups = Array.from(this.backupRegistry.values()).filter(
        (backup) => backup.userId === targetId && new Date(backup.createdAt).getTime() < cutoff
      );

      for (const backup of userBackups) {
        await this.deleteBackupRecord(backup);
      }

      logger.info(`Cleaned up ${userBackups.length} backups for user ${targetId}`);
      return userBackups.length;
    } catch (error) {
      logger.error(`Error cleaning up backups: ${error.message}`);
      throw error;
    }
  }

  async getBackupStats(userId) {
    try {
      const backups = Array.from(this.backupRegistry.values()).filter((backup) => backup.userId === userId);
      const totalBackups = backups.length;
      const totalSize = backups.reduce((sum, backup) => sum + Number(backup.size || 0), 0);

      return {
        totalBackups,
        totalSize,
        averageBackupSize: totalBackups > 0 ? Math.round(totalSize / totalBackups) : 0,
        averageSize: totalBackups > 0 ? Math.round(totalSize / totalBackups) : 0,
        storageUsed: totalSize,
      };
    } catch (error) {
      logger.error(`Error getting backup stats: ${error.message}`);
      throw error;
    }
  }

  async restoreFromBackup(backupId, userIdOrChatId, options = {}) {
    try {
      const backup = this.backupRegistry.get(backupId);
      if (!backup) {
        throw new Error('Backup not found');
      }

      const targetChatId = backup.userId === userIdOrChatId ? backup.chatId : userIdOrChatId;
      const messages = backup.payload || [];
      let restoredCount = 0;
      const errors = [];

      for (const messageData of messages) {
        try {
          const messageId = options.merge
            ? `${messageData.id || messageData.messageId}-restored-${Date.now()}`
            : messageData.id || messageData.messageId;

          if (!options.merge) {
            const existing = await Message.findOne({ _id: messageId, chatId: targetChatId });
            if (existing) {
              continue;
            }
          }

          await Message.create({
            _id: messageId,
            chatId: targetChatId,
            senderId: messageData.senderId,
            content: messageData.content,
            attachments: messageData.attachments || [],
            reactions: messageData.reactions || [],
            createdAt: messageData.createdAt ? new Date(messageData.createdAt) : new Date(),
            editedAt: messageData.editedAt ? new Date(messageData.editedAt) : null,
            messageType: 'text',
            type: 'text',
          });
          restoredCount += 1;
        } catch (innerError) {
          errors.push({ error: innerError.message });
        }
      }

      this.invalidateCache(targetChatId);
      logger.info(`Restored ${restoredCount} messages to chat ${targetChatId}`);

      return {
        success: true,
        chatId: targetChatId,
        messagesRestored: restoredCount,
        errors,
        restoredAt: new Date(),
      };
    } catch (error) {
      logger.error(`Error restoring backup: ${error.message}`);
      throw error;
    }
  }

  async bulkArchiveMessages(chatId, userId, messageIds = []) {
    const chat = await Chat.findById(chatId);
    if (!chat || !this.canManageChat(chat, userId)) {
      throw new Error('Not authorized');
    }

    const result = await Message.updateMany(
      { _id: { $in: messageIds }, chatId },
      { $set: { archived: true, archivedAt: new Date() } }
    );

    this.invalidateCache(chatId);
    return result.modifiedCount;
  }

  async bulkDeleteMessages(chatId, userId, messageIds = []) {
    const chat = await Chat.findById(chatId);
    if (!chat || !this.canManageChat(chat, userId)) {
      throw new Error('Not authorized');
    }

    const result = await Message.updateMany(
      { _id: { $in: messageIds }, chatId },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: userId } }
    );

    this.invalidateCache(chatId);
    return result.modifiedCount;
  }

  convertToCSV(messages = []) {
    const headers = ['id', 'senderId', 'content', 'createdAt'];
    const rows = messages.map((message) => [
      message.id || message._id || '',
      message.senderId || '',
      `"${String(message.content || '').replace(/"/g, '""')}"`,
      new Date(message.createdAt || Date.now()).toISOString(),
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  canAccessChat(chat, userId) {
    const participants = Array.isArray(chat.participants) ? chat.participants : [];
    return (
      String(chat.owner || '') === String(userId) ||
      participants.some((participant) =>
        typeof participant === 'object'
          ? String(participant.userId || participant) === String(userId)
          : String(participant) === String(userId)
      )
    );
  }

  canManageChat(chat, userId) {
    return String(chat.owner || '') === String(userId);
  }

  parseImportData(fileBufferOrObject) {
    if (Buffer.isBuffer(fileBufferOrObject)) {
      return JSON.parse(fileBufferOrObject.toString());
    }

    if (typeof fileBufferOrObject === 'string') {
      return JSON.parse(fileBufferOrObject);
    }

    if (typeof fileBufferOrObject === 'object') {
      return fileBufferOrObject;
    }

    throw new Error('Invalid backup file format');
  }

  async deleteBackupRecord(backup) {
    this.backupRegistry.delete(backup._id);
    try {
      await fs.unlink(backup.path);
    } catch (error) {
      logger.warn(`Could not delete backup: ${backup.filename}`);
    }
  }

  getFromCache(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  setCache(cacheKey, value) {
    this.cache.set(cacheKey, {
      data: value,
      timestamp: Date.now(),
    });
  }

  invalidateCache(chatId) {
    Array.from(this.cache.keys()).forEach((cacheKey) => {
      if (cacheKey.includes(chatId)) {
        this.cache.delete(cacheKey);
      }
    });
  }

  clearCache() {
    this.cache.clear();
    logger.info('Backup cache cleared');
  }
}

module.exports = new MessageBackupService();
