/**
 * Missed Reminder Scheduler Service (Phase 1)
 * 
 * Runs periodically to:
 * 1. Find overdue reminders
 * 2. Mark them as missed
 * 3. Emit notifications for missed reminders
 * 4. Handle escalation if configured
 */

const mongoose = require('mongoose');
const Reminder = require('../models/Reminder');
const logger = require('../utils/logger');

// Store running schedulers
const schedulers = new Map();

/**
 * Find and mark overdue reminders as missed
 * Runs every 5 minutes by default
 */
async function checkForMissedReminders() {
  try {
    const now = new Date();

    // Find reminders that are:
    // 1. Not completed
    // 2. Due date + time is in the past
    // 3. Not yet marked as missed
    // 4. Not snoozed
    const reminders = await Reminder.find({
      completed: false,
      missedAt: { $exists: false },
      snoozedUntil: { $exists: false, $eq: null }
    }).lean();

    let missedCount = 0;

    for (const reminderData of reminders) {
      const dueDateTime = reminderData.dueTime ?
        new Date(`${reminderData.dueDate.toISOString().split('T')[0]}T${reminderData.dueTime}`) :
        new Date(reminderData.dueDate);

      // Grace period: if due time is more than 1 hour in the past, mark as missed
      const gracePeriodMs = 60 * 60 * 1000;  // 1 hour grace period
      const missThreshold = new Date(dueDateTime.getTime() + gracePeriodMs);

      if (now > missThreshold) {
        try {
          await Reminder.findByIdAndUpdate(
            reminderData._id,
            {
              $set: {
                missedAt: dueDateTime,
                status: 'Missed'
              },
              $push: {
                missedHistory: {
                  missedAt: now,
                  status: 'pending'
                }
              }
            },
            { new: true }
          );

          missedCount++;
          logger.debug(`Marked reminder ${reminderData._id} as missed`);

          // Emit event for real-time notification (if using WebSocket/events)
          emitMissedReminderEvent(reminderData._id, reminderData.userId);
        } catch (error) {
          logger.error(`Error marking reminder ${reminderData._id} as missed:`, error);
        }
      }
    }

    if (missedCount > 0) {
      logger.info(`Missed Reminder Scheduler: Marked ${missedCount} reminders as missed`);
    }

  } catch (error) {
    logger.error('Error in checkForMissedReminders:', error);
  }
}

/**
 * Emit missed reminder event for real-time notifications
 * TODO: Integrate with WebSocket/event system if available
 */
function emitMissedReminderEvent(reminderId, userId) {
  try {
    // This would integrate with your WebSocket system
    // Example: io.to(userId).emit('reminder:missed', { reminderId });
    logger.debug(`Would emit missed reminder event for user ${userId}, reminder ${reminderId}`);
  } catch (error) {
    logger.error('Error emitting missed reminder event:', error);
  }
}

/**
 * Start the missed reminder scheduler
 * Runs every 5 minutes by default
 */
function startMissedReminderScheduler(intervalMs = 5 * 60 * 1000) {
  if (schedulers.has('missedReminder')) {
    logger.warn('Missed Reminder Scheduler already running');
    return;
  }

  logger.info(`Starting Missed Reminder Scheduler (interval: ${intervalMs}ms)`);

  // Run immediately on start
  checkForMissedReminders();

  // Then run on interval
  const schedulerId = setInterval(
    checkForMissedReminders,
    intervalMs
  );

  schedulers.set('missedReminder', {
    id: schedulerId,
    startedAt: new Date(),
    intervalMs: intervalMs
  });
}

/**
 * Stop the missed reminder scheduler
 */
function stopMissedReminderScheduler() {
  const scheduler = schedulers.get('missedReminder');
  if (scheduler) {
    clearInterval(scheduler.id);
    schedulers.delete('missedReminder');
    logger.info('Stopped Missed Reminder Scheduler');
  }
}

/**
 * Get scheduler status
 */
function getMissedReminderSchedulerStatus() {
  return schedulers.get('missedReminder') || null;
}

/**
 * Check specific reminder for missed status
 * Called during reminder delivery to verify if it's still valid
 */
async function isReminderMissed(reminderId) {
  try {
    const reminder = await Reminder.findById(reminderId).lean();
    
    if (!reminder || reminder.completed) {
      return false;
    }

    if (reminder.missedAt) {
      return true;
    }

    // Check if past due (with grace period)
    const dueDateTime = reminder.dueTime ?
      new Date(`${reminder.dueDate.toISOString().split('T')[0]}T${reminder.dueTime}`) :
      new Date(reminder.dueDate);

    const gracePeriodMs = 60 * 60 * 1000;  // 1 hour grace period
    const missThreshold = new Date(dueDateTime.getTime() + gracePeriodMs);
    
    return new Date() > missThreshold;
  } catch (error) {
    logger.error(`Error checking missed status for reminder ${reminderId}:`, error);
    return false;
  }
}

module.exports = {
  checkForMissedReminders,
  startMissedReminderScheduler,
  stopMissedReminderScheduler,
  getMissedReminderSchedulerStatus,
  isReminderMissed
};
