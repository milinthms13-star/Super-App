/**
 * SMS Reminder Scheduler Service (Phase 2)
 * 
 * Runs periodically to:
 * 1. Find reminders with SMS channel that are due
 * 2. Send SMS messages with remind-before offsets
 * 3. Track SMS delivery status
 * 4. Handle retries for failed messages
 * 5. Calculate next send time for recurring reminders
 */

const logger = require('../utils/logger');
const Reminder = require('../models/Reminder');
const { sendSMS } = require('../utils/sendSMS');
const { emitToUser } = require('../config/websocket');

class SMSReminderScheduler {
  constructor() {
    this.isRunning = false;
    this.checkInterval = null;
    this.checkIntervalMs = 5 * 60 * 1000; // Check every 5 minutes
    this.maxConcurrentSMS = 10;
    this.currentSMS = 0;
    this.graceWindowMs = 1 * 60 * 1000; // 1 minute grace window
  }

  /**
   * Start the scheduler service
   */
  start() {
    if (this.isRunning) {
      logger.warn('SMS reminder scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting SMS reminder scheduler...');

    // Run immediately on start
    this.checkAndProcessReminders().catch(err =>
      logger.error('Error in initial SMS scheduler run:', err)
    );

    // Then run on interval
    this.checkInterval = setInterval(() => {
      this.checkAndProcessReminders().catch(err =>
        logger.error('Error in scheduled SMS check:', err)
      );
    }, this.checkIntervalMs);

    logger.info(`SMS reminder scheduler started (interval: ${this.checkIntervalMs}ms)`);
  }

  /**
   * Stop the scheduler service
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('SMS reminder scheduler is not running');
      return;
    }

    clearInterval(this.checkInterval);
    this.isRunning = false;
    logger.info('SMS reminder scheduler stopped');
  }

  /**
   * Check for reminders that need SMS and process them
   */
  async checkAndProcessReminders() {
    try {
      if (this.currentSMS >= this.maxConcurrentSMS) {
        logger.debug(`Skipping check: ${this.currentSMS} SMS in progress`);
        return;
      }

      const now = new Date();
      const gracePeriodStart = new Date(now.getTime() - this.graceWindowMs);

      // Find all reminders that:
      // 1. Have SMS in channels
      // 2. Are not completed
      // 3. Have a phone number configured
      // 4. Are due (considering remind-before offsets)
      const dueReminders = await Reminder.find({
        completed: { $ne: true },
        reminders: 'SMS',
        recipientPhoneNumber: { $exists: true, $nin: [null, ''] },
        $and: [
          // Check if any remind-before offset is due
          {
            $expr: {
              $lt: [
                '$dueDate',
                new Date(now.getTime() + 5 * 60 * 1000) // Check within next 5 minutes
              ]
            }
          },
          // Ensure not snoozed
          {
            $or: [
              { snoozedUntil: { $exists: false } },
              { snoozedUntil: null },
              { snoozedUntil: { $lt: now } }
            ]
          },
          // Not marked as missed
          {
            $or: [
              { missedAt: { $exists: false } },
              { missedAt: null }
            ]
          }
        ]
      }).lean();

      if (dueReminders.length === 0) {
        return;
      }

      logger.info(`Found ${dueReminders.length} reminders due for SMS`);

      // Filter reminders that need SMS notifications based on remind-before offsets
      const remindersToSMS = dueReminders.filter(reminder => {
        return this._needsSMSNotification(reminder, now);
      });

      if (remindersToSMS.length === 0) {
        return;
      }

      logger.info(`${remindersToSMS.length} reminders need SMS notifications`);

      // Process reminders concurrently
      const batches = this._batchArray(remindersToSMS, this.maxConcurrentSMS);

      for (const batch of batches) {
        await Promise.all(
          batch.map(reminder => this.processReminder(reminder))
        );
      }
    } catch (error) {
      logger.error('Error checking reminders for SMS:', error);
    }
  }

  /**
   * Check if a reminder needs SMS notification based on remind-before offsets
   */
  _needsSMSNotification(reminder, now) {
    try {
      const offsets = reminder.reminderBeforeOffsets || [5];

      for (const offsetMinutes of offsets) {
        const offsetMs = offsetMinutes * 60 * 1000;
        const notificationTime = new Date(reminder.dueDate.getTime() - offsetMs);

        // Check if notification is due (within grace window)
        if (notificationTime <= now && notificationTime > new Date(now.getTime() - this.graceWindowMs)) {
          // Check if already sent
          const alreadySent = (reminder.notificationLog || []).some(log =>
            log.offsetMinutes === offsetMinutes &&
            log.channel === 'SMS' &&
            log.status === 'sent'
          );

          if (!alreadySent) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      logger.error('Error checking SMS notification:', error);
      return false;
    }
  }

  /**
   * Process a single reminder - send SMS
   */
  async processReminder(reminder) {
    this.currentSMS++;

    try {
      logger.info(`Processing SMS reminder: ${reminder._id} (${reminder.title})`);

      // Find which offset(s) are due
      const offsets = reminder.reminderBeforeOffsets || [5];
      const now = new Date();
      const dueSMS = [];

      for (const offsetMinutes of offsets) {
        const offsetMs = offsetMinutes * 60 * 1000;
        const notificationTime = new Date(reminder.dueDate.getTime() - offsetMs);

        // Check if due
        if (notificationTime <= now && notificationTime > new Date(now.getTime() - this.graceWindowMs)) {
          // Check if not already sent
          const alreadySent = (reminder.notificationLog || []).some(log =>
            log.offsetMinutes === offsetMinutes &&
            log.channel === 'SMS' &&
            log.status === 'sent'
          );

          if (!alreadySent) {
            dueSMS.push({ offsetMinutes, notificationTime });
          }
        }
      }

      if (dueSMS.length === 0) {
        logger.debug(`No SMS to send for reminder ${reminder._id}`);
        return;
      }

      // Fetch full reminder (not lean) for model methods
      const fullReminder = await Reminder.findById(reminder._id);

      // Prepare SMS message
      const timeUntilDue = this._formatTimeUntil(reminder.dueDate);
      const message = this._buildSMSMessage(
        reminder.title,
        reminder.description,
        timeUntilDue,
        reminder.priority
      );

      logger.debug(`Sending SMS to ${fullReminder.recipientPhoneNumber}: ${message}`);

      // Send SMS
      const smsResult = await sendSMS(
        fullReminder.recipientPhoneNumber,
        message,
        fullReminder._id
      );

      // Record notification for each offset
      for (const smsOffset of dueSMS) {
        fullReminder.recordNotificationSent(smsOffset.offsetMinutes, 'SMS');
        logger.info(`Recorded SMS sent for reminder ${fullReminder._id} at offset ${smsOffset.offsetMinutes}min`);
      }

      await fullReminder.save();

      // Notify user via WebSocket
      await this._notifyUser(fullReminder, smsResult);

      logger.info(`SMS reminder sent for ${fullReminder._id}: ${smsResult.status}`);

    } catch (error) {
      logger.error(`Error processing SMS reminder ${reminder._id}:`, error);

      // Fetch and update reminder for error tracking
      try {
        const fullReminder = await Reminder.findById(reminder._id);
        if (fullReminder) {
          const offsets = fullReminder.reminderBeforeOffsets || [5];
          for (const offsetMinutes of offsets) {
            fullReminder.recordNotificationSent(offsetMinutes, 'SMS');
          }
          fullReminder.markAsMissed();
          await fullReminder.save();
        }
      } catch (updateError) {
        logger.error('Error updating reminder after SMS failure:', updateError);
      }
    } finally {
      this.currentSMS--;
    }
  }

  /**
   * Build SMS message text
   */
  _buildSMSMessage(title, description, timeUntilDue, priority) {
    let message = `📌 ${title}`;

    if (description) {
      message += `\n\n${description}`;
    }

    if (timeUntilDue) {
      message += `\n\n⏰ ${timeUntilDue}`;
    }

    if (priority) {
      const priorityEmoji = priority === 'High' ? '🔴' : priority === 'Medium' ? '🟡' : '🟢';
      message += `\n\n${priorityEmoji} Priority: ${priority}`;
    }

    return message;
  }

  /**
   * Format time remaining until due date
   */
  _formatTimeUntil(dueDate) {
    const now = new Date();
    const diff = dueDate - now;

    if (diff < 0) {
      return 'Due now';
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `Due in ${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `Due in ${minutes}m`;
    } else {
      return 'Due in less than a minute';
    }
  }

  /**
   * Notify user via WebSocket
   */
  async _notifyUser(reminder, smsResult) {
    try {
      emitToUser(reminder.userId.toString(), 'reminder:sms-sent', {
        reminderId: reminder._id,
        title: reminder.title,
        status: smsResult.status,
        message: `SMS reminder sent to ${reminder.recipientPhoneNumber}`
      });
    } catch (error) {
      logger.debug('Error notifying user of SMS:', error.message);
    }
  }

  /**
   * Batch array for concurrent processing
   */
  _batchArray(arr, batchSize) {
    const batches = [];
    for (let i = 0; i < arr.length; i += batchSize) {
      batches.push(arr.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkIntervalMs: this.checkIntervalMs,
      maxConcurrentSMS: this.maxConcurrentSMS,
      currentSMS: this.currentSMS
    };
  }
}

module.exports = new SMSReminderScheduler();
