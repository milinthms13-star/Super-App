const cron = require('node-cron');
const analyticsService = require('../services/analyticsService');
const logger = require('../utils/logger');

// WebSocket broadcast for real-time dashboard updates
const { broadcast } = require('../config/websocket');
const AnalyticsDashboardService = require('../services/analyticsDashboardService');

/**
 * Analytics Aggregation Background Jobs
 * Scheduled tasks for calculating and storing analytics data
 */

let jobs = {
  dailyAnalytics: null,
  hourlyTrends: null,
  userStatsAggregation: null,
  conversationMetrics: null,
};

/**
 * Start daily platform analytics calculation
 * Runs at 2:00 AM UTC every day
 */
const startDailyAggregation = () => {
  try {
    // 0 2 * * * - At 2:00 AM UTC every day
    jobs.dailyAnalytics = cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Starting daily analytics aggregation...');
        const date = new Date();
        date.setDate(date.getDate() - 1); // Calculate for previous day

        const result = await analyticsService.calculateDailyAnalytics(date);
        logger.info(`Daily analytics aggregation completed: ${result._id}`);
        // Emit real-time dashboard update after aggregation
        try {
          const dashboardService = new AnalyticsDashboardService();
          dashboardService.getDashboardOverview(null, 7).then((dashboardData) => {
            broadcast('dashboard:update', { source: 'daily', dashboardData });
          }).catch((err) => {
            logger.error('Error broadcasting dashboard update (daily):', err);
          });
        } catch (err) {
          logger.error('Error preparing dashboard update (daily):', err);
        }
      } catch (error) {
        logger.error('Error in daily analytics aggregation:', error);
      }
    });

    logger.info('Daily analytics aggregation job started');
  } catch (error) {
    logger.error('Error starting daily analytics aggregation:', error);
  }
};

/**
 * Start hourly trending topics calculation
 * Runs every hour at minute 0
 */
const startHourlyTrendAggregation = () => {
  try {
    // 0 * * * * - At the start of every hour
    jobs.hourlyTrends = cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Starting hourly trending topics calculation...');

        const result = await analyticsService.calculateTrendingTopics(1); // Last 1 hour
        logger.info(`Hourly trends calculation completed: ${result._id}`);
        // Emit real-time dashboard update after hourly trend aggregation
        try {
          const dashboardService = new AnalyticsDashboardService();
          dashboardService.getDashboardOverview(null, 1).then((dashboardData) => {
            broadcast('dashboard:update', { source: 'hourly', dashboardData });
          }).catch((err) => {
            logger.error('Error broadcasting dashboard update (hourly):', err);
          });
        } catch (err) {
          logger.error('Error preparing dashboard update (hourly):', err);
        }
      } catch (error) {
        logger.error('Error in hourly trends calculation:', error);
      }
    });

    logger.info('Hourly trends aggregation job started');
  } catch (error) {
    logger.error('Error starting hourly trends aggregation:', error);
  }
};

/**
 * Start user engagement stats aggregation
 * Runs every 6 hours (at 0, 6, 12, 18 UTC)
 */
const startUserStatsAggregation = () => {
  try {
    // 0 */6 * * * - At the start of every 6-hour block
    jobs.userStatsAggregation = cron.schedule('0 */6 * * *', async () => {
      try {
        logger.info('Starting user stats aggregation...');

        // Get all active users from database
        const User = require('../models/User');
        const users = await User.find({ isActive: true }).select('_id').limit(1000);

        let successful = 0;
        let failed = 0;

        for (const user of users) {
          try {
            await analyticsService.calculateUserStats(user._id);
            successful++;
          } catch (error) {
            logger.error(`Failed to calculate stats for user ${user._id}:`, error);
            failed++;
          }
        }

        logger.info(
          `User stats aggregation completed: ${successful} successful, ${failed} failed`
        );
        // Emit real-time dashboard update after user stats aggregation
        try {
          const dashboardService = new AnalyticsDashboardService();
          dashboardService.getDashboardOverview(null, 1).then((dashboardData) => {
            broadcast('dashboard:update', { source: 'userStats', dashboardData });
          }).catch((err) => {
            logger.error('Error broadcasting dashboard update (userStats):', err);
          });
        } catch (err) {
          logger.error('Error preparing dashboard update (userStats):', err);
        }
      } catch (error) {
        logger.error('Error in user stats aggregation:', error);
      }
    });

    logger.info('User stats aggregation job started');
  } catch (error) {
    logger.error('Error starting user stats aggregation:', error);
  }
};

/**
 * Start conversation metrics aggregation
 * Runs every 4 hours (at 0, 4, 8, 12, 16, 20 UTC)
 */
