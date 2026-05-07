const logger = require('../utils/logger');
const Message = require('../models/Message');
const VoiceMessage = require('../models/VoiceMessage');
const fs = require('fs').promises;
const path = require('path');

class VoiceMessageService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 10 * 60 * 1000; // 10 minutes
    this.maxDuration = 3600; // 1 hour in seconds
    this.supportedFormats = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'];
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
  }

  /**
   * Upload voice message
   * @param {Buffer} audioBuffer - Audio data
   * @param {string} chatId - Chat ID
   * @param {string} userId - Sender user ID
   * @param {Object} options - Additional options
   * @returns {Object} Voice message object
   */
  async uploadVoiceMessage(audioBuffer, chatId, userId, options = {}) {
    try {
      if (!audioBuffer || !chatId || !userId) {
        throw new Error('Missing required fields');
      }

      if (audioBuffer.length > this.maxFileSize) {
        throw new Error(`Audio file exceeds limit of ${this.maxFileSize / 1024 / 1024}MB`);
      }

      // Validate audio format
      const mimeType = options.mimeType || 'audio/mpeg';
      if (!this.supportedFormats.includes(mimeType)) {
        throw new Error(`Unsupported audio format: ${mimeType}`);
      }

      // Get audio metadata
      const duration = await this.getAudioDuration(audioBuffer);
      if (duration > this.maxDuration) {
        throw new Error(`Audio duration exceeds limit of ${this.maxDuration} seconds`);
      }

      // Save audio file
      const fileHash = this.generateFileHash(audioBuffer);
      const storagePath = path.join('uploads', 'voice', fileHash);

      await fs.mkdir(path.dirname(storagePath), { recursive: true });
      await fs.writeFile(storagePath, audioBuffer);

      // Create message
      const message = new Message({
        chatId,
        senderId: userId,
        content: `[Voice Message - ${Math.round(duration)}s]`,
        messageType: 'voice',
        attachments: [],
        metadata: {
          voiceMessageId: fileHash,
          duration: Math.round(duration),
        },
        createdAt: new Date(),
      });

      await message.save();

      // Store voice message metadata
      const voiceMessage = new VoiceMessage({
        messageId: message._id,
        chatId,
        userId,
        duration: Math.round(duration),
        mimeType,
        fileSize: audioBuffer.length,
        fileHash,
        storagePath,
        url: `/api/voice/${fileHash}`,
        transcription: null,
        waveform: await this.generateWaveform(audioBuffer),
        createdAt: new Date(),
      });

      await voiceMessage.save();
      logger.info(`Voice message uploaded: ${message._id}`);
      return message;
    } catch (error) {
      logger.error(`Error uploading voice message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get voice message
   * @param {string} messageId - Message ID
   * @returns {Object} Voice message data
   */
  async getVoiceMessage(messageId) {
    try {
      const cacheKey = `voice:${messageId}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }

      const voiceMessage = await VoiceMessage.findOne({ messageId });
      if (!voiceMessage) {
        throw new Error('Voice message not found');
      }

      this.cache.set(cacheKey, { data: voiceMessage, timestamp: Date.now() });
      return voiceMessage;
    } catch (error) {
      logger.error(`Error getting voice message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Transcribe voice message
   * @param {string} messageId - Message ID
   * @param {string} language - Language code
   * @returns {Object} Transcription result
   */
  async transcribeVoiceMessage(messageId, language = 'en') {
    try {
      const voiceMessage = await VoiceMessage.findOne({ messageId });
      if (!voiceMessage) {
        throw new Error('Voice message not found');
      }

      // In production, use speech-to-text service (Google, Azure, etc.)
      const transcription = await this.performSpeechToText(
        voiceMessage.storagePath,
        language
      );

      voiceMessage.transcription = {
        text: transcription,
        language,
        confidence: 0.95,
        transcribedAt: new Date(),
      };

      await voiceMessage.save();
      this.invalidateCache(messageId);

      logger.info(`Voice message transcribed: ${messageId}`);
      return voiceMessage.transcription;
    } catch (error) {
      logger.error(`Error transcribing voice message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get voice messages in chat
   * @param {string} chatId - Chat ID
   * @param {Object} options - Pagination options
   * @returns {Array} Voice messages
   */
  async getVoiceMessagesInChat(chatId, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;

      const cacheKey = `voice_chat:${chatId}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }

      const voiceMessages = await VoiceMessage.find({ chatId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .exec();

      this.cache.set(cacheKey, { data: voiceMessages, timestamp: Date.now() });
      return voiceMessages;
    } catch (error) {
      logger.error(`Error getting voice messages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete voice message
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID (for authorization)
   * @returns {boolean} Success
   */
  async deleteVoiceMessage(messageId, userId) {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      if (message.senderId !== userId) {
        throw new Error('Not authorized to delete this message');
      }

      const voiceMessage = await VoiceMessage.findOne({ messageId });
      if (voiceMessage) {
        // Delete file
        try {
          await fs.unlink(voiceMessage.storagePath);
        } catch (err) {
          logger.warn(`Could not delete voice file: ${voiceMessage.storagePath}`);
        }

        await VoiceMessage.deleteOne({ messageId });
        this.invalidateCache(messageId);
      }

      // Soft delete message
      message.isDeleted = true;
      message.deletedAt = new Date();
      await message.save();

      logger.info(`Voice message deleted: ${messageId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting voice message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get voice message statistics
   * @param {string} chatId - Chat ID
   * @returns {Object} Statistics
   */
  async getVoiceStats(chatId) {
    try {
      const messages = await VoiceMessage.find({ chatId });

      const totalSize = messages.reduce((sum, msg) => sum + msg.fileSize, 0);
      const totalDuration = messages.reduce((sum, msg) => sum + msg.duration, 0);
      const transcribed = messages.filter((msg) => msg.transcription).length;

      return {
        totalMessages: messages.length,
        totalSize,
        totalDuration: Math.round(totalDuration),
        averageDuration: messages.length > 0 ? Math.round(totalDuration / messages.length) : 0,
        transcribedMessages: transcribed,
        untranscribedMessages: messages.length - transcribed,
      };
    } catch (error) {
      logger.error(`Error getting voice stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate waveform visualization
   * @param {Buffer} audioBuffer - Audio data
   * @returns {Array} Waveform data points
   */
  async generateWaveform(audioBuffer) {
    try {
      // Simplified waveform generation
      // In production, use waveform.js or similar
      const samples = [];
      const sampleRate = 100; // Sample every 100 bytes

      for (let i = 0; i < audioBuffer.length; i += sampleRate) {
        const chunk = audioBuffer.slice(i, i + sampleRate);
        const avg = chunk.reduce((a, b) => a + b, 0) / chunk.length;
        samples.push(Math.round((avg / 255) * 100));
      }

      return samples;
    } catch (error) {
      logger.error(`Error generating waveform: ${error.message}`);
      return [];
    }
  }

  // Helper methods
  generateFileHash(buffer) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  async getAudioDuration(buffer) {
    // Simplified - in production use ffprobe or similar
    return Math.round(buffer.length / 128000); // Approximate duration
  }

  async performSpeechToText(filePath, language) {
    // Simplified - in production use actual STT service
    return 'Transcribed voice message text would appear here';
  }

  invalidateCache(messageId) {
    this.cache.delete(`voice:${messageId}`);
  }

  clearCache() {
    this.cache.clear();
    logger.info('Voice message cache cleared');
  }
}

module.exports = new VoiceMessageService();
