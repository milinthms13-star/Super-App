const cron = require('node-cron');
const AbuseReport = require('../models/AbuseReport');
const ModerationQueue = require('../models/ModerationQueue');
const AdminLog = require('../models/AdminLog');
const moderationService = require('../services/moderationService');
const logger = require('../config/logger');

/**
 * Moderation Cleanup Job - Phase 2 Feature 3
 * Scheduled background tasks for queue maintenance and report cleanup
 */

class ModerationCleanupJob {
  constructor() {
    this.jobs = [];
  }

  /**
   * Job 1: Stale Report Cleanup (every 6 hours)
   * Auto-resolve reports older than 30 days with no moderator action
   */
  startStaleReportCleanup() {
    const job = cron.schedule('0 */6 * * *', async () => {
      try {
        logger.info('Starting stale report cleanup...');

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const result = await AbuseReport.updateMany(
          {
            status: 'pending',
            createdAt: { $lt: thirtyDaysAgo }
          },
          {
            status: 'dismissed',
            resolution: 'auto_dismissed_stale',
            moderationNotes: 'Automatically dismissed after 30 days with no moderator action'
          }
        );

        logger.info(`Cleaned up ${result.modifiedCount} stale reports`);

        // Update queue items
        if (result.modifiedCount > 0) {
          await ModerationQueue.updateMany(
            {
              status: { $nin: ['completed', 'escalated'] },
              createdAt: { $lt: thirtyDaysAgo }
            },
            {
              status: 'completed'
            }
          );
          logger.info(`Completed ${result.modifiedCount} stale queue items`);
        }
      } catch (error) {
        logger.error('Stale report cleanup error:', error);
      }
    });

    this.jobs.push(job);
    logger.info('Stale report cleanup job started (every 6 hours)');
  }