const startConversationMetricsAggregation = () => {
  try {
    // 0 */4 * * * - At the start of every 4-hour block
    jobs.conversationMetrics = cron.schedule('0 */4 * * *', async () => {
      try {
        logger.info('Starting conversation metrics aggregation...');

        // Get all active conversations from database
        const Conversation = require('../models/Conversation');
        const conversations = await Conversation.find({
          isActive: true,
          lastMessageDate: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        })
          .select('_id')
          .limit(500);

        let successful = 0;
        let failed = 0;

        for (const conversation of conversations) {
          try {
            await analyticsService.calculateConversationMetrics(conversation._id);
            successful++;
          } catch (error) {
            logger.error(`Failed to calculate metrics for conversation ${conversation._id}:`, error);
            failed++;
          }
        }

        logger.info(
          `Conversation metrics aggregation completed: ${successful} successful, ${failed} failed`
        );
        // Emit real-time dashboard update after conversation metrics aggregation
        try {
          const dashboardService = new AnalyticsDashboardService();
          dashboardService.getDashboardOverview(null, 1).then((dashboardData) => {
            broadcast('dashboard:update', { source: 'conversationMetrics', dashboardData });
          }).catch((err) => {
            logger.error('Error broadcasting dashboard update (conversationMetrics):', err);
          });
        } catch (err) {
          logger.error('Error preparing dashboard update (conversationMetrics):', err);
        }
      } catch (error) {
        logger.error('Error in conversation metrics aggregation:', error);
      }
    });

    logger.info('Conversation metrics aggregation job started');
  } catch (error) {
    logger.error('Error starting conversation metrics aggregation:', error);
  }
};

/**
 * Start all analytics aggregation jobs
 */
const startAll = () => {
  try {
    logger.info('Initializing analytics aggregation jobs...');

    startDailyAggregation();
    startHourlyTrendAggregation();
    startUserStatsAggregation();
    startConversationMetricsAggregation();

    logger.info('All analytics aggregation jobs initialized successfully');

    // Return job references for testing/monitoring
    return jobs;
  } catch (error) {
    logger.error('Error initializing analytics jobs:', error);
    throw error;
  }
};

/**
 * Stop all analytics aggregation jobs
 */
const stopAll = async () => {
  try {
    logger.info('Stopping all analytics aggregation jobs...');

    for (const [jobName, job] of Object.entries(jobs)) {
      if (job) {
        job.stop();
        logger.info(`${jobName} job stopped`);
      }
    }

    jobs = {
      dailyAnalytics: null,
      hourlyTrends: null,
      userStatsAggregation: null,
      conversationMetrics: null,
    };

    logger.info('All analytics aggregation jobs stopped');
  } catch (error) {
    logger.error('Error stopping analytics jobs:', error);
    throw error;
  }
};

/**
 * Get job status
 */
const getJobStatus = () => {
  return {
    dailyAnalytics: jobs.dailyAnalytics ? 'running' : 'stopped',
    hourlyTrends: jobs.hourlyTrends ? 'running' : 'stopped',
    userStatsAggregation: jobs.userStatsAggregation ? 'running' : 'stopped',
    conversationMetrics: jobs.conversationMetrics ? 'running' : 'stopped',
  };
};

/**
 * Manually trigger daily analytics calculation
 */
const triggerDailyAnalytics = async (date = new Date()) => {
  try {
    logger.info('Manually triggering daily analytics calculation...');
    const result = await analyticsService.calculateDailyAnalytics(date);
    logger.info('Daily analytics calculation completed manually');
    return result;
  } catch (error) {
    logger.error('Error in manual daily analytics trigger:', error);
    throw error;
  }
};

/**
 * Manually trigger user stats calculation for specific user
 */
const triggerUserStatsCalculation = async (userId) => {
  try {
    logger.info(`Manually triggering user stats calculation for user: ${userId}`);
    const result = await analyticsService.calculateUserStats(userId);
    logger.info(`User stats calculation completed for user: ${userId}`);
    return result;
  } catch (error) {
    logger.error(`Error calculating user stats for ${userId}:`, error);
    throw error;
  }
};

/**
 * Manually trigger conversation metrics calculation for specific conversation
 */
const triggerConversationMetrics = async (conversationId) => {
  try {
    logger.info(`Manually triggering metrics calculation for conversation: ${conversationId}`);
    const result = await analyticsService.calculateConversationMetrics(conversationId);
    logger.info(`Metrics calculation completed for conversation: ${conversationId}`);
    return result;
  } catch (error) {
    logger.error(`Error calculating metrics for conversation ${conversationId}:`, error);
    throw error;
  }
};

/**
 * Manually trigger trends calculation
 */
const triggerTrendsCalculation = async (hours = 24) => {
  try {
    logger.info(`Manually triggering trends calculation for last ${hours} hours...`);
    const result = await analyticsService.calculateTrendingTopics(hours);
    logger.info(`Trends calculation completed`);
    return result;
  } catch (error) {
    logger.error('Error calculating trends:', error);
    throw error;
  }
};

module.exports = {
  startAll,
  stopAll,
  getJobStatus,
  triggerDailyAnalytics,
  triggerUserStatsCalculation,
  triggerConversationMetrics,
  triggerTrendsCalculation,
  // Individual start methods (for testing)
  startDailyAggregation,
  startHourlyTrendAggregation,
  startUserStatsAggregation,
  startConversationMetricsAggregation,
};
