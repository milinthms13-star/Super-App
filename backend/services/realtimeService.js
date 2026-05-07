const moderationService = require('./moderationService');
const moderationWebsocket = require('../websocket/moderationWebsocket');
const logger = require('../config/logger');

/**
 * Real-Time Service - Wraps moderationService with WebSocket event notifications
 * Ensures all moderation actions trigger real-time updates to connected clients
 */

class RealtimeService {
  /**
   * Submit abuse report with real-time notification
   */
  async submitReport(reportData) {
    try {
      const report = await moderationService.submitReport(reportData);

      // Notify all moderators of new report
      moderationWebsocket.notifyNewReport(report);

      logger.info(`[RealtimeService] New report ${report._id} submitted and broadcast`);
      return report;
    } catch (error) {
      logger.error('[RealtimeService] Error submitting report:', error);
      throw error;
    }
  }

  /**
   * Get pending reports
   */
  async getPendingReports(filters, page = 1, limit = 20) {
    return moderationService.getPendingReports(filters, page, limit);
  }

  /**
   * Get next moderation task
   */
  async getNextModerationTask() {
    return moderationService.getNextModerationTask();
  }

  /**
   * Review report with real-time update
   */
  async reviewReport(reportId, reviewData) {
    try {
      const result = await moderationService.reviewReport(reportId, reviewData);

      // Notify report subscribers
      moderationWebsocket.broadcastReportUpdate(reportId, {
        type: 'report_reviewed',
        severity: result.severity,
        category: result.category,
        status: result.status
      });

      logger.info(`[RealtimeService] Report ${reportId} reviewed`);
      return result;
    } catch (error) {
      logger.error('[RealtimeService] Error reviewing report:', error);
      throw error;
    }
  }

  /**
   * Warn user with real-time notification
   */
  async warnUser(reportId, userId, reason) {
    try {
      const result = await moderationService.warnUser(reportId, userId, reason);

      // Notify report subscribers
      moderationWebsocket.broadcastReportUpdate(reportId, {
        type: 'user_warned',
        userId,
        warningCount: result.warningCount,
        reason
      });

      // Broadcast to all moderators
      moderationWebsocket.broadcastModerationEvent({
        type: 'user_warned',
        reportId,
        userId,
        warningCount: result.warningCount
      });

      logger.info(`[RealtimeService] User ${userId} warned (count: ${result.warningCount})`);
      return result;
    } catch (error) {
      logger.error('[RealtimeService] Error warning user:', error);
      throw error;
    }
  }

  /**
   * Suspend user with real-time notification
   */
  async suspendUser(reportId, userId, duration, reason) {
    try {
      const result = await moderationService.suspendUser(reportId, userId, duration, reason);

      // Notify report subscribers
      moderationWebsocket.broadcastReportUpdate(reportId, {
        type: 'user_suspended',
        userId,
        suspendedUntil: result.suspendedUntil,
        reason
      });

      // Broadcast to all moderators
      moderationWebsocket.broadcastModerationEvent({
        type: 'user_suspended',
        reportId,
        userId,
        duration
      });

      logger.info(`[RealtimeService] User ${userId} suspended until ${result.suspendedUntil}`);
      return result;
    } catch (error) {
      logger.error('[RealtimeService] Error suspending user:', error);
      throw error;
    }
  }

  /**
   * Ban user with real-time notification
   */
  async banUser(reportId, userId, reason) {
    try {
      const result = await moderationService.banUser(reportId, userId, reason);

      // Notify report subscribers
      moderationWebsocket.broadcastReportUpdate(reportId, {
        type: 'user_banned',
        userId,
        reason,
        bannedAt: result.bannedAt
      });

      // Broadcast to all moderators
      moderationWebsocket.broadcastModerationEvent({
        type: 'user_banned',
        reportId,
        userId
      });

      logger.info(`[RealtimeService] User ${userId} permanently banned`);
      return result;
    } catch (error) {
      logger.error('[RealtimeService] Error banning user:', error);
      throw error;
    }
  }

