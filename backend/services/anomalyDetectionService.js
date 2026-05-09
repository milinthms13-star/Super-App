/**
 * Anomaly Detection Service - Phase 14
 * Detect transaction and usage anomalies
 */

const Order = require('../models/Order');
const Payment = require('../models/Payment');
const User = require('../models/User');
const logger = require('./logger');

class AnomalyDetectionService {
  /**
   * Detect transaction anomalies
   */
  static async detectTransactionAnomalies(timeWindowHours = 24) {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - timeWindowHours);

      const recentTransactions = await Order.find({
        createdAt: { $gte: cutoffTime }
      }).populate('userId');

      const anomalies = [];
      const stats = this.calculateTransactionStats(recentTransactions);

      for (const transaction of recentTransactions) {
        const isAnomaly = this.isTransactionAnomaly(transaction, stats);

        if (isAnomaly) {
          anomalies.push({
            orderId: transaction._id,
            userId: transaction.userId._id,
            userEmail: transaction.userId.email,
            amount: transaction.totalAmount,
            type: isAnomaly.type,
            severity: isAnomaly.severity,
            reason: isAnomaly.reason,
            timestamp: transaction.createdAt
          });
        }
      }

      logger.info(`Detected ${anomalies.length} transaction anomalies`);

      return {
        timeWindow: `${timeWindowHours} hours`,
        anomaliesDetected: anomalies.length,
        anomalies,
        statistics: stats,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Error detecting transaction anomalies:', error);
      throw error;
    }
  }

  /**
   * Detect user behavior anomalies
   */
  static async detectUserBehaviorAnomalies() {
    try {
      const anomalies = [];
      const users = await User.find({ status: 'active' }).limit(500);

      const userBehaviorStats = await this.calculateUserBehaviorStats();

      for (const user of users) {
        const orders = await Order.find({ userId: user._id }).limit(100);

        if (orders.length === 0) continue;

        const userBehavior = {
          orderCount: orders.length,
          averageOrderValue: orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0) / orders.length,
          orderFrequency: this.calculateOrderFrequency(orders)
        };

        if (this.isUserBehaviorAnomaly(userBehavior, userBehaviorStats)) {
          anomalies.push({
            userId: user._id,
            email: user.email,
            behavior: userBehavior,
            anomalyType: 'unusual-pattern',
            severity: 'medium'
          });
        }
      }

      return {
        anomaliesDetected: anomalies.length,
        anomalies: anomalies.slice(0, 50),
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error detecting user behavior anomalies:', error);
      throw error;
    }
  }

  /**
   * Calculate transaction statistics
   */
  static calculateTransactionStats(transactions) {
    const amounts = transactions.map(t => t.totalAmount || 0);

    const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean: Math.round(mean),
      stdDev: Math.round(stdDev),
      min: Math.min(...amounts),
      max: Math.max(...amounts),
      median: this.calculateMedian(amounts),
      totalTransactions: transactions.length
    };
  }

  /**
   * Check if transaction is anomalous
   */
  static isTransactionAnomaly(transaction, stats) {
    const amount = transaction.totalAmount || 0;
    const zScore = (amount - stats.mean) / stats.stdDev;

    // Thresholds
    if (zScore > 3) {
      return {
        type: 'extreme-value',
        severity: 'high',
        reason: `Transaction amount (${amount}) is 3+ standard deviations above mean`
      };
    }

    if (zScore < -2 && amount > 0) {
      return {
        type: 'unusual-low-value',
        severity: 'low',
        reason: 'Unusually low transaction amount'
      };
    }

    if (transaction.itemCount > 100) {
      return {
        type: 'bulk-transaction',
        severity: 'medium',
        reason: `Unusually high item count: ${transaction.itemCount}`
      };
    }

    return null;
  }

  /**
   * Calculate user behavior statistics
   */
  static async calculateUserBehaviorStats() {
    try {
      const users = await User.find({ status: 'active' }).limit(1000);
      const orderCounts = [];
      const orderValues = [];

      for (const user of users) {
        const orders = await Order.find({ userId: user._id });
        orderCounts.push(orders.length);

        if (orders.length > 0) {
          const totalValue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
          orderValues.push(totalValue / orders.length);
        }
      }

      return {
        avgOrderCount: Math.round(orderCounts.reduce((sum, c) => sum + c, 0) / orderCounts.length),
        avgOrderValue: Math.round(orderValues.reduce((sum, v) => sum + v, 0) / orderValues.length),
        maxOrderCount: Math.max(...orderCounts),
        minOrderCount: Math.min(...orderCounts)
      };
    } catch (error) {
      logger.error('Error calculating user behavior stats:', error);
      return {
        avgOrderCount: 0,
        avgOrderValue: 0,
        maxOrderCount: 0,
        minOrderCount: 0
      };
    }
  }

  /**
   * Check if user behavior is anomalous
   */
  static isUserBehaviorAnomaly(userBehavior, stats) {
    // Detect anomalies if order count is 10x higher than average
    if (userBehavior.orderCount > stats.maxOrderCount * 1.5) {
      return true;
    }

    // Detect anomalies if order value is 5x higher than average
    if (userBehavior.averageOrderValue > stats.avgOrderValue * 5) {
      return true;
    }

    return false;
  }

  /**
   * Calculate order frequency
   */
  static calculateOrderFrequency(orders) {
    if (orders.length < 2) return 0;

    const timestamps = orders.map(o => o.createdAt.getTime()).sort((a, b) => a - b);
    let totalDays = 0;

    for (let i = 1; i < timestamps.length; i++) {
      totalDays += (timestamps[i] - timestamps[i - 1]) / (1000 * 60 * 60 * 24);
    }

    return timestamps.length / (totalDays || 1);
  }

  /**
   * Calculate median
   */
  static calculateMedian(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Get anomaly alerts
   */
  static async getAnomalyAlerts() {
    try {
      const transactionAnomalies = await this.detectTransactionAnomalies(24);
      const behaviorAnomalies = await this.detectUserBehaviorAnomalies();

      return {
        timestamp: new Date(),
        alerts: [
          {
            type: 'transaction',
            count: transactionAnomalies.anomaliesDetected,
            severity: 'high',
            data: transactionAnomalies.anomalies.slice(0, 5)
          },
          {
            type: 'behavior',
            count: behaviorAnomalies.anomaliesDetected,
            severity: 'medium',
            data: behaviorAnomalies.anomalies.slice(0, 5)
          }
        ],
        totalAlerts: transactionAnomalies.anomaliesDetected + behaviorAnomalies.anomaliesDetected
      };
    } catch (error) {
      logger.error('Error getting anomaly alerts:', error);
      throw error;
    }
  }
}

module.exports = AnomalyDetectionService;
