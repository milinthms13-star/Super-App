const cron = require('node-cron');
const abuseReportingService = require('../services/abuseReportingService');
const Message = require('../models/Message');
const User = require('../models/User');
const logger = require('../config/logger');

/**
 * Abuse Reporting Job - Phase 2 Feature 5: User Abuse Reporting System
 * Scheduled background tasks for auto-detection and abuse monitoring
 */

class AbuseReportingJob {
  constructor() {
    this.jobs = [];
  }

  /**
   * Job 1: Auto-detect spam (every 30 minutes)
   * Scan recent messages for spam patterns
   */
  startSpamDetection() {
    const job = cron.schedule('*/30 * * * *', async () => {
      try {
        logger.info('Starting spam detection scan...');

        // Get recent messages (last 30 minutes)
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

        const messages = await Message.find({
          createdAt: { $gte: thirtyMinutesAgo }
        }).limit(1000);

        logger.debug(`Scanning ${messages.length} recent messages for spam`);

        let detectedCount = 0;
        for (const message of messages) {
          const isSuspicious = this._checkSpamPatterns(message.content);
          if (isSuspicious) {
            logger.warn(`Suspicious spam detected in message ${message._id}`);
            detectedCount++;

            // Could trigger auto-reporting or notification here
          }
        }

        if (detectedCount > 0) {
          logger.info(`Spam detection: ${detectedCount} suspicious messages found`);
        }
      } catch (error) {
        logger.error('Spam detection error:', error);
      }
    });

    this.jobs.push(job);
    logger.info('Spam detection job started (every 30 minutes)');
  }

