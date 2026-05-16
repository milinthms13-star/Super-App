const logger = require('../config/logger');

/**
 * Message Batcher - Phase 2 Feature 4: Real-Time Optimization
 * Batches multiple messages into single socket emissions for reduced overhead
 */

class MessageBatcher {
  constructor(maxBatchSize = 50, maxWaitTime = 1000) {
    this.batches = new Map(); // userId -> batch array
    this.timers = new Map(); // userId -> timer ID
    this.maxBatchSize = maxBatchSize; // max messages per batch
    this.maxWaitTime = maxWaitTime; // max wait time in ms before forced flush
    this.stats = {
      totalBatches: 0,
      totalMessages: 0,
      totalMessagesInFlushedBatches: 0,
      compressionRatio: 0
    };
  }

  /**
   * Add message to batch
   */
  addMessageToBatch(userId, message) {
    try {
      // Create batch if doesn't exist
      if (!this.batches.has(userId)) {
        this.batches.set(userId, []);
      }

      const batch = this.batches.get(userId);
      batch.push(message);

      this.stats.totalMessages++;

      // If batch reaches max size, flush immediately
      if (batch.length >= this.maxBatchSize) {
        return this.flush(userId);
      }

      // Set timer for delayed flush if not already set
      if (!this.timers.has(userId)) {
        const timerId = setTimeout(() => {
          this.flush(userId);
        }, this.maxWaitTime);

        this.timers.set(userId, timerId);
      }

      return null; // No flush yet
    } catch (error) {
      logger.error('Error adding message to batch:', error);
      return null;
    }
  }

  /**
   * Flush batch for user
   */
  flush(userId) {
    try {
      if (!this.batches.has(userId)) {
        return null;
      }

      const batch = this.batches.get(userId);
      if (batch.length === 0) {
        return null;
      }

      // Clear timer
      if (this.timers.has(userId)) {
        clearTimeout(this.timers.get(userId));
        this.timers.delete(userId);
      }

      // Create batched result
      const batchedData = {
        type: 'message_batch',
        count: batch.length,
        messages: batch,
        timestamp: new Date(),
        batchId: `batch_${userId}_${Date.now()}`
      };

      this.stats.totalBatches++;
      this.stats.totalMessagesInFlushedBatches += batch.length;

      // Clear batch
      this.batches.delete(userId);

      logger.debug(`Flushed batch for user ${userId}: ${batch.length} messages`);

      return batchedData;
    } catch (error) {
      logger.error('Error flushing batch:', error);
      return null;
    }
  }

  /**
   * Flush all batches
   */
  flushAll() {
    try {
      const results = [];

      for (const userId of this.batches.keys()) {
        const batchedData = this.flush(userId);
        if (batchedData) {
          results.push(batchedData);
        }
      }

      return results;
    } catch (error) {
      logger.error('Error flushing all batches:', error);
      return [];
    }
  }

  /**
   * Get batch size for user
   */
  getBatchSize(userId) {
    return this.batches.has(userId) ? this.batches.get(userId).length : 0;
  }

  /**
   * Get all batch sizes
   */
  getAllBatchSizes() {
    const sizes = {};
    for (const [userId, batch] of this.batches.entries()) {
      sizes[userId] = batch.length;
    }
    return sizes;
  }

  /**
   * Get statistics
   */
  getStats() {
    const avgMessagesPerBatch =
      this.stats.totalBatches > 0
        ? this.stats.totalMessagesInFlushedBatches / this.stats.totalBatches
        : 0;

    return {
      totalBatches: this.stats.totalBatches,
      totalMessages: this.stats.totalMessages,
      avgMessagesPerBatch: avgMessagesPerBatch.toFixed(2),
      activeBatches: this.batches.size,
      reductionPercentage: avgMessagesPerBatch > 0
        ? ((1 - 1 / avgMessagesPerBatch) * 100).toFixed(2)
        : '0.00'
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalBatches: 0,
      totalMessages: 0,
      totalMessagesInFlushedBatches: 0,
      compressionRatio: 0
    };
  }

  /**
   * Clear all batches
   */
  clear() {
    try {
      // Clear all timers
      for (const timerId of this.timers.values()) {
        clearTimeout(timerId);
      }

      this.batches.clear();
      this.timers.clear();

      logger.info('All batches cleared');
    } catch (error) {
      logger.error('Error clearing batches:', error);
    }
  }
}

module.exports = new MessageBatcher();
