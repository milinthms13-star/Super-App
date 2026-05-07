const AbuseReport = require('../models/AbuseReport');
const User = require('../models/User');
const Message = require('../models/Message');
const logger = require('../config/logger');

/**
 * Abuse Reporting Service - Phase 2 Feature 5: User Abuse Reporting System
 * Handles user-submitted abuse reports, appeals, and auto-detection
 */

class AbuseReportingService {
  constructor() {
    this.reportTimeout = 24 * 60 * 60 * 1000; // 24 hours
    this.autoDetectionPatterns = {
      harassment: {
        keywords: ['harassment', 'harassment'],
        minOccurrences: 2,
        threshold: 0.7
      },
      spam: {
        keywords: ['spam', 'junk', 'unwanted'],
        minOccurrences: 3,
        threshold: 0.8
      },
      hate_speech: {
        keywords: [],
        threshold: 0.9 // ML-based detection
      }
    };
    this.stats = {
      userReports: 0,
      autoDetected: 0,
      appealsSubmitted: 0,
      appealsApproved: 0
    };
  }

  /**
   * Submit abuse report from user
   */
  async submitUserReport(reporterUserId, reportData) {
    try {
      logger.info(`User ${reporterUserId} submitting abuse report`);

      // Validate inputs
      if (!reportData.reportedUser || !reportData.reason) {
        throw new Error('Invalid report data');
      }

      // Prevent self-reports
      if (reporterUserId.toString() === reportData.reportedUser.toString()) {
        throw new Error('Cannot report yourself');
      }

      // Check for duplicate recent reports
      const recentReport = await AbuseReport.findOne({
        reportedBy: reporterUserId,
        reportedUser: reportData.reportedUser,
        createdAt: { $gte: new Date(Date.now() - this.reportTimeout) }
      });

      if (recentReport) {
        throw new Error('You have already reported this user recently');
      }

      // Create report
      const report = await AbuseReport.createReport({
        reportedBy: reporterUserId,
        reportedUser: reportData.reportedUser,
        reportedMessage: reportData.reportedMessage,
        reason: reportData.reason,
        description: reportData.description,
        // Add user-specific fields
        userContext: {
          relationship: reportData.relationship || 'stranger', // friend, contact, stranger
          previousIncidents: reportData.previousIncidents || false,
          severity: this._calculateUserReportedSeverity(reportData)
        }
      });

      this.stats.userReports++;

      logger.info(`Abuse report created by user: ${report._id}`);

      return {
        report,
        message: 'Report submitted successfully. Our moderation team will review it.',
        referenceId: report._id
      };
    } catch (error) {
      logger.error('Error submitting user report:', error);
      throw error;
    }
  }

