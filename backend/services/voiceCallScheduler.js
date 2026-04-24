const logger = require('../utils/logger');
const Reminder = require('../models/Reminder');
const voiceCallService = require('./voiceCallService');
const { emitToUser } = require('../config/websocket');

/**
 * Automated Voice Call Scheduler
 * Runs periodically to:
 * 1. Find reminders with voice calls that are due
 * 2. Execute voice calls
 * 3. Track call status and handle retries
 * 4. Calculate next call time for recurring reminders
 */

class VoiceCallScheduler {
  constructor() {
    this.isRunning = false;
    this.checkInterval = null;
    this.checkIntervalMs = 60 * 1000; // Check every 60 seconds
    this.maxConcurrentCalls = 5;
    this.currentCalls = 0;
  }

  /**
   * Start the scheduler service
   */
  start() {
    if (this.isRunning) {
      logger.warn('Voice call scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting voice call scheduler...');

    // Run immediately on start
    this.checkAndProcessReminders().catch(err => 
      logger.error('Error in initial scheduler run:', err)
    );

    // Then run on interval
    this.checkInterval = setInterval(() => {
      this.checkAndProcessReminders().catch(err =>
        logger.error('Error in scheduled reminder check:', err)
      );
    }, this.checkIntervalMs);

    logger.info(`Voice call scheduler started (interval: ${this.checkIntervalMs}ms)`);
  }

  /**
   * Stop the scheduler service
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Voice call scheduler is not running');
      return;
    }

    clearInterval(this.checkInterval);
    this.isRunning = false;
    logger.info('Voice call scheduler stopped');
  }

  /**
   * Check for reminders that need voice calls and process them
   */
  async checkAndProcessReminders() {
    try {
      if (this.currentCalls >= this.maxConcurrentCalls) {
        logger.debug(`Skipping check: ${this.currentCalls} calls in progress`);
        return;
      }

      // Find all pending voice call reminders that are due
      const dueReminders = await Reminder.find({
        recipientPhoneNumber: { $exists: true, $nin: [null, ''] },
        callStatus: { $in: ['pending', 'ringing', 'no-answer'] },
        $or: [
          {
            messageType: 'audio',
            voiceNoteUrl: { $exists: true, $nin: [null, ''] }
          },
          {
            $or: [
              { messageType: { $exists: false } },
              { messageType: 'text' }
            ],
            voiceMessage: { $exists: true, $nin: [null, ''] }
          }
        ],
        $and: [
          {
            $expr: {
              $lte: [{ $ifNull: ['$nextCallTime', '$dueDate'] }, new Date()]
            }
          },
          {
            $expr: {
              $lt: ['$callAttempts', '$maxCallAttempts']
            }
          }
        ]
      });

      if (dueReminders.length === 0) {
        return;
      }

      logger.info(`Found ${dueReminders.length} reminders due for voice calls`);

      // Process reminders concurrently up to maxConcurrentCalls
      const batches = this._batchArray(dueReminders, this.maxConcurrentCalls);
      
      for (const batch of batches) {
        await Promise.all(
          batch.map(reminder => this.processReminder(reminder))
        );
      }
    } catch (error) {
      logger.error('Error checking reminders:', error);
    }
  }

  /**
   * Process a single reminder - initiate voice call
   */
  async processReminder(reminder) {
    this.currentCalls++;
    
    try {
      logger.info(`Processing voice call reminder: ${reminder._id} (${reminder.title})`);

      // Prepare call data
      const callData = {
        reminderId: reminder._id,
        recipientPhoneNumber: voiceCallService.formatPhoneNumber(reminder.recipientPhoneNumber),
        voiceMessage: reminder.voiceMessage,
        messageType: reminder.messageType || 'text',
        senderName: reminder.senderName || 'Reminder Service',
        voiceNoteUrl: reminder.voiceNoteUrl
      };

      // Initiate the voice call
      const callResult = await voiceCallService.initiateVoiceCall(callData);

      // Update reminder with call result
      reminder.recordCallAttempt(
        callResult.status,
        callResult.callId,
        callResult.error || null
      );

      await reminder.save();

      // Notify recipient via WebSocket
      await this._notifyRecipient(reminder, callResult);

      // Notify sender via WebSocket
      await this._notifySender(reminder, callResult);

      logger.info(`Voice call initiated for reminder ${reminder._id}: ${callResult.status}`);

    } catch (error) {
      logger.error(`Error processing reminder ${reminder._id}:`, error);

      // Record failed attempt
      reminder.recordCallAttempt('failed', null, error.message);
      await reminder.save();

      // Notify both parties of failure
      try {
        await this._notifySender(reminder, { status: 'failed', error: error.message });
      } catch (notifyError) {
        logger.error('Error notifying sender of failure:', notifyError);
      }
    } finally {
      this.currentCalls--;
    }
  }

  /**
   * Notify the reminder recipient about the call
   */
  async _notifyRecipient(reminder, callResult) {
    try {
      if (!reminder.recipientId) return;

      emitToUser(reminder.recipientId, 'reminder:voice-call', {
        reminderId: reminder._id,
        title: reminder.title,
        message: reminder.voiceMessage,
        status: callResult.status,
        callId: callResult.callId,
        from: reminder.userId,
        timestamp: new Date()
      });

      logger.debug(`Notified recipient ${reminder.recipientId} about voice call`);
    } catch (error) {
      logger.error('Error notifying recipient:', error);
    }
  }

  /**
   * Notify the reminder sender (creator) about call status
   */
  async _notifySender(reminder, callResult) {
    try {
      if (!reminder.userId) return;

      emitToUser(reminder.userId, 'reminder:voice-call-status', {
        reminderId: reminder._id,
        title: reminder.title,
        recipientId: reminder.recipientId,
        status: callResult.status,
        callId: callResult.callId,
        error: callResult.error,
        timestamp: new Date()
      });

      logger.debug(`Notified sender ${reminder.userId} about voice call status`);
    } catch (error) {
      logger.error('Error notifying sender:', error);
    }
  }

  /**
   * Utility: split array into batches
   */
  _batchArray(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Manually trigger a voice call reminder
   */
  async triggerManualCall(reminderId) {
    try {
      const reminder = await Reminder.findById(reminderId);
      
      if (!reminder) {
        throw new Error('Reminder not found');
      }

      const hasVoiceContent =
        reminder.messageType === 'audio'
          ? Boolean(String(reminder.voiceNoteUrl || '').trim())
          : Boolean(String(reminder.voiceMessage || '').trim());

      if (!reminder.recipientPhoneNumber) {
        throw new Error('Reminder does not have recipient phone number configured');
      }

      if (!hasVoiceContent) {
        throw new Error('Reminder does not have playable voice content configured');
      }

      logger.info(`Manually triggering voice call for reminder: ${reminderId}`);
      
      await this.processReminder(reminder);
      
      return {
        success: true,
        message: 'Voice call triggered',
        reminderId
      };
    } catch (error) {
      logger.error('Error triggering manual call:', error);
      throw error;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentCalls: this.currentCalls,
      maxConcurrentCalls: this.maxConcurrentCalls,
      checkIntervalMs: this.checkIntervalMs
    };
  }
}

// Export singleton instance
module.exports = new VoiceCallScheduler();
