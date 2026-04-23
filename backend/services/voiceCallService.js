const logger = require('../utils/logger');
const twilioConfig = require('../config/twilio');

/**
 * Voice Call Service
 * Handles automated voice calls for reminders with or without Twilio
 * In development/demo mode without Twilio credentials, uses simulation
 */

class VoiceCallService {
  constructor() {
    this.isTwilioConfigured = twilioConfig.isConfigured();
    if (this.isTwilioConfigured) {
      this.twilio = require('twilio');
      this.twilioClient = this.twilio(twilioConfig.accountSid, twilioConfig.authToken);
    }
  }

  /**
   * Generate TTS (Text-to-Speech) message
   * In real implementation, this would call Twilio TTS API
   * For now, returns message object that stores the text
   */
  async generateTTSMessage(messageText) {
    try {
      if (!messageText || typeof messageText !== 'string') {
        throw new Error('Message text is required');
      }

      // Limit message length for readability
      const maxLength = 500;
      if (messageText.length > maxLength) {
        logger.warn(`Message truncated from ${messageText.length} to ${maxLength} chars`);
      }

      return {
        type: 'text-to-speech',
        content: messageText.substring(0, maxLength),
        createdAt: new Date(),
        duration: this._estimateDuration(messageText) // Estimate in seconds
      };
    } catch (error) {
      logger.error('Error generating TTS message:', error);
      throw error;
    }
  }

  /**
   * Initiate an automated voice call to recipient
   * Sends reminder via voice with text-to-speech or pre-recorded audio
   */
  async initiateVoiceCall(reminderData) {
    const {
      reminderId,
      recipientPhoneNumber,
      voiceMessage,
      messageType = 'text',
      senderName = 'System'
    } = reminderData;

    try {
      // Validate phone number
      if (!recipientPhoneNumber || !this._isValidPhoneNumber(recipientPhoneNumber)) {
        throw new Error('Invalid phone number');
      }

      const callData = {
        reminderId,
        recipientPhoneNumber,
        senderName,
        messageType,
        voiceMessage,
        initiatedAt: new Date(),
        status: 'pending'
      };

      if (this.isTwilioConfigured) {
        return await this._initiateRealCall(callData);
      } else {
        return await this._simulateCall(callData);
      }
    } catch (error) {
      logger.error('Error initiating voice call:', error);
      return {
        status: 'failed',
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Real Twilio voice call implementation
   */
  async _initiateRealCall(callData) {
    try {
      const twiml = this._generateTwiML(callData);

      const call = await this.twilioClient.calls.create({
        to: callData.recipientPhoneNumber,
        from: twilioConfig.phoneNumber,
        twiml: twiml
      });

      logger.info(`Twilio call initiated: ${call.sid} for reminder ${callData.reminderId}`);

      return {
        status: 'ringing',
        callId: call.sid,
        timestamp: new Date(),
        provider: 'twilio'
      };
    } catch (error) {
      logger.error('Twilio call error:', error);
      throw error;
    }
  }

  /**
   * Simulated voice call for development (when Twilio not configured)
   * Logs the call attempt and returns success
   */
  async _simulateCall(callData) {
    logger.info('SIMULATED VOICE CALL (Twilio not configured)');
    logger.info(`  Recipient: ${callData.recipientPhoneNumber}`);
    logger.info(`  From: ${callData.senderName}`);
    logger.info(`  Message Type: ${callData.messageType}`);
    logger.info(`  Message: "${callData.voiceMessage.substring(0, 100)}..."`);

    // Simulate call in progress
    return {
      status: 'ringing',
      callId: `SIM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      provider: 'simulation',
      simulatedDuration: this._estimateDuration(callData.voiceMessage),
      note: 'This is a simulated call. Add Twilio credentials to enable real calls.'
    };
  }

  /**
   * Generate TwiML (Twilio Markup Language) for voice calls
   */
  _generateTwiML(callData) {
    const VoiceResponse = require('twilio').twiml.VoiceResponse;
    const response = new VoiceResponse();

    // Optional: Play hold music or greeting
    response.say(
      `This is an automated reminder from ${callData.senderName}. ` +
      `The message follows. `,
      { voice: 'alice' }
    );

    // Play the reminder message
    if (callData.messageType === 'text') {
      response.say(callData.voiceMessage, { voice: 'alice', language: 'en-US' });
    } else if (callData.messageType === 'audio' && callData.voiceNoteUrl) {
      response.play(callData.voiceNoteUrl);
    }

    // Allow recipient to acknowledge
    response.say('Press any key to acknowledge this reminder.', { voice: 'alice' });
    response.gather({ numDigits: 1, timeout: 30, action: '/api/reminders/voice/acknowledge' });

    return response.toString();
  }

  /**
   * Handle call status callback from Twilio
   */
  async handleCallStatusCallback(data) {
    const { CallSid, CallStatus, RecordingUrl, RecordingDuration } = data;

    logger.info(`Call status update: ${CallSid} - ${CallStatus}`);

    return {
      callId: CallSid,
      status: CallStatus,
      recordingUrl: RecordingUrl,
      recordingDuration: RecordingDuration,
      processedAt: new Date()
    };
  }

  /**
   * Validate phone number format
   */
  _isValidPhoneNumber(phoneNumber) {
    // Basic validation - allows +1 followed by 10 digits or variations
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * Estimate speech duration based on character count
   * Average speaking rate: ~150 words per minute, ~5 chars per word = ~750 chars/minute
   */
  _estimateDuration(text) {
    const chars = text.length;
    return Math.ceil((chars / 750) * 60); // Duration in seconds
  }

  /**
   * Format phone number to standard format
   */
  formatPhoneNumber(phoneNumber) {
    // Remove all non-digits except leading +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Add +1 if US number without country code
    if (cleaned.length === 10 && !cleaned.startsWith('+')) {
      return `+1${cleaned}`;
    }
    
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  }

  /**
   * Get voice call status by reminder ID
   */
  async getCallStatus(reminderId) {
    try {
      const Reminder = require('../models/Reminder');
      const reminder = await Reminder.findById(reminderId);
      
      if (!reminder) {
        return null;
      }

      return {
        reminderId: reminder._id,
        callStatus: reminder.callStatus,
        lastCallTime: reminder.lastCallTime,
        callAttempts: reminder.callAttempts,
        maxCallAttempts: reminder.maxCallAttempts,
        callHistory: reminder.callHistory,
        nextCallTime: reminder.nextCallTime
      };
    } catch (error) {
      logger.error('Error getting call status:', error);
      throw error;
    }
  }
}

module.exports = new VoiceCallService();
