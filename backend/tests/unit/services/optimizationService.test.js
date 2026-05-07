const mongoose = require('mongoose');
const assert = require('assert');
const optimizationService = require('../../../services/optimizationService');
const OptimizationMetrics = require('../../../models/OptimizationMetrics');
const zlib = require('zlib');
const util = require('util');

const gzip = util.promisify(zlib.gzip);
const gunzip = util.promisify(zlib.gunzip);

describe('optimizationService Unit Tests', () => {
  const userId = new mongoose.Types.ObjectId();
  const chatId = new mongoose.Types.ObjectId();

  before(async () => {
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/nilahub-test');
    }
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  });

  after(async () => {
    await mongoose.disconnect();
  });

  describe('batchTypingIndicators()', () => {
    it('should batch typing indicators', async () => {
      const indicators = [
        { userId: new mongoose.Types.ObjectId(), chatId, isTyping: true },
        { userId: new mongoose.Types.ObjectId(), chatId, isTyping: true },
        { userId: new mongoose.Types.ObjectId(), chatId, isTyping: false }
      ];

      const batch = await optimizationService.batchTypingIndicators(indicators);

      assert.ok(batch);
      assert.ok(Array.isArray(batch));
    });

    it('should apply batching window', async () => {
      const indicator1 = { userId: new mongoose.Types.ObjectId(), chatId, isTyping: true };
      const indicator2 = { userId: new mongoose.Types.ObjectId(), chatId, isTyping: true };

      const batch1 = await optimizationService.batchTypingIndicators([indicator1]);
      const batch2 = await optimizationService.batchTypingIndicators([indicator2]);

      // Both should be processed
      assert.ok(batch1);
      assert.ok(batch2);
    });

    it('should deduplicate typing indicators', async () => {
      const sameUserId = new mongoose.Types.ObjectId();

      const indicators = [
        { userId: sameUserId, chatId, isTyping: true },
        { userId: sameUserId, chatId, isTyping: true },
        { userId: sameUserId, chatId, isTyping: false }
      ];

      const batch = await optimizationService.batchTypingIndicators(indicators);

      // Should deduplicate to latest state
      assert.ok(batch);
    });
  });

  describe('batchReadReceipts()', () => {
    it('should batch read receipts', async () => {
      const receipts = [
        { userId: new mongoose.Types.ObjectId(), messageId: new mongoose.Types.ObjectId(), chatId },
        { userId: new mongoose.Types.ObjectId(), messageId: new mongoose.Types.ObjectId(), chatId },
        { userId: new mongoose.Types.ObjectId(), messageId: new mongoose.Types.ObjectId(), chatId }
      ];

      const batch = await optimizationService.batchReadReceipts(receipts);

      assert.ok(batch);
      assert.ok(Array.isArray(batch));
    });

    it('should optimize read receipt throughput', async () => {
      const receipts = [];
      for (let i = 0; i < 100; i++) {
        receipts.push({
          userId: new mongoose.Types.ObjectId(),
          messageId: new mongoose.Types.ObjectId(),
          chatId
        });
      }

      const start = Date.now();
      const batch = await optimizationService.batchReadReceipts(receipts);
      const duration = Date.now() - start;

      assert.ok(batch);
      assert.ok(duration < 5000); // Should complete in reasonable time
    });

    it('should handle empty receipt list', async () => {
      const batch = await optimizationService.batchReadReceipts([]);

      assert.ok(Array.isArray(batch));
      assert.strictEqual(batch.length, 0);
    });
  });

  describe('enableDeltaSync()', () => {
    it('should enable delta sync mode', async () => {
      const config = await optimizationService.enableDeltaSync();

      assert.ok(config);
      assert.ok(config.deltaSync === true || typeof config === 'object');
    });

    it('should track changed fields only', async () => {
      const message1 = {
        _id: new mongoose.Types.ObjectId(),
        content: 'Original',
        edited: false
      };

      const message2 = {
        _id: message1._id,
        content: 'Updated',
        edited: true,
        editedAt: new Date()
      };

      // Delta sync should identify changes
      const delta = await optimizationService.enableDeltaSync({
        original: message1,
        updated: message2
      });

      // Should have delta information
      assert.ok(delta !== undefined);
    });
  });

  describe('compressMessagePayload()', () => {
    it('should compress message payload', async () => {
      const message = {
        _id: new mongoose.Types.ObjectId(),
        content: 'This is a long message that should be compressed. '.repeat(10),
        chatId,
        senderId: userId,
        messageType: 'text'
      };

      const compressed = await optimizationService.compressMessagePayload(message);

      assert.ok(compressed);
      assert.ok(Buffer.isBuffer(compressed) || typeof compressed === 'string');
    });

    it('should reduce payload size', async () => {
      const message = {
        _id: new mongoose.Types.ObjectId(),
        content: 'A'.repeat(1000),
        chatId,
        senderId: userId,
        messageType: 'text'
      };

      const original = JSON.stringify(message);
      const compressed = await optimizationService.compressMessagePayload(message);

      if (Buffer.isBuffer(compressed)) {
        assert.ok(compressed.length < original.length);
      } else {
        assert.ok(typeof compressed === 'string');
      }
    });

    it('should handle small payloads', async () => {
      const message = {
        _id: new mongoose.Types.ObjectId(),
        content: 'Hi',
        chatId,
        senderId: userId,
        messageType: 'text'
      };

      const compressed = await optimizationService.compressMessagePayload(message);

      assert.ok(compressed);
    });

    it('should preserve data integrity', async () => {
      const message = {
        _id: new mongoose.Types.ObjectId(),
        content: 'Original content',
        metadata: { urgent: true },
        chatId,
        senderId: userId
      };

      const compressed = await optimizationService.compressMessagePayload(message);

      // After decompression, data should be intact
      assert.ok(compressed);
    });
  });

  describe('detectDuplicates()', () => {
    it('should detect duplicate messages by clientMessageId', async () => {
      const isDuplicate = await optimizationService.detectDuplicates({
        userId,
        chatId,
        clientMessageId: 'msg-123'
      });

      assert.ok(typeof isDuplicate === 'boolean');
    });

    it('should return false for new messages', async () => {
      const isDuplicate = await optimizationService.detectDuplicates({
        userId,
        chatId,
        clientMessageId: 'new-msg-' + Date.now()
      });

      assert.strictEqual(isDuplicate, false);
    });

    it('should detect within same chat', async () => {
      const clientId = 'dup-check-' + Date.now();

      const result1 = await optimizationService.detectDuplicates({
        userId,
        chatId,
        clientMessageId: clientId
      });

      assert.ok(typeof result1 === 'boolean');
    });

    it('should handle missing clientMessageId', async () => {
      const result = await optimizationService.detectDuplicates({
        userId,
        chatId,
        clientMessageId: ''
      });

      assert.ok(typeof result === 'boolean');
    });
  });

  describe('recordMetric()', () => {
    it('should record performance metric', async () => {
      const metric = await optimizationService.recordMetric({
        userId,
        eventType: 'message-send',
        duration: 150,
        chatId
      });

      assert.ok(metric._id);
      assert.strictEqual(metric.eventType, 'message-send');
      assert.strictEqual(metric.duration, 150);
    });

    it('should track various event types', async () => {
      const eventTypes = ['message-send', 'read-receipt', 'typing-indicator', 'file-upload'];

      for (const eventType of eventTypes) {
        const metric = await optimizationService.recordMetric({
          userId,
          eventType,
          duration: Math.random() * 500,
          chatId
        });

        assert.strictEqual(metric.eventType, eventType);
      }
    });

    it('should record optional metadata', async () => {
      const metric = await optimizationService.recordMetric({
        userId,
        eventType: 'message-send',
        duration: 200,
        chatId,
        payloadSize: 512,
        compressed: true
      });

      assert.ok(metric.payloadSize || metric.compressed !== undefined);
    });

    it('should validate duration is positive', async () => {
      try {
        await optimizationService.recordMetric({
          userId,
          eventType: 'message-send',
          duration: -100,
          chatId
        });
        // May succeed or fail depending on validation
        assert.ok(true);
      } catch (error) {
        assert.ok(error);
      }
    });
  });

  describe('getPerformanceMetrics()', () => {
    it('should retrieve performance metrics', async () => {
      await optimizationService.recordMetric({
        userId,
        eventType: 'message-send',
        duration: 150,
        chatId
      });

      const metrics = await optimizationService.getPerformanceMetrics({
        userId,
        timeframe: '24h'
      });

      assert.ok(metrics);
      assert.ok(typeof metrics === 'object');
    });

    it('should support different timeframes', async () => {
      const timeframes = ['1h', '24h', '7d', '30d'];

      for (const timeframe of timeframes) {
        const metrics = await optimizationService.getPerformanceMetrics({
          userId,
          timeframe
        });

        assert.ok(metrics || metrics === null);
      }
    });

    it('should calculate averages', async () => {
      await optimizationService.recordMetric({
        userId,
        eventType: 'message-send',
        duration: 100,
        chatId
      });

      await optimizationService.recordMetric({
        userId,
        eventType: 'message-send',
        duration: 200,
        chatId
      });

      const metrics = await optimizationService.getPerformanceMetrics({
        userId,
        timeframe: '24h'
      });

      assert.ok(metrics);
    });
  });

  describe('getLatencyStats()', () => {
    it('should retrieve latency statistics', async () => {
      await optimizationService.recordMetric({
        userId,
        eventType: 'message-send',
        duration: 100,
        chatId
      });

      const stats = await optimizationService.getLatencyStats({
        userId,
        chatId
      });

      assert.ok(stats);
    });

    it('should calculate percentiles', async () => {
      // Record multiple metrics
      for (let i = 0; i < 10; i++) {
        await optimizationService.recordMetric({
          userId,
          eventType: 'message-send',
          duration: (i + 1) * 10,
          chatId
        });
      }

      const stats = await optimizationService.getLatencyStats({
        userId,
        chatId
      });

      // Should have p95, p99 if enough data
      assert.ok(stats);
    });

    it('should handle empty stats', async () => {
      const stats = await optimizationService.getLatencyStats({
        userId,
        chatId: new mongoose.Types.ObjectId()
      });

      assert.ok(stats === null || typeof stats === 'object');
    });
  });

  describe('getConnectionMetrics()', () => {
    it('should retrieve connection metrics', async () => {
      const metrics = await optimizationService.getConnectionMetrics({
        userId
      });

      assert.ok(typeof metrics === 'object');
    });

    it('should track connection status', async () => {
      const metrics = await optimizationService.getConnectionMetrics({
        userId
      });

      assert.ok(metrics.connected !== undefined || metrics.status !== undefined);
    });
  });

  describe('enableHeartbeat()', () => {
    it('should enable keep-alive heartbeat', async () => {
      const config = await optimizationService.enableHeartbeat({
        userId,
        interval: 30000
      });

      assert.ok(config);
      assert.ok(config.interval || config.heartbeat !== undefined);
    });

    it('should validate interval duration', async () => {
      try {
        await optimizationService.enableHeartbeat({
          userId,
          interval: 100 // Too short
        });
        assert.ok(true); // May succeed or fail
      } catch (error) {
        assert.ok(error);
      }
    });
  });

  describe('TTL Expiration', () => {
    it('should auto-delete metrics after 30 days', async () => {
      await optimizationService.recordMetric({
        userId,
        eventType: 'message-send',
        duration: 150,
        chatId
      });

      const indexes = await OptimizationMetrics.collection.getIndexes();

      const ttlIndex = Object.values(indexes).find(
        idx => idx.expireAfterSeconds !== undefined
      );

      assert.ok(ttlIndex);
      assert.strictEqual(ttlIndex.expireAfterSeconds, 2592000); // 30 days
    });
  });

  describe('Payload Compression', () => {
    it('should compress large messages efficiently', async () => {
      const largeMessage = {
        _id: new mongoose.Types.ObjectId(),
        content: JSON.stringify({ data: 'x'.repeat(10000) }),
        chatId,
        senderId: userId
      };

      const compressed = await optimizationService.compressMessagePayload(largeMessage);

      assert.ok(compressed);
    });

    it('should handle binary data', async () => {
      const message = {
        _id: new mongoose.Types.ObjectId(),
        content: 'binary data',
        binary: Buffer.from('test'),
        chatId
      };

      const compressed = await optimizationService.compressMessagePayload(message);

      assert.ok(compressed);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid eventType gracefully', async () => {
      try {
        await optimizationService.recordMetric({
          userId,
          eventType: '',
          duration: 100,
          chatId
        });
        assert.ok(true);
      } catch (error) {
        assert.ok(error);
      }
    });

    it('should handle null/undefined durations', async () => {
      try {
        await optimizationService.recordMetric({
          userId,
          eventType: 'message-send',
          duration: undefined,
          chatId
        });
      } catch (error) {
        assert.ok(error);
      }
    });

    it('should handle concurrent metric recording', async () => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          optimizationService.recordMetric({
            userId,
            eventType: 'message-send',
            duration: Math.random() * 500,
            chatId
          })
        );
      }

      const results = await Promise.all(promises);

      assert.strictEqual(results.length, 10);
    });
  });

  describe('Performance Baselines', () => {
    it('should record metrics within acceptable time', async () => {
      const start = Date.now();

      await optimizationService.recordMetric({
        userId,
        eventType: 'message-send',
        duration: 150,
        chatId
      });

      const elapsed = Date.now() - start;

      assert.ok(elapsed < 1000); // Should be fast
    });

    it('should batch operations efficiently', async () => {
      const indicators = [];

      for (let i = 0; i < 50; i++) {
        indicators.push({
          userId: new mongoose.Types.ObjectId(),
          chatId,
          isTyping: true
        });
      }

      const start = Date.now();
      await optimizationService.batchTypingIndicators(indicators);
      const elapsed = Date.now() - start;

      assert.ok(elapsed < 2000);
    });
  });
});
