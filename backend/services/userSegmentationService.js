/**
 * User Segmentation Service - Phase 14
 * Segment users by behavior, RFM, and cohorts
 */

const User = require('../models/User');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const logger = require('./logger');
const { v4: uuidv4 } = require('uuid');

class UserSegmentationService {
  /**
   * Get or create user segment
   */
  static async getSegmentAnalysis(segmentType = 'behavioral') {
    try {
      let analysis;

      switch (segmentType) {
        case 'behavioral':
          analysis = await this.getBehavioralSegments();
          break;
        case 'rfm':
          analysis = await this.getRFMSegments();
          break;
        case 'cohort':
          analysis = await this.getCohortAnalysis();
          break;
        default:
          throw new Error('Unknown segment type');
      }

      return analysis;
    } catch (error) {
      logger.error('Error analyzing segments:', error);
      throw error;
    }
  }

  /**
   * Get behavioral segments
   */
  static async getBehavioralSegments() {
    const users = await User.find({ status: 'active' }).limit(1000);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    const segments = {
      vip: { users: [], count: 0, description: 'High-value, very active' },
      loyal: { users: [], count: 0, description: 'Regular customers' },
      occasional: { users: [], count: 0, description: 'Occasional buyers' },
      inactive: { users: [], count: 0, description: 'Not active recently' },
      dormant: { users: [], count: 0, description: 'Completely inactive' }
    };

    for (const user of users) {
      const orders = await Order.find({
        userId: user._id,
        createdAt: { $gte: startDate, $lte: endDate }
      });

      const daysSinceLastOrder = await this.getDaysSinceLastOrder(user._id);
      const totalSpend = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      let segment;
      if (daysSinceLastOrder < 30 && orders.length > 10 && totalSpend > 5000) {
        segment = 'vip';
      } else if (daysSinceLastOrder < 60 && orders.length > 5) {
        segment = 'loyal';
      } else if (daysSinceLastOrder < 120 && orders.length > 0) {
        segment = 'occasional';
      } else if (daysSinceLastOrder < 365) {
        segment = 'inactive';
      } else {
        segment = 'dormant';
      }

      segments[segment].users.push({
        userId: user._id,
        email: user.email,
        totalSpend,
        orderCount: orders.length,
        daysSinceLastOrder
      });
    }

    // Calculate counts
    Object.keys(segments).forEach(key => {
      segments[key].count = segments[key].users.length;
    });

    return {
      segmentType: 'behavioral',
      segments,
      analysisDate: new Date(),
      totalUsers: users.length
    };
  }

  /**
   * Get RFM segments
   */
  static async getRFMSegments() {
    const users = await User.find({ status: 'active' }).limit(1000);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365);

    const rfmData = [];

    for (const user of users) {
      const orders = await Order.find({
        userId: user._id,
        createdAt: { $gte: startDate, $lte: endDate }
      });

      const daysSinceLastOrder = await this.getDaysSinceLastOrder(user._id);
      const totalSpend = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      // Calculate RFM scores (0-3 for each)
      const recency = this.scoreRecency(daysSinceLastOrder);
      const frequency = this.scoreFrequency(orders.length);
      const monetary = this.scoreMonetary(totalSpend);

      const rfmScore = recency * 100 + frequency * 10 + monetary;

      rfmData.push({
        userId: user._id,
        email: user.email,
        recency,
        frequency,
        monetary,
        rfmScore,
        totalSpend,
        orderCount: orders.length,
        segment: this.getRFMSegmentName(recency, frequency, monetary)
      });
    }

    // Group by segment
    const segments = {};
    rfmData.forEach(item => {
      if (!segments[item.segment]) {
        segments[item.segment] = [];
      }
      segments[item.segment].push(item);
    });

    return {
      segmentType: 'rfm',
      segments,
      analysisDate: new Date(),
      totalUsers: users.length
    };
  }

  /**
   * Get cohort analysis
   */
  static async getCohortAnalysis() {
    const cohorts = {};

    // Group users by signup month
    const users = await User.find().select('_id createdAt email');

    users.forEach(user => {
      const cohortMonth = new Date(user.createdAt).toISOString().slice(0, 7);

      if (!cohorts[cohortMonth]) {
        cohorts[cohortMonth] = {
          signupDate: cohortMonth,
          users: [],
          metrics: {
            totalUsers: 0,
            activeUsers: 0,
            churnedUsers: 0,
            revenue: 0
          }
        };
      }

      cohorts[cohortMonth].users.push(user._id);
    });

    // Calculate cohort metrics
    for (const month in cohorts) {
      const cohort = cohorts[month];
      cohort.metrics.totalUsers = cohort.users.length;

      const orders = await Order.find({ userId: { $in: cohort.users } });
      cohort.metrics.revenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      const daysSinceSignup = this.getDaysSinceCohortStart(month);
      cohort.metrics.activeUsers = cohort.users.length;
      cohort.metrics.retentionRate = ((cohort.users.length / cohort.users.length) * 100).toFixed(2);
    }

    return {
      segmentType: 'cohort',
      cohorts,
      analysisDate: new Date()
    };
  }

  /**
   * Score recency (0-3)
   */
  static scoreRecency(daysSinceLastOrder) {
    if (daysSinceLastOrder <= 30) return 3;
    if (daysSinceLastOrder <= 90) return 2;
    if (daysSinceLastOrder <= 180) return 1;
    return 0;
  }

  /**
   * Score frequency (0-3)
   */
  static scoreFrequency(orderCount) {
    if (orderCount >= 20) return 3;
    if (orderCount >= 10) return 2;
    if (orderCount >= 1) return 1;
    return 0;
  }

  /**
   * Score monetary (0-3)
   */
  static scoreMonetary(totalSpend) {
    if (totalSpend >= 10000) return 3;
    if (totalSpend >= 5000) return 2;
    if (totalSpend >= 1000) return 1;
    return 0;
  }

  /**
   * Get RFM segment name
   */
  static getRFMSegmentName(r, f, m) {
    if (r >= 2 && f >= 2 && m >= 2) return 'Champions';
    if (r >= 2 && f >= 2) return 'Loyal Customers';
    if (r >= 2 && m >= 2) return 'Big Spenders';
    if (r >= 2) return 'Potential Loyalists';
    if (f >= 2 && m >= 2) return 'At Risk';
    if (f >= 2) return 'Hibernating';
    return 'Lost';
  }

  /**
   * Get days since last order
   */
  static async getDaysSinceLastOrder(userId) {
    const lastOrder = await Order.findOne({ userId }).sort({ createdAt: -1 });
    if (!lastOrder) return 999;

    return Math.floor((new Date() - lastOrder.createdAt) / (1000 * 60 * 60 * 24));
  }

  /**
   * Get days since cohort start
   */
  static getDaysSinceCohortStart(cohortMonth) {
    const cohortDate = new Date(cohortMonth + '-01');
    return Math.floor((new Date() - cohortDate) / (1000 * 60 * 60 * 24));
  }

  /**
   * Get segment users
   */
  static async getSegmentUsers(segmentType, segmentName, limit = 100) {
    try {
      const analysis = await this.getSegmentAnalysis(segmentType);

      if (segmentType === 'behavioral') {
        return analysis.segments[segmentName]?.users.slice(0, limit) || [];
      } else if (segmentType === 'rfm') {
        return analysis.segments[segmentName]?.slice(0, limit) || [];
      }

      return [];
    } catch (error) {
      logger.error('Error getting segment users:', error);
      throw error;
    }
  }
}

module.exports = UserSegmentationService;
