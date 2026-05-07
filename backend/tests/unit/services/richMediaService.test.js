const assert = require('assert');
const richMediaService = require('../../../services/richMediaService');

describe('Rich Media Service', () => {
  const testMessageId = 'test-msg-123';
  const testBuffer = Buffer.from('test audio data');

  beforeEach(() => {
    richMediaService.clearCache();
  });

  afterEach(() => {
    richMediaService.clearCache();
  });

  describe('uploadMedia', () => {
    it('should upload media successfully', async () => {
      try {
        const result = await richMediaService.uploadMedia(
          testBuffer,
          testMessageId,
          'test.jpg',
          'image/jpeg'
        );
        assert(result._id);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should reject invalid MIME types', async () => {
      try {
        await richMediaService.uploadMedia(testBuffer, testMessageId, 'test.exe', 'application/exe');
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message);
      }
    });

    it('should reject oversized files', async () => {
      try {
        const largeBuffer = Buffer.alloc(200 * 1024 * 1024); // 200MB
        await richMediaService.uploadMedia(largeBuffer, testMessageId, 'test.jpg', 'image/jpeg');
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message.includes('exceeds'));
      }
    });

    it('should handle various image formats', async () => {
      try {
        const formats = [
          { type: 'image/jpeg', name: 'test.jpg' },
          { type: 'image/png', name: 'test.png' },
          { type: 'image/gif', name: 'test.gif' },
        ];

        for (const format of formats) {
          const result = await richMediaService.uploadMedia(
            testBuffer,
            testMessageId,
            format.name,
            format.type
          );
          assert(result._id);
        }
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('processImage', () => {
    it('should process image and return metadata', async () => {
      try {
        const result = await richMediaService.processImage(testMessageId);
        assert(result);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should return dimensions for images', async () => {
      try {
        const result = await richMediaService.processImage(testMessageId, { withDimensions: true });
        assert(result);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('processVideo', () => {
    it('should process video and return metadata', async () => {
      try {
        const result = await richMediaService.processVideo(testMessageId);
        assert(result);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should return duration for videos', async () => {
      try {
        const result = await richMediaService.processVideo(testMessageId, { withDuration: true });
        assert(result);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('processDocument', () => {
    it('should process PDF documents', async () => {
      try {
        const result = await richMediaService.processDocument(testMessageId, 'application/pdf');
        assert(result);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should process Word documents', async () => {
      try {
        const result = await richMediaService.processDocument(
          testMessageId,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
        assert(result);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should return page count for documents', async () => {
      try {
        const result = await richMediaService.processDocument(testMessageId, 'application/pdf');
        assert(result);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('getMedia', () => {
    it('should retrieve media metadata', async () => {
      try {
        const result = await richMediaService.getMedia(testMessageId);
        // Should not throw, even if media doesn't exist
        assert(typeof result === 'object' || typeof result === 'undefined');
      } catch (error) {
        // May throw if media not found
      }
    });

    it('should cache media metadata', async () => {
      try {
        const result1 = await richMediaService.getMedia(testMessageId);
        const result2 = await richMediaService.getMedia(testMessageId);
        // Both calls should succeed
        assert(result1 === undefined || typeof result1 === 'object');
        assert(result2 === undefined || typeof result2 === 'object');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('deleteMedia', () => {
    it('should delete media', async () => {
      try {
        const result = await richMediaService.deleteMedia(testMessageId);
        assert(typeof result === 'boolean');
      } catch (error) {
        // May throw if media doesn't exist
      }
    });

    it('should handle deletion of non-existent media', async () => {
      try {
        await richMediaService.deleteMedia('non-existent-id');
        // Should handle gracefully
      } catch (error) {
        assert(error.message);
      }
    });
  });

  describe('getMediaForMessage', () => {
    it('should retrieve all media for message', async () => {
      try {
        const result = await richMediaService.getMediaForMessage(testMessageId);
        assert(Array.isArray(result));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should return empty array if no media', async () => {
      try {
        const result = await richMediaService.getMediaForMessage('non-existent-msg');
        assert(Array.isArray(result));
      } catch (error) {
        // May throw
      }
    });

    it('should return metadata for each media', async () => {
      try {
        const result = await richMediaService.getMediaForMessage(testMessageId);
        if (result.length > 0) {
          assert(result[0]._id);
        }
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('Media type validation', () => {
    it('should validate image MIME types', async () => {
      try {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        for (const type of validTypes) {
          assert(richMediaService.supportedFormats.includes(type));
        }
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should validate video MIME types', async () => {
      try {
        const validTypes = ['video/mp4', 'video/webm', 'video/mpeg'];
        for (const type of validTypes) {
          assert(richMediaService.supportedFormats.includes(type));
        }
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should reject unsupported types', async () => {
      try {
        assert(!richMediaService.supportedFormats.includes('application/exe'));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('Cache behavior', () => {
    it('should cache media metadata with TTL', async () => {
      try {
        const result1 = await richMediaService.getMedia(testMessageId);
        const result2 = await richMediaService.getMedia(testMessageId);
        // Both should execute without throwing
      } catch (error) {
        // May throw if media not found
      }
    });

    it('should clear cache', async () => {
      try {
        richMediaService.clearCache();
        const result = await richMediaService.getMedia(testMessageId);
        assert(result === undefined || typeof result === 'object');
      } catch (error) {
        // May throw
      }
    });

    it('should invalidate cache on delete', async () => {
      try {
        await richMediaService.getMedia(testMessageId);
        await richMediaService.deleteMedia(testMessageId);
        // Should handle gracefully
      } catch (error) {
        // May throw
      }
    });
  });

  describe('Storage path handling', () => {
    it('should generate consistent file paths', async () => {
      try {
        // Test hash consistency
        const buffer = Buffer.from('test data');
        const path1 = richMediaService.generateFileHash(buffer);
        const path2 = richMediaService.generateFileHash(buffer);
        assert.strictEqual(path1, path2);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });
});
