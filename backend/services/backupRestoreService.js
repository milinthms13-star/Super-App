const ChatBackup = require('../models/ChatBackup');
const RestoreQueue = require('../models/RestoreQueue');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const json2csv = require('json2csv').parse;
const logger = require('../utils/logger');

class BackupRestoreService {
  constructor() {
    if (BackupRestoreService.instance) {
      return BackupRestoreService.instance;
    }
    this.backupDir = path.join(__dirname, '../backups');
    BackupRestoreService.instance = this;
  }

  /**
   * Create backup of one or all chats
   */
  async createBackup(userId, chatId = null, backupType = 'single-chat') {
    try {
      // Create backup directory if not exists
      await fs.mkdir(this.backupDir, { recursive: true });

      const backup = new ChatBackup({
        userId,
        chatId,
        backupType,
        backupName: `backup_${new Date().toISOString().split('T')[0]}`,
        status: 'in-progress',
        progress: 0,
      });

      await backup.save();

      // Start async backup process
      this._performBackup(backup, chatId).catch((error) => {
        logger.error('Error in backup process:', error);
      });

      return backup;
    } catch (error) {
      logger.error('Error creating backup:', error);
      throw error;
    }
  }

  /**
   * Internal method to perform backup
   */
  async _performBackup(backup, chatId) {
    try {
      let chats;
      if (chatId) {
        chats = [await Chat.findById(chatId)];
      } else {
        chats = await Chat.find({ participants: backup.userId });
      }

      let totalMessages = 0;
      let totalMedia = 0;
      const backupData = {
        metadata: {
          userId: backup.userId,
          createdAt: new Date(),
          chatCount: chats.length,
        },
        chats: [],
      };

      for (let i = 0; i < chats.length; i++) {
        const chat = chats[i];
        const messages = await Message.find({ chatId: chat._id })
          .populate('senderId', 'username email')
          .lean();

        backupData.chats.push({
          chatId: chat._id,
          chatName: chat.name,
          messages: messages,
        });

        totalMessages += messages.length;
        totalMedia += messages.filter((m) => m.mediaUrls?.length).length;

        // Update progress
        backup.progress = Math.round((i / chats.length) * 100);
        await backup.save();
      }

      // Save backup file
      const backupFileName = `backup_${backup._id}_${Date.now()}.json`;
      const backupFilePath = path.join(this.backupDir, backupFileName);

      await fs.writeFile(backupFilePath, JSON.stringify(backupData, null, 2));

      // Update backup metadata
      backup.messageCount = totalMessages;
      backup.mediaCount = totalMedia;
      backup.backupSize = (await fs.stat(backupFilePath)).size;
      backup.storageLocation = backupFilePath;
      backup.status = 'completed';
      backup.progress = 100;
      backup.completedAt = new Date();
      backup.isVerified = true;
      backup.verificationHash = await this._generateHash(backupFilePath);

      await backup.save();

      logger.info(`Backup ${backup._id} completed with ${totalMessages} messages`);
      return backup;
    } catch (error) {
      backup.status = 'failed';
      await backup.save();
      logger.error('Error performing backup:', error);
      throw error;
    }
  }

  /**
   * Get all backups for user
   */
  async getBackups(userId, filters = {}) {
    try {
      const query = { userId };

      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.backupType) {
        query.backupType = filters.backupType;
      }

      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      const backups = await ChatBackup.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await ChatBackup.countDocuments(query);

      return {
        backups,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error retrieving backups:', error);
      throw error;
    }
  }

  /**
   * Export chat as JSON
   */
  async exportChatAsJSON(chatId, userId) {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }

      const messages = await Message.find({ chatId }).populate('senderId');

