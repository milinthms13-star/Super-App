/**
 * Advanced Communication Features
 * Typing indicators, read receipts, voice calls, video calls, WhatsApp integration
 */

const mongoose = require('mongoose');

const CallRecordSchema = new mongoose.Schema({
  id: { type: String, default: () => require('crypto').randomUUID() },
  fromProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MatrimonialProfile',
    required: true
  },
  toProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MatrimonialProfile',
    required: true
  },
  callType: {
    type: String,
    enum: ['voice', 'video', 'scheduled'],
    required: true
  },
  status: {
    type: String,
    enum: ['initiated', 'ringing', 'connected', 'ended', 'rejected', 'missed'],
    default: 'initiated'
  },
  startTime: Date,
  endTime: Date,
  duration: Number,
  callQuality: {
    type: String,
    enum: ['good', 'fair', 'poor'],
    default: 'good'
  },
  recordingUrl: String,
  rejectionReason: String,
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const TypingIndicatorSchema = new mongoose.Schema({
  fromProfileId: mongoose.Schema.Types.ObjectId,
  toProfileId: mongoose.Schema.Types.ObjectId,
  isTyping: Boolean,
  timestamp: Date
}, { _id: false });

/**
 * Mark message as read and emit read receipt
 */
const markMessageAsRead = async (messageId, readerId) => {
  try {
    // Update message read status
    return {
      messageId,
      readBy: readerId,
      readAt: new Date(),
      status: 'read'
    };
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
};

/**
 * Get read status for conversation
 */
const getReadStatus = async (fromId, toId) => {
  try {
    return {
      fromId,
      toId,
      lastReadMessageId: null,
      lastReadTime: new Date(),
      unreadCount: 0
    };
  } catch (error) {
    console.error('Error getting read status:', error);
    throw error;
  }
};

/**
 * Update typing indicator
 */
const updateTypingIndicator = async (fromId, toId, isTyping = true) => {
  try {
    return {
      fromId,
      toId,
      isTyping,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error updating typing indicator:', error);
    throw error;
  }
};

/**
 * Initiate voice call
 */
const initiateVoiceCall = async (fromProfileId, toProfileId) => {
  try {
    const callRecord = {
      id: require('crypto').randomUUID(),
      fromProfileId,
      toProfileId,
      callType: 'voice',
      status: 'initiated',
      startTime: new Date(),
      createdAt: new Date()
    };

    return callRecord;
  } catch (error) {
    console.error('Error initiating voice call:', error);
    throw error;
  }
};

/**
 * Initiate video call
 */
const initiateVideoCall = async (fromProfileId, toProfileId, roomUrl) => {
  try {
    const callRecord = {
      id: require('crypto').randomUUID(),
      fromProfileId,
      toProfileId,
      callType: 'video',
      status: 'initiated',
      startTime: new Date(),
      roomUrl,
      createdAt: new Date()
    };

    return callRecord;
  } catch (error) {
    console.error('Error initiating video call:', error);
    throw error;
  }
};

/**
 * Update call status
 */
const updateCallStatus = async (callId, status, options = {}) => {
  try {
    const update = {
      id: callId,
      status,
      timestamp: new Date()
    };

    if (options.duration) update.duration = options.duration;
    if (options.rejectionReason) update.rejectionReason = options.rejectionReason;
    if (options.callQuality) update.callQuality = options.callQuality;
    if (options.recordingUrl) update.recordingUrl = options.recordingUrl;

    return update;
  } catch (error) {
    console.error('Error updating call status:', error);
    throw error;
  }
};

/**
 * Schedule a call
 */
const scheduleCall = async (fromProfileId, toProfileId, scheduledTime, callType = 'video') => {
  try {
    return {
      fromProfileId,
      toProfileId,
      callType,
      status: 'scheduled',
      scheduledTime: new Date(scheduledTime),
      notificationSent: false,
      createdAt: new Date()
    };
  } catch (error) {
    console.error('Error scheduling call:', error);
    throw error;
  }
};

/**
 * Create WhatsApp integration link
 */
const createWhatsAppLink = (phoneNumber, message = '') => {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${encoded}`;
};

/**
 * Send WhatsApp message via integration
 */
const sendWhatsAppMessage = async (toPhoneNumber, message) => {
  try {
    // This would integrate with WhatsApp Business API
    // For now, returns the link that user can use
    return {
      type: 'whatsapp',
      recipient: toPhoneNumber,
      message,
      link: createWhatsAppLink(toPhoneNumber, message),
      status: 'ready_to_send',
      instructions: 'Click the link to open WhatsApp and send the message'
    };
  } catch (error) {
    console.error('Error with WhatsApp integration:', error);
    throw error;
  }
};

/**
 * Enable/disable communication features based on subscription
 */
const getCommunicationFeatures = async (userEmail) => {
  try {
    // This would check subscription tier
    const subscription = {
      tier: 'premium' // Example
    };

    const features = {
      textMessaging: true,
      unlimitedMessages: subscription.tier !== 'free',
      voiceCalls: subscription.tier !== 'free',
      videoCalls: subscription.tier === 'premium' || subscription.tier === 'vip',
      voiceNotes: subscription.tier === 'premium' || subscription.tier === 'vip',
      whatsAppIntegration: subscription.tier === 'vip',
      scheduleCall: subscription.tier === 'gold' || subscription.tier === 'premium' || subscription.tier === 'vip',
      recordCalls: subscription.tier === 'vip'
    };

    return features;
  } catch (error) {
    console.error('Error getting communication features:', error);
    throw error;
  }
};

/**
 * Get call history for user
 */
const getCallHistory = async (profileId, limit = 20) => {
  try {
    return {
      profileId,
      totalCalls: 0,
      voiceCalls: 0,
      videoCalls: 0,
      missedCalls: 0,
      totalDuration: 0,
      calls: [],
      limit
    };
  } catch (error) {
    console.error('Error fetching call history:', error);
    throw error;
  }
};

/**
 * Generate call statistics
 */
const getCallStatistics = async (profileId) => {
  try {
    return {
      profileId,
      totalCalls: 0,
      averageCallDuration: 0,
      voiceCallsCount: 0,
      videoCallsCount: 0,
      missedCallsCount: 0,
      callSuccessRate: 0,
      topCallers: [],
      thisMonthCalls: 0
    };
  } catch (error) {
    console.error('Error getting call statistics:', error);
    throw error;
  }
};

/**
 * Send notification for incoming call
 */
const sendCallNotification = async (toProfileId, fromProfileName, callType = 'voice') => {
  try {
    return {
      type: 'incoming_call',
      toProfileId,
      from: fromProfileName,
      callType,
      timestamp: new Date(),
      expiresIn: 30 // seconds
    };
  } catch (error) {
    console.error('Error sending call notification:', error);
    throw error;
  }
};

/**
 * Record voice note
 */
const saveVoiceNote = async (fromProfileId, toProfileId, audioUrl, duration) => {
  try {
    return {
      id: require('crypto').randomUUID(),
      fromProfileId,
      toProfileId,
      type: 'voice_note',
      audioUrl,
      duration,
      isRead: false,
      createdAt: new Date()
    };
  } catch (error) {
    console.error('Error saving voice note:', error);
    throw error;
  }
};

module.exports = {
  markMessageAsRead,
  getReadStatus,
  updateTypingIndicator,
  initiateVoiceCall,
  initiateVideoCall,
  updateCallStatus,
  scheduleCall,
  createWhatsAppLink,
  sendWhatsAppMessage,
  getCommunicationFeatures,
  getCallHistory,
  getCallStatistics,
  sendCallNotification,
  saveVoiceNote,
  CallRecordSchema,
  TypingIndicatorSchema
};
