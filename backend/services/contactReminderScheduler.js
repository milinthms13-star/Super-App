/**
 * contactReminderScheduler
 * Handles reminders that target a specific contact with deliveryMode = 'voice'.
 * When a voice-mode contact reminder is due:
 *   - If Twilio is configured → automated call via voiceCallService
 *   - Otherwise → in-app notification prompting the scheduler owner to call manually
 *
 * Text-mode contact reminders are handled by whatsappReminderScheduler.
 */

const Reminder = require('../models/Reminder');
const voiceCallService = require('./voiceCallService');
const { emitInAppNotification } = require('../utils/inAppNotification');
const logger = require('../utils/logger');

let schedulerInterval = null;
const SCHEDULER_INTERVAL = 2 * 60 * 1000; // 2 minutes — tighter loop for calls
const GRACE_PERIOD = 2 * 60 * 1000;       // 2 minutes grace

// ── Helpers ──────────────────────────────────────────────────────────────────

function _isVoiceCallDue(reminder, now) {
  if (reminder.snoozedUntil && new Date(reminder.snoozedUntil) > now) return false;
  if (reminder.callStatus === 'completed') return false;
  if ((reminder.callAttempts || 0) >= (reminder.maxCallAttempts || 3)) return false;

  const scheduled = reminder.nextCallTime
    ? new Date(reminder.nextCallTime)
    : reminder.dueDate
      ? new Date(reminder.dueDate)
      : null;

  if (!scheduled) return false;

  const diff = now.getTime() - scheduled.getTime();
  return diff >= 0 && diff <= GRACE_PERIOD;
}

// ── Core processing ───────────────────────────────────────────────────────────

async function checkAndProcessVoiceContactReminders() {
  try {
    const now = new Date();
    const twilioConfig = require('../config/twilio');

    const reminders = await Reminder.find({
      recipientContactId: { $exists: true, $ne: null },
      deliveryMode: 'voice',
      completed: false,
      missedAt: { $exists: false },
    })
      .select('_id userId title description priority dueDate dueTime voiceMessage messageType voiceNoteUrl recipientPhoneNumber callStatus callAttempts maxCallAttempts nextCallTime snoozedUntil recurring recipientContactId')
      .populate('recipientContactId', '_id name username')
      .lean();

    const dueReminders = reminders.filter(r => _isVoiceCallDue(r, now));
    if (dueReminders.length === 0) return;

    logger.info(`contactReminderScheduler: ${dueReminders.length} voice contact reminder(s) due`);

    await Promise.all(dueReminders.map(async (reminder) => {
      try {
        // Resolve sender name
        let senderName = 'Reminder Service';
        try {
          const User = require('../models/User');
          const sender = await User.findById(reminder.userId).select('name username').lean();
          senderName = sender?.name || sender?.username || senderName;
        } catch (_) { /* non-critical */ }

        const phoneNumber = String(reminder.recipientPhoneNumber || '').trim();
        const recipientName = reminder.recipientContactId?.name
          || reminder.recipientContactId?.username
          || 'Contact';

        // ── Twilio path ──────────────────────────────────────────────────────
        if (twilioConfig.isConfigured() && phoneNumber) {
          try {
            const callResult = await voiceCallService.initiateVoiceCall({
              reminderId: String(reminder._id),
              recipientPhoneNumber: phoneNumber,
              voiceMessage: reminder.voiceMessage || `You have a reminder: ${reminder.title}`,
              messageType: reminder.messageType || 'text',
              senderName,
              voiceNoteUrl: reminder.voiceNoteUrl || '',
            });

            await Reminder.updateOne(
              { _id: reminder._id },
              {
                $set: {
                  callStatus: 'ringing',
                  lastCallTime: now,
                  callAttempts: (reminder.callAttempts || 0) + 1,
                },
                $push: {
                  callHistory: {
                    callTime: now,
                    status: 'ringing',
                    callId: callResult.callSid || null,
                  },
                  notificationLog: {
                    offsetMinutes: 0,
                    firedAt: now,
                    channel: 'contact-voice-twilio',
                    status: 'sent',
                  },
                },
              }
            );

            logger.info(`contactReminderScheduler: Twilio call placed for reminder ${reminder._id} → ${phoneNumber}`);
            return;
          } catch (twilioErr) {
            logger.warn(`contactReminderScheduler: Twilio failed for ${reminder._id}: ${twilioErr.message}`);
            // Fall through to in-app notification
          }
        }

        // ── In-app fallback: notify the creator to call manually ─────────────
        await emitInAppNotification(String(reminder.userId), {
          type: 'reminder-call-prompt',
          title: `Call ${recipientName} now`,
          body: `Your reminder "${reminder.title}" is due. Please call ${recipientName}${phoneNumber ? ` at ${phoneNumber}` : ''}.`,
          reminderId: String(reminder._id),
          priority: reminder.priority || 'High',
          telUri: phoneNumber ? `tel:${phoneNumber}` : null,
        });

        // Also notify the recipient in-app if they are an app user
        if (reminder.recipientContactId?._id) {
          await emitInAppNotification(String(reminder.recipientContactId._id), {
            type: 'reminder',
            title: `Reminder from ${senderName}`,
            body: `${senderName} has a reminder for you: "${reminder.title}". They will call you shortly.`,
            reminderId: String(reminder._id),
            priority: reminder.priority || 'High',
          });
        }

        await Reminder.updateOne(
          { _id: reminder._id },
          {
            $set: { callAttempts: (reminder.callAttempts || 0) + 1 },
            $push: {
              notificationLog: {
                offsetMinutes: 0,
                firedAt: now,
                channel: 'contact-voice-inapp',
                status: 'sent',
              },
            },
          }
        );

        logger.info(`contactReminderScheduler: in-app call prompt sent for reminder ${reminder._id}`);
      } catch (err) {
        logger.error(`contactReminderScheduler error for reminder ${reminder._id}:`, err);
      }
    }));
  } catch (error) {
    logger.error('contactReminderScheduler: unexpected error:', error);
  }
}

// ── Start / Stop ──────────────────────────────────────────────────────────────

function startContactReminderScheduler() {
  if (schedulerInterval) {
    logger.warn('contactReminderScheduler already running');
    return;
  }
  logger.info('Starting contactReminderScheduler');
  checkAndProcessVoiceContactReminders();
  schedulerInterval = setInterval(checkAndProcessVoiceContactReminders, SCHEDULER_INTERVAL);
}

function stopContactReminderScheduler() {
  if (schedulerInterval) {
    logger.info('Stopping contactReminderScheduler');
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

function getStatus() {
  return { running: Boolean(schedulerInterval), interval: SCHEDULER_INTERVAL };
}

module.exports = {
  startContactReminderScheduler,
  stopContactReminderScheduler,
  getStatus,
  checkAndProcessVoiceContactReminders,
};
