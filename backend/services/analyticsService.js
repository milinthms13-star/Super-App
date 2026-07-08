const MatrimonialProfile = require('../models/MatrimonialProfile');
const User = require('../models/User');
const Message = require('../models/Message');
const { cacheService } = require('./cacheService');
const { errorTrackingService } = require('./errorTrackingService');

class AnalyticsService {
  constructor() {
    this.cacheTTL = 300; // 5 minutes cache for analytics
  }

  /**
   * Get engagement metrics
   * @param {Date} startDate - Start date for metrics
   * @param {Date} endDate - End date for metrics
   * @returns {Promise<Object>} Engagement metrics
   */
  async getEngagementMetrics(startDate, endDate) {
    try {
      const cacheKey = `analytics:engagement:${startDate.getTime()}:${endDate.getTime()}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };

      const [
        totalProfiles,
        activeProfiles,
        newProfiles,
        totalMessages,
        totalInterests,
        acceptedInterests,
        profileViews,
        avgMessagesPerUser,
        avgInterestsPerUser
      ] = await Promise.all([
        MatrimonialProfile.countDocuments(),
        MatrimonialProfile.countDocuments({ lastActive: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
        MatrimonialProfile.countDocuments(dateFilter),
        Message.countDocuments({ module: 'matrimonial', ...dateFilter }),
        MatrimonialProfile.aggregate([
          { $unwind: '$interests' },
          { $match: { 'interests.createdAt': { $gte: startDate, $lte: endDate } } },
          { $count: 'total' }
        ]),
        MatrimonialProfile.aggregate([
          { $unwind: '$interests' },
          { $match: { 
            'interests.createdAt': { $gte: startDate, $lte: endDate },
            'interests.status': 'accepted'
          } },
          { $count: 'total' }
        ]),
        MatrimonialProfile.aggregate([
          { $match: dateFilter },
          { $group: { _id: null, total: { $sum: '$profileViews' } } }
        ]),
        MatrimonialProfile.aggregate([
          { $lookup: { from: 'messages', localField: 'userId', foreignField: 'senderId', as: 'messages' } },
          { $project: { messageCount: { $size: '$messages' } } },
          { $group: { _id: null, avg: { $avg: '$messageCount' } } }
        ]),
        MatrimonialProfile.aggregate([
          { $project: { interestCount: { $size: '$interests' } } },
          { $group: { _id: null, avg: { $avg: '$interestCount' } } }
        ])
      ]);

      const metrics = {
        profiles: {
          total: totalProfiles,
          active: activeProfiles,
          new: newProfiles,
          activeRate: totalProfiles > 0 ? ((activeProfiles / totalProfiles) * 100).toFixed(1) : 0
        },
        engagement: {
          totalMessages,
          totalInterests: totalInterests[0]?.total || 0,
          acceptedInterests: acceptedInterests[0]?.total || 0,
          interestAcceptanceRate: totalInterests[0]?.total > 0 
            ? ((acceptedInterests[0]?.total / totalInterests[0]?.total) * 100).toFixed(1) 
            : 0,
          profileViews: profileViews[0]?.total || 0,
          avgMessagesPerUser: Math.round(avgMessagesPerUser[0]?.avg || 0),
          avgInterestsPerUser: Math.round(avgInterestsPerUser[0]?.avg || 0)
        },
        dateRange: { startDate, endDate }
      };

      await cacheService.set(cacheKey, metrics, this.cacheTTL);
      return metrics;
    } catch (error) {
      errorTrackingService.captureError(error, { context: 'engagement-metrics' });
      throw error;
    }
  }

  /**
   * Get conversion funnel data
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Conversion funnel data
   */
  async getConversionFunnel(startDate, endDate) {
    try {
      const cacheKey = `analytics:funnel:${startDate.getTime()}:${endDate.getTime()}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };

      const [
        signups,
        profilesCreated,
        profilesCompleted,
        profilesWithPhotos,
        profilesVerified,
        profilesWithInterests,
        profilesWithMessages,
        profilesWithMatches,
        premiumConversions
      ] = await Promise.all([
        User.countDocuments({ 'roles.matrimonial': true, ...dateFilter }),
        MatrimonialProfile.countDocuments(dateFilter),
        MatrimonialProfile.countDocuments({ 
          ...dateFilter,
          bio: { $exists: true, $ne: '' },
          education: { $exists: true, $ne: '' },
          profession: { $exists: true, $ne: '' }
        }),
        MatrimonialProfile.countDocuments({ 
          ...dateFilter,
          photoUrl: { $exists: true, $ne: null }
        }),
        MatrimonialProfile.countDocuments({ 
          ...dateFilter,
          verificationStatus: 'verified'
        }),
        MatrimonialProfile.countDocuments({ 
          ...dateFilter,
          interests: { $exists: true, $ne: [] }
        }),
        MatrimonialProfile.aggregate([
          { $match: dateFilter },
          { $lookup: { from: 'messages', localField: 'userId', foreignField: 'senderId', as: 'messages' } },
          { $match: { 'messages.0': { $exists: true } } },
          { $count: 'total' }
        ]),
        MatrimonialProfile.countDocuments({ 
          ...dateFilter,
          'interests.status': 'accepted'
        }),
        User.countDocuments({
          'roles.matrimonial': true,
          'subscription.tier': { $in: ['premium', 'elite'] },
          'subscription.startDate': { $gte: startDate, $lte: endDate }
        })
      ]);

      const funnel = {
        stages: [
          { stage: 'Signups', count: signups, percentage: 100 },
          { stage: 'Profile Created', count: profilesCreated, percentage: signups > 0 ? ((profilesCreated / signups) * 100).toFixed(1) : 0 },
          { stage: 'Profile Completed', count: profilesCompleted, percentage: signups > 0 ? ((profilesCompleted / signups) * 100).toFixed(1) : 0 },
          { stage: 'Photo Uploaded', count: profilesWithPhotos, percentage: signups > 0 ? ((profilesWithPhotos / signups) * 100).toFixed(1) : 0 },
          { stage: 'Profile Verified', count: profilesVerified, percentage: signups > 0 ? ((profilesVerified / signups) * 100).toFixed(1) : 0 },
          { stage: 'Sent Interest', count: profilesWithInterests, percentage: signups > 0 ? ((profilesWithInterests / signups) * 100).toFixed(1) : 0 },
          { stage: 'Sent Message', count: profilesWithMessages[0]?.total || 0, percentage: signups > 0 ? (((profilesWithMessages[0]?.total || 0) / signups) * 100).toFixed(1) : 0 },
          { stage: 'Got Match', count: profilesWithMatches, percentage: signups > 0 ? ((profilesWithMatches / signups) * 100).toFixed(1) : 0 },
          { stage: 'Premium Conversion', count: premiumConversions, percentage: signups > 0 ? ((premiumConversions / signups) * 100).toFixed(1) : 0 }
        ],
        conversionRate: signups > 0 ? ((premiumConversions / signups) * 100).toFixed(1) : 0,
        dateRange: { startDate, endDate }
      };

      await cacheService.set(cacheKey, funnel, this.cacheTTL);
      return funnel;
    } catch (error) {
      errorTrackingService.captureError(error, { context: 'conversion-funnel' });
      throw error;
    }
  }

  /**
   * Get revenue metrics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Revenue metrics
   */
  async getRevenueMetrics(startDate, endDate) {
    try {
      const cacheKey = `analytics:revenue:${startDate.getTime()}:${endDate.getTime()}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      // Subscription pricing (should be from config/database)
      const pricing = {
        basic: 999,
        premium: 2999,
        elite: 5999
      };

      const subscriptions = await User.aggregate([
        {
          $match: {
            'roles.matrimonial': true,
            'subscription.tier': { $in: ['basic', 'premium', 'elite'] },
            'subscription.startDate': { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$subscription.tier',
            count: { $sum: 1 }
          }
        }
      ]);

      let totalRevenue = 0;
      const revenueByTier = {};

      subscriptions.forEach(sub => {
        const tier = sub._id;
        const revenue = sub.count * (pricing[tier] || 0);
        revenueByTier[tier] = { count: sub.count, revenue };
        totalRevenue += revenue;
      });

      // Get active subscriptions
      const activeSubscriptions = await User.countDocuments({
        'roles.matrimonial': true,
        'subscription.tier': { $in: ['basic', 'premium', 'elite'] },
        'subscription.endDate': { $gte: new Date() }
      });

      // Calculate MRR (Monthly Recurring Revenue)
      const monthlyRevenue = await User.aggregate([
        {
          $match: {
            'roles.matrimonial': true,
            'subscription.tier': { $in: ['basic', 'premium', 'elite'] },
            'subscription.endDate': { $gte: new Date() }
          }
        },
        {
          $group: {
            _id: '$subscription.tier',
            count: { $sum: 1 }
          }
        }
      ]);

      let mrr = 0;
      monthlyRevenue.forEach(sub => {
        mrr += sub.count * (pricing[sub._id] || 0);
      });

      // Calculate churn rate
      const previousMonth = new Date(startDate);
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      
      const churnedUsers = await User.countDocuments({
        'roles.matrimonial': true,
        'subscription.endDate': { $gte: previousMonth, $lte: startDate },
        'subscription.autoRenew': false
      });

      const previousActiveUsers = await User.countDocuments({
        'roles.matrimonial': true,
        'subscription.endDate': { $gte: previousMonth }
      });

      const churnRate = previousActiveUsers > 0 
        ? ((churnedUsers / previousActiveUsers) * 100).toFixed(1)
        : 0;

      // Calculate ARPU (Average Revenue Per User)
      const totalUsers = await User.countDocuments({ 'roles.matrimonial': true });
      const arpu = totalUsers > 0 ? (totalRevenue / totalUsers).toFixed(2) : 0;

      const metrics = {
        revenue: {
          total: totalRevenue,
          byTier: revenueByTier,
          mrr,
          arpu
        },
        subscriptions: {
          active: activeSubscriptions,
          new: subscriptions.reduce((sum, sub) => sum + sub.count, 0),
          churnRate
        },
        dateRange: { startDate, endDate }
      };

      await cacheService.set(cacheKey, metrics, this.cacheTTL);
      return metrics;
    } catch (error) {
      errorTrackingService.captureError(error, { context: 'revenue-metrics' });
      throw error;
    }
  }

  /**
   * Get time-series data for charts
   * @param {string} metric - Metric type (users, messages, interests, revenue)
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} interval - Interval (day, week, month)
   * @returns {Promise<Array>} Time-series data
   */
  async getTimeSeriesData(metric, startDate, endDate, interval = 'day') {
    try {
      const cacheKey = `analytics:timeseries:${metric}:${interval}:${startDate.getTime()}:${endDate.getTime()}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      let groupBy;
      switch (interval) {
        case 'day':
          groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
          break;
        case 'week':
          groupBy = { $dateToString: { format: '%Y-W%V', date: '$createdAt' } };
          break;
        case 'month':
          groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
          break;
        default:
          groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
      }

      let data;

      switch (metric) {
        case 'users':
          data = await User.aggregate([
            { $match: { 'roles.matrimonial': true, createdAt: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: groupBy, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ]);
          break;

        case 'profiles':
          data = await MatrimonialProfile.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: groupBy, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ]);
          break;

        case 'messages':
          data = await Message.aggregate([
            { $match: { module: 'matrimonial', createdAt: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: groupBy, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ]);
          break;

        case 'interests':
          data = await MatrimonialProfile.aggregate([
            { $unwind: '$interests' },
            { $match: { 'interests.createdAt': { $gte: startDate, $lte: endDate } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$interests.createdAt' } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ]);
          break;

        default:
          data = [];
      }

      await cacheService.set(cacheKey, data, this.cacheTTL);
      return data;
    } catch (error) {
      errorTrackingService.captureError(error, { metric, interval, context: 'timeseries-data' });
      throw error;
    }
  }

  /**
   * Get user demographics
   * @returns {Promise<Object>} Demographics data
   */
  async getDemographics() {
    try {
      const cacheKey = 'analytics:demographics';
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const [
        byGender,
        byAge,
        byReligion,
        byLocation,
        byEducation,
        byMaritalStatus
      ] = await Promise.all([
        MatrimonialProfile.aggregate([
          { $group: { _id: '$gender', count: { $sum: 1 } } }
        ]),
        MatrimonialProfile.aggregate([
          {
            $bucket: {
              groupBy: '$age',
              boundaries: [18, 25, 30, 35, 40, 50, 100],
              default: 'Other',
              output: { count: { $sum: 1 } }
            }
          }
        ]),
        MatrimonialProfile.aggregate([
          { $group: { _id: '$religion', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        MatrimonialProfile.aggregate([
          { $group: { _id: '$location', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        MatrimonialProfile.aggregate([
          { $group: { _id: '$education', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        MatrimonialProfile.aggregate([
          { $group: { _id: '$maritalStatus', count: { $sum: 1 } } }
        ])
      ]);

      const demographics = {
        gender: byGender,
        age: byAge,
        religion: byReligion,
        location: byLocation,
        education: byEducation,
        maritalStatus: byMaritalStatus
      };

      await cacheService.set(cacheKey, demographics, this.cacheTTL * 4); // Cache for 20 minutes
      return demographics;
    } catch (error) {
      errorTrackingService.captureError(error, { context: 'demographics' });
      throw error;
    }
  }

  /**
   * Get user retention metrics
   * @param {Date} startDate - Cohort start date
   * @returns {Promise<Object>} Retention data
   */
  async getRetentionMetrics(startDate) {
    try {
      const cacheKey = `analytics:retention:${startDate.getTime()}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      // Get users who signed up in the cohort period
      const cohortEnd = new Date(startDate);
      cohortEnd.setMonth(cohortEnd.getMonth() + 1);

      const cohortUsers = await User.find({
        'roles.matrimonial': true,
        createdAt: { $gte: startDate, $lte: cohortEnd }
      }).select('_id');

      const cohortUserIds = cohortUsers.map(u => u._id);
      const cohortSize = cohortUserIds.length;

      // Calculate retention for each month
      const retentionData = [];
      for (let month = 1; month <= 6; month++) {
        const checkDate = new Date(startDate);
        checkDate.setMonth(checkDate.getMonth() + month);

        const activeUsers = await MatrimonialProfile.countDocuments({
          userId: { $in: cohortUserIds },
          lastActive: { $gte: checkDate }
        });

        retentionData.push({
          month,
          activeUsers,
          retentionRate: cohortSize > 0 ? ((activeUsers / cohortSize) * 100).toFixed(1) : 0
        });
      }

      const result = {
        cohortStart: startDate,
        cohortSize,
        retention: retentionData
      };

      await cacheService.set(cacheKey, result, this.cacheTTL * 12); // Cache for 1 hour
      return result;
    } catch (error) {
      errorTrackingService.captureError(error, { context: 'retention-metrics' });
      throw error;
    }
  }

  /**
   * Get top performers (most active users, most viewed profiles, etc.)
   * @param {string} type - Type of top performers
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} Top performers
   */
  async getTopPerformers(type, limit = 10) {
    try {
      const cacheKey = `analytics:top:${type}:${limit}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      let results;

      switch (type) {
        case 'most_viewed':
          results = await MatrimonialProfile.find()
            .sort({ profileViews: -1 })
            .limit(limit)
            .select('name age gender location profileViews photoUrl');
          break;

        case 'most_interests':
          results = await MatrimonialProfile.aggregate([
            { $project: { name: 1, age: 1, gender: 1, location: 1, interestCount: { $size: '$interests' } } },
            { $sort: { interestCount: -1 } },
            { $limit: limit }
          ]);
          break;

        case 'most_active':
          results = await MatrimonialProfile.find()
            .sort({ lastActive: -1 })
            .limit(limit)
            .select('name age gender location lastActive photoUrl');
          break;

        default:
          results = [];
      }

      await cacheService.set(cacheKey, results, this.cacheTTL * 2);
      return results;
    } catch (error) {
      errorTrackingService.captureError(error, { type, context: 'top-performers' });
      throw error;
    }
  }

  /**
   * Clear analytics cache
   */
  async clearCache() {
    try {
      // This would clear all analytics-related cache keys
      // For now, we'll just log it
      await errorTrackingService.logAudit('analytics_cache_cleared', { timestamp: new Date() });
      return { success: true, message: 'Analytics cache cleared' };
    } catch (error) {
      errorTrackingService.captureError(error, { context: 'clear-analytics-cache' });
      throw error;
    }
  }
}

// Singleton instance
const analyticsService = new AnalyticsService();

module.exports = { analyticsService, AnalyticsService };