  /**
   * Job 2: Auto-detect harassment (every 1 hour)
   * Scan for harassment patterns in recent messages
   */
  startHarassmentDetection() {
    const job = cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Starting harassment detection scan...');

        // Get recent messages (last 1 hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        const messages = await Message.find({
          createdAt: { $gte: oneHourAgo }
        }).limit(500);

        logger.debug(`Scanning ${messages.length} messages for harassment patterns`);

        let detectedCount = 0;
        for (const message of messages) {
          const harassmentScore = this._calculateHarassmentScore(message.content);
          if (harassmentScore > 0.7) {
            logger.warn(`Potential harassment detected: ${message._id}`);
            detectedCount++;
          }
        }

        if (detectedCount > 0) {
          logger.info(`Harassment detection: ${detectedCount} suspicious messages found`);
        }
      } catch (error) {
        logger.error('Harassment detection error:', error);
      }
    });

    this.jobs.push(job);
    logger.info('Harassment detection job started (every hour)');
  }

  /**
   * Job 3: Monitor repeat offenders (every 6 hours)
   * Identify users with multiple reports
   */
  startRepeatOffenderMonitoring() {
    const job = cron.schedule('0 */6 * * *', async () => {
      try {
        logger.info('Monitoring repeat offenders...');

        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

        // Find users with multiple recent reports
        const offenders = await Message.collection
          .aggregate([
            {
              $match: {
                createdAt: { $gte: sixHoursAgo }
              }
            },
            {
              $group: {
                _id: '$sender',
                messageCount: { $sum: 1 },
                messages: { $push: '$_id' }
              }
            },
            {
              $match: {
                messageCount: { $gte: 100 } // More than 100 messages in 6 hours
              }
            }
          ])
          .toArray();

        if (offenders.length > 0) {
          logger.warn(`Found ${offenders.length} potential spam accounts`);

          for (const offender of offenders) {
            logger.warn(`Offender ${offender._id}: ${offender.messageCount} messages in 6 hours`);
          }
        }
      } catch (error) {
        logger.error('Repeat offender monitoring error:', error);
      }
    });

    this.jobs.push(job);
    logger.info('Repeat offender monitoring job started (every 6 hours)');
  }

  /**
   * Job 4: Appeal backlog check (every 2 hours)
   * Monitor pending appeals and notify moderators
   */
  startAppealBacklogCheck() {
    const job = cron.schedule('0 */2 * * *', async () => {
      try {
        logger.info('Checking appeal backlog...');

        const AbuseReport = require('../models/AbuseReport');

        const pendingAppeals = await AbuseReport.countDocuments({
          status: 'appeal_pending'
        });

        if (pendingAppeals > 0) {
          logger.warn(`${pendingAppeals} appeals pending moderator review`);

          // Could send notification to moderators
        }
      } catch (error) {
        logger.error('Appeal backlog check error:', error);
      }
    });

    this.jobs.push(job);
    logger.info('Appeal backlog check job started (every 2 hours)');
  }

  /**
   * Job 5: Daily abuse report summary (daily at 01:00 UTC)
   * Generate daily statistics and trends
   */
  startDailyAbuseSummary() {
    const job = cron.schedule('0 1 * * *', async () => {
      try {
        logger.info('Generating daily abuse summary...');

        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const startOfDay = new Date(yesterday);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(yesterday);
        endOfDay.setHours(23, 59, 59, 999);

        const AbuseReport = require('../models/AbuseReport');

        // Get daily statistics
        const dailyStats = await AbuseReport.collection
          .aggregate([
            {
              $match: {
                createdAt: { $gte: startOfDay, $lte: endOfDay }
              }
            },
            {
              $group: {
                _id: '$reason',
                count: { $sum: 1 }
              }
            }
          ])
          .toArray();

        const totalReports = dailyStats.reduce((sum, stat) => sum + stat.count, 0);

        logger.info('Daily abuse summary', {
          date: startOfDay.toISOString().split('T')[0],
          totalReports,
          byReason: dailyStats
        });
      } catch (error) {
        logger.error('Daily abuse summary error:', error);
      }
    });

    this.jobs.push(job);
    logger.info('Daily abuse summary job started (daily at 01:00 UTC)');
  }

  /**
   * Job 6: Update user safety scores (every 4 hours)
   * Calculate and update safety/trust scores for users
   */
  startUserSafetyScoreUpdate() {
    const job = cron.schedule('0 */4 * * *', async () => {
      try {
        logger.info('Updating user safety scores...');

        const AbuseReport = require('../models/AbuseReport');

        // Get users with recent reports
        const recentlyReported = await AbuseReport.collection
          .aggregate([
            {
              $match: {
                createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
              }
            },
            {
              $group: {
                _id: '$reportedUser',
                reportCount: { $sum: 1 }
              }
            }
          ])
          .toArray();

        let updatedCount = 0;
        for (const userStats of recentlyReported) {
          const user = await User.findById(userStats._id);
          if (user) {
            // Calculate safety score (0-100)
            const safetyScore = Math.max(0, 100 - userStats.reportCount * 5);

            user.moderation = user.moderation || {};
            user.moderation.safetyScore = safetyScore;

            await user.save();
            updatedCount++;
          }
        }

        logger.info(`Updated safety scores for ${updatedCount} users`);
      } catch (error) {
        logger.error('User safety score update error:', error);
      }
    });

    this.jobs.push(job);
    logger.info('User safety score update job started (every 4 hours)');
  }

  /**
   * Helper: Check spam patterns
   */
  _checkSpamPatterns(content) {
    if (!content) return false;

    const lower = content.toLowerCase();

    // Check for promotional content
    const promoPatterns = [
      /buy\s+(now|here)/i,
      /limited\s+offer/i,
      /click\s+here/i,
      /free\s+money/i,
      /win\s+\$\d+/i
    ];

    if (promoPatterns.some(p => p.test(content))) {
      return true;
    }

    // Check for link spam (too many URLs)
    const urlCount = (content.match(/https?:\/\//g) || []).length;
    if (urlCount > 3) {
      return true;
    }

    // Check for repeated characters (like "AAAAAAA")
    if (/(.)\1{5,}/.test(content)) {
      return true;
    }

    return false;
  }

  /**
   * Helper: Calculate harassment score
   */
  _calculateHarassmentScore(content) {
    if (!content) return 0;

    const lower = content.toLowerCase();

    // Simple scoring: count harassment indicators
    let score = 0;

    const harassmentKeywords = [
      'hate', 'kill', 'die', 'stupid', 'idiot', 'worthless', 'loser'
    ];

    for (const keyword of harassmentKeywords) {
      const count = (lower.match(new RegExp(keyword, 'g')) || []).length;
      score += count * 0.1;
    }

    // All caps = higher likelihood of aggression
    if (content === content.toUpperCase() && content.length > 10) {
      score += 0.2;
    }

    return Math.min(1, score); // Cap at 1
  }

  /**
   * Start all jobs
   */
  startAll() {
    try {
      logger.info('Starting abuse reporting jobs...');
      this.startSpamDetection();
      this.startHarassmentDetection();
      this.startRepeatOffenderMonitoring();
      this.startAppealBacklogCheck();
      this.startDailyAbuseSummary();
      this.startUserSafetyScoreUpdate();
      logger.info('All abuse reporting jobs started successfully');
    } catch (error) {
      logger.error('Error starting abuse reporting jobs:', error);
    }
  }

  /**
   * Stop all jobs
   */
  stopAll() {
    try {
      logger.info('Stopping abuse reporting jobs...');
      this.jobs.forEach(job => job.stop());
      this.jobs = [];
      logger.info('All abuse reporting jobs stopped');
    } catch (error) {
      logger.error('Error stopping abuse reporting jobs:', error);
    }
  }
}

module.exports = new AbuseReportingJob();
