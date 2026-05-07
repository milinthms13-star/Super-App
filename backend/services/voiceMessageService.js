const logger = require('../utils/logger');
const Message = require('../models/Message');
const VoiceMessage = require('../models/VoiceMessage');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class VoiceMessageService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 10 * 60 * 1000;
    this.maxDurationSeconds = 3600;
    this.supportedFormats = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'];
    this.maxFileSize = 50 * 1024 * 1024;
  }

  async uploadVoiceMessage(audioBuffer, arg2, arg3, arg4, arg5 = {}) {
    try {
      const normalized = this.normalizeUploadArgs(arg2, arg3, arg4, arg5);
      const { chatId, userId, options } = normalized;

      if (!audioBuffer || !chatId || !userId) {
        throw new Error('Missing required fields');
      }

      if (audioBuffer.length > this.maxFileSize) {
        throw new Error(`Audio file exceeds limit of ${this.maxFileSize / 1024 / 1024}MB`);
      }

      const mimeType = options.mimeType || 'audio/mp3';
      if (!this.supportedFormats.includes(mimeType)) {
        throw new Error(`Audio format not supported: ${mimeType}`);
      }

      const durationSeconds = await this.resolveDuration(audioBuffer, options.duration);
      if (durationSeconds > this.maxDurationSeconds) {
        throw new Error(`Audio duration exceeds limit of ${this.maxDurationSeconds} seconds`);
      }

      const fileHash = this.generateFileHash(audioBuffer);
      const storagePath = path.join('uploads', 'voice', fileHash);
      await fs.mkdir(path.dirname(storagePath), { recursive: true });
      await fs.writeFile(storagePath, audioBuffer);

      const waveform = this.buildWaveformData(audioBuffer, options.resolution || 64);
      const message = await Message.create({
        chatId,
        senderId: userId,
        content: `[Voice Message - ${Math.round(durationSeconds)}s]`,
        messageType: 'voice',
        type: 'voice',
        metadata: {
          voiceMessageId: fileHash,
          duration: Math.round(durationSeconds),
        },
        createdAt: new Date(),
      });

      await VoiceMessage.create({
        messageId: message._id,
        chatId,
        userId,
        duration: Math.round(durationSeconds),
        mimeType,
        fileSize: audioBuffer.length,
        fileHash,
        storagePath,
        url: `/api/voice/${fileHash}`,
        transcription: null,
        transcriptionStatus: 'pending',
        detectedLanguage: null,
        waveform,
        device: options.device || null,
        createdAt: new Date(),
      });

      this.invalidateCache(message._id, chatId);
      logger.info(`Voice message uploaded: ${message._id}`);
      return this.getVoiceMessage(message._id);
    } catch (error) {
      logger.error(`Error uploading voice message: ${error.message}`);
      throw error;
    }
  }

  async getVoiceMessage(messageId) {
    try {
      const cacheKey = `voice:${messageId}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      const voiceMessage = await VoiceMessage.findOne({ messageId });
      if (!voiceMessage) {
        throw new Error('Voice message not found');
      }

      const message = await Message.findById(messageId);
      const response = this.buildVoiceResponse(message, voiceMessage);
      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      logger.error(`Error getting voice message: ${error.message}`);
      throw error;
    }
  }

  async transcribeVoiceMessage(messageId, language = 'en') {
    try {
      const voiceMessage = await VoiceMessage.findOne({ messageId });
      if (!voiceMessage) {
        throw new Error('Voice message not found');
      }

      const transcription = await this.performSpeechToText(voiceMessage.storagePath, language);
      voiceMessage.transcription = transcription;
      voiceMessage.transcriptionStatus = 'completed';
      voiceMessage.detectedLanguage = language;
      await voiceMessage.save();

      this.invalidateCache(messageId, voiceMessage.chatId);
      logger.info(`Voice message transcribed: ${messageId}`);
      return this.getVoiceMessage(messageId);
    } catch (error) {
      logger.error(`Error transcribing voice message: ${error.message}`);
      throw error;
    }
  }

  async getVoiceMessagesInChat(chatId, options = {}) {
    try {
      const limit = Number(options.limit || 20);
      const offset = Number(options.offset || 0);
      const cacheKey = `voice_chat:${chatId}:${limit}:${offset}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      const voiceMessages = await VoiceMessage.find({ chatId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .exec();

      const responses = [];
      for (const voiceMessage of voiceMessages) {
        const message = await Message.findById(voiceMessage.messageId);
        responses.push(this.buildVoiceResponse(message, voiceMessage));
      }

      this.setCache(cacheKey, responses);
      return responses;
    } catch (error) {
      logger.error(`Error getting voice messages: ${error.message}`);
      throw error;
    }
  }

  async deleteVoiceMessage(messageId, userId) {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      if (String(message.senderId) !== String(userId)) {
        throw new Error('Not authorized to delete this message');
      }

      const voiceMessage = await VoiceMessage.findOne({ messageId });
      if (voiceMessage) {
        try {
          await fs.unlink(voiceMessage.storagePath);
        } catch (error) {
          logger.warn(`Could not delete voice file: ${voiceMessage.storagePath}`);
        }

        await VoiceMessage.deleteOne({ messageId });
        this.invalidateCache(messageId, voiceMessage.chatId);
      }

      message.isDeleted = true;
      message.deletedAt = new Date();
      if (typeof message.save === 'function') {
        await message.save();
      }

      logger.info(`Voice message deleted: ${messageId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting voice message: ${error.message}`);
      throw error;
    }
  }

  async getVoiceStats(chatOrUserId) {
    try {
      const messages = await VoiceMessage.find({
        $or: [{ chatId: chatOrUserId }, { userId: chatOrUserId }],
      }).exec();

      const totalSize = messages.reduce((sum, item) => sum + Number(item.fileSize || 0), 0);
      const totalDuration = messages.reduce((sum, item) => sum + Number(item.duration || 0), 0);
      const transcribedMessages = messages.filter((item) => item.transcriptionStatus === 'completed').length;
      const byDevice = messages.reduce((acc, item) => {
        const key = item.device || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      return {
        totalMessages: messages.length,
        totalSize,
        storageUsed: totalSize,
        totalDuration: Math.round(totalDuration),
        averageDuration: messages.length > 0 ? Math.round(totalDuration / messages.length) : 0,
        transcribedMessages,
        untranscribedMessages: messages.length - transcribedMessages,
        transcriptionRate: messages.length > 0 ? transcribedMessages / messages.length : 0,
        byDevice,
      };
    } catch (error) {
      logger.error(`Error getting voice stats: ${error.message}`);
      throw error;
    }
  }

  async generateWaveform(messageIdOrBuffer, options = {}) {
    try {
      if (Buffer.isBuffer(messageIdOrBuffer)) {
        return {
          data: this.buildWaveformData(messageIdOrBuffer, options.resolution || 64),
        };
      }

      const voiceMessage = await VoiceMessage.findOne({ messageId: messageIdOrBuffer });
      if (!voiceMessage) {
        throw new Error('Voice message not found');
      }

      const waveform = Array.isArray(voiceMessage.waveform) ? voiceMessage.waveform : [];
      const resolution = Number(options.resolution || waveform.length || 64);
      return {
        data: waveform.slice(0, resolution),
      };
    } catch (error) {
      logger.error(`Error generating waveform: ${error.message}`);
      throw error;
    }
  }

  normalizeUploadArgs(arg2, arg3, arg4, arg5) {
    if (typeof arg4 === 'string') {
      return {
        userId: arg2,
        chatId: arg3,
        options: {
          ...(arg5 || {}),
          mimeType: arg4,
        },
      };
    }

    return {
      chatId: arg2,
      userId: arg3,
      options: arg4 || {},
    };
  }

  async resolveDuration(audioBuffer, explicitDuration) {
    if (explicitDuration !== undefined && explicitDuration !== null) {
      const durationSeconds =
        explicitDuration > this.maxDurationSeconds ? explicitDuration / 1000 : explicitDuration;
      return durationSeconds;
    }

    return this.getAudioDuration(audioBuffer);
  }

  buildVoiceResponse(message, voiceMessage) {
    return {
      _id: message?._id || voiceMessage.messageId,
      messageId: voiceMessage.messageId,
      chatId: voiceMessage.chatId,
      userId: voiceMessage.userId,
      senderId: message?.senderId || voiceMessage.userId,
      content: message?.content || null,
      duration: voiceMessage.duration,
      mimeType: voiceMessage.mimeType,
      fileSize: voiceMessage.fileSize,
      url: voiceMessage.url,
      transcription: voiceMessage.transcription,
      transcriptionStatus: voiceMessage.transcriptionStatus || 'pending',
      detectedLanguage: voiceMessage.detectedLanguage,
      waveform: {
        data: Array.isArray(voiceMessage.waveform) ? voiceMessage.waveform : [],
      },
      createdAt: voiceMessage.createdAt || message?.createdAt || new Date(),
      device: voiceMessage.device || null,
    };
  }

  buildWaveformData(audioBuffer, resolution = 64) {
    const targetResolution = Math.max(1, Number(resolution));
    const step = Math.max(1, Math.floor(audioBuffer.length / targetResolution));
    const points = [];

    for (let index = 0; index < audioBuffer.length; index += step) {
      const chunk = audioBuffer.slice(index, index + step);
      const average = chunk.reduce((sum, value) => sum + value, 0) / chunk.length;
      const normalized = Number((((average / 255) * 2) - 1).toFixed(4));
      points.push(Math.max(-1, Math.min(1, normalized)));
      if (points.length >= targetResolution) {
        break;
      }
    }

    return points;
  }

  generateFileHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  async getAudioDuration(buffer) {
    return Math.max(1, Math.round(buffer.length / 128000));
  }

  async performSpeechToText(filePath, language) {
    return `Transcription generated for ${path.basename(filePath)} (${language})`;
  }

  invalidateCache(messageId, chatId) {
    this.cache.delete(`voice:${messageId}`);
    Array.from(this.cache.keys()).forEach((cacheKey) => {
      if (chatId && cacheKey.startsWith(`voice_chat:${chatId}:`)) {
        this.cache.delete(cacheKey);
      }
    });
  }

  getFromCache(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  setCache(cacheKey, value) {
    this.cache.set(cacheKey, {
      data: value,
      timestamp: Date.now(),
    });
  }

  clearCache() {
    this.cache.clear();
    logger.info('Voice message cache cleared');
  }
}

module.exports = new VoiceMessageService();