  /**
   * Job 2: Overdue Queue Escalation (every 1 hour)
   * Escalate any queue items that exceed their due date
   */
  startOverdueQueueEscalation() {
    const job = cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Starting overdue queue escalation...');

        const now = new Date();

        const overdueItems = await ModerationQueue.find({
          status: 'in_progress',
          dueDate: { $lt: now }
        });

        logger.debug(`Found ${overdueItems.length} overdue items`);

        for (const item of overdueItems) {
          try {
            await ModerationQueue.findByIdAndUpdate(
              item._id,
              {
                status: 'escalated',
                escalationReason: 'Overdue - exceeded SLA target',
                escalatedAt: new Date()
              }
            );

            logger.info(`Escalated overdue queue item ${item._id}`);
          } catch (itemError) {
            logger.error(`Error escalating item ${item._id}:`, itemError);
          }
        }

        logger.info(`Escalated ${overdueItems.length} overdue items`);
      } catch (error) {
        logger.error('Overdue queue escalation error:', error);
      }
    });

    this.jobs.push(job);
    logger.info('Overdue queue escalation job started (every hour)');
  }

  /**
   * Job 3: Queue Performance Optimization (daily at 03:00 UTC)
   * Reassign tasks, update metrics, and identify stuck items
   */
  startQueueOptimization() {
    const job = cron.schedule('0 3 * * *', async () => {
      try {
        logger.info('Starting queue performance optimization...');

        // Get queue statistics
        const stats = await ModerationQueue.getQueueStats();
        logger.info('Queue stats:', {
          queued: stats.queued,
          inProgress: stats.inProgress,
          avgResolutionTime: stats.avgResolutionTime
        });

        // Identify stuck items (in_progress > 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const stuckItems = await ModerationQueue.find({
          status: 'in_progress',
          updatedAt: { $lt: oneDayAgo }
        });

        logger.info(`Found ${stuckItems.length} potentially stuck items`);

        for (const item of stuckItems) {
          try {
            // Mark for escalation
            await ModerationQueue.findByIdAndUpdate(
              item._id,
              {
                status: 'escalated',
                escalationReason: 'No updates for 24+ hours',
                escalatedAt: new Date()
              }
            );

            logger.warn(`Marked item ${item._id} as stuck for escalation`);
          } catch (itemError) {
            logger.error(`Error marking stuck item ${item._id}:`, itemError);
          }
        }

        // Log daily metrics
        await AdminLog.collection.insertOne({
          admin: 'system',
          action: 'queue_optimization',
          reason: 'Daily queue metrics update',
          details: {
            queueStats: stats,
            stuckItemsFound: stuckItems.length,
            timestamp: new Date()
          },
          severity: 'low'
        });

        logger.info('Queue optimization completed');
      } catch (error) {
        logger.error('Queue optimization error:', error);
      }
    });

    this.jobs.push(job);
    logger.info('Queue optimization job started (daily at 03:00 UTC)');
  }

  /**
   * Job 4: Moderation Metrics Aggregation (daily at 04:00 UTC)
   * Calculate and store daily moderation metrics
   */
  startMetricsAggregation() {
    const job = cron.schedule('0 4 * * *', async () => {
      try {
        logger.info('Starting metrics aggregation...');

        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const startOfDay = new Date(yesterday);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(yesterday);
        endOfDay.setHours(23, 59, 59, 999);

        // Get daily stats
        const reports = await AbuseReport.countDocuments({
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        });

        const resolved = await AbuseReport.countDocuments({
          resolvedAt: { $gte: startOfDay, $lte: endOfDay }
        });

        const actions = await AdminLog.countDocuments({
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        });

        const metrics = {
          date: startOfDay,
          reportsSubmitted: reports,
          reportsResolved: resolved,
          actionsLogged: actions,
          resolutionRate: reports > 0 ? (resolved / reports) * 100 : 0
        };

        logger.info('Daily metrics:', metrics);

        // Store metrics (could be stored in a separate collection)
        await AdminLog.collection.insertOne({
          admin: 'system',
          action: 'metrics_aggregation',
          reason: 'Daily metrics calculation',
          details: metrics,
          severity: 'low'
        });

      } catch (error) {
        logger.error('Metrics aggregation error:', error);
      }
    });

    this.jobs.push(job);
    logger.info('Metrics aggregation job started (daily at 04:00 UTC)');
  }

  /**
   * Job 5: Auto-unlock Suspended Users (every 1 hour)
   * Release users whose suspension period has expired
   */
  startSuspensionAutoUnlock() {
    const job = cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Starting suspension auto-unlock check...');

        const unlocked = await moderationService.autoUnlockSuspendedUsers();
        if (unlocked > 0) {
          logger.info(`Auto-unlocked ${unlocked} suspended users`);
        }
      } catch (error) {
        logger.error('Suspension auto-unlock error:', error);
      }
    });

    this.jobs.push(job);
    logger.info('Suspension auto-unlock job started (every hour)');
  }

  /**
   * Job 6: Appeal Notification Check (every 30 minutes)
   * Check for pending appeals and notify moderators
   */
  startAppealNotifications() {
    const job = cron.schedule('*/30 * * * *', async () => {
      try {
        logger.info('Checking for pending appeals...');

        const pendingAppeals = await AbuseReport.countDocuments({
          status: 'appeal_pending'
        });

        if (pendingAppeals > 0) {
          logger.warn(`${pendingAppeals} pending appeals awaiting response`);
          // In production: Send notification to admin panel via WebSocket
        }
      } catch (error) {
        logger.error('Appeal notification check error:', error);
      }
    });

    this.jobs.push(job);
    logger.info('Appeal notification check job started (every 30 minutes)');
  }

  /**
   * Start all jobs
   */
  startAll() {
    try {
      logger.info('Starting moderation cleanup jobs...');
      this.startStaleReportCleanup();
      this.startOverdueQueueEscalation();
      this.startQueueOptimization();
      this.startMetricsAggregation();
      this.startSuspensionAutoUnlock();
      this.startAppealNotifications();
      logger.info('All moderation cleanup jobs started successfully');
    } catch (error) {
      logger.error('Error starting moderation jobs:', error);
    }
  }

  /**
   * Stop all jobs
   */
  stopAll() {
    try {
      logger.info('Stopping moderation cleanup jobs...');
      this.jobs.forEach(job => job.stop());
      this.jobs = [];
      logger.info('All moderation cleanup jobs stopped');
    } catch (error) {
      logger.error('Error stopping moderation jobs:', error);
    }
  }
}

module.exports = new ModerationCleanupJob();
