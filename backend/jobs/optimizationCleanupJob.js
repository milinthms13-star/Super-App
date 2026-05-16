const cron = require('node-cron');
const messageBatcher = require('../services/messageBatcher');
const deltaSync = require('../services/deltaSync');
const compressionUtil = require('../services/compressionUtil');
const logger = require('../config/logger');

/**
 * Optimization Cleanup Job - Phase 2 Feature 4: Real-Time Optimization
 * Scheduled background tasks for optimization maintenance
 */

class OptimizationCleanupJob {
  constructor() {
    this.jobs = [];
  }

  /**
   * Job 1: Flush stale batches (every 2 minutes)
   * Flush batches that haven't been updated for 90 seconds
   */
  startStaleBatchFlush() {
    const job = cron.schedule('*/2 * * * *', async () => {
      try {
        logger.info('Flushing stale batches...');

        const results = messageBatcher.flushAll();
        if (results.length > 0) {
          logger.info(`Flushed ${results.length} stale batches`);
        }
      } catch (error) {
        logger.error('Stale batch flush error:', error);
      }
    });

    this.jobs.push(job);
    logger.info('Stale batch flush job started (every 2 minutes)');
  }

  /**
   * Job 2: Optimize delta sync (every 6 hours)
   * Clean up old tracked states to prevent memory leaks
   */
  startDeltaSyncOptimization() {
    const job = cron.schedule('0 */6 * * *', async () => {
      try {
        logger.info('Running delta sync optimization...');

        const statsBefore = deltaSync.getStats();

        // Clear states if tracking too many (> 10000)
        if (statsBefore.trackedStates > 10000) {
          deltaSync.clearAllStates();
          logger.info('Cleared delta sync states due to memory threshold');
        }

        const statsAfter = deltaSync.getStats();

        logger.info('Delta sync optimization complete', {
          statesBeforeCleanup: statsBefore.trackedStates,
          statesAfterCleanup: statsAfter.trackedStates,
          bandwidthSavedTotal: statsAfter.bandwidthSaved
        });
      } catch (error) {
        logger.error('Delta sync optimization error:', error);
      }
    });

    this.jobs.push(job);
    logger.info('Delta sync optimization job started (every 6 hours)');
  }

  /**
   * Job 3: Compression metrics aggregation (daily at 02:00 UTC)
   * Log compression metrics for monitoring
   */
  startCompressionMetricsAggregation() {
    const job = cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Aggregating compression metrics...');

        const stats = compressionUtil.getStats();

        logger.info('Compression metrics', {
          totalCompressed: stats.totalCompressed,
          totalDecompressed: stats.totalDecompressed,
          bandwidthSaved: stats.bandwidthSaved,
          avgCompressionRatio: stats.avgCompressionRatio,
          estimatedDailyBandwidthSavings: stats.estimatedDailyBandwidthSavings
        });
      } catch (error) {
        logger.error('Compression metrics aggregation error:', error);
      }
    });

    this.jobs.push(job);
    logger.info('Compression metrics aggregation job started (daily at 02:00 UTC)');
  }

  /**
   * Job 4: Optimization performance report (daily at 03:00 UTC)
   * Generate comprehensive optimization performance report
   */
  startOptimizationPerformanceReport() {
    const job = cron.schedule('0 3 * * *', async () => {
      try {
        logger.info('Generating optimization performance report...');

        const batchingStats = messageBatcher.getStats();
        const deltaSyncStats = deltaSync.getStats();
        const compressionStats = compressionUtil.getStats();

        const totalBandwidthSaved =
          (deltaSyncStats.bandwidthSaved || 0) +
          (compressionStats.bandwidthSaved || 0);

        const report = {
          timestamp: new Date().toISOString(),
          batching: batchingStats,
          deltaSync: deltaSyncStats,
          compression: compressionStats,
          totals: {
            totalBandwidthSaved,
            effectivenessPercentage: batchingStats.reductionPercentage,
            estimatedMonthlySavings: {
              bandwidth: (totalBandwidthSaved * 30) / (1024 * 1024), // MB
              computationalOverhead: 'Minimal - async processing'
            }
          }
        };

        logger.info('Daily optimization report', report);

        // Could be stored in database for trend analysis
      } catch (error) {
        logger.error('Optimization performance report error:', error);
      }
    });

    this.jobs.push(job);
    logger.info('Optimization performance report job started (daily at 03:00 UTC)');
  }

  /**
   * Job 5: Reset periodic statistics (every 7 days)
   * Clear statistics to start fresh metrics cycle
   */
  startPeriodicStatsReset() {
    const job = cron.schedule('0 0 * * 0', async () => {
      try {
        logger.info('Performing weekly statistics reset...');

        // Log final stats before reset
        logger.info('Weekly statistics before reset', {
          batching: messageBatcher.getStats(),
          deltaSync: deltaSync.getStats(),
          compression: compressionUtil.getStats()
        });

        // Reset stats
        messageBatcher.resetStats();
        deltaSync.resetStats();
        compressionUtil.resetStats();

        logger.info('Weekly statistics reset completed');
      } catch (error) {
        logger.error('Periodic stats reset error:', error);
      }
    });

    this.jobs.push(job);
    logger.info('Periodic statistics reset job started (weekly, every Sunday at 00:00 UTC)');
  }

  /**
   * Job 6: Memory pressure relief (every 10 minutes)
   * Check memory usage and clear caches if needed
   */
  startMemoryPressureRelief() {
    const job = cron.schedule('*/10 * * * *', async () => {
      try {
        const memUsage = process.memoryUsage();
        const heapPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

        if (heapPercentage > 88) {
          logger.warn('Memory pressure detected:', {
            heapPercentage: heapPercentage.toFixed(2),
            heapUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
            heapTotal: (memUsage.heapTotal / 1024 / 1024).toFixed(2) + ' MB'
          });

          // Only clear delta sync states in extreme low-memory conditions.
          if (heapPercentage > 95) {
            const statsBefore = deltaSync.getStats();
            deltaSync.clearAllStates();
            const statsAfter = deltaSync.getStats();

            logger.warn('Emergency: Cleared delta sync states', {
              statesCleared: statsBefore.trackedStates - statsAfter.trackedStates
            });
          }

          // Force garbage collection if available
          if (global.gc) {
            global.gc();
            logger.warn('Manual garbage collection triggered');
          }
        }
      } catch (error) {
        logger.error('Memory pressure relief error:', error);
      }
    });

    this.jobs.push(job);
    logger.info('Memory pressure relief job started (every 10 minutes)');
  }

  /**
   * Start all jobs
   */
  startAll() {
    try {
      logger.info('Starting optimization cleanup jobs...');
      this.startStaleBatchFlush();
      this.startDeltaSyncOptimization();
      this.startCompressionMetricsAggregation();
      this.startOptimizationPerformanceReport();
      this.startPeriodicStatsReset();
      this.startMemoryPressureRelief();
      logger.info('All optimization cleanup jobs started successfully');
    } catch (error) {
      logger.error('Error starting optimization jobs:', error);
    }
  }

  /**
   * Stop all jobs
   */
  stopAll() {
    try {
      logger.info('Stopping optimization cleanup jobs...');
      this.jobs.forEach(job => job.stop());
      this.jobs = [];
      logger.info('All optimization cleanup jobs stopped');
    } catch (error) {
      logger.error('Error stopping optimization jobs:', error);
    }
  }
}

module.exports = new OptimizationCleanupJob();
