/**
 * Bulk Template Management Service
 * Apply templates in bulk to multiple reminders
 * Enable template cloning, batch updates, and group operations
 */

const Reminder = require('../models/Reminder');
const ReminderTemplate = require('../models/ReminderTemplate');
const logger = require('../utils/logger');

class BulkTemplateManagementService {
  /**
   * Apply template to multiple reminders
   * @param {String} userId
   * @param {String} templateId
   * @param {Array<String>} reminderIds - IDs to apply template to
   * @returns {Promise<Object>} Result summary
   */
  async applyTemplateToReminders(userId, templateId, reminderIds) {
    try {
      // Verify template belongs to user
      const template = await ReminderTemplate.findOne({
        _id: templateId,
        userId
      });

      if (!template) {
        throw new Error('Template not found or unauthorized');
      }

      // Verify all reminders belong to user
      const reminders = await Reminder.find({
        _id: { $in: reminderIds },
        userId
      });

      if (reminders.length !== reminderIds.length) {
        throw new Error('Some reminders not found or unauthorized');
      }

      // Bulk update
      const result = await Reminder.updateMany(
        {
          _id: { $in: reminderIds },
          userId
        },
        {
          $set: { templateId }
        }
      );

      // Update template usage count
      await ReminderTemplate.findByIdAndUpdate(templateId, {
        $inc: { usageCount: reminderIds.length },
        lastUsed: new Date()
      });

      logger.info(`Applied template ${templateId} to ${result.modifiedCount} reminders`);

      return {
        success: true,
        templateId,
        appliedTo: result.modifiedCount,
        totalRequested: reminderIds.length,
        failed: reminderIds.length - result.modifiedCount
      };
    } catch (error) {
      logger.error('Error applying template to reminders:', error);
      throw error;
    }
  }

  /**
   * Apply template to reminders matching criteria
   * @param {String} userId
   * @param {String} templateId
   * @param {Object} filter - MongoDB filter object
   */
  async applyTemplateToMatching(userId, templateId, filter) {
    try {
      // Verify template exists and belongs to user
      const template = await ReminderTemplate.findOne({
        _id: templateId,
        userId
      });

      if (!template) {
        throw new Error('Template not found');
      }

      // Find matching reminders
      const matchingReminders = await Reminder.find({
        userId,
        ...filter
      }).select('_id');

      if (matchingReminders.length === 0) {
        return {
          success: true,
          appliedTo: 0,
          message: 'No reminders matched filter'
        };
      }

      const reminderIds = matchingReminders.map(r => r._id);

      // Apply template to all matching
      const result = await Reminder.updateMany(
        {
          _id: { $in: reminderIds },
          userId
        },
        {
          $set: { templateId }
        }
      );

      // Update template usage
      await ReminderTemplate.findByIdAndUpdate(templateId, {
        $inc: { usageCount: result.modifiedCount },
        lastUsed: new Date()
      });

      return {
        success: true,
        templateId,
        appliedTo: result.modifiedCount,
        filter
      };
    } catch (error) {
      logger.error('Error applying template to matching reminders:', error);
      throw error;
    }
  }

  /**
   * Bulk update reminder delivery channels
   * @param {String} userId
   * @param {Array<String>} reminderIds
   * @param {Object} channelConfig - e.g., { whatsappPhoneNumber, telegramChatId, pushEnabled }
   */
  async bulkUpdateChannels(userId, reminderIds, channelConfig) {
    try {
      // Validate reminders exist
      const reminders = await Reminder.find({
        _id: { $in: reminderIds },
        userId
      });

      if (reminders.length !== reminderIds.length) {
        throw new Error('Some reminders not found');
      }

      const updateData = {};

      if (channelConfig.whatsappPhoneNumber) {
        updateData.whatsappPhoneNumber = channelConfig.whatsappPhoneNumber;
      }
      if (channelConfig.telegramChatId) {
        updateData.telegramChatId = channelConfig.telegramChatId;
      }
      if (typeof channelConfig.pushEnabled === 'boolean') {
        updateData.pushEnabled = channelConfig.pushEnabled;
      }

      const result = await Reminder.updateMany(
        {
          _id: { $in: reminderIds },
          userId
        },
        {
          $set: updateData
        }
      );

      logger.info(`Bulk updated ${result.modifiedCount} reminders with channels:`, channelConfig);

      return {
        success: true,
        updated: result.modifiedCount,
        channels: Object.keys(updateData)
      };
    } catch (error) {
      logger.error('Error bulk updating channels:', error);
      throw error;
    }
  }

