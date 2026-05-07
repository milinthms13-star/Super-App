/**
 * Diary Draft Expiration Utility
 * Handles automatic cleanup of old draft entries
 * 
 * Phase 4.5: Keeps the database clean by removing stale drafts
 */

const mongoose = require('mongoose');
const DiaryEntry = require('../models/DiaryEntry');

// Configuration
const DRAFT_RETENTION_DAYS = parseInt(process.env.DIARY_DRAFT_RETENTION_DAYS || 7);
const BATCH_SIZE = 100; // Process in batches to avoid memory issues

/**
 * Calculate cutoff date for draft expiration
 * @param {number} daysBack - Number of days to look back
 * @returns {Date} - Cutoff date
 */
const getCutoffDate = (daysBack = DRAFT_RETENTION_DAYS) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  return cutoff;
};

/**
 * Find expired drafts (old and untouched)
 * @param {number} daysBack - Number of days to look back
 * @returns {Promise<Array>} - Array of draft entry IDs
 */
const findExpiredDrafts = async (daysBack = DRAFT_RETENTION_DAYS) => {
  try {
    const cutoffDate = getCutoffDate(daysBack);

    const expiredDrafts = await DiaryEntry.find({
      isDraft: true,
      isDeleted: { $ne: true }, // Don't process already soft-deleted
      updatedAt: { $lt: cutoffDate } // Not modified since cutoff
    })
      .select('_id userId updatedAt')
      .lean()
      .exec();

    return expiredDrafts;
  } catch (error) {
    console.error('Error finding expired drafts:', error);
    return [];
  }
};

/**
 * Soft delete (mark as deleted) a batch of draft entries
 * @param {Array<string>} draftIds - Array of draft entry IDs
 * @returns {Promise<Object>} - Result with count of deleted drafts
 */
const softDeleteDrafts = async (draftIds) => {
  try {
    if (draftIds.length === 0) {
      return { deletedCount: 0, failedCount: 0 };
    }

    const result = await DiaryEntry.updateMany(
      { _id: { $in: draftIds } },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          isDraft: false // Unmark as draft after deletion
        }
      }
    );

    return {
      deletedCount: result.modifiedCount,
      failedCount: draftIds.length - result.modifiedCount
    };
  } catch (error) {
    console.error('Error soft-deleting drafts:', error);
    return {
      deletedCount: 0,
      failedCount: draftIds.length,
      error: error.message
    };
  }
};

/**
 * Permanently delete (hard delete) old draft entries
 * This is more aggressive and should only be used after long retention periods
 * @param {number} daysBack - Number of days to look back (default: 90)
 * @returns {Promise<Object>} - Deletion statistics
 */
