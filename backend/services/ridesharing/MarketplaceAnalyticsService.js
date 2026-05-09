/**
 * MarketplaceAnalyticsService.js
 * Comprehensive marketplace analytics and insights for ridesharing platform
 * Includes trending routes, demand patterns, marketplace health metrics
 */

const mongoose = require('mongoose');

class MarketplaceAnalyticsService {
  /**
   * Get trending routes in the marketplace
   */
  static async getTrendingRoutes(period = 'daily', limit = 20) {
    try {
      const collection = mongoose.connection.collection('payment_transactions');
      
      const daysAgo = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
      const dateFilter = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      const trends = await collection.aggregate([
        {
          $match: {
            createdAt: { $gte: dateFilter },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: '$route', // Assuming transactions contain route info
            rideCount: { $sum: 1 },
            totalRevenue: { $sum: '$amount' },
            avgRideValue: { $avg: '$amount' }
          }
        },
        {
          $sort: { rideCount: -1 }
        },
        {
          $limit: limit
        }
      ]).toArray();

      return {
        success: true,
        data: {
          period,
          routes: trends.map(t => ({
            route: t._id,
            rideCount: t.rideCount,
            totalRevenue: t.totalRevenue.toFixed(2),
            avgRideValue: t.avgRideValue.toFixed(2),
            trend: 'up' // Could calculate vs previous period
          }))
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching trending routes: ${error.message}`
      };
    }
  }

  /**
   * Get peak demand times
   */
  static async getPeakDemandTimes(days = 7) {
    try {
      const collection = mongoose.connection.collection('payment_transactions');
      const dateFilter = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const demandByHour = await collection.aggregate([
        {
          $match: {
            createdAt: { $gte: dateFilter },
            status: 'completed'
          }
        },
        {
          $project: {
            hour: { $hour: '$createdAt' },
            dayOfWeek: { $dayOfWeek: '$createdAt' },
            amount: 1
          }
        },
        {
          $group: {
            _id: { hour: '$hour', dayOfWeek: '$dayOfWeek' },
            rideCount: { $sum: 1 },
            totalRevenue: { $sum: '$amount' },
            avgRideValue: { $avg: '$amount' }
          }
        },
        {
          $sort: { rideCount: -1 }
        }
      ]).toArray();

      return {
        success: true,
        data: {
          period: `${days} days`,
          peakTimes: demandByHour.slice(0, 10).map(d => ({
            hour: d._id.hour,
            dayOfWeek: d._id.dayOfWeek,
            rideCount: d.rideCount,
            totalRevenue: d.totalRevenue.toFixed(2),
            demand: 'high'
          }))
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching peak demand times: ${error.message}`
      };
    }
  }

  /**
   * Get marketplace health score
   */
  static async getMarketplaceHealth() {
    try {
      const transactionsCollection = mongoose.connection.collection('payment_transactions');
      const usersCollection = mongoose.connection.collection('users');
      const ratingsCollection = mongoose.connection.collection('ratings');

      // Last 30 days metrics
      const dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Completion rate
      const completedRides = await transactionsCollection.countDocuments({
        createdAt: { $gte: dateFilter },
        status: 'completed'
      });

      const cancelledRides = await transactionsCollection.countDocuments({
        createdAt: { $gte: dateFilter },
        status: 'cancelled'
      });

      const completionRate = (completedRides / (completedRides + cancelledRides)) * 100 || 0;

      // User retention
      const activeUsers = await usersCollection.countDocuments({
        lastActivityAt: { $gte: dateFilter }
      });

      const totalUsers = await usersCollection.countDocuments({});
      const retentionRate = (activeUsers / totalUsers) * 100 || 0;

      // Average rating trend
      const ratings = await ratingsCollection
        .find({ createdAt: { $gte: dateFilter }, status: 'approved' })
        .toArray();

      const avgRating = ratings.length > 0
        ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(2)
        : 0;

      // Calculate health score (0-100)
      const healthScore = (
        (completionRate * 0.4) +
        (retentionRate * 0.3) +
        (avgRating / 5 * 100 * 0.3)
      ).toFixed(2);

      let healthStatus = 'excellent';
      if (healthScore < 60) healthStatus = 'poor';
      else if (healthScore < 70) healthStatus = 'fair';
      else if (healthScore < 80) healthStatus = 'good';
      else if (healthScore < 90) healthStatus = 'very_good';

      return {
        success: true,
        data: {
          healthScore,
          healthStatus,
          metrics: {
            completionRate: completionRate.toFixed(2),
            retentionRate: retentionRate.toFixed(2),
            avgRating,
            activeUsers,
            totalUsers,
            completedRides30Days: completedRides,
            cancelledRides30Days: cancelledRides
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error calculating marketplace health: ${error.message}`
      };
    }
  }

  /**
   * Get user segmentation by activity
   */
  static async getUserSegmentation(metric = 'rides') {
    try {
      const transactionsCollection = mongoose.connection.collection('payment_transactions');

      const segments = await transactionsCollection.aggregate([
        {
          $match: { status: 'completed' }
        },
        {
          $group: {
            _id: '$userId',
            rideCount: { $sum: 1 },
            totalSpent: { $sum: '$amount' },
            avgRideValue: { $avg: '$amount' }
          }
        },
        {
          $facet: {
            heavy_users: [
              { $match: { rideCount: { $gte: 50 } } },
              { $count: 'count' }
            ],
            regular_users: [
              { $match: { rideCount: { $gte: 10, $lt: 50 } } },
              { $count: 'count' }
            ],
            occasional_users: [
              { $match: { rideCount: { $gte: 1, $lt: 10 } } },
              { $count: 'count' }
            ]
          }
        }
      ]).toArray();

      const segmentCounts = segments[0];

      return {
        success: true,
        data: {
          segments: {
            heavy_users: segmentCounts.heavy_users[0]?.count || 0,
            regular_users: segmentCounts.regular_users[0]?.count || 0,
            occasional_users: segmentCounts.occasional_users[0]?.count || 0
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error segmenting users: ${error.message}`
      };
    }
  }

  /**
   * Get geographic distribution of rides
   */
  static async getGeographicMetrics() {
    try {
      const collection = mongoose.connection.collection('payment_transactions');

      const distribution = await collection.aggregate([
        {
          $match: { status: 'completed' }
        },
        {
          $group: {
            _id: '$location', // Assuming location data in transactions
            rideCount: { $sum: 1 },
            totalRevenue: { $sum: '$amount' },
            avgRating: { $avg: '$rating' }
          }
        },
        {
          $sort: { rideCount: -1 }
        },
        {
          $limit: 20
        }
      ]).toArray();

      return {
        success: true,
        data: {
          locations: distribution.map(d => ({
            location: d._id,
            rideCount: d.rideCount,
            totalRevenue: d.totalRevenue.toFixed(2),
            avgRating: d.avgRating ? d.avgRating.toFixed(2) : 0
          }))
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching geographic metrics: ${error.message}`
      };
    }
  }

  /**
   * Get revenue trends over time
   */
  static async getRevenueTrends(days = 30) {
    try {
      const collection = mongoose.connection.collection('payment_transactions');
      const dateFilter = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const trends = await collection.aggregate([
        {
          $match: {
            createdAt: { $gte: dateFilter },
            status: 'completed'
          }
        },
        {
          $project: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            amount: 1
          }
        },
        {
          $group: {
            _id: '$date',
            dailyRevenue: { $sum: '$amount' },
            rideCount: { $sum: 1 },
            avgRideValue: { $avg: '$amount' }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]).toArray();

      return {
        success: true,
        data: {
          period: `${days} days`,
          trends: trends.map(t => ({
            date: t._id,
            dailyRevenue: t.dailyRevenue.toFixed(2),
            rideCount: t.rideCount,
            avgRideValue: t.avgRideValue.toFixed(2)
          }))
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching revenue trends: ${error.message}`
      };
    }
  }

  /**
   * Get driver availability metrics
   */
  static async getDriverAvailabilityMetrics() {
    try {
      const usersCollection = mongoose.connection.collection('users');
      const transactionsCollection = mongoose.connection.collection('payment_transactions');

      const drivers = await usersCollection.find({ userType: 'driver' }).toArray();
      const dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      let activeDrivers = 0;
      let totalRides = 0;
      let totalRevenue = 0;

      for (const driver of drivers) {
        const recentRides = await transactionsCollection.countDocuments({
          driverId: driver._id,
          createdAt: { $gte: dateFilter },
          status: 'completed'
        });

        if (recentRides > 0) {
          activeDrivers++;
          totalRides += recentRides;

          const revenue = await transactionsCollection.aggregate([
            {
              $match: {
                driverId: driver._id,
                createdAt: { $gte: dateFilter },
                status: 'completed'
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$amount' }
              }
            }
          ]).toArray();

          if (revenue.length > 0) {
            totalRevenue += revenue[0].total;
          }
        }
      }

      return {
        success: true,
        data: {
          totalDrivers: drivers.length,
          activeDrivers7Days: activeDrivers,
          engagementRate: ((activeDrivers / drivers.length) * 100).toFixed(2),
          totalRides7Days: totalRides,
          totalRevenue7Days: totalRevenue.toFixed(2),
          avgRidesPerDriver: (totalRides / Math.max(activeDrivers, 1)).toFixed(2)
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error calculating driver metrics: ${error.message}`
      };
    }
  }

  /**
   * Get marketplace comparison report
   */
  static async getMarketplaceComparison(period1Days = 7, period2Days = 14) {
    try {
      const collection = mongoose.connection.collection('payment_transactions');

      const now = new Date();
      const period1Start = new Date(now.getTime() - period1Days * 24 * 60 * 60 * 1000);
      const period2Start = new Date(now.getTime() - (period1Days + period2Days) * 24 * 60 * 60 * 1000);

      const metrics1 = await collection.aggregate([
        {
          $match: {
            createdAt: { $gte: period1Start },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            rideCount: { $sum: 1 },
            totalRevenue: { $sum: '$amount' },
            avgRideValue: { $avg: '$amount' }
          }
        }
      ]).toArray();

      const metrics2 = await collection.aggregate([
        {
          $match: {
            createdAt: { $gte: period2Start, $lt: period1Start },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            rideCount: { $sum: 1 },
            totalRevenue: { $sum: '$amount' },
            avgRideValue: { $avg: '$amount' }
          }
        }
      ]).toArray();

      const m1 = metrics1[0] || { rideCount: 0, totalRevenue: 0, avgRideValue: 0 };
      const m2 = metrics2[0] || { rideCount: 0, totalRevenue: 0, avgRideValue: 0 };

      const rideGrowth = m2.rideCount > 0 ? ((m1.rideCount - m2.rideCount) / m2.rideCount * 100).toFixed(2) : 0;
      const revenueGrowth = m2.totalRevenue > 0 ? ((m1.totalRevenue - m2.totalRevenue) / m2.totalRevenue * 100).toFixed(2) : 0;

      return {
        success: true,
        data: {
          period1: `Last ${period1Days} days`,
          period2: `Previous ${period2Days} days`,
          comparison: {
            rideGrowth: `${rideGrowth}%`,
            revenueGrowth: `${revenueGrowth}%`,
            current: {
              rides: m1.rideCount,
              revenue: m1.totalRevenue.toFixed(2)
            },
            previous: {
              rides: m2.rideCount,
              revenue: m2.totalRevenue.toFixed(2)
            }
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error generating comparison report: ${error.message}`
      };
    }
  }
}

module.exports = MarketplaceAnalyticsService;
