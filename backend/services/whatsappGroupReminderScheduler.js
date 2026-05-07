/**
 * WhatsApp Group Reminder Scheduler
 * Schedule WhatsApp group reminder delivery at remind-before offsets
 * Handles bulk delivery to WhatsApp groups
 */

const Reminder = require('../models/Reminder');
const ReminderDeliveryLog = require('../models/ReminderDeliveryLog');
const { sendWhatsAppToGroup } = require('../utils/sendWhatsApp');
const reminderAnalyticsService = require('./reminderAnalyticsService');
const logger = require('../utils/logger');
const pLimit = require('p-limit');

let whatsappGroupSchedulerRunning = false;

class WhatsAppGroupReminderScheduler {
  constructor() {
    this.maxConcurrent = 15;
    this.limit = pLimit(this.maxConcurrent);
    this.gracePeriodMinutes = 1;
  }

  /**
   * Start WhatsApp group reminder scheduler
   */
  startWhatsAppGroupReminderScheduler() {
    if (whatsappGroupSchedulerRunning) {
      logger.warn('WhatsApp group reminder scheduler already running');
      return;
    }

    logger.info('Starting WhatsApp group reminder scheduler');
    whatsappGroupSchedulerRunning = true;

    // Run every 5 minutes
    this.schedulerInterval = setInterval(() => {
      this.checkAndProcessReminders().catch(error => {
        logger.error('Error in WhatsApp group scheduler:', error);
      });
    }, 5 * 60 * 1000);

    // Run immediately on startup
    this.checkAndProcessReminders().catch(error => {
      logger.error('Initial WhatsApp group scheduler error:', error);
    });
  }

  /**
   * Stop WhatsApp group reminder scheduler
   */
  stopWhatsAppGroupReminderScheduler() {
    if (!whatsappGroupSchedulerRunning) {
      logger.warn('WhatsApp group reminder scheduler not running');
      return;
    }

    logger.info('Stopping WhatsApp group reminder scheduler');
    clearInterval(this.schedulerInterval);
    whatsappGroupSchedulerRunning = false;
  }

  /**
   * Check and process all group reminders
   */
  async checkAndProcessReminders() {
    try {
      const now = new Date();

      // Find reminders with WhatsApp group configured and remind offsets
      const reminders = await Reminder.find({
        whatsappGroupId: { $exists: true, $ne: null },
        isActive: true,
        snoozedUntil: { $lt: now }
      })
        .select('_id userId title description dueDateTime whatsappGroupId category priority remindBeforeOffsets notificationLog')
        .lean();

      if (reminders.length === 0) {
        logger.debug('No group reminders to process');
        return;
      }

      logger.info(`Processing ${reminders.length} WhatsApp group reminders`);

      // Process each reminder
      const tasks = reminders.map(reminder =>
        this.limit(() => this._processReminder(reminder))
      );

      const results = await Promise.allSettled(tasks);

      const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
      const failed = results.filter(r => r.status === 'rejected').length;

      logger.info(`WhatsApp group reminder processing complete: ${successful} sent, ${failed} failed`);
    } catch (error) {
      logger.error('Error in checkAndProcessReminders:', error);
    }
  }

  /**
   * Process individual reminder
   * @private
   */
  async _processReminder(reminder) {
    try {
      const now = new Date();
      const remindBeforeOffsets = reminder.remindBeforeOffsets || [5, 1];

      // Check each offset
      for (const offset of remindBeforeOffsets) {
        if (this._needsWhatsAppGroupNotification(reminder, offset, now)) {
          await this.processReminder(reminder._id, reminder.userId, offset);
        }
      }

      return true;
    } catch (error) {
      logger.error(`Error processing group reminder ${reminder._id}:`, error);
      return false;
    }
  }

  /**
   * Determine if reminder needs notification at this offset
   * @private
   */
  _needsWhatsAppGroupNotification(reminder, offsetMinutes, now) {
    const notificationLog = reminder.notificationLog || [];
    const offsetLog = notificationLog.find(
      nl => nl.offsetMinutes === offsetMinutes && nl.channel === 'whatsapp-group'
    );

    if (offsetLog && offsetLog.firedAt) {
      return false; // Already fired
    }

    const dueTime = new Date(reminder.dueDateTime);
    const notificationTime = new Date(dueTime.getTime() - offsetMinutes * 60000);
    const gracePeriod = new Date(notificationTime.getTime() + this.gracePeriodMinutes * 60000);

    // Should fire if now is between notificationTime and gracePeriod
    return now >= notificationTime && now <= gracePeriod;
  }

  /**
   * Process and send group reminder
   */
  async processReminder(reminderId, userId, offsetMinutes) {
    try {
      const reminder = await Reminder.findById(reminderId);

      if (!reminder || !reminder.whatsappGroupId) {
        logger.warn(`Invalid reminder or missing group ID: ${reminderId}`);
        return;
      }

      const message = this._buildWhatsAppMessage(reminder, offsetMinutes);

      // Send to group
      const sendResult = await sendWhatsAppToGroup(
        reminder.whatsappGroupId,
        message,
        reminderId
      );

      // Log delivery
      const deliveryLog = {
        reminderId,
        userId,
        channel: 'whatsapp-group',
        offsetMinutes,
        scheduledTime: new Date(),
        deliveredAt: sendResult.success ? new Date() : null,
        status: sendResult.success ? 'sent' : 'failed',
        recipient: reminder.whatsappGroupId,
        errorMessage: sendResult.error || null,
        retryCount: 0,
        metadata: {
          messageId: sendResult.messageId,
          groupId: reminder.whatsappGroupId,
          provider: 'twilio-whatsapp'
        },
        reminderTitle: reminder.title,
        reminderCategory: reminder.category,
        reminderPriority: reminder.priority
      };

      await reminderAnalyticsService.logDelivery(deliveryLog);

      // Update reminder notification log
      await Reminder.findByIdAndUpdate(
        reminderId,
        {
          $push: {
            notificationLog: {
              offsetMinutes,
              firedAt: new Date(),
              channel: 'whatsapp-group',
              status: sendResult.success ? 'sent' : 'failed'
            }
          }
        }
      );

      if (sendResult.success) {
        logger.info(`WhatsApp group message sent for reminder ${reminderId}`);
      } else {
        logger.error(`WhatsApp group message failed for reminder ${reminderId}:`, sendResult.error);
      }

      return sendResult;
    } catch (error) {
      logger.error(`Error processing group reminder ${reminderId}:`, error);
      throw error;
    }
  }

  /**
   * Build WhatsApp message for group
   * @private
   */
  _buildWhatsAppMessage(reminder, offsetMinutes) {
    const dueTime = new Date(reminder.dueDateTime);
    const hoursRemaining = Math.round((dueTime - new Date()) / (1000 * 60 * 60));

    const priorityEmoji = {
      low: '🟢',
      medium: '🟡',
      high: '🔴',
      urgent: '🚨'
    };

    const emoji = priorityEmoji[reminder.priority] || '📝';

    const message = `${emoji} *[Group] ${reminder.title}*\n\n⏰ Due in: ${offsetMinutes} minutes\n📋 ${reminder.description || 'No description'}\n🏷️ ${reminder.category}\n⚡ Priority: ${reminder.priority}`;

    return message;
  }
}

module.exports = new WhatsAppGroupReminderScheduler();
