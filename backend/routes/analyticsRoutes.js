const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const analyticsService = require('../services/analyticsService');
const MessageAnalytics = require('../models/MessageAnalytics');
const UserMessageStats = require('../models/UserMessageStats');
const ConversationMetrics = require('../models/ConversationMetrics');
const MessageTrendData = require('../models/MessageTrendData');
const logger = require('../utils/logger');

/**
 * Message Analytics Routes
 * Endpoints for retrieving messaging analytics and statistics
 */

/**
 * GET /api/messaging/analytics/platform
 * Get platform-wide messaging statistics
 * Query params: days (default 7), period ('daily', 'weekly', 'monthly')
 */
router.get('/platform', auth, async (req, res) => {
  try {
    const { days = 7, period = 'daily' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await MessageAnalytics.find({
      date: { $gte: startDate },
      period,
    })
      .sort({ date: -1 })
      .lean();

    if (!analytics.length) {
      return res.status(404).json({
        success: false,
        message: 'No analytics data found',
      });
    }

    // Calculate aggregates
    const total = {
      totalMessages: analytics.reduce((sum, a) => sum + a.totalMessages, 0),
      totalUsers: Math.max(...analytics.map((a) => a.totalUsers)),
      activeUsers: Math.max(...analytics.map((a) => a.activeUsers)),
      averageResponseTime: Math.round(
        analytics.reduce((sum, a) => sum + a.averageResponseTime, 0) / analytics.length
      ),
    };

    res.json({
      success: true,
      data: {
        period,
        days,
        records: analytics,
        totals: total,
      },
    });
  } catch (error) {
    logger.error('Error fetching platform analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/messaging/analytics/user/:userId
 * Get user-specific messaging statistics
 */
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Users can only view their own stats or admins can view any
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const userStats = await UserMessageStats.findOne({ userId })
      .populate('frequentContacts.contactId', 'username avatar')
      .lean();

    if (!userStats) {
      return res.status(404).json({
        success: false,
        message: 'User stats not found',
      });
    }

    res.json({
      success: true,
      data: userStats,
    });
  } catch (error) {
    logger.error('Error fetching user analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/messaging/analytics/user/:userId/timeline
 * Get user activity timeline (messages per day)
 */
router.get('/user/:userId/timeline', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    // Check authorization
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const Message = require('../models/Message');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const messages = await Message.find({
      sender: userId,
      createdAt: { $gte: startDate },
    });

    // Group by date
    const timeline = {};
    messages.forEach((msg) => {
      const date = new Date(msg.createdAt).toISOString().split('T')[0];
      timeline[date] = (timeline[date] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        days,
        timeline,
        totalMessages: messages.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching user timeline:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/messaging/analytics/conversation/:conversationId
 * Get conversation metrics
 */
router.get('/conversation/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const metrics = await ConversationMetrics.findOne({ conversationId })
      .populate('participants', 'username avatar')
      .lean();

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: 'Conversation metrics not found',
      });
    }

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Error fetching conversation metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/messaging/analytics/trending
 * Get trending topics and keywords
 */
router.get('/trending', async (req, res) => {
  try {
    const { hours = 24, limit = 10 } = req.query;

    const trends = await MessageTrendData.findOne({
      period: hours <= 1 ? 'hourly' : 'daily',
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!trends) {
      return res.status(404).json({
        success: false,
        message: 'No trend data available',
      });
    }

    res.json({
      success: true,
      data: {
        keywords: trends.topKeywords.slice(0, limit),
        hashtags: trends.trendingHashtags.slice(0, limit),
        topics: trends.trendingTopics.slice(0, limit),
        updatedAt: trends.createdAt,
      },
    });
  } catch (error) {
    logger.error('Error fetching trending data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/messaging/analytics/engagement-leaderboard
 * Get top users by engagement
 */
router.get('/engagement-leaderboard', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const topUsers = await UserMessageStats.find({
      isActive: true,
    })
      .sort({ engagementScore: -1 })
      .limit(parseInt(limit))
      .select('userId engagementScore totalMessagesSent averageResponseTime')
      .populate('userId', 'username avatar')
      .lean();

    res.json({
      success: true,
      data: topUsers.map((u, idx) => ({
        rank: idx + 1,
        user: u.userId,
        engagementScore: u.engagementScore,
        totalMessages: u.totalMessagesSent,
        avgResponseTime: u.averageResponseTime,
      })),
    });
  } catch (error) {
    logger.error('Error fetching engagement leaderboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/messaging/analytics/activity-heatmap
 * Get hourly/daily activity patterns
 */
router.get('/activity-heatmap', async (req, res) => {
  try {
    const { period = 'hourly' } = req.query; // 'hourly' or 'daily'

    const analytics = await MessageAnalytics.find({
      period,
    })
      .sort({ date: -1 })
      .limit(7)
      .lean();

    // Create heatmap data
    const heatmap = {};
    analytics.forEach((record) => {
      const key = period === 'hourly' ? record.peakHour : new Date(record.date).toISOString().split('T')[0];
      heatmap[key] = record.peakMessageCount;
    });

    res.json({
      success: true,
      data: {
        period,
        heatmap,
      },
    });
  } catch (error) {
    logger.error('Error fetching activity heatmap:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/messaging/analytics/device-breakdown
 * Get device usage breakdown
 */
router.get('/device-breakdown', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await MessageAnalytics.find({
      date: { $gte: startDate },
    }).lean();

    // Aggregate device stats
    let totalMobile = 0,
      totalWeb = 0,
      totalTablet = 0;
    analytics.forEach((a) => {
      totalMobile += a.deviceMetrics.mobile;
      totalWeb += a.deviceMetrics.web;
      totalTablet += a.deviceMetrics.tablet;
    });

    const total = totalMobile + totalWeb + totalTablet;

    res.json({
      success: true,
      data: {
        days,
        mobile: { count: totalMobile, percentage: ((totalMobile / total) * 100).toFixed(2) },
        web: { count: totalWeb, percentage: ((totalWeb / total) * 100).toFixed(2) },
        tablet: { count: totalTablet, percentage: ((totalTablet / total) * 100).toFixed(2) },
      },
    });
  } catch (error) {
    logger.error('Error fetching device breakdown:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/messaging/analytics/message-types
 * Get breakdown of message types
 */
router.get('/message-types', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await MessageAnalytics.find({
      date: { $gte: startDate },
    }).lean();

    // Aggregate message types
    let types = {
      text: 0,
      media: 0,
      sticker: 0,
      reaction: 0,
      edit: 0,
      delete: 0,
    };

    analytics.forEach((a) => {
      Object.keys(types).forEach((type) => {
        types[type] += a.messageTypes[type] || 0;
      });
    });

    const total = Object.values(types).reduce((a, b) => a + b, 0);

    res.json({
      success: true,
      data: {
        days,
        types: Object.entries(types).map(([type, count]) => ({
          type,
          count,
          percentage: ((count / total) * 100).toFixed(2),
        })),
      },
    });
  } catch (error) {
    logger.error('Error fetching message types:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/messaging/analytics/calculate-user-stats
 * Manually trigger user stats calculation (admin only)
 */
router.post('/calculate-user-stats/:userId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin only',
      });
    }

    const { userId } = req.params;
    const stats = await analyticsService.calculateUserStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error calculating user stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/messaging/analytics/calculate-conversation-metrics
 * Manually trigger conversation metrics calculation (admin only)
 */
router.post('/calculate-conversation-metrics/:conversationId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin only',
      });
    }

    const { conversationId } = req.params;
    const metrics = await analyticsService.calculateConversationMetrics(conversationId);

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Error calculating conversation metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/messaging/analytics/calculate-trending
 * Manually trigger trend calculation (admin only)
 */
router.post('/calculate-trending', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin only',
      });
    }

    const { hours = 24 } = req.body;
    const trends = await analyticsService.calculateTrendingTopics(hours);

    res.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    logger.error('Error calculating trends:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/messaging/analytics/health-check
 * Get overall system health metrics
 */
router.get('/health-check', async (req, res) => {
  try {
    const latestAnalytics = await MessageAnalytics.findOne()
      .sort({ createdAt: -1 })
      .lean();

    if (!latestAnalytics) {
      return res.json({
        success: true,
        data: {
          status: 'healthy',
          message: 'No analytics data yet',
        },
      });
    }

    const failureRate = (latestAnalytics.failedMessages / latestAnalytics.totalMessages) * 100;
    const status = failureRate < 1 ? 'healthy' : failureRate < 5 ? 'degraded' : 'critical';

    res.json({
      success: true,
      data: {
        status,
        totalMessages: latestAnalytics.totalMessages,
        failureRate: failureRate.toFixed(2),
        readRate: latestAnalytics.messageReadRate.toFixed(2),
        avgResponseTime: latestAnalytics.averageResponseTime,
        activeUsers: latestAnalytics.activeUsers,
      },
    });
  } catch (error) {
    logger.error('Error fetching health check:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============== PHASE 3: ADVANCED ANALYTICS ==============

/**
 * GET /api/messaging/analytics/v3/user-insights
 * Get advanced user insights
 * @access Private
 */
router.get('/v3/user-insights', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const timeRange = req.query.timeRange || '30'; // days
    const timeRangeMs = parseInt(timeRange) * 24 * 60 * 60 * 1000;

    const analytics = await messageAnalyticsService.getUserAnalytics(
      userId,
      timeRangeMs
    );

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Error fetching user insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user insights',
    });
  }
});

/**
 * GET /api/messaging/analytics/v3/real-time-dashboard
 * Get real-time messaging dashboard
 * @access Private/Admin
 */
router.get('/v3/real-time-dashboard', auth, async (req, res) => {
  try {
    // Check admin role
    if (!req.user.isAdmin && !req.user.isModerator) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Admin access required',
      });
    }

    const dashboard = await messageAnalyticsService.getRealTimeDashboard();

    res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    logger.error('Error fetching real-time dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard',
    });
  }
});

/**
 * GET /api/messaging/analytics/v3/platform-insights
 * Get platform-wide advanced analytics
 * @access Private/Admin
 */
router.get('/v3/platform-insights', auth, async (req, res) => {
  try {
    // Check admin role
    if (!req.user.isAdmin && !req.user.isModerator) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Admin access required',
      });
    }

    const period = req.query.period || 'daily';
    const analytics = await messageAnalyticsService.getPlatformAnalytics(period);

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Error fetching platform insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch platform insights',
    });
  }
});

/**
 * GET /api/messaging/analytics/v3/export
 * Export user analytics as CSV
 * @access Private
 */
router.get('/v3/export', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const timeRange = req.query.timeRange || '30'; // days
    const timeRangeMs = parseInt(timeRange) * 24 * 60 * 60 * 1000;

    const csv = await messageAnalyticsService.exportAnalyticsToCsv(
      userId,
      timeRangeMs
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="messaging-analytics.csv"'
    );
    res.send(csv);
  } catch (error) {
    logger.error('Error exporting analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export analytics',
    });
  }
});

module.exports = router;
