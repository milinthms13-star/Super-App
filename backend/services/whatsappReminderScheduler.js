const Reminder = require('../models/Reminder');
const { sendWhatsApp } = require('../utils/sendWhatsApp');
const { sendWhatsAppReminder } = require('../utils/sendWhatsAppReminder');
const { sendTelegramMessage } = require('../utils/sendTelegramMessage');
const { emitInAppNotification } = require('../utils/inAppNotification');
const logger = require('../utils/logger');

let whatsappSchedulerInterval = null;
const SCHEDULER_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_CONCURRENT_WHATSAPP = 15;
const GRACE_PERIOD = 1 * 60 * 1000; // 1 minute grace period

/**
 * Check and process reminders due for WhatsApp delivery
 * Handles both:
 *   A) Self reminders (whatsappPhoneNumber set directly on reminder)
 *   B) Contact reminders (recipientContactId + deliveryMode='text')
 */
async function checkAndProcessReminders() {
  try {
    const now = new Date();

    // ── A) Self / direct WhatsApp reminders (original behaviour) ─────────────
    const selfReminders = await Reminder.find({
      reminders: { $in: ['WhatsApp'] },
      completed: false,
      missedAt: { $exists: false },
      whatsappPhoneNumber: { $exists: true, $ne: '' },
    }).select('_id userId dueDate reminderBeforeOffsets notificationLog snoozedUntil whatsappPhoneNumber title description priority category').lean();

    const selfDue = selfReminders.filter(r => _needsWhatsAppNotification(r, now));
    for (let i = 0; i < selfDue.length; i += MAX_CONCURRENT_WHATSAPP) {
      await Promise.all(selfDue.slice(i, i + MAX_CONCURRENT_WHATSAPP).map(r => processReminder(r, now)));
    }

    // ── B) Contact reminders with text delivery mode ──────────────────────────
    const contactReminders = await Reminder.find({
      recipientContactId: { $exists: true, $ne: null },
      deliveryMode: 'text',
      completed: false,
      missedAt: { $exists: false },
    })
      .select('_id userId dueDate reminderBeforeOffsets notificationLog snoozedUntil whatsappPhoneNumber telegramChatId title description priority recipientContactId deliveryMode')
      .populate('recipientContactId', '_id name username')
      .lean();

    const contactDue = contactReminders.filter(r => _needsContactTextNotification(r, now));
    for (let i = 0; i < contactDue.length; i += MAX_CONCURRENT_WHATSAPP) {
      await Promise.all(contactDue.slice(i, i + MAX_CONCURRENT_WHATSAPP).map(r => processContactReminder(r, now)));
    }
  } catch (error) {
    logger.error('Error in WhatsApp reminder scheduler:', error);
  }
}

/**
 * Check if a contact-targeted text reminder is due for notification
 */
function _needsContactTextNotification(reminder, now) {
  if (reminder.snoozedUntil && reminder.snoozedUntil > now) return false;

  const offsets = reminder.reminderBeforeOffsets?.length ? reminder.reminderBeforeOffsets : [5];
  for (const offsetMinutes of offsets) {
    const notifyTime = new Date(reminder.dueDate.getTime() - offsetMinutes * 60 * 1000);
    const timeDiff = now.getTime() - notifyTime.getTime();
    const alreadyNotified = (reminder.notificationLog || []).some(
      log => log.offsetMinutes === offsetMinutes && log.channel === 'contact-text' && log.firedAt
    );
    if (timeDiff >= 0 && timeDiff <= GRACE_PERIOD && !alreadyNotified) return true;
  }
  return false;
}

/**
 * Process a contact-targeted text reminder:
 * tries WhatsApp WABA → Telegram → in-app (all free)
 */
async function processContactReminder(reminder, now) {
  try {
    const offsets = reminder.reminderBeforeOffsets?.length ? reminder.reminderBeforeOffsets : [5];
    const recipientUser = reminder.recipientContactId;
    if (!recipientUser) return;

    // Resolve sender name from userId (best-effort)
    let senderName = 'A contact';
    try {
      const User = require('../models/User');
      const sender = await User.findById(reminder.userId).select('name username').lean();
      senderName = sender?.name || sender?.username || senderName;
    } catch (_) { /* non-critical */ }

    for (const offsetMinutes of offsets) {
      const notifyTime = new Date(reminder.dueDate.getTime() - offsetMinutes * 60 * 1000);
      const timeDiff = now.getTime() - notifyTime.getTime();
      const alreadyNotified = (reminder.notificationLog || []).some(
        log => log.offsetMinutes === offsetMinutes && log.channel === 'contact-text' && log.firedAt
      );

      if (timeDiff < 0 || timeDiff > GRACE_PERIOD || alreadyNotified) continue;

      const dueLabel = reminder.dueDate
        ? new Date(reminder.dueDate).toLocaleDateString('en-IN')
        : 'soon';
      const timeText = formatTimeOffset(offsetMinutes);

      let delivered = false;

      // 1. WhatsApp (free WABA)
      if (reminder.whatsappPhoneNumber) {
        const waResult = await sendWhatsAppReminder(reminder.whatsappPhoneNumber, {
          senderName,
          title: reminder.title,
          description: reminder.description || '',
          dueLabel: `${dueLabel} (in ${timeText})`,
          priority: reminder.priority || 'Medium',
        });
        if (waResult.success) delivered = true;
        logger.info(`Contact WhatsApp for reminder ${reminder._id}: ${waResult.status}`);
      }

      // 2. Telegram (free bot)
      if (reminder.telegramChatId) {
        const tgResult = await sendTelegramMessage(
          reminder.telegramChatId,
          `🔔 *Reminder from ${senderName}*\n\n` +
          `📋 *${reminder.title}*\n` +
          (reminder.description ? `${reminder.description}\n\n` : '\n') +
          `⏰ Due in: ${timeText}\n` +
          `⚡ Priority: ${reminder.priority || 'Medium'}`
        );
        if (tgResult.success) delivered = true;
      }

      // 3. In-app (always attempt)
      const inAppResult = await emitInAppNotification(String(recipientUser._id), {
        type: 'reminder',
        title: `Reminder: ${reminder.title}`,
        body: `${senderName} set a reminder for you. Due in ${timeText}.`,
        reminderId: String(reminder._id),
        priority: reminder.priority,
      });
      if (inAppResult.success) delivered = true;

      // Record
      const logStatus = delivered ? 'sent' : 'failed';
      await Reminder.updateOne(
        { _id: reminder._id },
        {
          $push: {
            notificationLog: {
              offsetMinutes,
              firedAt: now,
              channel: 'contact-text',
              status: logStatus,
            },
          },
        }
      );

      logger.info(`Contact text reminder ${reminder._id} offset ${offsetMinutes}min → ${logStatus}`);
    }
  } catch (error) {
    logger.error(`Error processing contact reminder ${reminder._id}:`, error);
  }
}

/**
 * Check if a reminder needs WhatsApp notification (self/direct delivery)
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