  /**
   * Get user's own reports
   */
  async getUserReports(userId, limit = 20) {
    try {
      const reports = await AbuseReport.find({
        reportedBy: userId
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('reportedUser', 'name email')
        .populate('reportedMessage', 'content');

      return {
        reports,
        count: reports.length,
        stats: {
          pending: reports.filter(r => r.status === 'pending').length,
          investigating: reports.filter(r => r.status === 'investigating').length,
          resolved: reports.filter(r => r.status === 'resolved').length
        }
      };
    } catch (error) {
      logger.error('Error fetching user reports:', error);
      throw error;
    }
  }

  /**
   * Check report status
   */
  async getReportStatus(reportId, userId) {
    try {
      const report = await AbuseReport.findById(reportId);

      if (!report) {
        throw new Error('Report not found');
      }

      // Users can only check their own reports
      if (report.reportedBy.toString() !== userId.toString()) {
        throw new Error('Unauthorized access to report');
      }

      return {
        status: report.status,
        reason: report.reason,
        resolution: report.resolution,
        moderationNotes: report.moderationNotes,
        createdAt: report.createdAt,
        resolvedAt: report.resolvedAt,
        canAppeal: report.status === 'dismissed' || report.status === 'resolved'
      };
    } catch (error) {
      logger.error('Error fetching report status:', error);
      throw error;
    }
  }

  /**
   * Submit appeal for report decision
   */
  async submitAppeal(reportId, userId, appealReason) {
    try {
      logger.info(`User ${userId} submitting appeal for report ${reportId}`);

      const report = await AbuseReport.findById(reportId);

      if (!report) {
        throw new Error('Report not found');
      }

      // Verify ownership
      if (report.reportedBy.toString() !== userId.toString()) {
        throw new Error('Can only appeal your own reports');
      }

      // Check if appeal is allowed
      if (!report.canAppeal?.()) {
        throw new Error('This report cannot be appealed');
      }

      // Submit appeal
      await report.submitAppeal(appealReason);
      await report.save();

      this.stats.appealsSubmitted++;

      logger.info(`Appeal submitted for report ${reportId}`);

      return {
        message: 'Appeal submitted successfully',
        status: report.status,
        appealStatus: 'under_review'
      };
    } catch (error) {
      logger.error('Error submitting appeal:', error);
      throw error;
    }
  }

  /**
   * Auto-detect spam/harassment messages
   */
  async autoDetectAbuse(userId, messages) {
    try {
      logger.info(`Running auto-detection on ${messages.length} messages`);

      const detectedAbuse = [];

      for (const message of messages) {
        const abuseType = this._detectAbusePattern(message.content);

        if (abuseType) {
          detectedAbuse.push({
            messageId: message._id,
            userId: message.sender,
            content: message.content,
            detectedType: abuseType,
            confidence: 0.85,
            autoReported: false
          });
        }
      }

      if (detectedAbuse.length > 0) {
        this.stats.autoDetected += detectedAbuse.length;
        logger.warn(`Auto-detected ${detectedAbuse.length} potentially abusive messages`);
      }

      return detectedAbuse;
    } catch (error) {
      logger.error('Error in auto-detection:', error);
      return [];
    }
  }

  /**
   * Helper: Detect abuse pattern in text
   */
  _detectAbusePattern(content) {
    try {
      if (!content) return null;

      const lowerContent = content.toLowerCase();

      // Check for spam
      const spamKeywords = ['buy now', 'click here', 'limited offer', 'free money'];
      if (spamKeywords.some(kw => lowerContent.includes(kw))) {
        return 'spam';
      }

      // Check for harassment
      const harassmentKeywords = ['hate you', 'kill yourself', 'you suck'];
      if (harassmentKeywords.some(kw => lowerContent.includes(kw))) {
        return 'harassment';
      }

      // Check for repeated messages (potential spam)
      if (content.length < 10 && content.match(/(.)\1{4,}/)) {
        return 'spam';
      }

      return null;
    } catch (error) {
      logger.error('Error detecting pattern:', error);
      return null;
    }
  }

  /**
   * Helper: Calculate severity based on user-provided context
   */
  _calculateUserReportedSeverity(reportData) {
    let severity = 'low';

    if (reportData.previousIncidents) {
      severity = 'high';
    } else if (reportData.relationship === 'contact') {
      severity = 'medium';
    }

    return severity;
  }

  /**
   * Get abuse statistics for user
   */
  async getUserAbuseStats(userId) {
    try {
      const reported = await AbuseReport.countDocuments({
        reportedBy: userId
      });

      const received = await AbuseReport.countDocuments({
        reportedUser: userId
      });

      const userWarnings = await User.findById(userId).select(
        'moderation.warnings moderation.status'
      );

      return {
        reportsSubmitted: reported,
        reportsReceived: received,
        accountStatus: userWarnings?.moderation?.status || 'active',
        warnings: userWarnings?.moderation?.warnings || 0,
        accountHealth: this._calculateAccountHealth(userWarnings?.moderation)
      };
    } catch (error) {
      logger.error('Error fetching user abuse stats:', error);
      throw error;
    }
  }

  /**
   * Helper: Calculate account health score
   */
  _calculateAccountHealth(moderation) {
    if (!moderation) return 100;

    let health = 100;

    // Deduct points for warnings
    health -= moderation.warnings * 10;

    // Deduct points for suspension
    if (moderation.status === 'suspended') {
      health -= 30;
    }

    // Deduct points for bans
    if (moderation.status === 'banned') {
      health = 0;
    }

    return Math.max(0, health);
  }

  /**
   * Get trending abuse reasons
   */
  async getTrendingAbuseReasons(days = 7) {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const reasons = await AbuseReport.collection
        .aggregate([
          {
            $match: {
              createdAt: { $gte: since }
            }
          },
          {
            $group: {
              _id: '$reason',
              count: { $sum: 1 }
            }
          },
          {
            $sort: { count: -1 }
          },
          {
            $limit: 10
          }
        ])
        .toArray();

      return reasons;
    } catch (error) {
      logger.error('Error fetching trending reasons:', error);
      return [];
    }
  }

  /**
   * Get moderation insights
   */
  async getModerationInsights() {
    try {
      const totalReports = await AbuseReport.countDocuments();
      const pendingReports = await AbuseReport.countDocuments({
        status: 'pending'
      });
      const resolvedReports = await AbuseReport.countDocuments({
        status: 'resolved'
      });
      const appealsPending = await AbuseReport.countDocuments({
        status: 'appeal_pending'
      });

      const avgResolutionTime = await AbuseReport.collection
        .aggregate([
          {
            $match: { resolvedAt: { $exists: true, $ne: null } }
          },
          {
            $project: {
              resolutionTime: {
                $subtract: ['$resolvedAt', '$createdAt']
              }
            }
          },
          {
            $group: {
              _id: null,
              avgTime: { $avg: '$resolutionTime' }
            }
          }
        ])
        .toArray();

      return {
        totalReports,
        pendingReports,
        resolvedReports,
        appealsPending,
        avgResolutionTimeHours:
          avgResolutionTime[0]?.avgTime / (1000 * 60 * 60) || 0,
        resolutionRate: totalReports > 0 ? (resolvedReports / totalReports) * 100 : 0
      };
    } catch (error) {
      logger.error('Error fetching moderation insights:', error);
      throw error;
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      userReportsSubmitted: this.stats.userReports,
      autoDetectedCases: this.stats.autoDetected,
      appealsSubmitted: this.stats.appealsSubmitted,
      appealsApproved: this.stats.appealsApproved
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      userReports: 0,
      autoDetected: 0,
      appealsSubmitted: 0,
      appealsApproved: 0
    };
  }

  // ========== FEATURE 5: BULK REPORTING & AGGREGATION ==========

  /**
   * Feature 5: Bulk report abuse (batch multiple reports)
   */
  async bulkReportAbuse(bulkReportData) {
    try {
      const { reports, batchId, timestamp } = bulkReportData;

      if (!Array.isArray(reports) || reports.length === 0) {
        throw new Error('Invalid bulk report format');
      }

      if (reports.length > 100) {
        throw new Error('Bulk report limit is 100 items');
      }

      const results = {
        successful: [],
        failed: [],
        duplicates: [],
        total: reports.length
      };

      // Process each report
      for (const reportData of reports) {
        try {
          // Check for duplicates within 24 hours
          const isDuplicate = await AbuseReport.findOne({
            reportedBy: reportData.reporterUserId,
            reportedUser: reportData.reportedUserId,
            createdAt: { $gte: new Date(Date.now() - this.reportTimeout) }
          });

          if (isDuplicate) {
            results.duplicates.push({
              ...reportData,
              reason: 'Duplicate within 24h'
            });
            continue;
          }

          // Create report
          const report = await AbuseReport.createReport({
            reportedBy: reportData.reporterUserId,
            reportedUser: reportData.reportedUserId,
            reason: reportData.reason,
            description: reportData.description,
            batchId,
            batchTimestamp: timestamp
          });

          results.successful.push(report._id);
          this.stats.userReports++;
        } catch (error) {
          results.failed.push({
            data: reportData,
            error: error.message
          });
        }
      }

      logger.info(`[Feature5] Bulk report: ${results.successful.length}/${results.total} successful`);
      return results;
    } catch (error) {
      logger.error('[Feature5] Error processing bulk report:', error);
      throw error;
    }
  }

  /**
   * Feature 5: Aggregate related reports (detect patterns)
   */
  async aggregateReports(timeWindow = 24) {
    try {
      const hoursAgo = new Date(Date.now() - timeWindow * 60 * 60 * 1000);

      // Get reports within time window
      const reports = await AbuseReport.find({
        createdAt: { $gte: hoursAgo },
        status: { $in: ['pending', 'investigating'] }
      }).lean();

      // Group by reported user
      const byUser = {};
      const byReason = {};

      reports.forEach(report => {
        const userId = report.reportedUser.toString();
        if (!byUser[userId]) {
          byUser[userId] = [];
        }
        byUser[userId].push(report);

        if (!byReason[report.reason]) {
          byReason[report.reason] = [];
        }
        byReason[report.reason].push(report);
      });

      // Find patterns (3+ reports)
      const patterns = {
        serialOffenders: Object.entries(byUser)
          .filter(([userId, reportsArray]) => reportsArray.length >= 3)
          .map(([userId, reportsArray]) => ({
            userId,
            count: reportsArray.length,
            reasons: [...new Set(reportsArray.map(r => r.reason))],
            reportIds: reportsArray.map(r => r._id),
            shouldEscalate: reportsArray.length >= 5
          })),

        categoryTrends: Object.entries(byReason)
          .map(([reason, reportsArray]) => ({
            category: reason,
            count: reportsArray.length,
            trend: this._calculateTrend(reportsArray)
          }))
          .sort((a, b) => b.count - a.count),

        total: reports.length,
        timeWindow
      };

      // Auto-escalate serial offenders
      for (const offender of patterns.serialOffenders) {
        if (offender.shouldEscalate) {
          await AbuseReport.updateMany(
            { _id: { $in: offender.reportIds } },
            { escalated: true, escalationReason: 'serial_offender' }
          );
        }
      }

      logger.info(`[Feature5] Aggregation: ${patterns.serialOffenders.length} serial offenders detected`);
      return patterns;
    } catch (error) {
      logger.error('[Feature5] Error aggregating reports:', error);
      throw error;
    }
  }

  /**
   * Feature 5: Advanced analytics dashboard
   */
  async getAnalytics(days = 7) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const pipeline = [
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $facet: {
            byCategory: [
              { $group: { _id: '$reason', count: { $sum: 1 } } },
              { $sort: { count: -1 } }
            ],
            byStatus: [
              { $group: { _id: '$status', count: { $sum: 1 } } },
              { $sort: { count: -1 } }
            ],
            bySeverity: [
              {
                $group: {
                  _id: '$userContext.severity',
                  count: { $sum: 1 }
                }
              },
              { $sort: { count: -1 } }
            ],
            timeline: [
              {
                $group: {
                  _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                  },
                  count: { $sum: 1 }
                }
              },
              { $sort: { _id: 1 } }
            ],
            topReporters: [
              { $group: { _id: '$reportedBy', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 10 }
            ],
            topReported: [
              { $group: { _id: '$reportedUser', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 10 }
            ]
          }
        }
      ];

      const results = await AbuseReport.aggregate(pipeline);
      const data = results[0];

      // Calculate summary stats
      const totalReports = await AbuseReport.countDocuments({ createdAt: { $gte: startDate } });
      const resolvedReports = await AbuseReport.countDocuments({
        createdAt: { $gte: startDate },
        status: 'resolved'
      });
      const pendingReports = await AbuseReport.countDocuments({
        createdAt: { $gte: startDate },
        status: 'pending'
      });

      return {
        period: { startDate, days },
        summary: {
          total: totalReports,
          resolved: resolvedReports,
          pending: pendingReports,
          resolutionRate: totalReports > 0 ? ((resolvedReports / totalReports) * 100).toFixed(1) + '%' : '0%'
        },
        byCategory: data.byCategory,
        byStatus: data.byStatus,
        bySeverity: data.bySeverity,
        timeline: data.timeline,
        topReporters: data.topReporters,
        topReported: data.topReported
      };
    } catch (error) {
      logger.error('[Feature5] Error getting analytics:', error);
      throw error;
    }
  }

  /**
   * Feature 5: Enhanced filtering with multiple criteria
   */
  async filterReports(filters = {}, page = 1, limit = 20) {
    try {
      const {
        reason,
        status,
        severity,
        sortBy = 'createdAt'
      } = filters;

      const query = {};
      if (reason) query.reason = reason;
      if (status) query.status = status;
      if (severity) query['userContext.severity'] = severity;

      const skip = (page - 1) * limit;

      const reports = await AbuseReport
        .find(query)
        .sort({ [sortBy]: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reportedBy', 'email name')
        .populate('reportedUser', 'email name');

      const total = await AbuseReport.countDocuments(query);

      return {
        reports,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('[Feature5] Error filtering reports:', error);
      throw error;
    }
  }

  /**
   * Feature 5: Get report trends
   */
  async getReportTrends(days = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const reports = await AbuseReport.find({
        createdAt: { $gte: startDate }
      }).lean();

      // Calculate daily trend
      const dailyTrend = {};
      reports.forEach(report => {
        const date = report.createdAt.toISOString().split('T')[0];
        if (!dailyTrend[date]) {
          dailyTrend[date] = { total: 0, byReason: {} };
        }
        dailyTrend[date].total++;
        dailyTrend[date].byReason[report.reason] = (dailyTrend[date].byReason[report.reason] || 0) + 1;
      });

      return {
        period: { startDate, days },
        trend: dailyTrend,
        avgPerDay: (reports.length / days).toFixed(1)
      };
    } catch (error) {
      logger.error('[Feature5] Error getting trends:', error);
      throw error;
    }
  }

  /**
   * Helper: Calculate trend
   */
  _calculateTrend(reportsArray) {
    if (reportsArray.length < 2) return 'stable';
    const recent = reportsArray.filter(r => r.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;
    const older = reportsArray.length - recent;
    return recent > older ? 'increasing' : 'stable';
  }

  /**
   * Helper: Calculate user reported severity
   */
  _calculateUserReportedSeverity(reportData) {
    let severity = 'low';
    if (reportData.previousIncidents) severity = 'high';
    if (reportData.relationship === 'stranger' && reportData.description?.length > 200) severity = 'medium';
    return severity;
  }
}

module.exports = new AbuseReportingService();
