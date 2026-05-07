const OptimizationMetrics = require('../models/OptimizationMetrics');
const Message = require('../models/Message');
const logger = require('../utils/logger');

class OptimizationService {
  constructor() {
    if (OptimizationService.instance) {
      return OptimizationService.instance;
    }
    this.typingBatches = {};
    this.readReceiptBatches = {};
    this.deliveryBatches = {};
    OptimizationService.instance = this;
  }

  /**
   * Record optimization metric
   */
  async recordMetric(userId, eventType, duration, additionalData = {}) {
    try {
      const metric = new OptimizationMetrics({
        userId,
        eventType,
        duration,
        ...additionalData,
      });

      await metric.save();
      return metric;
    } catch (error) {
      logger.error('Error recording optimization metric:', error);
    }
  }

  /**
   * Batch typing indicators (aggregate every 100ms)
   */
  batchTypingIndicators(chatId, userId, isTyping) {
    try {
      const batchKey = `${chatId}_${userId}`;

      if (this.typingBatches[batchKey]) {
        clearTimeout(this.typingBatches[batchKey].timeout);
      }

      if (!isTyping) {
        delete this.typingBatches[batchKey];
        return { batched: true, delay: 0 };
      }

      return new Promise((resolve) => {
        this.typingBatches[batchKey] = {
          timeout: setTimeout(() => {
            delete this.typingBatches[batchKey];
            resolve({ batched: true, delay: 100 });
          }, 100),
        };
      });
    } catch (error) {
      logger.error('Error batching typing indicators:', error);
      return { batched: false, error: error.message };
    }
  }

  /**
   * Batch read receipts (aggregate every 200ms)
   */
  batchReadReceipts(chatId, userId, messageIds) {
    try {
      const batchKey = chatId;

      if (!this.readReceiptBatches[batchKey]) {
        this.readReceiptBatches[batchKey] = {
          messageIds: new Set(),
          users: new Map(),
          timeout: null,
        };
      }

      const batch = this.readReceiptBatches[batchKey];
      messageIds.forEach((id) => batch.messageIds.add(id));

      if (!batch.users.has(userId)) {
        batch.users.set(userId, true);
      }

      clearTimeout(batch.timeout);

      return new Promise((resolve) => {
        batch.timeout = setTimeout(async () => {
          try {
            const updates = Array.from(batch.messageIds).map((messageId) => ({
              messageId,
              userId,
            }));

            delete this.readReceiptBatches[batchKey];
            resolve({ batched: true, updates, delay: 200 });
          } catch (error) {
            logger.error('Error processing batched read receipts:', error);
            resolve({ batched: false, error: error.message });
          }
        }, 200);
      });
    } catch (error) {
      logger.error('Error batching read receipts:', error);
      return { batched: false, error: error.message };
    }
  }

  /**
   * Batch message delivery notifications
   */
  batchMessageDelivery(chatId, messageIds) {
    try {
      const batchKey = chatId;

      if (!this.deliveryBatches[batchKey]) {
        this.deliveryBatches[batchKey] = {
          messageIds: [],
          timeout: null,
        };
      }

      const batch = this.deliveryBatches[batchKey];
      batch.messageIds.push(...messageIds);

      clearTimeout(batch.timeout);

      return new Promise((resolve) => {
        batch.timeout = setTimeout(() => {
          const uniqueIds = [...new Set(batch.messageIds)];
          delete this.deliveryBatches[batchKey];
          resolve({
            batched: true,
            messageIds: uniqueIds,
            count: uniqueIds.length,
            delay: 150,
          });
        }, 150);
      });
    } catch (error) {
      logger.error('Error batching message delivery:', error);
      return { batched: false, error: error.message };
    }
  }

  /**
   * Enable delta sync (send only changed fields)
   */
  enableDeltaSync(message, previousMessage) {
    try {
      if (!previousMessage) {
        return {
          enabled: true,
          deltaPayload: message,
          reduction: 0,
        };
      }

      const delta = {};
      let changedFieldCount = 0;

      const fieldsToCompare = ['content', 'status', 'readBy', 'reactions', 'mediaUrls'];

      for (const field of fieldsToCompare) {
        const prev = JSON.stringify(previousMessage[field]);
        const curr = JSON.stringify(message[field]);

        if (prev !== curr) {
          delta[field] = message[field];
          changedFieldCount++;
        }
      }

      delta._id = message._id;

      const fullSize = JSON.stringify(message).length;
      const deltaSize = JSON.stringify(delta).length;
      const reduction = Math.round(((fullSize - deltaSize) / fullSize) * 100);

      return {
        enabled: true,
        deltaPayload: delta,
        reduction,
        changedFields: changedFieldCount,
      };
    } catch (error) {
      logger.error('Error enabling delta sync:', error);
      return {
        enabled: false,
        deltaPayload: message,
        error: error.message,
      };
    }
  }