      const exportData = {
        chat: {
          id: chat._id,
          name: chat.name,
          type: chat.type,
          createdAt: chat.createdAt,
        },
        messageCount: messages.length,
        messages: messages,
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      logger.error('Error exporting chat as JSON:', error);
      throw error;
    }
  }

  /**
   * Export chat as CSV
   */
  async exportChatAsCSV(chatId) {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }

      const messages = await Message.find({ chatId })
        .populate('senderId', 'username email')
        .lean();

      const csvData = messages.map((msg) => ({
        messageId: msg._id,
        sender: msg.senderId?.username || 'Unknown',
        senderEmail: msg.senderId?.email || 'N/A',
        content: msg.content,
        messageType: msg.messageType,
        timestamp: msg.createdAt,
        status: msg.status,
        readBy: msg.readBy?.length || 0,
      }));

      return json2csv(csvData);
    } catch (error) {
      logger.error('Error exporting chat as CSV:', error);
      throw error;
    }
  }

  /**
   * Restore chat from backup
   */
  async restoreChatFromBackup(backupId, userId) {
    try {
      const backup = await ChatBackup.findById(backupId);
      if (!backup) {
        throw new Error('Backup not found');
      }

      const restoreQueue = new RestoreQueue({
        userId,
        backupId,
        status: 'pending',
        totalMessages: backup.messageCount,
      });

      await restoreQueue.save();

      // Start async restoration
      this._performRestore(restoreQueue, backup).catch((error) => {
        logger.error('Error in restore process:', error);
      });

      return restoreQueue;
    } catch (error) {
      logger.error('Error initiating restore:', error);
      throw error;
    }
  }

  /**
   * Internal method to perform restoration
   */
  async _performRestore(restoreQueue, backup) {
    try {
      restoreQueue.status = 'in-progress';
      restoreQueue.startedAt = new Date();
      await restoreQueue.save();

      const backupFile = await fs.readFile(backup.storageLocation, 'utf-8');
      const backupData = JSON.parse(backupFile);

      let processedMessages = 0;

      for (const chatData of backupData.chats) {
        for (const messageData of chatData.messages) {
          // Restore message
          const newMessage = new Message({
            chatId: chatData.chatId,
            senderId: messageData.senderId,
            content: messageData.content,
            messageType: messageData.messageType,
            mediaUrls: messageData.mediaUrls,
            createdAt: messageData.createdAt,
          });

          await newMessage.save();
          processedMessages++;

          // Update progress
          restoreQueue.processedMessages = processedMessages;
          restoreQueue.progress = Math.round(
            (processedMessages / restoreQueue.totalMessages) * 100
          );
          await restoreQueue.save();
        }
      }

      restoreQueue.status = 'completed';
      restoreQueue.completedAt = new Date();
      restoreQueue.progress = 100;
      await restoreQueue.save();

      logger.info(`Restoration completed: ${processedMessages} messages restored`);
      return restoreQueue;
    } catch (error) {
      restoreQueue.status = 'failed';
      restoreQueue.errorMessage = error.message;
      await restoreQueue.save();
      logger.error('Error performing restore:', error);
      throw error;
    }
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupId) {
    try {
      const backup = await ChatBackup.findByIdAndDelete(backupId);
      if (!backup) {
        throw new Error('Backup not found');
      }

      // Delete backup file from storage
      if (backup.storageLocation && backup.storageLocation.startsWith(this.backupDir)) {
        await fs.unlink(backup.storageLocation);
      }

      logger.info(`Backup ${backupId} deleted`);
      return backup;
    } catch (error) {
      logger.error('Error deleting backup:', error);
      throw error;
    }
  }

  /**
   * Get restoration status
   */
  async getRestoreStatus(restoreId) {
    try {
      const restore = await RestoreQueue.findById(restoreId);
      if (!restore) {
        throw new Error('Restoration record not found');
      }
      return restore;
    } catch (error) {
      logger.error('Error getting restore status:', error);
      throw error;
    }
  }

  /**
   * Schedule auto-backup for user
   */
  async scheduleAutoBackup(userId, frequency = 'weekly') {
    try {
      const backup = await ChatBackup.findOneAndUpdate(
        { userId, status: 'completed' },
        {
          autoBackup: {
            enabled: true,
            frequency,
          },
        },
        { new: true }
      );

      if (!backup) {
        throw new Error('No completed backup found to schedule');
      }

      logger.info(`Auto-backup scheduled for user ${userId} with frequency ${frequency}`);
      return backup;
    } catch (error) {
      logger.error('Error scheduling auto-backup:', error);
      throw error;
    }
  }

  /**
   * Generate hash for backup verification
   */
  async _generateHash(filePath) {
    try {
      const fileContent = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(fileContent).digest('hex');
    } catch (error) {
      logger.error('Error generating hash:', error);
      return null;
    }
  }
}

module.exports = new BackupRestoreService();
