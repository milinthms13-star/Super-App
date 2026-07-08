/**
 * Video/Voice Call Service
 * Handles Twilio and Jitsi integration for video/voice calls
 */

const twilio = require('twilio');
const crypto = require('crypto');
const logger = require('../utils/logger');
const MatrimonialProfile = require('../models/MatrimonialProfile');

class VideoCallService {
  constructor() {
    this.twilioClient = null;
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.apiKey = process.env.TWILIO_API_KEY;
    this.apiSecret = process.env.TWILIO_API_SECRET;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.jitsiDomain = process.env.JITSI_DOMAIN || 'meet.jit.si';
    
    if (this.accountSid && this.authToken) {
      this.twilioClient = twilio(this.accountSid, this.authToken);
    }
  }

  /**
   * Create Twilio video room
   */
  async createTwilioRoom(roomName, options = {}) {
    try {
      if (!this.twilioClient) {
        throw new Error('Twilio not configured');
      }

      const room = await this.twilioClient.video.rooms.create({
        uniqueName: roomName,
        type: options.type || 'group', // 'group', 'peer-to-peer', 'go'
        recordParticipantsOnConnect: options.record || false,
        maxParticipants: options.maxParticipants || 2,
        statusCallback: options.statusCallback,
        statusCallbackMethod: 'POST'
      });

      logger.info(`Twilio room created: ${room.sid}`);

      return {
        roomSid: room.sid,
        roomName: room.uniqueName,
        status: room.status,
        type: room.type,
        maxParticipants: room.maxParticipants,
        duration: room.duration,
        createdAt: new Date(room.dateCreated)
      };
    } catch (error) {
      logger.error('Error creating Twilio room:', error);
      throw new Error(`Failed to create video room: ${error.message}`);
    }
  }

  /**
   * Generate Twilio access token for participant
   */
  generateTwilioAccessToken(identity, roomName) {
    try {
      if (!this.apiKey || !this.apiSecret || !this.accountSid) {
        throw new Error('Twilio credentials not configured');
      }

      const AccessToken = twilio.jwt.AccessToken;
      const VideoGrant = AccessToken.VideoGrant;

      const token = new AccessToken(
        this.accountSid,
        this.apiKey,
        this.apiSecret,
        { identity, ttl: 3600 } // 1 hour expiry
      );

      const videoGrant = new VideoGrant({
        room: roomName
      });

      token.addGrant(videoGrant);

      return token.toJwt();
    } catch (error) {
      logger.error('Error generating Twilio token:', error);
      throw new Error(`Failed to generate access token: ${error.message}`);
    }
  }

  /**
   * Complete Twilio room
   */
  async completeTwilioRoom(roomSid) {
    try {
      if (!this.twilioClient) {
        throw new Error('Twilio not configured');
      }

      const room = await this.twilioClient.video.rooms(roomSid).update({
        status: 'completed'
      });

      logger.info(`Twilio room completed: ${roomSid}`);

      return {
        roomSid: room.sid,
        status: room.status,
        duration: room.duration
      };
    } catch (error) {
      logger.error('Error completing Twilio room:', error);
      throw new Error(`Failed to complete room: ${error.message}`);
    }
  }

  /**
   * Get Twilio room details
   */
  async getTwilioRoom(roomSid) {
    try {
      if (!this.twilioClient) {
        throw new Error('Twilio not configured');
      }

      const room = await this.twilioClient.video.rooms(roomSid).fetch();

      return {
        roomSid: room.sid,
        roomName: room.uniqueName,
        status: room.status,
        type: room.type,
        duration: room.duration,
        maxParticipants: room.maxParticipants,
        createdAt: new Date(room.dateCreated),
        endedAt: room.dateUpdated ? new Date(room.dateUpdated) : null
      };
    } catch (error) {
      logger.error('Error fetching Twilio room:', error);
      throw new Error(`Failed to fetch room: ${error.message}`);
    }
  }

  /**
   * Get room participants
   */
  async getRoomParticipants(roomSid) {
    try {
      if (!this.twilioClient) {
        throw new Error('Twilio not configured');
      }

      const participants = await this.twilioClient.video
        .rooms(roomSid)
        .participants
        .list({ limit: 50 });

      return participants.map(p => ({
        sid: p.sid,
        identity: p.identity,
        status: p.status,
        startTime: new Date(p.startTime),
        endTime: p.endTime ? new Date(p.endTime) : null,
        duration: p.duration
      }));
    } catch (error) {
      logger.error('Error fetching room participants:', error);
      throw new Error(`Failed to fetch participants: ${error.message}`);
    }
  }

