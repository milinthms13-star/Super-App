const logger = require('../utils/logger');
const Reminder = require('../models/Reminder');
const voiceCallService = require('./voiceCallService');
const { emitToUser } = require('../config/websocket');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Call = require('../models/Call');
const mongoose = require('mongoose');

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
    this.checkIntervalMs = 30 * 1000; // Check every 30 seconds (reduced from 60 for better accuracy)
    this.maxConcurrentCalls = 5;
    this.currentCalls = 0;
    this.graceWindowMs = 5 * 60 * 1000; // 5 minute grace window for catching missed reminders
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

    logger.info(`Voice call scheduler started (interval: ${this.checkIntervalMs}ms, grace window: ${this.graceWindowMs}ms)`);
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

      const now = new Date();
      const gracePeriodStart = new Date(now.getTime() - this.graceWindowMs);
      const scheduledTimeExpression = { $ifNull: ['$nextCallTime', '$dueDate'] };

      // Find all pending voice call reminders that are due
      const dueReminders = await Reminder.find({
        completed: { $ne: true },
        recipientPhoneNumber: { $exists: true, $nin: [null, ''] },
        callStatus: { $in: ['pending', 'no-answer', 'failed'] },
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
          // Reminder time must be in the past or due right now.
          {
            $expr: {
              $lte: [scheduledTimeExpression, now]
            }
          },
          // Reminder must still be inside the grace window.
          {
            $expr: {
              $gte: [scheduledTimeExpression, gracePeriodStart]
            }
          },
          // Still have attempts remaining.
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
      
      // Log reminder details for debugging
      dueReminders.forEach(reminder => {
        const callTime = reminder.nextCallTime || reminder.dueDate;
        logger.debug(`Due reminder: ${reminder.title} (ID: ${reminder._id})`);
        logger.debug(`  Scheduled: ${callTime}, Current: ${now}, Overdue by: ${now - callTime}ms`);
      });

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

      const formattedPhoneNumber = voiceCallService.formatPhoneNumber(reminder.recipientPhoneNumber);

      // Prepare call data
      const callData = {
        reminderId: reminder._id,
        recipientPhoneNumber: formattedPhoneNumber,
        voiceMessage: reminder.voiceMessage,
        messageType: reminder.messageType || 'text',
        senderName: reminder.senderName || 'Reminder Service',
        voiceNoteUrl: reminder.voiceNoteUrl
      };

      // Level 1: Try chat-module call when phone belongs to a registered user.
      // Level 2: Fall back to normal mobile voice call (Twilio/simulated) when chat route is unavailable.
      const recipientUser = await this._resolveRecipientForChatCall(reminder, formattedPhoneNumber);
      const callResult = recipientUser
        ? await this._initiateChatModuleCall(reminder, recipientUser, callData)
        : await voiceCallService.initiateVoiceCall(callData);

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

  _normalizePhone(phoneValue = '') {
    return String(phoneValue || '').replace(/\D/g, '');
  }

  async _resolveRecipientForChatCall(reminder, formattedPhoneNumber) {
    try {
      const existingRecipientId = String(reminder.recipientId || '').trim();

      if (mongoose.Types.ObjectId.isValid(existingRecipientId)) {
        const existingUser = await User.findById(existingRecipientId).select('_id');
        if (existingUser) {
          return existingUser;
        }
      }

      const normalizedPhone = this._normalizePhone(formattedPhoneNumber);
      if (normalizedPhone.length < 10) {
        return null;
      }

      const localPhone = normalizedPhone.slice(-10);
      const recipientUser = await User.findOne({
        $or: [{ phone: normalizedPhone }, { phone: localPhone }],
      }).select('_id');

      if (recipientUser && String(reminder.recipientId || '') !== String(recipientUser._id)) {
        reminder.recipientId = String(recipientUser._id);
      }

      return recipientUser;
    } catch (error) {
      logger.warn(`Failed resolving chat recipient for reminder ${reminder._id}: ${error.message}`);
      return null;
    }
  }

  async _initiateChatModuleCall(reminder, recipientUser, callData) {
    try {
      const initiatorId = String(reminder.userId || '').trim();
      const recipientId = String(recipientUser._id || '').trim();

      if (!mongoose.Types.ObjectId.isValid(initiatorId) || !mongoose.Types.ObjectId.isValid(recipientId)) {
        throw new Error('Invalid user ID for chat call');
      }

      if (initiatorId === recipientId) {
        throw new Error('Sender and recipient cannot be the same for chat call');
      }

      let chat = await Chat.findOne({
        type: 'direct',
        participants: { $all: [initiatorId, recipientId] },
      }).select('_id participants');

      if (!chat) {
        chat = await Chat.create({
          type: 'direct',
          participants: [initiatorId, recipientId],
        });
      }

      const call = await Call.create({
        chatId: chat._id,
        initiatorId,
        recipientId,
        callType: 'audio',
        status: 'ringing',
      });

      emitToUser(recipientId, 'call:incoming', {
        _id: call._id,
        callId: call._id,
        initiatorId,
        recipientId,
        chatId: chat._id,
        callType: 'audio',
        status: call.status,
        caller: {
          _id: initiatorId,
          name: callData.senderName || 'Reminder Service',
          avatar: '',
        },
        reminderId: reminder._id,
        reminderTitle: reminder.title,
        voiceMessage: callData.messageType === 'text' ? callData.voiceMessage : '',
        messageType: callData.messageType,
        voiceNoteUrl: callData.messageType === 'audio' ? callData.voiceNoteUrl : '',
        timestamp: new Date(),
      });

      logger.info(`Chat-module call initiated for reminder ${reminder._id}: ${call._id}`);

      return {
        status: 'ringing',
        callId: String(call._id),
        timestamp: new Date(),
        provider: 'chat-module',
      };
    } catch (error) {
      logger.warn(`Chat call fallback to mobile for reminder ${reminder._id}: ${error.message}`);
      return voiceCallService.initiateVoiceCall(callData);
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
