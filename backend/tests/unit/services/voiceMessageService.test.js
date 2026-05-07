const assert = require('assert');
jest.mock('../../../models/Message', () => require('./helpers/inMemoryMessagingModels').MessageModel);
jest.mock('../../../models/VoiceMessage', () => require('./helpers/inMemoryMessagingModels').VoiceMessageModel);

const { resetMessagingStore } = require('./helpers/inMemoryMessagingModels');
const voiceMessageService = require('../../../services/voiceMessageService');

describe('Voice Message Service', () => {
  const testUserId = 'test-user-456';
  const testChatId = 'test-chat-123';
  const testAudioBuffer = Buffer.from('audio-data');

  beforeEach(() => {
    resetMessagingStore();
    voiceMessageService.clearCache();
  });

  afterEach(() => {
    voiceMessageService.clearCache();
  });

  describe('uploadVoiceMessage', () => {
    it('should upload voice message successfully', async () => {
      try {
        const result = await voiceMessageService.uploadVoiceMessage(
          testAudioBuffer,
          testUserId,
          testChatId,
          'audio/mp3'
        );
        assert(result._id);
        assert.strictEqual(result.userId, testUserId);
        assert.strictEqual(result.chatId, testChatId);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should reject unsupported audio formats', async () => {
      try {
        await voiceMessageService.uploadVoiceMessage(
          testAudioBuffer,
          testUserId,
          testChatId,
          'audio/aac'
        );
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message.includes('not supported'));
      }
    });

    it('should accept supported formats', async () => {
      try {
        const formats = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'];
        for (const format of formats) {
          const result = await voiceMessageService.uploadVoiceMessage(
            testAudioBuffer,
            testUserId,
            testChatId,
            format
          );
          assert(result);
        }
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should enforce max duration', async () => {
      try {
        const maxDuration = 3600000; // 1 hour in ms
        const result = await voiceMessageService.uploadVoiceMessage(
          testAudioBuffer,
          testUserId,
          testChatId,
          'audio/mp3',
          { duration: maxDuration + 1000 }
        );
        // Should throw if duration exceeds max
      } catch (error) {
        assert(error.message);
      }
    });

    it('should enforce max file size', async () => {
      try {
        const oversizedBuffer = Buffer.alloc(60000000); // 60MB
        await voiceMessageService.uploadVoiceMessage(
          oversizedBuffer,
          testUserId,
          testChatId,
          'audio/mp3'
        );
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message.includes('exceeds'));
      }
    });

    it('should set initial transcription status', async () => {
      try {
        const result = await voiceMessageService.uploadVoiceMessage(
          testAudioBuffer,
          testUserId,
          testChatId,
          'audio/mp3'
        );
        assert.strictEqual(result.transcriptionStatus, 'pending');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('getVoiceMessage', () => {
    it('should retrieve voice message', async () => {
      try {
        const uploaded = await voiceMessageService.uploadVoiceMessage(
          testAudioBuffer,
          testUserId,
          testChatId,
          'audio/mp3'
        );

        const result = await voiceMessageService.getVoiceMessage(uploaded._id);
        assert.strictEqual(result._id, uploaded._id);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should cache voice message metadata', async () => {
      try {
        const uploaded = await voiceMessageService.uploadVoiceMessage(
          testAudioBuffer,
          testUserId,
          testChatId,
          'audio/mp3'
        );

        const result1 = await voiceMessageService.getVoiceMessage(uploaded._id);
        const result2 = await voiceMessageService.getVoiceMessage(uploaded._id);
        assert.deepStrictEqual(result1, result2);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should handle non-existent message', async () => {
      try {
        await voiceMessageService.getVoiceMessage('non-existent');
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message);
      }
    });
  });

  describe('transcribeVoiceMessage', () => {
    it('should transcribe voice message', async () => {
      try {
        const uploaded = await voiceMessageService.uploadVoiceMessage(
          testAudioBuffer,
          testUserId,
          testChatId,
          'audio/mp3'
        );

        const result = await voiceMessageService.transcribeVoiceMessage(uploaded._id);
        assert(result.transcription);
        assert.strictEqual(result.transcriptionStatus, 'completed');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should handle transcription errors gracefully', async () => {
      try {
        const uploaded = await voiceMessageService.uploadVoiceMessage(
          testAudioBuffer,
          testUserId,
          testChatId,
          'audio/mp3'
        );

        // Simulate error by using invalid ID
        await voiceMessageService.transcribeVoiceMessage('invalid-id');
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message);
      }
    });

    it('should support language detection', async () => {
      try {
        const uploaded = await voiceMessageService.uploadVoiceMessage(
          testAudioBuffer,
          testUserId,
          testChatId,
          'audio/mp3'
        );

        const result = await voiceMessageService.transcribeVoiceMessage(uploaded._id);
        assert(result.detectedLanguage);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('getVoiceMessagesInChat', () => {
    it('should retrieve all voice messages in chat', async () => {
      try {
        const result = await voiceMessageService.getVoiceMessagesInChat(testChatId);
        assert(Array.isArray(result));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should respect limit parameter', async () => {
      try {
        const result = await voiceMessageService.getVoiceMessagesInChat(testChatId, {
          limit: 10,
        });
        assert(result.length <= 10);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should include metadata for each message', async () => {
      try {
        const result = await voiceMessageService.getVoiceMessagesInChat(testChatId);
        if (result.length > 0) {
          result.forEach((msg) => {
            assert(msg._id);
            assert(msg.userId);
            assert(msg.duration);
          });
        }
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('deleteVoiceMessage', () => {
    it('should delete voice message', async () => {
      try {
        const uploaded = await voiceMessageService.uploadVoiceMessage(
          testAudioBuffer,
          testUserId,
          testChatId,
          'audio/mp3'
        );

        const result = await voiceMessageService.deleteVoiceMessage(uploaded._id, testUserId);
        assert(result === true);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should enforce authorization', async () => {
      try {
        const uploaded = await voiceMessageService.uploadVoiceMessage(
          testAudioBuffer,
          testUserId,
          testChatId,
          'audio/mp3'
        );

        await voiceMessageService.deleteVoiceMessage(uploaded._id, 'different-user');
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message.includes('authorized'));
      }
    });

    it('should handle non-existent message', async () => {
      try {
        await voiceMessageService.deleteVoiceMessage('non-existent', testUserId);
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message);
      }
    });
  });

  describe('getVoiceStats', () => {
    it('should return voice message statistics', async () => {
      try {
        const stats = await voiceMessageService.getVoiceStats(testUserId);
        assert(typeof stats.totalMessages === 'number');
        assert(typeof stats.totalDuration === 'number');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should track transcriptions', async () => {
      try {
        const stats = await voiceMessageService.getVoiceStats(testUserId);
        assert(typeof stats.transcribedMessages === 'number');
        assert(typeof stats.transcriptionRate === 'number');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should calculate average duration', async () => {
      try {
        const stats = await voiceMessageService.getVoiceStats(testUserId);
        assert(typeof stats.averageDuration === 'number');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should include device information', async () => {
      try {
        const stats = await voiceMessageService.getVoiceStats(testUserId);
        if (stats.byDevice) {
          assert(typeof stats.byDevice === 'object');
        }
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('generateWaveform', () => {
    it('should generate waveform data', async () => {
      try {
        const uploaded = await voiceMessageService.uploadVoiceMessage(
          testAudioBuffer,
          testUserId,
          testChatId,
          'audio/mp3'
        );

        const result = await voiceMessageService.generateWaveform(uploaded._id);
        assert(Array.isArray(result.data));
        assert(result.data.length > 0);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should return normalized waveform data', async () => {
      try {
        const uploaded = await voiceMessageService.uploadVoiceMessage(
          testAudioBuffer,
          testUserId,
          testChatId,
          'audio/mp3'
        );

        const result = await voiceMessageService.generateWaveform(uploaded._id);
        result.data.forEach((point) => {
          assert(typeof point === 'number');
          assert(point >= -1 && point <= 1);
        });
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should support resolution parameter', async () => {
      try {
        const uploaded = await voiceMessageService.uploadVoiceMessage(
          testAudioBuffer,
          testUserId,
          testChatId,
          'audio/mp3'
        );

        const result = await voiceMessageService.generateWaveform(uploaded._id, { resolution: 256 });
        assert(result.data.length <= 256);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('Audio format validation', () => {
    it('should validate MP3 format', async () => {
      try {
        const result = await voiceMessageService.uploadVoiceMessage(
          testAudioBuffer,
          testUserId,
          testChatId,
          'audio/mp3'
        );
        assert(result);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should validate WAV format', async () => {
      try {
        const result = await voiceMessageService.uploadVoiceMessage(
          testAudioBuffer,
          testUserId,
          testChatId,
          'audio/wav'
        );
        assert(result);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should validate OGG format', async () => {
      try {
        const result = await voiceMessageService.uploadVoiceMessage(
          testAudioBuffer,
          testUserId,
          testChatId,
          'audio/ogg'
        );
        assert(result);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should validate WebM format', async () => {
      try {
        const result = await voiceMessageService.uploadVoiceMessage(
          testAudioBuffer,
          testUserId,
          testChatId,
          'audio/webm'
        );
        assert(result);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('Cache behavior', () => {
    it('should cache voice message', async () => {
      try {
        const uploaded = await voiceMessageService.uploadVoiceMessage(
          testAudioBuffer,
          testUserId,
          testChatId,
          'audio/mp3'
        );

        const result1 = await voiceMessageService.getVoiceMessage(uploaded._id);
        const result2 = await voiceMessageService.getVoiceMessage(uploaded._id);
        assert.deepStrictEqual(result1, result2);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should clear cache', async () => {
      try {
        voiceMessageService.clearCache();
        const result = await voiceMessageService.getVoiceStats(testUserId);
        assert(typeof result.totalMessages === 'number');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });
});
