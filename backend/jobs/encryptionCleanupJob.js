const cron = require('node-cron');
const encryptionService = require('../services/encryptionService');
const EncryptionKey = require('../models/EncryptionKey');
const logger = require('../config/logger');

/**
 * Encryption Cleanup Job - Phase 2 Feature
 * Handles automatic key rotation, expiration cleanup, and key maintenance
 */

class EncryptionCleanupJob {
  constructor() {
    this.jobs = {};
  }

  /**
   * Start all encryption maintenance jobs
   */
  startAll() {
    this.startExpiredKeyCleanup();
    this.startKeyRotationReminder();
    this.startKeyUsageStats();
    logger.info('✓ All encryption cleanup jobs started');
  }

  /**
   * Start expired key cleanup (every 6 hours)
   * Deletes keys that have passed expiration date
   */
  startExpiredKeyCleanup() {
    try {
      // Every 6 hours at minute 0
      this.jobs.expiredKeyCleanup = cron.schedule('0 */6 * * *', async () => {
        try {
          logger.info('Running expired key cleanup...');

          const result = await EncryptionKey.deleteMany({
            expiresAt: { $lt: new Date() },
            isPrimary: false // Never delete primary key
          });

          logger.info(`Cleaned up ${result.deletedCount} expired encryption keys`);
        } catch (error) {
          logger.error('Error in expired key cleanup job:', error);
          // Don't crash server
        }
      });

      logger.info('✓ Expired key cleanup job scheduled (every 6 hours)');
    } catch (error) {
      logger.error('Failed to schedule expired key cleanup:', error);
    }
  }

  /**
   * Start key rotation reminder (every 24 hours)
   * Notifies users when keys are expiring soon (< 7 days)
   */
  startKeyRotationReminder() {
    try {
      // Every day at 02:00 UTC
      this.jobs.keyRotationReminder = cron.schedule('0 2 * * *', async () => {
        try {
          logger.info('Running key rotation reminder check...');

          const expiringDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

          const expiringKeys = await EncryptionKey.find({
            expiresAt: {
              $gte: new Date(),
              $lte: expiringDate
            },
            isPrimary: true,
            isActive: true
          }).select('userId');

          const userIds = [...new Set(expiringKeys.map(k => k.userId.toString()))];

          logger.info(`Found ${userIds.length} users with expiring encryption keys`);

          // In production: Send notifications to users
          // await notificationService.notifyKeyExpiration(userIds);

        } catch (error) {
          logger.error('Error in key rotation reminder job:', error);
        }
      });

      logger.info('✓ Key rotation reminder job scheduled (daily at 02:00 UTC)');
    } catch (error) {
      logger.error('Failed to schedule key rotation reminder:', error);
    }
  }

  /**
   * Start key usage statistics generation (daily)
   * Aggregates encryption usage metrics
   */
  startKeyUsageStats() {
    try {
      // Every day at 03:00 UTC
      this.jobs.keyUsageStats = cron.schedule('0 3 * * *', async () => {
        try {
          logger.info('Generating key usage statistics...');

          const activeKeys = await EncryptionKey.countDocuments({
            isActive: true,
            expiresAt: { $gt: new Date() }
          });

          const totalEncryptions = await EncryptionKey.aggregate([
            {
              $match: {
                isActive: true,
                expiresAt: { $gt: new Date() }
              }
            },
            {
              $group: {
                _id: null,
                totalEncrypted: { $sum: '$messagesEncrypted' },
                totalDecrypted: { $sum: '$messagesDecrypted' }
              }
            }
          ]);

          const stats = totalEncryptions[0] || { totalEncrypted: 0, totalDecrypted: 0 };

          logger.info(`Encryption stats: ${activeKeys} active keys, ${stats.totalEncrypted} encrypted messages, ${stats.totalDecrypted} decrypted messages`);

          // In production: Store metrics in time series database or monitoring system
          // await metricsService.recordEncryptionStats(stats);

        } catch (error) {
          logger.error('Error generating key usage stats:', error);
        }
      });

      logger.info('✓ Key usage statistics job scheduled (daily at 03:00 UTC)');
    } catch (error) {
      logger.error('Failed to schedule key usage stats job:', error);
    }
  }

  /**
   * Stop all jobs
   */
  stop() {
    try {
      Object.values(this.jobs).forEach(job => {
        if (job && typeof job.stop === 'function') {
          job.stop();
        }
      });
      logger.info('✓ All encryption cleanup jobs stopped');
    } catch (error) {
      logger.error('Error stopping cleanup jobs:', error);
    }
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      running: Object.keys(this.jobs).length > 0,
      jobs: {
        expiredKeyCleanup: !!this.jobs.expiredKeyCleanup,
        keyRotationReminder: !!this.jobs.keyRotationReminder,
        keyUsageStats: !!this.jobs.keyUsageStats
      }
    };
  }
}

module.exports = new EncryptionCleanupJob();
