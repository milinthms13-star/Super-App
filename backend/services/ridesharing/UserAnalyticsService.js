/**
 * UserAnalyticsService.js
 * Phase 8: User Analytics & Insights
 * Tracks ride patterns, spending, preferences, and provides intelligent recommendations
 */

const UserAnalytics = require('../../models/UserAnalytics');
const RideHistory = require('../../models/RideHistory');
const RideRequest = require('../../models/RideRequest');
const UserProfile = require('../../models/UserProfile');

class UserAnalyticsService {
  /**
   * Track ride event for analytics
   */
  static async trackRideEvent(userId, eventData) {
    try {
      const {
        rideId,
        eventType, // 'ride_started', 'ride_completed', 'ride_cancelled'
        rideDetails,
      } = eventData;

      let analytics = await UserAnalytics.findOne({ userId });

      if (!analytics) {
        analytics = new UserAnalytics({
          userId,
          totalRides: 0,
          completedRides: 0,
          cancelledRides: 0,
          totalSpent: 0,
          averageRating: 0,
          rideHistory: [],
          favoriteRoutes: [],
          spendingPattern: {},
          timePreferences: {},
          vehiclePreferences: {},
        });
      }

      if (eventType === 'ride_completed') {
        analytics.completedRides += 1;
        analytics.totalRides += 1;
        analytics.totalSpent += rideDetails.fare || 0;

        // Update spending pattern
        const date = new Date();
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        analytics.spendingPattern[month] = (analytics.spendingPattern[month] || 0) + (rideDetails.fare || 0);

        // Track favorite routes
        this.updateFavoriteRoutes(analytics, rideDetails);

        // Update time preferences
        this.updateTimePreferences(analytics, date);

        // Update vehicle preferences
        if (rideDetails.vehicleType) {
          analytics.vehiclePreferences[rideDetails.vehicleType] =
            (analytics.vehiclePreferences[rideDetails.vehicleType] || 0) + 1;
        }
      } else if (eventType === 'ride_cancelled') {
        analytics.cancelledRides += 1;
        analytics.totalRides += 1;
      }

      analytics.lastRideAt = new Date();
      await analytics.save();

      return {
        success: true,
        message: 'Ride event tracked successfully',
      };
    } catch (error) {
      throw new Error(`Error tracking ride event: ${error.message}`);
    }
  }

  /**
   * Update favorite routes
   */
  static updateFavoriteRoutes(analytics, rideDetails) {
    try {
      const routeKey = `${rideDetails.source}-${rideDetails.destination}`;

      if (!analytics.favoriteRoutes) {
        analytics.favoriteRoutes = [];
      }

      const existingRoute = analytics.favoriteRoutes.find(
        (r) => r.route === routeKey
      );

      if (existingRoute) {
        existingRoute.count += 1;
        existingRoute.lastUsed = new Date();
      } else {
        analytics.favoriteRoutes.push({
          route: routeKey,
          source: rideDetails.source,
          destination: rideDetails.destination,
          count: 1,
          lastUsed: new Date(),
        });
      }

      // Keep only top 10 routes
      analytics.favoriteRoutes.sort((a, b) => b.count - a.count);
      if (analytics.favoriteRoutes.length > 10) {
        analytics.favoriteRoutes = analytics.favoriteRoutes.slice(0, 10);
      }
    } catch (error) {
      console.error('Error updating favorite routes:', error.message);
    }
  }

  /**
   * Update time preferences
   */
  static updateTimePreferences(analytics, date) {
    try {
      if (!analytics.timePreferences) {
        analytics.timePreferences = {};
      }

      const hour = String(date.getHours()).padStart(2, '0');
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

      analytics.timePreferences[`hour_${hour}`] =
        (analytics.timePreferences[`hour_${hour}`] || 0) + 1;
      analytics.timePreferences[dayOfWeek] =
        (analytics.timePreferences[dayOfWeek] || 0) + 1;
    } catch (error) {
      console.error('Error updating time preferences:', error.message);
    }
  }

  /**
   * Get user analytics dashboard
   */
  static async getUserAnalyticsDashboard(userId) {
    try {
      const analytics = await UserAnalytics.findOne({ userId }).lean();

      if (!analytics) {
        return {
          success: true,
          data: {
            totalRides: 0,
            completedRides: 0,
            cancelledRides: 0,
            totalSpent: 0,
            averageSpendPerRide: 0,
            cancellationRate: 0,
          },
        };
      }

      const cancellationRate =
        analytics.totalRides > 0
          ? (
              (analytics.cancelledRides / analytics.totalRides) *
              100
            ).toFixed(2)
          : 0;

      const averageSpend =
        analytics.completedRides > 0
          ? (analytics.totalSpent / analytics.completedRides).toFixed(2)
          : 0;

      return {
        success: true,
        data: {
          totalRides: analytics.totalRides,
          completedRides: analytics.completedRides,
          cancelledRides: analytics.cancelledRides,
          totalSpent: Math.round(analytics.totalSpent * 100) / 100,
          averageSpendPerRide: averageSpend,
          cancellationRate: cancellationRate + '%',
          lastRideAt: analytics.lastRideAt,
          favoriteRoutes: analytics.favoriteRoutes?.slice(0, 5) || [],
        },
      };
    } catch (error) {
      throw new Error(`Error retrieving user analytics dashboard: ${error.message}`);
    }
  }

