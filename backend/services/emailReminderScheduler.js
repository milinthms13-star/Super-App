/**
 * Email Reminder Scheduler Service (Phase 3)
 * 
 * Runs periodically to:
 * 1. Find reminders with Email channel that are due
 * 2. Send email messages with remind-before offsets
 * 3. Track email delivery status
 * 4. Handle retries for failed messages
 * 5. Calculate next send time for recurring reminders
 */

const logger = require('../utils/logger');
const Reminder = require('../models/Reminder');
const { sendEmail, buildReminderEmailHtml, isConfigured } = require('../utils/sendEmail');
const { emitToUser } = require('../config/websocket');

class EmailReminderScheduler {
  constructor() {
    this.isRunning = false;
    this.checkInterval = null;
    this.checkIntervalMs = 5 * 60 * 1000; // Check every 5 minutes
    this.maxConcurrentEmails = 20;
    this.currentEmails = 0;
    this.graceWindowMs = 1 * 60 * 1000; // 1 minute grace window
  }

  /**
   * Start the scheduler service
   */
  start() {
    if (this.isRunning) {
      logger.warn('Email reminder scheduler is already running');
      return;
    }

    if (!isConfigured()) {
      logger.warn('Email service not configured - scheduler will not start');
      return;
    }

    this.isRunning = true;
    logger.info('Starting email reminder scheduler...');

    // Run immediately on start
    this.checkAndProcessReminders().catch(err =>
      logger.error('Error in initial email scheduler run:', err)
    );

    // Then run on interval
    this.checkInterval = setInterval(() => {
      this.checkAndProcessReminders().catch(err =>
        logger.error('Error in scheduled email check:', err)
      );
    }, this.checkIntervalMs);

    logger.info(`Email reminder scheduler started (interval: ${this.checkIntervalMs}ms)`);
  }

  /**
   * Stop the scheduler service
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Email reminder scheduler is not running');
      return;
    }

    clearInterval(this.checkInterval);
    this.isRunning = false;
    logger.info('Email reminder scheduler stopped');
  }

  /**
   * Check for reminders that need email and process them
   */
  async checkAndProcessReminders() {
    try {
      if (this.currentEmails >= this.maxConcurrentEmails) {
        logger.debug(`Skipping check: ${this.currentEmails} emails in progress`);
        return;
      }

      const now = new Date();

      // Find all reminders that:
      // 1. Have Email in channels
      // 2. Are not completed
      // 3. Have an email address configured
      // 4. Are due (considering remind-before offsets)
      const dueReminders = await Reminder.find({
        completed: { $ne: true },
        reminders: 'Email',
        email: { $exists: true, $nin: [null, ''] },
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

      logger.info(`Found ${dueReminders.length} reminders due for email`);

      // Filter reminders that need email notifications based on remind-before offsets
      const remindersToEmail = dueReminders.filter(reminder => {
        return this._needsEmailNotification(reminder, now);
      });

      if (remindersToEmail.length === 0) {
        return;
      }

      logger.info(`${remindersToEmail.length} reminders need email notifications`);

      // Process reminders concurrently
      const batches = this._batchArray(remindersToEmail, this.maxConcurrentEmails);

      for (const batch of batches) {
        await Promise.all(
          batch.map(reminder => this.processReminder(reminder))
        );
      }
    } catch (error) {
      logger.error('Error checking reminders for email:', error);
    }
  }

  /**
   * Check if a reminder needs email notification based on remind-before offsets
   */
  _needsEmailNotification(reminder, now) {
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
            log.channel === 'Email' &&
            log.status === 'sent'
          );

          if (!alreadySent) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      logger.error('Error checking email notification:', error);
      return false;
    }
  }

  /**
   * Process a single reminder - send email
   */
  async processReminder(reminder) {
    this.currentEmails++;

    try {
      logger.info(`Processing email reminder: ${reminder._id} (${reminder.title})`);

      // Find which offset(s) are due
      const offsets = reminder.reminderBeforeOffsets || [5];
      const now = new Date();
      const dueEmails = [];

      for (const offsetMinutes of offsets) {
        const offsetMs = offsetMinutes * 60 * 1000;
        const notificationTime = new Date(reminder.dueDate.getTime() - offsetMs);

        // Check if due
        if (notificationTime <= now && notificationTime > new Date(now.getTime() - this.graceWindowMs)) {
          // Check if not already sent
          const alreadySent = (reminder.notificationLog || []).some(log =>
            log.offsetMinutes === offsetMinutes &&
            log.channel === 'Email' &&
            log.status === 'sent'
          );

          if (!alreadySent) {
            dueEmails.push({ offsetMinutes, notificationTime });
          }
        }
      }

      if (dueEmails.length === 0) {
        logger.debug(`No emails to send for reminder ${reminder._id}`);
        return;
      }

      // Fetch full reminder (not lean) for model methods
      const fullReminder = await Reminder.findById(reminder._id);

      // Prepare email content
      const timeUntilDue = this._formatTimeUntil(reminder.dueDate);
      const htmlContent = buildReminderEmailHtml(reminder, timeUntilDue);
      const subject = `📌 Reminder: ${reminder.title}`;

      logger.debug(`Sending email to ${fullReminder.email}: ${subject}`);

      // Send email
      const emailResult = await sendEmail(
        fullReminder.email,
        subject,
        htmlContent,
        `Reminder: ${reminder.title}\n\n${timeUntilDue}`,
        fullReminder._id
      );

      // Record notification for each offset
      for (const emailOffset of dueEmails) {
        fullReminder.recordNotificationSent(emailOffset.offsetMinutes, 'Email');
        logger.info(`Recorded email sent for reminder ${fullReminder._id} at offset ${emailOffset.offsetMinutes}min`);
      }

      await fullReminder.save();

      // Notify user via WebSocket
      await this._notifyUser(fullReminder, emailResult);

      logger.info(`Email reminder sent for ${fullReminder._id}: ${emailResult.status}`);

    } catch (error) {
      logger.error(`Error processing email reminder ${reminder._id}:`, error);

      // Fetch and update reminder for error tracking
      try {
        const fullReminder = await Reminder.findById(reminder._id);
        if (fullReminder) {
          const offsets = fullReminder.reminderBeforeOffsets || [5];
          for (const offsetMinutes of offsets) {
            fullReminder.recordNotificationSent(offsetMinutes, 'Email');
          }
          fullReminder.markAsMissed();
          await fullReminder.save();
        }
      } catch (updateError) {
        logger.error('Error updating reminder after email failure:', updateError);
      }
    } finally {
      this.currentEmails--;
    }
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
  async _notifyUser(reminder, emailResult) {
    try {
      emitToUser(reminder.userId.toString(), 'reminder:email-sent', {
        reminderId: reminder._id,
        title: reminder.title,
        status: emailResult.status,
        message: `Email reminder sent to ${reminder.email}`
      });
    } catch (error) {
      logger.debug('Error notifying user of email:', error.message);
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
      maxConcurrentEmails: this.maxConcurrentEmails,
      currentEmails: this.currentEmails,
      isConfigured: isConfigured()
    };
  }
}

module.exports = new EmailReminderScheduler();
