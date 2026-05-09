/**
 * AnalyticsOptimizationService.js
 * Phase 12: Real-Time Analytics & Dashboard Optimization
 * Caching strategies, dashboard metrics, BI features, performance optimization
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

class AnalyticsOptimizationService {
  // In-memory cache for dashboard metrics (would use Redis in production)
  static dashboardCache = new Map();
  static cacheExpiry = 5 * 60 * 1000; // 5 minutes

  /**
   * Get executive dashboard metrics
   */
  static async getExecutiveDashboardMetrics(filters = {}) {
    try {
      const cacheKey = `executive_dashboard_${filters.period || 'daily'}`;
      
      // Check cache
      const cached = this.dashboardCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return {
          success: true,
          message: 'Dashboard metrics retrieved from cache',
          data: { ...cached.data, fromCache: true }
        };
      }

      const db = mongoose.connection.db;
      const transactionCollection = db.collection('payment_transactions');
      const fraudCollection = db.collection('fraud_reports');
      const refundCollection = db.collection('refunds');

      const dateFilter = this._getDateFilter(filters.period || 'daily');

      // Parallel queries for performance
      const [transactions, fraudReports, refunds] = await Promise.all([
        transactionCollection.find(dateFilter).toArray(),
        fraudCollection.find(dateFilter).toArray(),
        refundCollection.find(dateFilter).toArray()
      ]);

      const completedTransactions = transactions.filter(t => t.status === 'completed');
      
      const metrics = {
        period: filters.period || 'daily',
        timestamp: new Date(),
        revenue: {
          totalRevenue: completedTransactions.reduce((sum, t) => sum + t.amount, 0),
          refundedAmount: refunds.reduce((sum, r) => sum + r.amount, 0),
          netRevenue: completedTransactions.reduce((sum, t) => sum + t.amount, 0) - 
                      refunds.reduce((sum, r) => sum + r.amount, 0),
          transactionCount: completedTransactions.length,
          avgOrderValue: 0
        },
        fraud: {
          fraudReportCount: fraudReports.length,
          fraudAmount: fraudReports.reduce((sum, f) => sum + f.amount, 0),
          fraudRate: transactions.length > 0 ? (fraudReports.length / transactions.length * 100) : 0
        },
        performance: {
          successRate: transactions.length > 0 ? (completedTransactions.length / transactions.length * 100) : 0,
          failureRate: transactions.length > 0 ? ((transactions.length - completedTransactions.length) / transactions.length * 100) : 0,
          avgProcessingTime: 0
        }
      };

      if (completedTransactions.length > 0) {
        metrics.revenue.avgOrderValue = metrics.revenue.totalRevenue / completedTransactions.length;
      }

      // Cache the metrics
      this.dashboardCache.set(cacheKey, {
        data: metrics,
        expiresAt: Date.now() + this.cacheExpiry
      });

      return {
        success: true,
        message: 'Executive dashboard metrics retrieved successfully',
        data: metrics
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get real-time payment flow metrics
   */
  static async getRealTimePaymentFlow(filters = {}) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('payment_transactions');

      // Last 30 minutes
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      const recentTransactions = await collection
        .find({ createdAt: { $gte: thirtyMinutesAgo } })
        .toArray();

      // Group by minute
      const flowByMinute = {};
      recentTransactions.forEach(t => {
        const minute = Math.floor(t.createdAt.getTime() / (60 * 1000));
        if (!flowByMinute[minute]) {
          flowByMinute[minute] = {
            timestamp: new Date(minute * 60 * 1000),
            count: 0,
            amount: 0,
            status: {}
          };
        }
        flowByMinute[minute].count += 1;
        flowByMinute[minute].amount += t.amount;
        flowByMinute[minute].status[t.status] = (flowByMinute[minute].status[t.status] || 0) + 1;
      });

      const flow = Object.values(flowByMinute).sort((a, b) => a.timestamp - b.timestamp);

      // Calculate velocity
      const avgTransactionsPerMinute = recentTransactions.length / 30;
      const currentTransactionRate = flow[flow.length - 1]?.count || 0;
      const velocity = (currentTransactionRate / avgTransactionsPerMinute * 100).toFixed(2);

      return {
        success: true,
        message: 'Real-time payment flow retrieved successfully',
        data: {
          totalTransactions: recentTransactions.length,
          totalAmount: recentTransactions.reduce((sum, t) => sum + t.amount, 0),
          avgTransactionsPerMinute: avgTransactionsPerMinute.toFixed(2),
          currentRate: currentTransactionRate,
          velocityChange: velocity,
          flow
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get fraud risk heatmap
   */
  static async getFraudRiskHeatmap(filters = {}) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('fraud_monitoring');

      const dateFilter = {
        createdAt: {
          $gte: new Date(filters.startDate || Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      };

      if (filters.endDate) {
        dateFilter.createdAt.$lte = new Date(filters.endDate);
      }

      const records = await collection
        .find(dateFilter)
        .toArray();

      // Group by hour and risk level
      const heatmap = {};
      records.forEach(r => {
        const hour = r.createdAt.getHours();
        const day = r.createdAt.getDay();
        const key = `${day}_${hour}`;

        if (!heatmap[key]) {
          heatmap[key] = {
            day,
            hour,
            minimal: 0,
            low: 0,
            medium: 0,
            high: 0,
            critical: 0
          };
        }

        if (r.riskScore < 20) heatmap[key].minimal += 1;
        else if (r.riskScore < 40) heatmap[key].low += 1;
        else if (r.riskScore < 60) heatmap[key].medium += 1;
        else if (r.riskScore < 80) heatmap[key].high += 1;
        else heatmap[key].critical += 1;
      });

      return {
        success: true,
        message: 'Fraud risk heatmap retrieved successfully',
        data: {
          heatmap: Object.values(heatmap),
          totalRecords: records.length,
          criticalCount: records.filter(r => r.riskScore >= 80).length
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get payment method trends
   */
  static async getPaymentMethodTrends(filters = {}) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('payment_transactions');

      const dateFilter = {
        createdAt: {
          $gte: new Date(filters.startDate || Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      };

      if (filters.endDate) {
        dateFilter.createdAt.$lte = new Date(filters.endDate);
      }

      const transactions = await collection
        .find(dateFilter)
        .toArray();

      // Group by method and day
      const trends = {};
      transactions.forEach(t => {
        const day = t.createdAt.toISOString().split('T')[0];
        const method = t.paymentMethodId || 'unknown';
        const key = `${day}_${method}`;

        if (!trends[key]) {
          trends[key] = {
            date: day,
            method,
            count: 0,
            amount: 0,
            successCount: 0
          };
        }

        trends[key].count += 1;
        trends[key].amount += t.amount;
        if (t.status === 'completed') {
          trends[key].successCount += 1;
        }
      });

      // Calculate success rates
      Object.values(trends).forEach(t => {
        t.successRate = Math.round((t.successCount / t.count) * 100);
      });

      return {
        success: true,
        message: 'Payment method trends retrieved successfully',
        data: {
          trends: Object.values(trends).sort((a, b) => new Date(a.date) - new Date(b.date)),
          totalTransactions: transactions.length
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get customer segmentation analytics
   */
  static async getCustomerSegmentation(filters = {}) {
    try {
      const db = mongoose.connection.db;
      const transactionCollection = db.collection('payment_transactions');

      const dateFilter = {
        status: 'completed',
        createdAt: {
          $gte: new Date(filters.startDate || Date.now() - 90 * 24 * 60 * 60 * 1000)
        }
      };

      if (filters.endDate) {
        dateFilter.createdAt.$lte = new Date(filters.endDate);
      }

      const transactions = await transactionCollection
        .find(dateFilter)
        .toArray();

      // Segment customers by transaction count and spending
      const userMetrics = {};
      transactions.forEach(t => {
        if (!userMetrics[t.userId]) {
          userMetrics[t.userId] = {
            transactionCount: 0,
            totalSpending: 0,
            lastTransaction: null
          };
        }
        userMetrics[t.userId].transactionCount += 1;
        userMetrics[t.userId].totalSpending += t.amount;
        userMetrics[t.userId].lastTransaction = t.createdAt;
      });

      // Categorize segments
      const segments = {
        high_value: [],      // >$1000 total, frequent
        regular: [],         // $500-1000, moderate frequency
        casual: [],          // <$500, infrequent
        dormant: []          // No recent transactions
      };

      Object.entries(userMetrics).forEach(([userId, metrics]) => {
        if (metrics.totalSpending > 1000 && metrics.transactionCount > 10) {
          segments.high_value.push({ userId, ...metrics });
        } else if (metrics.totalSpending > 500 && metrics.transactionCount > 5) {
          segments.regular.push({ userId, ...metrics });
        } else {
          segments.casual.push({ userId, ...metrics });
        }
      });

      return {
        success: true,
        message: 'Customer segmentation analytics retrieved successfully',
        data: {
          segments: {
            high_value: {
              count: segments.high_value.length,
              avgSpending: segments.high_value.length > 0 
                ? Math.round((segments.high_value.reduce((sum, s) => sum + s.totalSpending, 0) / segments.high_value.length) * 100) / 100
                : 0
            },
            regular: {
              count: segments.regular.length,
              avgSpending: segments.regular.length > 0 
                ? Math.round((segments.regular.reduce((sum, s) => sum + s.totalSpending, 0) / segments.regular.length) * 100) / 100
                : 0
            },
            casual: {
              count: segments.casual.length,
              avgSpending: segments.casual.length > 0 
                ? Math.round((segments.casual.reduce((sum, s) => sum + s.totalSpending, 0) / segments.casual.length) * 100) / 100
                : 0
            }
          }
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get anomaly detection report
   */
  static async getAnomalyDetectionReport(filters = {}) {
    try {
      const db = mongoose.connection.db;
      const transactionCollection = db.collection('payment_transactions');
      const fraudCollection = db.collection('fraud_monitoring');

      const dateFilter = {
        createdAt: {
          $gte: new Date(filters.startDate || Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      };

      if (filters.endDate) {
        dateFilter.createdAt.$lte = new Date(filters.endDate);
      }

      const transactions = await transactionCollection.find(dateFilter).toArray();
      const fraudMonitoring = await fraudCollection.find(dateFilter).toArray();

      // Calculate daily statistics
      const dailyStats = {};
      transactions.forEach(t => {
        const day = t.createdAt.toISOString().split('T')[0];
        if (!dailyStats[day]) {
          dailyStats[day] = { count: 0, amount: 0 };
        }
        dailyStats[day].count += 1;
        dailyStats[day].amount += t.amount;
      });

      const days = Object.values(dailyStats);
      const avgCount = days.length > 0 ? days.reduce((sum, d) => sum + d.count, 0) / days.length : 0;
      const avgAmount = days.length > 0 ? days.reduce((sum, d) => sum + d.amount, 0) / days.length : 0;

      // Detect anomalies
      const anomalies = [];
      Object.entries(dailyStats).forEach(([day, stats]) => {
        const countDeviation = Math.abs(stats.count - avgCount) / avgCount * 100;
        const amountDeviation = Math.abs(stats.amount - avgAmount) / avgAmount * 100;

        if (countDeviation > 30 || amountDeviation > 30) {
          anomalies.push({
            date: day,
            transactionCount: stats.count,
            totalAmount: Math.round(stats.amount * 100) / 100,
            countDeviation: Math.round(countDeviation),
            amountDeviation: Math.round(amountDeviation),
            severity: (countDeviation + amountDeviation) / 2 > 50 ? 'high' : 'medium'
          });
        }
      });

      return {
        success: true,
        message: 'Anomaly detection report retrieved successfully',
        data: {
          averageTransactionsPerDay: Math.round(avgCount),
          averageAmountPerDay: Math.round(avgAmount * 100) / 100,
          anomalyCount: anomalies.length,
          anomalies: anomalies.sort((a, b) => b.severity.localeCompare(a.severity))
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Clear cache
   */
  static clearCache(key) {
    if (key) {
      this.dashboardCache.delete(key);
      return { success: true, message: 'Cache entry cleared' };
    }

    this.dashboardCache.clear();
    return { success: true, message: 'All cache cleared' };
  }

  /**
   * Helper: Get date filter
   */
  static _getDateFilter(period) {
    let startDate;
    const now = new Date();

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    return {
      createdAt: { $gte: startDate, $lte: now }
    };
  }
}

module.exports = AnalyticsOptimizationService;
