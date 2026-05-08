/**
 * AdvancedAnalyticsService
 * Comprehensive analytics and business intelligence service
 * Aggregates order, delivery, revenue, and operational metrics
 */

const FoodDeliveryAnalytics = require('../models/FoodDeliveryAnalytics');
const FoodOrder = require('../models/FoodOrder');

class AdvancedAnalyticsService {
  /**
   * Generate daily analytics report
   */
  static async generateDailyAnalytics(date = new Date()) {
    try {
      const analyticsId = `analytics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Aggregate order data
      const orderStats = await this._getOrderStats(startOfDay, endOfDay);
      const revenueStats = await this._getRevenueStats(startOfDay, endOfDay);
      const deliveryStats = await this._getDeliveryStats(startOfDay, endOfDay);
      const userStats = await this._getUserStats(startOfDay, endOfDay);
      const paymentStats = await this._getPaymentStats(startOfDay, endOfDay);
      const ratingStats = await this._getRatingStats(startOfDay, endOfDay);

      const analytics = new FoodDeliveryAnalytics({
        analyticsId,
        date,
        period: 'daily',
        orders: orderStats,
        revenue: revenueStats,
        delivery: deliveryStats,
        users: userStats,
        payments: paymentStats,
        ratings: ratingStats,
      });

      await analytics.calculateMetrics();

      return {
        success: true,
        data: analytics,
        message: 'Daily analytics generated',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Get order statistics
   */
  static async _getOrderStats(startDate, endDate) {
    try {
      const stats = await FoodOrder.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
            failedOrders: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
            avgOrderValue: { $avg: '$totalAmount' },
            medianOrderValue: { $median: '$totalAmount' },
            totalOrderValue: { $sum: '$totalAmount' },
          },
        },
      ]);

      return stats[0] || {};
    } catch (error) {
      console.error('Order stats error:', error);
      return {};
    }
  }

  /**
   * Get revenue statistics
   */
  static async _getRevenueStats(startDate, endDate) {
    try {
      const stats = await FoodOrder.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: 'delivered',
          },
        },
        {
          $group: {
            _id: null,
            grossRevenue: { $sum: '$totalAmount' },
            platformFeeCollected: { $sum: '$platformFee' },
            taxCollected: { $sum: '$tax' },
            discountsGiven: { $sum: '$discountAmount' },
            deliveryCharges: { $sum: '$deliveryFee' },
          },
        },
      ]);

      const revenue = stats[0] || {};
      revenue.netRevenue =
        (revenue.grossRevenue || 0) - (revenue.discountsGiven || 0) + (revenue.platformFeeCollected || 0);

      return revenue;
    } catch (error) {
      console.error('Revenue stats error:', error);
      return {};
    }
  }

  /**
   * Get delivery statistics
   */
  static async _getDeliveryStats(startDate, endDate) {
    try {
      const stats = await FoodOrder.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: 'delivered',
          },
        },
        {
          $group: {
            _id: null,
            avgDeliveryTime: {
              $avg: {
                $divide: [
                  { $subtract: ['$deliveredAt', '$acceptedAt'] },
                  60000, // Convert to minutes
                ],
              },
            },
            onTimeDeliveries: {
              $sum: {
                $cond: [
                  {
                    $lte: [
                      { $subtract: ['$deliveredAt', '$acceptedAt'] },
                      30 * 60000, // 30 minutes
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);

      return stats[0] || {};
    } catch (error) {
      console.error('Delivery stats error:', error);
      return {};
    }
  }

  /**
   * Get user statistics
   */
  static async _getUserStats(startDate, endDate) {
    try {
      const activeUsers = await FoodOrder.distinct('userId', {
        createdAt: { $gte: startDate, $lte: endDate },
      });

      return {
        activeUsers: activeUsers.length,
      };
    } catch (error) {
      console.error('User stats error:', error);
      return {};
    }
  }

  /**
   * Get payment statistics
   */
  static async _getPaymentStats(startDate, endDate) {
    try {
      const stats = await FoodOrder.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 },
          },
        },
      ]);

      const paymentBreakdown = {};
      let totalTransactions = 0;

      for (const stat of stats) {
        paymentBreakdown[stat._id] = stat.count;
        totalTransactions += stat.count;
      }

      return {
        totalTransactions,
        paymentMethodBreakdown: paymentBreakdown,
      };
    } catch (error) {
      console.error('Payment stats error:', error);
      return {};
    }
  }

  /**
   * Get rating statistics
   */
  static async _getRatingStats(startDate, endDate) {
    try {
      const stats = await FoodOrder.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            'rating.score': { $exists: true },
          },
        },
        {
          $group: {
            _id: null,
            avgOrderRating: { $avg: '$rating.score' },
            fiveStar: { $sum: { $cond: [{ $eq: ['$rating.score', 5] }, 1, 0] } },
            fourStar: { $sum: { $cond: [{ $eq: ['$rating.score', 4] }, 1, 0] } },
            threeStar: { $sum: { $cond: [{ $eq: ['$rating.score', 3] }, 1, 0] } },
            twoStar: { $sum: { $cond: [{ $eq: ['$rating.score', 2] }, 1, 0] } },
            oneStar: { $sum: { $cond: [{ $eq: ['$rating.score', 1] }, 1, 0] } },
          },
        },
      ]);

      return stats[0] || {};
    } catch (error) {
      console.error('Rating stats error:', error);
      return {};
    }
  }

  /**
   * Get analytics for date range
   */
  static async getAnalyticsRange(startDate, endDate, period = 'daily') {
    try {
      const query = {
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
        period,
      };

      const analytics = await FoodDeliveryAnalytics.find(query).sort({ date: 1 });

      if (analytics.length === 0) {
        return {
          success: false,
          message: 'No analytics found for the specified range',
        };
      }

      return {
        success: true,
        data: analytics,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Get top performing restaurants
   */
  static async getTopRestaurants(limit = 10) {
    try {
      const restaurants = await FoodOrder.aggregate([
        {
          $group: {
            _id: '$restaurantId',
            orders: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
            avgRating: { $avg: '$rating.score' },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: limit },
      ]);

      return {
        success: true,
        data: restaurants,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Get business insights
   */
  static async getBusinessInsights(startDate, endDate) {
    try {
      const analyticsData = await this.getAnalyticsRange(startDate, endDate, 'daily');

      if (!analyticsData.success) {
        return analyticsData;
      }

      const data = analyticsData.data;
      const totalAnalytics = data.length;

      // Aggregate insights
      let totalRevenue = 0;
      let totalOrders = 0;
      let avgOrderValue = 0;
      let totalUsers = 0;

      for (const analytics of data) {
        totalRevenue += analytics.revenue?.netRevenue || 0;
        totalOrders += analytics.orders?.totalOrders || 0;
        totalUsers += analytics.users?.activeUsers || 0;
      }

      avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      return {
        success: true,
        data: {
          period: `${startDate} to ${endDate}`,
          totalRevenue,
          totalOrders,
          avgOrderValue,
          totalUsers,
          daysAnalyzed: totalAnalytics,
          dailyAvgRevenue: totalAnalytics > 0 ? totalRevenue / totalAnalytics : 0,
          dailyAvgOrders: totalAnalytics > 0 ? totalOrders / totalAnalytics : 0,
          userRetentionRate:
            data.length > 1 ? ((data[data.length - 1].users.activeUsers || 0) / (data[0].users.activeUsers || 1)) * 100 : 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Get peak hours analysis
   */
  static async getPeakHoursAnalysis(restaurantId = null) {
    try {
      const match = { status: 'delivered' };
      if (restaurantId) {
        match.restaurantId = restaurantId;
      }

      const peakHours = await FoodOrder.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            orders: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
          },
        },
        { $sort: { orders: -1 } },
      ]);

      return {
        success: true,
        data: peakHours,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }
}

module.exports = AdvancedAnalyticsService;
