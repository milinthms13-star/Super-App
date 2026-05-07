const Reminder = require('../models/Reminder');
const User = require('../models/User');
const { sendPushNotification } = require('../utils/sendPushNotification');
const logger = require('../utils/logger');

let pushSchedulerInterval = null;
const SCHEDULER_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_CONCURRENT_PUSH = 30;
const GRACE_PERIOD = 1 * 60 * 1000; // 1 minute grace period

/**
 * Check and process reminders due for push notification delivery
 */
async function checkAndProcessReminders() {
  try {
    const now = new Date();

    // Find all active reminders with Push channel enabled
    const reminders = await Reminder.find({
      $or: [
        { reminders: 'Push' },
        { reminders: { $in: ['Push'] } }
      ],
      completed: false,
      missedAt: { $exists: false }
    }).select('_id userId dueDate reminderBeforeOffsets notificationLog snoozedUntil title description priority category').lean();

    if (reminders.length === 0) return;

    const batchSize = MAX_CONCURRENT_PUSH;
    const remindersNeedingPush = reminders.filter(reminder => _needsPushNotification(reminder, now));

    for (let i = 0; i < remindersNeedingPush.length; i += batchSize) {
      const batch = remindersNeedingPush.slice(i, i + batchSize);
      await Promise.all(batch.map(reminder => processReminder(reminder, now)));
    }
  } catch (error) {
    logger.error('Error in push notification reminder scheduler:', error);
  }
}

/**
 * Check if a reminder needs push notification
 */
function _needsPushNotification(reminder, now) {
  // Skip if snoozed
  if (reminder.snoozedUntil && reminder.snoozedUntil > now) return false;

  const offsets = reminder.reminderBeforeOffsets && reminder.reminderBeforeOffsets.length > 0
    ? reminder.reminderBeforeOffsets
    : [5];

  for (const offsetMinutes of offsets) {
    const notificationTime = new Date(reminder.dueDate.getTime() - offsetMinutes * 60 * 1000);
    const timeDiff = now.getTime() - notificationTime.getTime();

    const alreadyNotified = reminder.notificationLog &&
      reminder.notificationLog.some(log => log.offsetMinutes === offsetMinutes && log.channel === 'Push' && log.firedAt);

    if (timeDiff >= 0 && timeDiff <= GRACE_PERIOD && !alreadyNotified) {
      return true;
    }
  }

  return false;
}

/**
 * Process a single reminder for push notification delivery
 */
async function processReminder(reminder, now) {
  try {
    // Fetch user to get push tokens
    const user = await User.findById(reminder.userId).select('pushTokens').lean();

    if (!user || !user.pushTokens || user.pushTokens.length === 0) {
      return;
    }

    const offsets = reminder.reminderBeforeOffsets && reminder.reminderBeforeOffsets.length > 0
      ? reminder.reminderBeforeOffsets
      : [5];

    for (const offsetMinutes of offsets) {
      const notificationTime = new Date(reminder.dueDate.getTime() - offsetMinutes * 60 * 1000);
      const timeDiff = now.getTime() - notificationTime.getTime();

      const alreadyNotified = reminder.notificationLog &&
        reminder.notificationLog.some(log => log.offsetMinutes === offsetMinutes && log.channel === 'Push' && log.firedAt);

      if (timeDiff >= 0 && timeDiff <= GRACE_PERIOD && !alreadyNotified) {
        const notificationData = buildPushNotification(reminder, offsetMinutes);

        // Send to all user's push tokens (devices)
        let successCount = 0;
        for (const pushToken of user.pushTokens) {
          try {
            const result = await sendPushNotification(pushToken, notificationData, reminder._id.toString());
            if (result.success) successCount++;
          } catch (error) {
            logger.warn(`Failed to send push to token ${pushToken}:`, error.message);
          }
        }

        // Record in notification log
        await Reminder.updateOne(
          { _id: reminder._id },
          {
            $push: {
              notificationLog: {
                offsetMinutes,
                firedAt: now,
                channel: 'Push',
                status: successCount > 0 ? 'sent' : 'failed'
              }
            }
          }
        );

        logger.info(`Push notification sent for reminder ${reminder._id}`, {
          offsetMinutes,
          devicesReached: successCount,
          totalDevices: user.pushTokens.length
        });
      }
    }
  } catch (error) {
    logger.error(`Error processing push for reminder ${reminder._id}:`, error);
  }
}

/**
 * Build push notification content
 */
function buildPushNotification(reminder, offsetMinutes) {
  const timeText = formatTimeOffset(offsetMinutes);

  return {
    title: `⏰ ${reminder.title}`,
    body: `Due in ${timeText}. ${reminder.description ? reminder.description.substring(0, 50) + (reminder.description.length > 50 ? '...' : '') : 'Tap to view details'}`,
    icon: '/logo192.png',
    badge: '/badge-72x72.png'
  };
}

/**
 * Format offset minutes to readable time string
 */
function formatTimeOffset(minutes) {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

/**
 * Start push notification reminder scheduler
 */
function startPushNotificationScheduler() {
  if (pushSchedulerInterval) {
    logger.warn('Push notification scheduler already running');
    return;
  }

  logger.info('Starting push notification reminder scheduler');
  checkAndProcessReminders();
  pushSchedulerInterval = setInterval(checkAndProcessReminders, SCHEDULER_INTERVAL);
}

/**
 * Stop push notification reminder scheduler
 */
function stopPushNotificationScheduler() {
  if (pushSchedulerInterval) {
    logger.info('Stopping push notification reminder scheduler');
    clearInterval(pushSchedulerInterval);
    pushSchedulerInterval = null;
  }
}

module.exports = {
  startPushNotificationScheduler,
  stopPushNotificationScheduler,
  checkAndProcessReminders,
  buildPushNotification
};