  /**
   * Compress message payload for large messages
   */
  compressMessagePayload(message) {
    try {
      const zlib = require('zlib');

      const payload = JSON.stringify(message);
      const originalSize = payload.length;

      if (originalSize < 1024) {
        return {
          compressed: false,
          payload: message,
          originalSize,
          reason: 'Payload below 1KB threshold',
        };
      }

      const compressed = zlib.gzipSync(payload);
      const compressedSize = compressed.length;
      const ratio = Math.round(((originalSize - compressedSize) / originalSize) * 100);

      return {
        compressed: true,
        payload: compressed.toString('base64'),
        originalSize,
        compressedSize,
        compressionRatio: ratio,
      };
    } catch (error) {
      logger.error('Error compressing message payload:', error);
      return {
        compressed: false,
        payload: message,
        error: error.message,
      };
    }
  }

  /**
   * Enable heartbeat for connection keep-alive
   */
  enableHeartbeat(userId, interval = 30000) {
    try {
      return {
        heartbeatEnabled: true,
        interval,
        type: 'ping-pong',
        expiresAfterMissed: 3,
      };
    } catch (error) {
      logger.error('Error enabling heartbeat:', error);
      return {
        heartbeatEnabled: false,
        error: error.message,
      };
    }
  }

  /**
   * Detect duplicate messages
   */
  async detectDuplicates(clientMessageId, chatId, userId) {
    try {
      const message = await Message.findOne({
        clientMessageId,
        chatId,
        senderId: userId,
      });

      return {
        isDuplicate: !!message,
        message: message || null,
      };
    } catch (error) {
      logger.error('Error detecting duplicates:', error);
      return {
        isDuplicate: false,
        error: error.message,
      };
    }
  }

  /**
   * Get performance metrics for user
   */
  async getPerformanceMetrics(userId, timeframe = '24h') {
    try {
      const now = new Date();
      let fromDate = new Date();

      if (timeframe === '24h') {
        fromDate.setHours(fromDate.getHours() - 24);
      } else if (timeframe === '7d') {
        fromDate.setDate(fromDate.getDate() - 7);
      } else if (timeframe === '30d') {
        fromDate.setDate(fromDate.getDate() - 30);
      }

      const metrics = await OptimizationMetrics.find({
        userId,
        createdAt: { $gte: fromDate, $lte: now },
      });

      const eventMetrics = {};
      let totalDuration = 0;

      for (const metric of metrics) {
        if (!eventMetrics[metric.eventType]) {
          eventMetrics[metric.eventType] = {
            count: 0,
            totalDuration: 0,
            minDuration: Infinity,
            maxDuration: 0,
          };
        }

        const event = eventMetrics[metric.eventType];
        event.count++;
        event.totalDuration += metric.duration;
        event.minDuration = Math.min(event.minDuration, metric.duration);
        event.maxDuration = Math.max(event.maxDuration, metric.duration);
        totalDuration += metric.duration;
      }

      // Calculate averages
      for (const eventType in eventMetrics) {
        const event = eventMetrics[eventType];
        event.avgDuration = Math.round(event.totalDuration / event.count);
      }

      return {
        timeframe,
        totalMetrics: metrics.length,
        totalDuration,
        eventMetrics,
      };
    } catch (error) {
      logger.error('Error retrieving performance metrics:', error);
      throw error;
    }
  }

  /**
   * Get latency statistics
   */
  async getLatencyStats(userId, chatId = null) {
    try {
      const query = {
        userId,
        eventType: { $in: ['message-send', 'message-receive', 'read-receipt'] },
      };

      if (chatId) {
        query.chatId = chatId;
      }

      const metrics = await OptimizationMetrics.find(query).sort({ createdAt: -1 }).limit(100);

      if (metrics.length === 0) {
        return { latencies: [], avgLatency: 0, p95Latency: 0, p99Latency: 0 };
      }

      const latencies = metrics.map((m) => m.latency || m.duration).sort((a, b) => a - b);

      const avgLatency = Math.round(
        latencies.reduce((a, b) => a + b, 0) / latencies.length
      );
      const p95Index = Math.floor(latencies.length * 0.95);
      const p99Index = Math.floor(latencies.length * 0.99);

      return {
        sampleCount: latencies.length,
        avgLatency,
        minLatency: latencies[0],
        maxLatency: latencies[latencies.length - 1],
        p95Latency: latencies[p95Index],
        p99Latency: latencies[p99Index],
      };
    } catch (error) {
      logger.error('Error retrieving latency stats:', error);
      throw error;
    }
  }
}

module.exports = new OptimizationService();