  /**
   * Create Jitsi meeting room
   */
  createJitsiRoom(roomName, options = {}) {
    try {
      const roomId = roomName || this.generateRoomId();
      const roomUrl = `https://${this.jitsiDomain}/${roomId}`;

      // Generate JWT token for Jitsi (if using self-hosted with authentication)
      let token = null;
      if (process.env.JITSI_APP_ID && process.env.JITSI_APP_SECRET) {
        token = this.generateJitsiToken(roomId, options.identity || 'user', options);
      }

      logger.info(`Jitsi room created: ${roomId}`);

      return {
        roomId,
        roomUrl,
        token,
        domain: this.jitsiDomain,
        options: {
          roomName: options.displayName || roomId,
          startWithAudioMuted: options.startWithAudioMuted || false,
          startWithVideoMuted: options.startWithVideoMuted || false
        }
      };
    } catch (error) {
      logger.error('Error creating Jitsi room:', error);
      throw new Error(`Failed to create Jitsi room: ${error.message}`);
    }
  }

  /**
   * Generate Jitsi JWT token (for self-hosted with auth)
   */
  generateJitsiToken(roomName, userName, options = {}) {
    try {
      const appId = process.env.JITSI_APP_ID;
      const appSecret = process.env.JITSI_APP_SECRET;

      if (!appId || !appSecret) {
        return null;
      }

      const jwt = require('jsonwebtoken');
      
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        aud: 'jitsi',
        iss: appId,
        sub: this.jitsiDomain,
        room: roomName,
        exp: now + 3600, // 1 hour expiry
        context: {
          user: {
            name: userName,
            email: options.email || '',
            avatar: options.avatar || '',
            id: options.userId || crypto.randomUUID()
          },
          features: {
            livestreaming: options.livestreaming || false,
            recording: options.recording || false,
            transcription: options.transcription || false,
            'outbound-call': options.outboundCall || false
          }
        }
      };

      return jwt.sign(payload, appSecret, { algorithm: 'HS256' });
    } catch (error) {
      logger.error('Error generating Jitsi token:', error);
      return null;
    }
  }

  /**
   * Generate unique room ID
   */
  generateRoomId() {
    return `matrimonial-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Create call record
   */
  async createCallRecord(fromProfileId, toProfileId, callType, provider = 'jitsi') {
    try {
      const callId = crypto.randomUUID();
      const roomName = this.generateRoomId();

      let roomData;
      if (provider === 'twilio' && this.twilioClient) {
        roomData = await this.createTwilioRoom(roomName);
      } else {
        roomData = this.createJitsiRoom(roomName);
      }

      const callRecord = {
        id: callId,
        fromProfileId,
        toProfileId,
        callType,
        provider,
        roomId: roomData.roomSid || roomData.roomId,
        roomUrl: roomData.roomUrl || null,
        status: 'initiated',
        startTime: new Date(),
        createdAt: new Date()
      };

      logger.info(`Call record created: ${callId}`);

      return { callRecord, roomData };
    } catch (error) {
      logger.error('Error creating call record:', error);
      throw error;
    }
  }

  /**
   * Update call status
   */
  async updateCallStatus(callId, status, options = {}) {
    try {
      const update = {
        status,
        updatedAt: new Date()
      };

      if (status === 'ended' && options.startTime) {
        const endTime = new Date();
        const duration = Math.floor((endTime - new Date(options.startTime)) / 1000);
        update.endTime = endTime;
        update.duration = duration;
      }

      if (options.callQuality) {
        update.callQuality = options.callQuality;
      }

      if (options.rejectionReason) {
        update.rejectionReason = options.rejectionReason;
      }

      logger.info(`Call status updated: ${callId} -> ${status}`);

      return update;
    } catch (error) {
      logger.error('Error updating call status:', error);
      throw error;
    }
  }

  /**
   * Get call history for profile
   */
  async getCallHistory(profileId, limit = 20) {
    try {
      // This would typically query a CallHistory collection
      // For now, return empty array as placeholder
      return [];
    } catch (error) {
      logger.error('Error fetching call history:', error);
      throw error;
    }
  }

  /**
   * Get call statistics
   */
  async getCallStatistics(profileId) {
    try {
      // This would typically aggregate call data
      return {
        totalCalls: 0,
        voiceCalls: 0,
        videoCalls: 0,
        totalDuration: 0,
        averageDuration: 0,
        missedCalls: 0,
        completedCalls: 0
      };
    } catch (error) {
      logger.error('Error fetching call statistics:', error);
      throw error;
    }
  }

  /**
   * Check if service is configured
   */
  isConfigured() {
    return {
      twilio: !!(this.accountSid && this.authToken && this.apiKey && this.apiSecret),
      jitsi: !!this.jitsiDomain
    };
  }
}

// Singleton instance
const videoCallService = new VideoCallService();

module.exports = videoCallService;
