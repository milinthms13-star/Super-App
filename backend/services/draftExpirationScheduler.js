/**
 * Diary Draft Expiration Scheduler
 * Initializes the automatic cleanup of old draft entries
 * 
 * Phase 4.5: Scheduled job for draft management
 */

const logger = require('../utils/logger');
const draftExpiration = require('../utils/diaryDraftExpiration');

let scheduledTask = null;

/**
 * Initialize and start the diary draft expiration scheduler
 * Attempts to use node-cron if available, otherwise provides manual cleanup endpoint
 */
const startDraftExpirationScheduler = () => {
  try {
    // Try to require node-cron (optional dependency)
    let cron;
    try {
      cron = require('node-cron');
    } catch (e) {
      logger.warn(
        '[DIARY-DRAFT-EXPIRATION] node-cron not installed. Install with: npm install node-cron'
      );
      logger.info(
        '[DIARY-DRAFT-EXPIRATION] Use manual cleanup via: POST /api/diary/admin/cleanup-drafts'
      );
      return;
    }

    // Schedule the cleanup job to run daily at 3 AM
    scheduledTask = draftExpiration.scheduleExpirationJob(cron);

    if (scheduledTask) {
      logger.info('[DIARY-DRAFT-EXPIRATION] Scheduler initialized successfully');
    } else {
      logger.warn('[DIARY-DRAFT-EXPIRATION] Failed to initialize scheduler');
    }
  } catch (error) {
    logger.error('[DIARY-DRAFT-EXPIRATION] Error starting scheduler:', error);
  }
};

/**
 * Stop the scheduler (for graceful shutdown)
 */
const stopDraftExpirationScheduler = () => {
  try {
    if (scheduledTask) {
      scheduledTask.stop();
      scheduledTask = null;
      logger.info('[DIARY-DRAFT-EXPIRATION] Scheduler stopped');
    }
  } catch (error) {
    logger.error('[DIARY-DRAFT-EXPIRATION] Error stopping scheduler:', error);
  }
};

/**
 * Get current scheduler status
 */
const getSchedulerStatus = () => {
  return {
    active: scheduledTask !== null,
    timestamp: new Date(),
    retentionDays: draftExpiration.DRAFT_RETENTION_DAYS
  };
};

/**
 * Manually trigger cleanup (useful for admin panel or manual trigger)
 */
const triggerManualCleanup = async () => {
  return await draftExpiration.runExpirationJob();
};

module.exports = {
  startDraftExpirationScheduler,
  stopDraftExpirationScheduler,
  getSchedulerStatus,
  triggerManualCleanup
};