  /**
   * Bulk snooze reminders
   * @param {String} userId
   * @param {Array<String>} reminderIds
   * @param {Number} snoozeMinutes
   */
  async bulkSnooze(userId, reminderIds, snoozeMinutes) {
    try {
      const snoozeUntil = new Date(Date.now() + snoozeMinutes * 60000);

      const result = await Reminder.updateMany(
        {
          _id: { $in: reminderIds },
          userId
        },
        {
          $set: { snoozedUntil: snoozeUntil }
        }
      );

      logger.info(`Bulk snoozed ${result.modifiedCount} reminders for ${snoozeMinutes} minutes`);

      return {
        success: true,
        snoozed: result.modifiedCount,
        snoozeUntil,
        snoozeMinutes
      };
    } catch (error) {
      logger.error('Error bulk snoozing reminders:', error);
      throw error;
    }
  }

  /**
   * Bulk delete reminders
   * @param {String} userId
   * @param {Array<String>} reminderIds
   */
  async bulkDelete(userId, reminderIds) {
    try {
      const result = await Reminder.deleteMany({
        _id: { $in: reminderIds },
        userId
      });

      logger.info(`Bulk deleted ${result.deletedCount} reminders`);

      return {
        success: true,
        deleted: result.deletedCount,
        requested: reminderIds.length
      };
    } catch (error) {
      logger.error('Error bulk deleting reminders:', error);
      throw error;
    }
  }

  /**
   * Bulk update reminder priority
   * @param {String} userId
   * @param {Array<String>} reminderIds
   * @param {String} priority - 'low', 'medium', 'high', 'urgent'
   */
  async bulkUpdatePriority(userId, reminderIds, priority) {
    try {
      if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
        throw new Error('Invalid priority');
      }

      const result = await Reminder.updateMany(
        {
          _id: { $in: reminderIds },
          userId
        },
        {
          $set: { priority }
        }
      );

      return {
        success: true,
        updated: result.modifiedCount,
        priority
      };
    } catch (error) {
      logger.error('Error bulk updating priority:', error);
      throw error;
    }
  }

  /**
   * Bulk update reminder category
   * @param {String} userId
   * @param {Array<String>} reminderIds
   * @param {String} category
   */
  async bulkUpdateCategory(userId, reminderIds, category) {
    try {
      const result = await Reminder.updateMany(
        {
          _id: { $in: reminderIds },
          userId
        },
        {
          $set: { category }
        }
      );

      return {
        success: true,
        updated: result.modifiedCount,
        category
      };
    } catch (error) {
      logger.error('Error bulk updating category:', error);
      throw error;
    }
  }

  /**
   * Get bulk operation summary
   * Returns list of reminders grouped by status/priority/category
   * @param {String} userId
   * @param {String} groupBy - 'priority', 'category', 'channel'
   */
  async getReminderGroupSummary(userId, groupBy = 'priority') {
    try {
      const validGroupings = ['priority', 'category', 'channel'];
      if (!validGroupings.includes(groupBy)) {
        throw new Error('Invalid groupBy parameter');
      }

      const groupField = groupBy === 'channel' ? '$whatsappPhoneNumber' : `$${groupBy}`;

      const result = await Reminder.aggregate([
        {
          $match: { userId }
        },
        {
          $group: {
            _id: groupField,
            count: { $sum: 1 },
            reminderIds: { $push: '$_id' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      return {
        groupBy,
        summary: result
      };
    } catch (error) {
      logger.error('Error getting group summary:', error);
      throw error;
    }
  }

  /**
   * Clone template to multiple channels
   * @param {String} userId
   * @param {String} templateId
   * @param {Array<String>} channelList - ['email', 'sms', 'whatsapp', 'telegram', 'push']
   */
  async expandTemplateToChannels(userId, templateId, channelList) {
    try {
      const template = await ReminderTemplate.findOne({
        _id: templateId,
        userId
      });

      if (!template) {
        throw new Error('Template not found');
      }

      // For each channel, ensure template has that channel content
      // This could be used to generate content for new channels
      const expandedChannels = [];

      for (const channel of channelList) {
        if (channel === 'email' && template.emailTemplate) {
          expandedChannels.push('email');
        } else if (channel === 'sms' && template.smsTemplate) {
          expandedChannels.push('sms');
        } else if (channel === 'whatsapp' && template.whatsappTemplate) {
          expandedChannels.push('whatsapp');
        } else if (channel === 'telegram' && template.telegramTemplate) {
          expandedChannels.push('telegram');
        } else if (channel === 'push' && template.pushTemplate) {
          expandedChannels.push('push');
        }
      }

      return {
        success: true,
        templateId,
        availableChannels: expandedChannels,
        requestedChannels: channelList,
        missingChannels: channelList.filter(c => !expandedChannels.includes(c))
      };
    } catch (error) {
      logger.error('Error expanding template to channels:', error);
      throw error;
    }
  }
}

module.exports = new BulkTemplateManagementService();
