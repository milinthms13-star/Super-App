const cron = require('node-cron');
const otpService = require('../services/otpService');

/**
 * OTP Cleanup Job
 * Scheduled background job for OTP maintenance
 * 
 * Tasks:
 * - Clean up expired OTP sessions (runs every hour)
 * - Reset failed attempt tracking for locked devices (runs every 6 hours)
 * - Generate OTP statistics for monitoring (runs daily at midnight)
 */

class OtpCleanupJob {
  constructor() {
    this.expiredOtpCleanupJob = null;
    this.deviceLockResetJob = null;
    this.statsGenerationJob = null;
    this.isRunning = false;
  }

  /**
   * Start OTP cleanup jobs
   */
  startAll() {
    try {
      this.startExpiredOtpCleanup();
      this.startDeviceLockReset();
      this.startStatsGeneration();
      
      this.isRunning = true;
      console.log('✓ OTP cleanup jobs started');
    } catch (error) {
      console.error('[OtpCleanupJob.startAll] Error:', error.message);
      throw error;
    }
  }

  /**
   * Clean up expired OTP sessions
   * Runs every hour (note: MongoDB TTL index should handle this automatically)
   */
  startExpiredOtpCleanup() {
    // Run every hour at minute 0
    this.expiredOtpCleanupJob = cron.schedule('0 * * * *', async () => {
      try {
        const startTime = Date.now();
        const result = await otpService.cleanupExpiredOtps();
        const duration = Date.now() - startTime;

        console.log(`[OtpCleanupJob] Expired OTPs cleanup: deleted ${result.deletedCount} sessions in ${duration}ms`);
      } catch (error) {
        console.error('[OtpCleanupJob.startExpiredOtpCleanup] Error:', error.message);
      }
    });

    console.log('  → Expired OTP cleanup scheduled (every hour)');
  }

  /**
   * Reset device locks (after 15-minute lockout period expires)
   * Runs every 30 minutes
   */
  startDeviceLockReset() {
    // Run every 30 minutes
    this.deviceLockResetJob = cron.schedule('*/30 * * * *', async () => {
      try {
        const startTime = Date.now();
        
        const Device = require('../models/Device');
        
        // Find devices that are locked and lockout period has passed
        const result = await Device.updateMany(
          {
            verificationStatus: 'locked',
            lockedUntil: { $lt: new Date() }
          },
          {
            verificationStatus: 'unverified',
            lockedUntil: null
          }
        );

        const duration = Date.now() - startTime;

        if (result.modifiedCount > 0) {
          console.log(`[OtpCleanupJob] Device locks reset: ${result.modifiedCount} devices unlocked in ${duration}ms`);
        }
      } catch (error) {
        console.error('[OtpCleanupJob.startDeviceLockReset] Error:', error.message);
      }
    });

    console.log('  → Device lock reset scheduled (every 30 minutes)');
  }

  /**
   * Generate OTP statistics for monitoring and analytics
   * Runs daily at 00:30 UTC
   */
  startStatsGeneration() {
    // Run daily at 00:30 UTC
    this.statsGenerationJob = cron.schedule('30 0 * * *', async () => {
      try {
        const startTime = Date.now();
        
        // Generate stats for last 24 hours
        const stats = await otpService.getOtpStats({ hours: 24 });
        const duration = Date.now() - startTime;

        console.log(`[OtpCleanupJob] Statistics generated in ${duration}ms`);
        console.log(`  → Total OTPs in last 24h: ${stats.totalGenerated}`);
        
        // Log by type
        stats.byType.forEach(typeStats => {
          console.log(`  → ${typeStats._id}: ${typeStats.count} generated, ${typeStats.verifiedCount} verified`);
        });

        // Store stats to database (optional - for monitoring dashboard)
        // const OtpStats = require('../models/OtpStats');
        // await OtpStats.create({ timestamp: new Date(), stats });
      } catch (error) {
        console.error('[OtpCleanupJob.startStatsGeneration] Error:', error.message);
      }
    });

    console.log('  → OTP statistics generation scheduled (daily at 00:30 UTC)');
  }

  /**
   * Stop all OTP cleanup jobs
   */
  stop() {
    try {
      if (this.expiredOtpCleanupJob) {
        this.expiredOtpCleanupJob.stop();
        this.expiredOtpCleanupJob = null;
      }

      if (this.deviceLockResetJob) {
        this.deviceLockResetJob.stop();
        this.deviceLockResetJob = null;
      }

      if (this.statsGenerationJob) {
        this.statsGenerationJob.stop();
        this.statsGenerationJob = null;
      }

      this.isRunning = false;
      console.log('✓ OTP cleanup jobs stopped');
    } catch (error) {
      console.error('[OtpCleanupJob.stop] Error:', error.message);
      throw error;
    }
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobs: {
        expiredOtpCleanup: this.expiredOtpCleanupJob ? 'running' : 'stopped',
        deviceLockReset: this.deviceLockResetJob ? 'running' : 'stopped',
        statsGeneration: this.statsGenerationJob ? 'running' : 'stopped'
      }
    };
  }
}

// Export singleton
module.exports = new OtpCleanupJob();
