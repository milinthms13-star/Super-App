const Reminder = require('../models/Reminder');
const { sendTelegram } = require('../utils/sendTelegram');
const logger = require('../utils/logger');

let telegramSchedulerInterval = null;
const SCHEDULER_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_CONCURRENT_TELEGRAM = 20;
const GRACE_PERIOD = 1 * 60 * 1000; // 1 minute grace period

/**
 * Check and process reminders due for Telegram delivery
 */
async function checkAndProcessReminders() {
  try {
    const now = new Date();

    // Find all active reminders with Telegram channel enabled
    const reminders = await Reminder.find({
      $or: [
        { reminders: 'Telegram' },
        { reminders: { $in: ['Telegram'] } }
      ],
      completed: false,
      missedAt: { $exists: false }
    }).select('_id userId dueDate reminderBeforeOffsets notificationLog snoozedUntil telegramChatId title description priority').lean();

    if (reminders.length === 0) return;

    const batchSize = MAX_CONCURRENT_TELEGRAM;
    const remindersNeedingTelegram = reminders.filter(reminder => _needsTelegramNotification(reminder, now));

    for (let i = 0; i < remindersNeedingTelegram.length; i += batchSize) {
      const batch = remindersNeedingTelegram.slice(i, i + batchSize);
      await Promise.all(batch.map(reminder => processReminder(reminder, now)));
    }
  } catch (error) {
    logger.error('Error in Telegram reminder scheduler:', error);
  }
}

/**
 * Check if a reminder needs Telegram notification
 */
function _needsTelegramNotification(reminder, now) {
  if (!reminder.telegramChatId) return false;
  if (reminder.snoozedUntil && reminder.snoozedUntil > now) return false;

  const offsets = reminder.reminderBeforeOffsets && reminder.reminderBeforeOffsets.length > 0
    ? reminder.reminderBeforeOffsets
    : [5];

  for (const offsetMinutes of offsets) {
    const notificationTime = new Date(reminder.dueDate.getTime() - offsetMinutes * 60 * 1000);
    const timeDiff = now.getTime() - notificationTime.getTime();

    const alreadyNotified = reminder.notificationLog &&
      reminder.notificationLog.some(log => log.offsetMinutes === offsetMinutes && log.channel === 'Telegram' && log.firedAt);

    if (timeDiff >= 0 && timeDiff <= GRACE_PERIOD && !alreadyNotified) {
      return true;
    }
  }

  return false;
}

/**
 * Process a single reminder for Telegram delivery
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
        reminder.notificationLog.some(log => log.offsetMinutes === offsetMinutes && log.channel === 'Telegram' && log.firedAt);

      if (timeDiff >= 0 && timeDiff <= GRACE_PERIOD && !alreadyNotified) {
        const message = buildTelegramMessage(reminder, offsetMinutes);
        const result = await sendTelegram(reminder.telegramChatId, message, reminder._id.toString());

        await Reminder.updateOne(
          { _id: reminder._id },
          {
            $push: {
              notificationLog: {
                offsetMinutes,
                firedAt: now,
                channel: 'Telegram',
                status: result.success ? 'sent' : 'failed'
              }
            }
          }
        );

        logger.info(`Telegram notification sent for reminder ${reminder._id}`, {
          offsetMinutes,
          status: result.success ? 'sent' : 'failed'
        });
      }
    }
  } catch (error) {
    logger.error(`Error processing Telegram for reminder ${reminder._id}:`, error);
  }
}

/**
 * Build Telegram message content
 */
function buildTelegramMessage(reminder, offsetMinutes) {
  const timeText = formatTimeOffset(offsetMinutes);
  const priority = reminder.priority ? `[${reminder.priority}] ` : '';

  return `🔔 *Reminder Alert*\n\n` +
    `${priority}*${reminder.title}*\n` +
    `⏰ Due in: ${timeText}\n` +
    `📋 ${reminder.description || 'No description'}\n\n` +
    `📁 Category: ${reminder.category || 'Personal'}`;
}

/**
 * Format offset minutes to readable time string
 */
function formatTimeOffset(minutes) {
  if (minutes < 60) return `${minutes} minutes`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hour${Math.floor(minutes / 60) > 1 ? 's' : ''}`;
  return `${Math.floor(minutes / 1440)} day${Math.floor(minutes / 1440) > 1 ? 's' : ''}`;
}

/**
 * Start Telegram reminder scheduler
 */
function startTelegramReminderScheduler() {
  if (telegramSchedulerInterval) {
    logger.warn('Telegram reminder scheduler already running');
    return;
  }

  logger.info('Starting Telegram reminder scheduler');
  checkAndProcessReminders();
  telegramSchedulerInterval = setInterval(checkAndProcessReminders, SCHEDULER_INTERVAL);
}

/**
 * Stop Telegram reminder scheduler
 */
function stopTelegramReminderScheduler() {
  if (telegramSchedulerInterval) {
    logger.info('Stopping Telegram reminder scheduler');
    clearInterval(telegramSchedulerInterval);
    telegramSchedulerInterval = null;
  }
}

module.exports = {
  startTelegramReminderScheduler,
  stopTelegramReminderScheduler,
  checkAndProcessReminders,
  buildTelegramMessage
};
