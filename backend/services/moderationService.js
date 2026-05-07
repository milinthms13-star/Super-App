const AbuseReport = require('../models/AbuseReport');
const ModerationQueue = require('../models/ModerationQueue');
const AdminLog = require('../models/AdminLog');
const User = require('../models/User');
const Message = require('../models/Message');
const logger = require('../config/logger');

/**
 * Moderation Service - Phase 2 Feature 3
 * Handles abuse reporting, moderation workflow, and admin actions
 */

class ModerationService {
  constructor() {
    this.reportTimeout = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Submit abuse report
   */
  async submitReport(reportData) {
    try {
      logger.info(`Submitting abuse report from user ${reportData.reportedBy}`);

      // Prevent self-reports
      if (reportData.reportedBy.toString() === reportData.reportedUser.toString()) {
        throw new Error('Cannot report yourself');
      }

      // Check for duplicate reports (same user, same reason, within 24h)
      const existingReport = await AbuseReport.findOne({
        reportedBy: reportData.reportedBy,
        reportedUser: reportData.reportedUser,
        reason: reportData.reason,
        createdAt: { $gte: new Date(Date.now() - this.reportTimeout) }
      });

      if (existingReport) {
        throw new Error('You have already reported this user for this reason');
      }

      // Create report
      const report = await AbuseReport.createReport(reportData);

      // Add to moderation queue
      await ModerationQueue.enqueue(report._id, report.priority);

      logger.info(`Abuse report created: ${report._id} with priority ${report.priority}`);

      return report;
    } catch (error) {
      logger.error('Error submitting report:', error);
      throw error;
    }
  }

  /**
   * Get pending reports for moderation dashboard
   */
  async getPendingReports(moderatorId, limit = 20) {
    try {
      logger.debug(`Fetching pending reports for moderator ${moderatorId}`);

      const reports = await AbuseReport.getPendingReports(limit);
      const queueStats = await ModerationQueue.getQueueStats();

      return {
        reports,
        stats: queueStats
      };
    } catch (error) {
      logger.error('Error fetching pending reports:', error);
      throw error;
    }
  }

  /**
   * Get next task for moderator
   */
  async getNextModerationTask(moderatorId) {
    try {
      logger.debug(`Getting next task for moderator ${moderatorId}`);

      const queueItem = await ModerationQueue.getNextTask(moderatorId);

      if (!queueItem) {
        logger.info(`No pending tasks for moderator ${moderatorId}`);
        return null;
      }

      const report = await AbuseReport.findById(queueItem.abuseReport)
        .populate('reportedBy', 'name email')
        .populate('reportedUser', 'name email')
        .populate('reportedMessage');

      return {
        queueId: queueItem._id,
        report,
        timeRemaining: queueItem.getTimeUntilDue(),
        isOverdue: queueItem.isOverdue()
      };
    } catch (error) {
      logger.error('Error getting next task:', error);
      throw error;
    }
  }

  /**
   * Review report (preliminary assessment)
   */
  async reviewReport(queueId, moderatorId, assessment) {
    try {
      logger.info(`Reviewing report in queue ${queueId}`);

      const queueItem = await ModerationQueue.findByIdAndUpdate(
        queueId,
        {
          status: 'in_progress',
          preliminaryAssessment: assessment.notes,
          severity: assessment.severity,
          contentType: assessment.contentType,
          requiresEscalation: assessment.requiresEscalation
        },
        { new: true }
      );

      return queueItem;
    } catch (error) {
      logger.error('Error reviewing report:', error);
      throw error;
    }
  }

  /**
   * Warn user (formal warning)
   */
  async warnUser(userId, reason, moderatorId, details) {
    try {
      logger.info(`Warning user ${userId}: ${reason}`);

      const user = await User.findByIdAndUpdate(
        userId,
        {
          $inc: { 'moderation.warnings': 1 },
          $set: { 'moderation.lastWarning': new Date() }
        },
        { new: true }
      );

      // Log action
      await AdminLog.logAction({
        admin: moderatorId,
        action: 'warn_user',
        targetUser: userId,
        reason,
        details: {
          warnings: user.moderation.warnings,
          ...details
        },
        severity: details.severity || 'medium'
      });

      // Check if suspension threshold reached
      if (user.moderation.warnings >= 3) {
        return await this.suspendUser(userId, 7, `Automatic suspension after ${user.moderation.warnings} warnings`, moderatorId);
      }

      return user;
    } catch (error) {
      logger.error('Error warning user:', error);
      throw error;
    }
  }

  /**
   * Suspend user
   */
  async suspendUser(userId, days, reason, moderatorId) {
    try {
      logger.info(`Suspending user ${userId} for ${days} days`);

      const suspendUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      const user = await User.findByIdAndUpdate(
        userId,
        {
          'moderation.status': 'suspended',
          'moderation.suspendedUntil': suspendUntil,
          'moderation.suspensionReason': reason
        },
        { new: true }
      );

      // Log action
      await AdminLog.logAction({
        admin: moderatorId,
        action: 'suspend_user',
        targetUser: userId,
        reason,
        details: {
          suspensionDays: days,
          suspendedUntil,
          previousStatus: 'active'
        },
        severity: 'high'
      });

      logger.info(`User ${userId} suspended until ${suspendUntil}`);
      return user;
    } catch (error) {
      logger.error('Error suspending user:', error);
      throw error;
    }
  }

  /**
   * Ban user
   */
  async banUser(userId, reason, moderatorId) {
    try {
      logger.warn(`Banning user ${userId}: ${reason}`);

      const user = await User.findByIdAndUpdate(
        userId,
        {
          'moderation.status': 'banned',
          'moderation.bannedAt': new Date(),
          'moderation.banReason': reason
        },
        { new: true }
      );

      // Log action
      await AdminLog.logAction({
        admin: moderatorId,
        action: 'ban_user',
        targetUser: userId,
        reason,
        severity: 'critical'
      });

      logger.info(`User ${userId} banned`);
      return user;
    } catch (error) {
      logger.error('Error banning user:', error);
      throw error;
    }
  }

  /**
   * Remove message
   */
  async removeMessage(messageId, reason, moderatorId, reportId) {
    try {
      logger.info(`Removing message ${messageId}`);

      const message = await Message.findByIdAndUpdate(
        messageId,
        {
          removed: true,
          removalReason: reason,
          removedBy: moderatorId,
          removedAt: new Date()
        },
        { new: true }
      );

      // Log action
      await AdminLog.logAction({
        admin: moderatorId,
        action: 'remove_message',
        targetContent: messageId,
        abuseReport: reportId,
        reason,
        details: {
          messageContent: message.content?.substring(0, 100),
          removalReason: reason
        },
        severity: 'high'
      });

      return message;
    } catch (error) {
      logger.error('Error removing message:', error);
      throw error;
    }
  }

  /**
   * Resolve report with action
   */
  async resolveReport(reportId, resolution, resolutionDetails, moderatorId) {
    try {
      logger.info(`Resolving report ${reportId} with action: ${resolution}`);

      // Update report
      const report = await AbuseReport.resolveReport(
        reportId,
        resolution,
        resolutionDetails,
        moderatorId
      );

      // Update queue
      const queueItem = await ModerationQueue.completeTask(
        report._id,
        resolution,
        resolutionDetails.qualityScore || 75
      );

      // Take appropriate action based on resolution
      if (resolution === 'user_warned') {
        await this.warnUser(
          report.reportedUser,
          `Warned for ${report.reason}`,
          moderatorId,
          { severity: 'medium' }
        );
      } else if (resolution === 'message_removed') {
        await this.removeMessage(
          report.reportedMessage,
          `Violates ${report.reason}`,
          moderatorId,
          reportId
        );
      } else if (resolution === 'user_suspended') {
        await this.suspendUser(
          report.reportedUser,
          resolutionDetails.suspensionDays || 7,
          `Suspended for ${report.reason}`,
          moderatorId
        );
      } else if (resolution === 'user_banned') {
        await this.banUser(
          report.reportedUser,
          `Banned for ${report.reason}`,
          moderatorId
        );
      }

      // Log resolution
      await AdminLog.logAction({
        admin: moderatorId,
        action: 'resolve_report',
        targetUser: report.reportedUser,
        abuseReport: reportId,
        reason: `Resolved with action: ${resolution}`,
        details: resolutionDetails,
        severity: 'high'
      });

      logger.info(`Report ${reportId} resolved`);
      return report;
    } catch (error) {
      logger.error('Error resolving report:', error);
      throw error;
    }
  }

  /**
   * Dismiss report (false positive)
   */
  async dismissReport(reportId, reason, moderatorId) {
    try {
      logger.info(`Dismissing report ${reportId}`);

      const report = await AbuseReport.findByIdAndUpdate(
        reportId,
        {
          status: 'dismissed',
          resolution: 'dismissed_false_report',
          moderator: moderatorId,
          resolvedAt: new Date(),
          moderationNotes: reason
        },
        { new: true }
      );

      // Update queue
      await ModerationQueue.findByIdAndUpdate(
        report._id,
        { status: 'completed' }
      );

      // Log action
      await AdminLog.logAction({
        admin: moderatorId,
        action: 'dismiss_report',
        abuseReport: reportId,
        reason: `Dismissed as false report: ${reason}`,
        severity: 'low'
      });

      return report;
    } catch (error) {
      logger.error('Error dismissing report:', error);
      throw error;
    }
  }

  /**
   * Escalate report
   */
  async escalateReport(reportId, escalatedTo, reason, moderatorId) {
    try {
      logger.warn(`Escalating report ${reportId}`);

      const report = await AbuseReport.findByIdAndUpdate(
        reportId,
        {
          status: 'investigating'
        },
        { new: true }
      );

      const queueItem = await ModerationQueue.escalateTask(
        report._id,
        escalatedTo,
        reason
      );

      // Log action
      await AdminLog.logAction({
        admin: moderatorId,
        action: 'escalate_report',
        targetUser: report.reportedUser,
        abuseReport: reportId,
        reason: `Escalated: ${reason}`,
        severity: 'high'
      });

      return queueItem;
    } catch (error) {
      logger.error('Error escalating report:', error);
      throw error;
    }
  }

  /**
   * Get user moderation history
   */
  async getUserModerationHistory(userId) {
    try {
      const user = await User.findById(userId).select('moderation');
      const reports = await AbuseReport.getReportsByUser(userId);
      const logs = await AdminLog.getUserLogs(userId);

      return {
        user: user?.moderation || {},
        reports,
        logs
      };
    } catch (error) {
      logger.error('Error fetching moderation history:', error);
      throw error;
    }
  }

  /**
   * Get moderation statistics
   */
  async getModerationStats(days = 7) {
    try {
      const abuseStats = await AbuseReport.getAbuseStats(days);
      const queueStats = await ModerationQueue.getQueueStats();
      const moderationStats = await AdminLog.getModerationStats(days);

      return {
        abuseReports: abuseStats,
        queue: queueStats,
        moderationActions: moderationStats,
        period: `${days} days`
      };
    } catch (error) {
      logger.error('Error fetching moderation stats:', error);
      throw error;
    }
  }

  /**
   * Get moderator performance
   */
  async getModeratorPerformance(moderatorId, days = 7) {
    try {
      const stats = await ModerationQueue.getModeratorStats(moderatorId, days);
      const logs = await AdminLog.getAdminLogs(moderatorId, 100);

      return {
        stats,
        recentActions: logs,
        performanceRating: this._calculatePerformanceRating(stats)
      };
    } catch (error) {
      logger.error('Error fetching moderator performance:', error);
      throw error;
    }
  }

  /**
   * Helper: Calculate performance rating
   */
  _calculatePerformanceRating(stats) {
    if (stats.totalCompleted === 0) return 'N/A';

    const appealRate = (stats.appeals / stats.totalCompleted) * 100;
    const escalationRate = (stats.escalations / stats.totalCompleted) * 100;
    const qualityScore = stats.avgQualityScore || 0;

    // Lower appeal/escalation rates are better
    if (appealRate < 5 && escalationRate < 10 && qualityScore > 80) {
      return 'Excellent';
    } else if (appealRate < 10 && escalationRate < 20 && qualityScore > 70) {
      return 'Good';
    } else if (appealRate < 15 && escalationRate < 30 && qualityScore > 60) {
      return 'Fair';
    } else {
      return 'Needs Improvement';
    }
  }

  /**
   * Handle appeal
   */
  async handleAppeal(reportId, approved, response, moderatorId) {
    try {
      logger.info(`Handling appeal for report ${reportId}`);

      const report = await AbuseReport.findById(reportId);
      await report.respondToAppeal(approved, response);

      // Log action
      await AdminLog.logAction({
        admin: moderatorId,
        action: 'resolve_report',
        abuseReport: reportId,
        reason: `Appeal ${approved ? 'approved' : 'rejected'}: ${response}`,
        severity: approved ? 'high' : 'medium'
      });

      return report;
    } catch (error) {
      logger.error('Error handling appeal:', error);
      throw error;
    }
  }

  /**
   * Auto-unlock suspended user if suspension period expired
   */
  async autoUnlockSuspendedUsers() {
    try {
      const now = new Date();

      const result = await User.updateMany(
        {
          'moderation.status': 'suspended',
          'moderation.suspendedUntil': { $lt: now }
        },
        {
          'moderation.status': 'active',
          'moderation.suspendedUntil': null
        }
      );

      logger.info(`Auto-unlocked ${result.modifiedCount} suspended users`);
      return result.modifiedCount;
    } catch (error) {
      logger.error('Error auto-unlocking users:', error);
    }
  }
}

module.exports = new ModerationService();
