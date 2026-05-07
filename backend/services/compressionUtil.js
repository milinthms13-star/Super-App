const zlib = require('zlib');
const logger = require('../config/logger');

/**
 * Compression Utility - Phase 2 Feature 4: Real-Time Optimization
 * Compresses payloads to reduce bandwidth usage
 */

class CompressionUtil {
  constructor() {
    this.stats = {
      compressed: 0,
      decompressed: 0,
      originalSize: 0,
      compressedSize: 0
    };
  }

  /**
   * Compress data (gzip)
   */
  async compress(data) {
    try {
      const json = typeof data === 'string' ? data : JSON.stringify(data);
      const originalSize = Buffer.byteLength(json);

      return new Promise((resolve, reject) => {
        zlib.gzip(json, (err, compressed) => {
          if (err) {
            logger.error('Compression error:', err);
            reject(err);
          } else {
            const compressedSize = compressed.length;
            const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(2);

            this.stats.compressed++;
            this.stats.originalSize += originalSize;
            this.stats.compressedSize += compressedSize;

            resolve({
              compressed: compressed.toString('base64'),
              originalSize,
              compressedSize,
              ratio: parseFloat(ratio),
              isCompressed: true
            });
          }
        });
      });
    } catch (error) {
      logger.error('Error compressing data:', error);
      throw error;
    }
  }

  /**
   * Decompress data (gunzip)
   */
  async decompress(compressedData) {
    try {
      const buffer = Buffer.from(compressedData, 'base64');

      return new Promise((resolve, reject) => {
        zlib.gunzip(buffer, (err, decompressed) => {
          if (err) {
            logger.error('Decompression error:', err);
            reject(err);
          } else {
            this.stats.decompressed++;

            try {
              const json = decompressed.toString();
              const data = JSON.parse(json);
              resolve(data);
            } catch (parseErr) {
              logger.error('Error parsing decompressed data:', parseErr);
              reject(parseErr);
            }
          }
        });
      });
    } catch (error) {
      logger.error('Error decompressing data:', error);
      throw error;
    }
  }

  /**
   * Compress batch of messages
   */
  async compressBatch(messages) {
    try {
      const payload = { messages, timestamp: new Date() };
      return await this.compress(payload);
    } catch (error) {
      logger.error('Error compressing batch:', error);
      throw error;
    }
  }

  /**
   * Decompress batch of messages
   */
  async decompressBatch(compressedData) {
    try {
      const payload = await this.decompress(compressedData);
      return payload.messages || [];
    } catch (error) {
      logger.error('Error decompressing batch:', error);
      throw error;
    }
  }

  /**
   * Get compression statistics
   */
  getStats() {
    const totalSize = this.stats.originalSize + this.stats.compressedSize;
    const avgCompressionRatio =
      this.stats.compressed > 0
        ? (
            ((this.stats.originalSize - this.stats.compressedSize) /
              this.stats.originalSize) *
            100
          ).toFixed(2)
        : 0;

    return {
      totalCompressed: this.stats.compressed,
      totalDecompressed: this.stats.decompressed,
      originalSize: this.stats.originalSize,
      compressedSize: this.stats.compressedSize,
      bandwidthSaved: this.stats.originalSize - this.stats.compressedSize,
      avgCompressionRatio: parseFloat(avgCompressionRatio),
      estimatedDailyBandwidthSavings: this._estimateDailyBandwidthSavings()
    };
  }

  /**
   * Helper: Estimate daily bandwidth savings (for reference)
   */
  _estimateDailyBandwidthSavings() {
    if (this.stats.compressed === 0) return 0;

    const avgCompressionPerMessage =
      (this.stats.originalSize - this.stats.compressedSize) / this.stats.compressed;
    const messagesPerMinute = 100; // Assumption
    const messagesPerDay = messagesPerMinute * 60 * 24;

    return (avgCompressionPerMessage * messagesPerDay) / (1024 * 1024); // MB
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      compressed: 0,
      decompressed: 0,
      originalSize: 0,
      compressedSize: 0
    };
  }

  /**
   * Decide whether to compress based on data size
   */
  shouldCompress(data) {
    try {
      const size = Buffer.byteLength(JSON.stringify(data));
      return size > 1024; // Compress if > 1KB
    } catch (error) {
      return false;
    }
  }
}

module.exports = new CompressionUtil();