const hardDeleteOldDrafts = async (daysBack = 90) => {
  try {
    const cutoffDate = getCutoffDate(daysBack);

    const result = await DiaryEntry.deleteMany({
      isDraft: true,
      isDeleted: true, // Only delete already soft-deleted entries
      deletedAt: { $lt: cutoffDate }
    });

    return {
      permanentlyDeletedCount: result.deletedCount,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error permanently deleting old drafts:', error);
    return {
      permanentlyDeletedCount: 0,
      error: error.message
    };
  }
};

/**
 * Run expiration job: finds expired drafts and soft-deletes them in batches
 * @returns {Promise<Object>} - Job statistics
 */
const runExpirationJob = async () => {
  const jobStartTime = new Date();
  const stats = {
    timestamp: jobStartTime,
    totalProcessed: 0,
    totalDeleted: 0,
    totalFailed: 0,
    batches: 0,
    duration: 0,
    success: false
  };

  try {
    console.log(
      `[DIARY-DRAFT-EXPIRATION] Starting job: Removing drafts older than ${DRAFT_RETENTION_DAYS} days`
    );

    // Find all expired drafts
    const expiredDrafts = await findExpiredDrafts(DRAFT_RETENTION_DAYS);
    stats.totalProcessed = expiredDrafts.length;

    if (expiredDrafts.length === 0) {
      console.log('[DIARY-DRAFT-EXPIRATION] No expired drafts found');
      stats.success = true;
      return stats;
    }

    // Process in batches
    for (let i = 0; i < expiredDrafts.length; i += BATCH_SIZE) {
      const batch = expiredDrafts.slice(i, i + BATCH_SIZE);
      const batchIds = batch.map(d => d._id);

      const result = await softDeleteDrafts(batchIds);

      stats.totalDeleted += result.deletedCount;
      stats.totalFailed += result.failedCount;
      stats.batches += 1;

      console.log(
        `[DIARY-DRAFT-EXPIRATION] Batch ${stats.batches}: Deleted ${result.deletedCount}/${batch.length} drafts`
      );

      // Optional: Add delay between batches to avoid overload
      if (i + BATCH_SIZE < expiredDrafts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    stats.success = true;
    stats.duration = Date.now() - jobStartTime.getTime();

    console.log(
      `[DIARY-DRAFT-EXPIRATION] Job completed: Deleted ${stats.totalDeleted} drafts in ${stats.batches} batches (${stats.duration}ms)`
    );

    return stats;
  } catch (error) {
    stats.success = false;
    stats.error = error.message;
    console.error('[DIARY-DRAFT-EXPIRATION] Job failed:', error);
    return stats;
  }
};

/**
 * Get expiration statistics (preview of what would be deleted)
 * @returns {Promise<Object>} - Statistics about expiring drafts
 */
const getExpirationStats = async () => {
  try {
    const cutoffDate = getCutoffDate(DRAFT_RETENTION_DAYS);

    const stats = {
      retentionDays: DRAFT_RETENTION_DAYS,
      cutoffDate: cutoffDate,
      expiredDraftCount: 0,
      expiredByUser: {},
      oldestExpiredDraft: null,
      recentExpiredDraft: null
    };

    // Count expired drafts
    const expiredDrafts = await DiaryEntry.find({
      isDraft: true,
      isDeleted: { $ne: true },
      updatedAt: { $lt: cutoffDate }
    })
      .select('_id userId updatedAt title')
      .lean()
      .sort({ updatedAt: 1 })
      .exec();

    stats.expiredDraftCount = expiredDrafts.length;

    // Count by user
    expiredDrafts.forEach(draft => {
      stats.expiredByUser[draft.userId] = (stats.expiredByUser[draft.userId] || 0) + 1;
    });

    // Get oldest and newest
    if (expiredDrafts.length > 0) {
      stats.oldestExpiredDraft = {
        id: expiredDrafts[0]._id,
        userId: expiredDrafts[0].userId,
        updatedAt: expiredDrafts[0].updatedAt,
        title: expiredDrafts[0].title
      };

      stats.recentExpiredDraft = {
        id: expiredDrafts[expiredDrafts.length - 1]._id,
        userId: expiredDrafts[expiredDrafts.length - 1].userId,
        updatedAt: expiredDrafts[expiredDrafts.length - 1].updatedAt,
        title: expiredDrafts[expiredDrafts.length - 1].title
      };
    }

    return stats;
  } catch (error) {
    console.error('Error getting expiration stats:', error);
    return {
      error: error.message,
      retentionDays: DRAFT_RETENTION_DAYS
    };
  }
};

/**
 * Schedule cleanup to run at a specific time
 * Call this from server initialization
 * @param {Function} cron - node-cron schedule function
 * @returns {Object} - Scheduled task reference
 */
const scheduleExpirationJob = (cron) => {
  if (!cron) {
    console.warn('[DIARY-DRAFT-EXPIRATION] node-cron not available, skipping scheduler');
    return null;
  }

  // Run daily at 3 AM (adjust based on your timezone)
  const task = cron.schedule('0 3 * * *', async () => {
    console.log('[DIARY-DRAFT-EXPIRATION] Running scheduled cleanup job');
    const result = await runExpirationJob();
    console.log('[DIARY-DRAFT-EXPIRATION] Scheduled job result:', result);
  });

  console.log('[DIARY-DRAFT-EXPIRATION] Scheduled daily cleanup at 03:00 AM');
  return task;
};

module.exports = {
  getCutoffDate,
  findExpiredDrafts,
  softDeleteDrafts,
  hardDeleteOldDrafts,
  runExpirationJob,
  getExpirationStats,
  scheduleExpirationJob,
  DRAFT_RETENTION_DAYS,
  BATCH_SIZE
};