  /**
   * Remove message with real-time notification
   */
  async removeMessage(reportId, messageId, reason) {
    try {
      const result = await moderationService.removeMessage(reportId, messageId, reason);

      // Notify report subscribers
      moderationWebsocket.broadcastReportUpdate(reportId, {
        type: 'message_removed',
        messageId,
        reason
      });

      // Broadcast to all moderators
      moderationWebsocket.broadcastModerationEvent({
        type: 'message_removed',
        reportId,
        messageId
      });

      logger.info(`[RealtimeService] Message ${messageId} removed`);
      return result;
    } catch (error) {
      logger.error('[RealtimeService] Error removing message:', error);
      throw error;
    }
  }

  /**
   * Resolve report with real-time notification
   */
  async resolveReport(reportId, actionType, moderatorId, notes) {
    try {
      const result = await moderationService.resolveReport(reportId, actionType, moderatorId, notes);

      // Notify report subscribers and all moderators
      moderationWebsocket.notifyReportResolved(reportId, actionType, moderatorId);

      logger.info(`[RealtimeService] Report ${reportId} resolved with action: ${actionType}`);
      return result;
    } catch (error) {
      logger.error('[RealtimeService] Error resolving report:', error);
      throw error;
    }
  }

  /**
   * Dismiss report with real-time notification
   */
  async dismissReport(reportId, moderatorId, reason) {
    try {
      const result = await moderationService.dismissReport(reportId, moderatorId, reason);

      // Notify report subscribers
      moderationWebsocket.broadcastReportUpdate(reportId, {
        type: 'report_dismissed',
        dismissedBy: moderatorId,
        reason
      });

      // Broadcast to all moderators
      moderationWebsocket.broadcastModerationEvent({
        type: 'report_dismissed',
        reportId,
        reason: 'False positive'
      });

      logger.info(`[RealtimeService] Report ${reportId} dismissed`);
      return result;
    } catch (error) {
      logger.error('[RealtimeService] Error dismissing report:', error);
      throw error;
    }
  }

  /**
   * Escalate report with real-time notification
   */
  async escalateReport(reportId, escalationReason) {
    try {
      const result = await moderationService.escalateReport(reportId, escalationReason);

      // Notify report subscribers
      moderationWebsocket.broadcastReportUpdate(reportId, {
        type: 'report_escalated',
        reason: escalationReason
      });

      // Broadcast to all moderators (high priority)
      moderationWebsocket.broadcastModerationEvent({
        type: 'report_escalated',
        reportId,
        severity: 'critical',
        reason: escalationReason
      });

      logger.info(`[RealtimeService] Report ${reportId} escalated`);
      return result;
    } catch (error) {
      logger.error('[RealtimeService] Error escalating report:', error);
      throw error;
    }
  }

  /**
   * Handle appeal with real-time notification
   */
  async handleAppeal(reportId, moderatorId, decision, response) {
    try {
      const result = await moderationService.handleAppeal(reportId, moderatorId, decision, response);

      // Notify report subscribers
      moderationWebsocket.broadcastReportUpdate(reportId, {
        type: 'appeal_processed',
        decision,
        response
      });

      // Broadcast to all moderators
      moderationWebsocket.broadcastModerationEvent({
        type: 'appeal_processed',
        reportId,
        decision
      });

      logger.info(`[RealtimeService] Appeal for report ${reportId} processed: ${decision}`);
      return result;
    } catch (error) {
      logger.error('[RealtimeService] Error handling appeal:', error);
      throw error;
    }
  }

  /**
   * Get user moderation history
   */
  async getUserModerationHistory(userId, limit = 50) {
    return moderationService.getUserModerationHistory(userId, limit);
  }

  /**
   * Get moderation statistics
   */
  async getModerationStats(days = 7) {
    return moderationService.getModerationStats(days);
  }
}

module.exports = new RealtimeService();