  /**
   * Get spending analysis
   */
  static async getSpendingAnalysis(userId, timeframe = 'monthly') {
    try {
      const analytics = await UserAnalytics.findOne({ userId }).lean();

      if (!analytics) {
        return {
          success: true,
          data: {
            totalSpent: 0,
            breakdown: {},
          },
        };
      }

      const breakdown = {};
      let totalPeriodSpent = 0;

      if (timeframe === 'monthly') {
        Object.entries(analytics.spendingPattern).forEach(([month, amount]) => {
          breakdown[month] = amount;
          totalPeriodSpent += amount;
        });
      }

      // Calculate averages
      const monthCount = Object.keys(breakdown).length || 1;
      const averageMonthly = (totalPeriodSpent / monthCount).toFixed(2);

      return {
        success: true,
        data: {
          totalSpent: Math.round(analytics.totalSpent * 100) / 100,
          periodSpent: Math.round(totalPeriodSpent * 100) / 100,
          averageMonthly,
          breakdown,
          trendDirection: this.analyzeTrend(breakdown),
        },
      };
    } catch (error) {
      throw new Error(`Error retrieving spending analysis: ${error.message}`);
    }
  }

  /**
   * Analyze spending trend
   */
  static analyzeTrend(breakdown) {
    const values = Object.values(breakdown);
    if (values.length < 2) return 'insufficient_data';

    const recent = values.slice(-3);
    const previous = values.slice(-6, -3);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg = previous.length > 0
      ? previous.reduce((a, b) => a + b, 0) / previous.length
      : recentAvg;

    if (recentAvg > previousAvg * 1.1) return 'increasing';
    if (recentAvg < previousAvg * 0.9) return 'decreasing';
    return 'stable';
  }

