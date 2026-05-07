const Reminder = require('../models/Reminder');
const { sendWhatsApp } = require('../utils/sendWhatsApp');
const logger = require('../utils/logger');

let whatsappSchedulerInterval = null;
const SCHEDULER_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_CONCURRENT_WHATSAPP = 15;
const GRACE_PERIOD = 1 * 60 * 1000; // 1 minute grace period

/**
 * Check and process reminders due for WhatsApp delivery
 * Sends WhatsApp messages at remind-before offset times
 */
async function checkAndProcessReminders() {
  try {
    const now = new Date();
    
    // Find all active reminders with WhatsApp channel enabled
    const reminders = await Reminder.find({
      $or: [
        { reminders: 'WhatsApp' },
        { reminders: { $in: ['WhatsApp'] } }
      ],
      completed: false,
      missedAt: { $exists: false }  // Skip missed reminders
    }).select('_id userId dueDate reminderBeforeOffsets notificationLog snoozedUntil whatsappPhoneNumber title description priority').lean();

    if (reminders.length === 0) return;

    // Process reminders in batches to respect concurrency limits
    const batchSize = MAX_CONCURRENT_WHATSAPP;
    const remindersNeedingWhatsApp = reminders.filter(reminder => _needsWhatsAppNotification(reminder, now));

    for (let i = 0; i < remindersNeedingWhatsApp.length; i += batchSize) {
      const batch = remindersNeedingWhatsApp.slice(i, i + batchSize);
      await Promise.all(batch.map(reminder => processReminder(reminder, now)));
    }
  } catch (error) {
    logger.error('Error in WhatsApp reminder scheduler:', error);
  }
}

/**
 * Check if a reminder needs WhatsApp notification
 * @param {Object} reminder - Reminder document
 * @param {Date} now - Current time
 * @returns {boolean}
 */
function _needsWhatsAppNotification(reminder, now) {
  // Skip if no phone number configured
  if (!reminder.whatsappPhoneNumber) return false;

  // Skip if snoozed
  if (reminder.snoozedUntil && reminder.snoozedUntil > now) return false;

  // Check remind-before offsets
  const offsets = reminder.reminderBeforeOffsets && reminder.reminderBeforeOffsets.length > 0
    ? reminder.reminderBeforeOffsets
    : [5]; // Default 5 minutes

  for (const offsetMinutes of offsets) {
    const notificationTime = new Date(reminder.dueDate.getTime() - offsetMinutes * 60 * 1000);
    const timeDiff = now.getTime() - notificationTime.getTime();

    // Check if notification time has passed but within grace period
    const alreadyNotified = reminder.notificationLog &&
      reminder.notificationLog.some(log => log.offsetMinutes === offsetMinutes && log.channel === 'WhatsApp' && log.firedAt);

    if (timeDiff >= 0 && timeDiff <= GRACE_PERIOD && !alreadyNotified) {
      return true;
    }
  }

  return false;
}

/**
 * Process a single reminder for WhatsApp delivery
 * @param {Object} reminder - Reminder document
 * @param {Date} now - Current time
 */
async function processReminder(reminder, now) {
  try {
    const offsets = reminder.reminderBeforeOffsets && reminder.reminderBeforeOffsets.length > 0
      ? reminder.reminderBeforeOffsets
      : [5];

    for (const offsetMinutes of offsets) {
      const notificationTime = new Date(reminder.dueDate.getTime() - offsetMinutes * 60 * 1000);
      const timeDiff = now.getTime() - notificationTime.getTime();

      const alreadyNotified = reminder.notificationLog &&
        reminder.notificationLog.some(log => log.offsetMinutes === offsetMinutes && log.channel === 'WhatsApp' && log.firedAt);

      if (timeDiff >= 0 && timeDiff <= GRACE_PERIOD && !alreadyNotified) {
        // Build WhatsApp message
        const message = buildWhatsAppMessage(reminder, offsetMinutes);

        // Send WhatsApp
        const result = await sendWhatsApp(reminder.whatsappPhoneNumber, message, reminder._id.toString());

        // Record in notification log
        await Reminder.updateOne(
          { _id: reminder._id },
          {
            $push: {
              notificationLog: {
                offsetMinutes,
                firedAt: now,
                channel: 'WhatsApp',
                status: result.success ? 'sent' : 'failed'
              }
            }
          }
        );

        logger.info(`WhatsApp notification sent for reminder ${reminder._id}`, {
          offsetMinutes,
          status: result.success ? 'sent' : 'failed'
        });
      }
    }
  } catch (error) {
    logger.error(`Error processing WhatsApp for reminder ${reminder._id}:`, error);
  }
}

/**
 * Build WhatsApp message content
 * @param {Object} reminder - Reminder object
 * @param {number} offsetMinutes - Offset from due time
 * @returns {string}
 */
function buildWhatsAppMessage(reminder, offsetMinutes) {
  const timeText = formatTimeOffset(offsetMinutes);
  const priority = reminder.priority ? `[${reminder.priority}] ` : '';
  
  return `📬 *Reminder Alert*\n\n` +
    `${priority}*${reminder.title}*\n` +
    `⏰ Due in: ${timeText}\n` +
    `📋 ${reminder.description || 'No description'}\n\n` +
    `Category: ${reminder.category || 'Personal'}`;
}

/**
 * Format offset minutes to readable time string
 * @param {number} minutes
 * @returns {string}
 */
function formatTimeOffset(minutes) {
  if (minutes < 60) return `${minutes} minutes`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hour${Math.floor(minutes / 60) > 1 ? 's' : ''}`;
  return `${Math.floor(minutes / 1440)} day${Math.floor(minutes / 1440) > 1 ? 's' : ''}`;
}

/**
 * Start WhatsApp reminder scheduler
 */
function startWhatsAppReminderScheduler() {
  if (whatsappSchedulerInterval) {
    logger.warn('WhatsApp reminder scheduler already running');
    return;
  }

  logger.info('Starting WhatsApp reminder scheduler');
  
  // Run immediately on start
  checkAndProcessReminders();

  // Then run at regular intervals
  whatsappSchedulerInterval = setInterval(checkAndProcessReminders, SCHEDULER_INTERVAL);
}

/**
 * Stop WhatsApp reminder scheduler
 */
function stopWhatsAppReminderScheduler() {
  if (whatsappSchedulerInterval) {
    logger.info('Stopping WhatsApp reminder scheduler');
    clearInterval(whatsappSchedulerInterval);
    whatsappSchedulerInterval = null;
  }
}

module.exports = {
  startWhatsAppReminderScheduler,
  stopWhatsAppReminderScheduler,
  checkAndProcessReminders,
  buildWhatsAppMessage
};
