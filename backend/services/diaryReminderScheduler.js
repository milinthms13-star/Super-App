const DiaryCalendarItem = require('../models/DiaryCalendarItem');
const logger = require('../utils/logger');

/**
 * Diary Reminder Scheduler Service
 * Checks for due reminders and sends notifications
 */
class DiaryReminderScheduler {
  constructor(ioInstance = null) {
    this.ioInstance = ioInstance;
    this.checkInterval = 60000; // Check every 60 seconds
    this.intervalId = null;
    this.notifiedReminders = new Set(); // Track notified reminders in current session
  }

  /**
   * Start the reminder scheduler
   */
  start() {
    if (this.intervalId) {
      logger.warn('Diary reminder scheduler is already running');
      return;
    }

    logger.info('Starting diary reminder scheduler');
    this.intervalId = setInterval(() => {
      this.checkAndProcessReminders().catch((err) => {
        logger.error('Error checking diary reminders:', err);
      });
    }, this.checkInterval);

    // Run immediately on start
    this.checkAndProcessReminders();
  }

  /**
   * Stop the reminder scheduler
   */
  stop() {
    if (this.intervalId) {
      logger.info('Stopping diary reminder scheduler');
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check and process reminders that are due
   */
  async checkAndProcessReminders() {
    try {
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

      // Find reminders that are due within next 5 minutes
      const dueReminders = await DiaryCalendarItem.find({
        type: 'reminder',
        reminderAt: {
          $gte: now,
          $lte: fiveMinutesFromNow,
        },
        isCompleted: false,
        isNotified: false,
      })
        .select('_id userId title reminderAt note')
        .lean();

      for (const reminder of dueReminders) {
        await this.processReminder(reminder);
      }

      // Also check for overdue reminders (missed by more than 5 minutes)
      const overdueReminders = await DiaryCalendarItem.find({
        type: 'reminder',
        reminderAt: {
          $lt: new Date(now.getTime() - 5 * 60 * 1000),
        },
        isCompleted: false,
        isNotified: false,
      })
        .select('_id userId title reminderAt note')
        .lean()
        .limit(50); // Process up to 50 overdue

      for (const reminder of overdueReminders) {
        await this.markAsNotified(reminder._id, true); // Mark as notified but urgent
      }
    } catch (error) {
      logger.error('Error in checkAndProcessReminders:', error);
    }
  }

  /**
   * Process a single reminder - emit notification
   */
  async processReminder(reminder) {
    try {
      const reminderId = reminder._id.toString();

      // Avoid duplicate notifications in same session
      if (this.notifiedReminders.has(reminderId)) {
        return;
      }

      // Mark as notified
      await this.markAsNotified(reminder._id);
      this.notifiedReminders.add(reminderId);

      // Emit via WebSocket if available
      if (this.ioInstance) {
        const notificationPayload = {
          type: 'reminder',
          reminderId: reminder._id,
          userId: reminder.userId,
          title: reminder.title,
          note: reminder.note,
          reminderAt: reminder.reminderAt,
          message: `Reminder: ${reminder.title}`,
          timestamp: new Date(),
        };

        // Send to specific user
        const userSockets = await this.ioInstance.to(reminder.userId).emit(
          'diary:reminder-due',
          notificationPayload
        );

        logger.info(`Sent reminder notification for reminder ${reminderId} to user ${reminder.userId}`);
      }

      return {
        success: true,
        reminderId: reminder._id,
        userId: reminder.userId,
      };
    } catch (error) {
      logger.error(`Error processing reminder ${reminder._id}:`, error);
      throw error;
    }
  }

  /**
   * Mark a reminder as notified
   */
  async markAsNotified(reminderId, isUrgent = false) {
    try {
      await DiaryCalendarItem.updateOne(
        { _id: reminderId },
        {
          isNotified: true,
          notifiedAt: new Date(),
          ...(isUrgent && { isUrgent: true }),
        }
      );
    } catch (error) {
      logger.error(`Error marking reminder ${reminderId} as notified:`, error);
      throw error;
    }
  }

  /**
   * Get today's notes and reminders for a user
   */
  async getTodaysItems(userId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const items = await DiaryCalendarItem.find({
        userId,
        date: {
          $gte: today,
          $lt: tomorrow,
        },
      })
        .select('_id type title note reminderAt isCompleted isNotified date')
        .sort({ reminderAt: 1, createdAt: 1 })
        .lean();

      const grouped = {
        notes: items.filter((i) => i.type === 'note'),
        reminders: items.filter((i) => i.type === 'reminder'),
        pendingReminders: items.filter((i) => i.type === 'reminder' && !i.isCompleted),
      };

      return grouped;
    } catch (error) {
      logger.error('Error getting todays items:', error);
      throw error;
    }
  }

  /**
   * Get upcoming reminders (next 7 days)
   */
  async getUpcomingReminders(userId, daysAhead = 7) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const reminders = await DiaryCalendarItem.find({
        userId,
        type: 'reminder',
        isCompleted: false,
        reminderAt: {
          $gte: today,
          $lt: futureDate,
        },
      })
        .select('_id title reminderAt isNotified isCompleted date')
        .sort({ reminderAt: 1 })
        .lean();

      return reminders;
    } catch (error) {
      logger.error('Error getting upcoming reminders:', error);
      throw error;
    }
  }

  /**
   * Clear old notification tracking (cleanup)
   */
  clearOldNotifications() {
    // Keep only reminders from last hour in tracking
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const reminderId of this.notifiedReminders) {
      // Simple cleanup - could be enhanced with timestamps
    }
  }
}

module.exports = DiaryReminderScheduler;