  /**
   * Get ride pattern insights
   */
  static async getRidePatternInsights(userId) {
    try {
      const analytics = await UserAnalytics.findOne({ userId }).lean();

      if (!analytics) {
        return {
          success: true,
          data: {
            message: 'Insufficient data for insights',
          },
        };
      }

      // Find peak hours
      const hours = Object.entries(analytics.timePreferences || {})
        .filter(([k]) => k.startsWith('hour_'))
        .sort(([, a], [, b]) => b - a);

      const peakHours = hours.slice(0, 3).map(([hour, count]) => ({
        hour: hour.replace('hour_', '') + ':00',
        ridesCount: count,
      }));

      // Find preferred days
      const days = Object.entries(analytics.timePreferences || {})
        .filter(([k]) => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].includes(k))
        .sort(([, a], [, b]) => b - a);

      const preferredDays = days.slice(0, 3).map(([day, count]) => ({
        day,
        ridesCount: count,
      }));

      // Find preferred vehicles
      const vehicles = Object.entries(analytics.vehiclePreferences || {})
        .sort(([, a], [, b]) => b - a);

      const preferredVehicles = vehicles.slice(0, 3).map(([vehicle, count]) => ({
        vehicle,
        usageCount: count,
      }));

      return {
        success: true,
        data: {
          peakHours,
          preferredDays,
          preferredVehicles,
          favoriteRoutes: analytics.favoriteRoutes?.slice(0, 5) || [],
        },
      };
    } catch (error) {
      throw new Error(
        `Error retrieving ride pattern insights: ${error.message}`
      );
    }
  }

  /**
   * Get personalized recommendations
   */
  static async getPersonalizedRecommendations(userId) {
    try {
      const analytics = await UserAnalytics.findOne({ userId }).lean();
      const recommendations = [];

      if (!analytics) {
        recommendations.push({
          type: 'sign_up',
          message: 'Start tracking your rides to get personalized recommendations',
        });
        return { success: true, data: recommendations };
      }

      // Based on spending pattern
      if (analytics.totalSpent > 5000) {
        recommendations.push({
          type: 'premium_subscription',
          message: 'You spend a lot on rides. Consider our premium tiers for 20-30% savings!',
          savings: Math.round(analytics.totalSpent * 0.25),
        });
      }

      // Based on cancellation rate
      const cancellationRate =
        analytics.totalRides > 0
          ? (analytics.cancelledRides / analytics.totalRides) * 100
          : 0;

      if (cancellationRate > 20) {
        recommendations.push({
          type: 'planning',
          message: 'You have a high cancellation rate. Try booking rides in advance with scheduled rides feature!',
        });
      }

      // Based on favorite routes
      if (analytics.favoriteRoutes?.length > 0) {
        const topRoute = analytics.favoriteRoutes[0];
        if (topRoute.count > 10) {
          recommendations.push({
            type: 'recurring_route',
            message: `You use the route ${topRoute.route} frequently. Consider a corporate account for regular commutes!`,
          });
        }
      }

      // Based on time patterns
      const peakHour = Object.entries(analytics.timePreferences || {})
        .filter(([k]) => k.startsWith('hour_'))
        .sort(([, a], [, b]) => b - a)[0];

      if (peakHour) {
        recommendations.push({
          type: 'peak_hours',
          message: `You ride most during ${peakHour[0].replace('hour_', '')}:00. Consider booking 30 minutes earlier to avoid surge pricing!`,
        });
      }

      // Safety recommendation
      recommendations.push({
        type: 'safety',
        message: 'Enable emergency contacts and activate ride safety features for added protection.',
      });

      return {
        success: true,
        data: recommendations,
      };
    } catch (error) {
      throw new Error(
        `Error retrieving personalized recommendations: ${error.message}`
      );
    }
  }

  /**
   * Compare user to similar users
   */
  static async compareWithSimilarUsers(userId) {
    try {
      const userAnalytics = await UserAnalytics.findOne({ userId }).lean();

      if (!userAnalytics) {
        return {
          success: true,
          data: {
            message: 'Insufficient user data for comparison',
          },
        };
      }

      // Get average metrics from database
      const allAnalytics = await UserAnalytics.find().lean();

      const avgTotalRides =
        allAnalytics.reduce((sum, a) => sum + a.totalRides, 0) /
        (allAnalytics.length || 1);
      const avgSpent =
        allAnalytics.reduce((sum, a) => sum + a.totalSpent, 0) /
        (allAnalytics.length || 1);
      const avgRating =
        allAnalytics.reduce((sum, a) => sum + a.averageRating, 0) /
        (allAnalytics.length || 1);

      return {
        success: true,
        data: {
          userMetrics: {
            totalRides: userAnalytics.totalRides,
            totalSpent: userAnalytics.totalSpent,
            averageRating: userAnalytics.averageRating,
          },
          communityAverages: {
            avgRides: Math.round(avgTotalRides),
            avgSpent: Math.round(avgSpent),
            avgRating: (avgRating).toFixed(2),
          },
          comparison: {
            ridesVsAverage: userAnalytics.totalRides > avgTotalRides ? 'above' : 'below',
            spendingVsAverage: userAnalytics.totalSpent > avgSpent ? 'above' : 'below',
          },
        },
      };
    } catch (error) {
      throw new Error(
        `Error comparing with similar users: ${error.message}`
      );
    }
  }

  /**
   * Get monthly report
   */
  static async getMonthlyReport(userId, month, year) {
    try {
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const analytics = await UserAnalytics.findOne({ userId }).lean();

      if (!analytics) {
        return {
          success: true,
          data: {
            message: 'No data available for this period',
          },
        };
      }

      const monthSpent = analytics.spendingPattern?.[monthKey] || 0;
      const totalRides = analytics.totalRides || 0;

      return {
        success: true,
        data: {
          period: monthKey,
          spent: Math.round(monthSpent * 100) / 100,
          averagePerRide:
            totalRides > 0 ? (monthSpent / totalRides).toFixed(2) : 0,
          completedRides: analytics.completedRides,
          cancelledRides: analytics.cancelledRides,
          favoriteRoutes: analytics.favoriteRoutes?.slice(0, 5) || [],
        },
      };
    } catch (error) {
      throw new Error(`Error retrieving monthly report: ${error.message}`);
    }
  }

  /**
   * Export analytics data
   */
  static async exportAnalyticsData(userId, format = 'json') {
    try {
      const analytics = await UserAnalytics.findOne({ userId }).lean();

      if (!analytics) {
        return {
          success: false,
          message: 'No analytics data available',
        };
      }

      const exportData = {
        userId,
        exportDate: new Date().toISOString(),
        analytics: {
          totalRides: analytics.totalRides,
          completedRides: analytics.completedRides,
          cancelledRides: analytics.cancelledRides,
          totalSpent: analytics.totalSpent,
          spendingPattern: analytics.spendingPattern,
          favoriteRoutes: analytics.favoriteRoutes,
          timePreferences: analytics.timePreferences,
          vehiclePreferences: analytics.vehiclePreferences,
        },
      };

      if (format === 'csv') {
        // Convert to CSV format
        const csvContent = this.convertToCSV(exportData);
        return {
          success: true,
          data: csvContent,
          format: 'csv',
        };
      }

      return {
        success: true,
        data: exportData,
        format: 'json',
      };
    } catch (error) {
      throw new Error(
        `Error exporting analytics data: ${error.message}`
      );
    }
  }

  /**
   * Convert analytics to CSV
   */
  static convertToCSV(data) {
    let csv = 'Analytics Export\n';
    csv += `Export Date: ${data.exportDate}\n\n`;

    csv += 'Summary\n';
    csv += 'Total Rides,' + data.analytics.totalRides + '\n';
    csv += 'Completed Rides,' + data.analytics.completedRides + '\n';
    csv += 'Cancelled Rides,' + data.analytics.cancelledRides + '\n';
    csv += 'Total Spent,' + data.analytics.totalSpent + '\n\n';

    csv += 'Monthly Spending\n';
    Object.entries(data.analytics.spendingPattern).forEach(([month, amount]) => {
      csv += month + ',' + amount + '\n';
    });

    return csv;
  }
}

module.exports = UserAnalyticsService;
