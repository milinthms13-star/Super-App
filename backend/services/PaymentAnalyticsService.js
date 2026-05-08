const PaymentAnalytics = require('../models/PaymentAnalytics');
const FoodDeliveryPayment = require('../models/FoodDeliveryPayment');

class PaymentAnalyticsService {
  /**
   * Generate daily analytics for all payments
   */
  static async generateDailyAnalytics(date = new Date()) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch all payments for the day
      const payments = await FoodDeliveryPayment.find({
        initiatedAt: { $gte: startOfDay, $lte: endOfDay },
      });

      if (payments.length === 0) {
        return null;
      }

      const analytics = this._calculateMetrics(payments, 'daily', date);
      await PaymentAnalytics.updateOne(
        {
          date: startOfDay,
          period: 'daily',
        },
        analytics,
        { upsert: true }
      );

      return analytics;
    } catch (error) {
      throw new Error(`Daily analytics generation failed: ${error.message}`);
    }
  }

  /**
   * Generate hourly analytics
   */
  static async generateHourlyAnalytics(dateTime = new Date()) {
    try {
      const startOfHour = new Date(dateTime);
      startOfHour.setMinutes(0, 0, 0);
      const endOfHour = new Date(startOfHour);
      endOfHour.setHours(endOfHour.getHours() + 1);

      const payments = await FoodDeliveryPayment.find({
        initiatedAt: { $gte: startOfHour, $lt: endOfHour },
      });

      if (payments.length === 0) {
        return null;
      }

      const analytics = this._calculateMetrics(payments, 'hourly', dateTime);
      await PaymentAnalytics.updateOne(
        {
          date: startOfHour,
          period: 'hourly',
        },
        analytics,
        { upsert: true }
      );

      return analytics;
    } catch (error) {
      throw new Error(`Hourly analytics generation failed: ${error.message}`);
    }
  }

  /**
   * Get payment analytics for date range
   */
  static async getAnalyticsRange(startDate, endDate, period = 'daily') {
    try {
      const analytics = await PaymentAnalytics.find({
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
        period,
      }).sort({ date: -1 });

      return analytics;
    } catch (error) {
      throw new Error(`Failed to fetch analytics: ${error.message}`);
    }
  }

  /**
   * Get current period analytics
   */
  static async getCurrentAnalytics(period = 'daily') {
    try {
      const now = new Date();
      let startDate;

      if (period === 'daily') {
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
      } else if (period === 'weekly') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
      } else if (period === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const analytics = await PaymentAnalytics.findOne({
        date: { $gte: startDate },
        period,
      }).sort({ date: -1 });

      return analytics;
    } catch (error) {
      throw new Error(`Failed to get current analytics: ${error.message}`);
    }
  }

  /**
   * Get payment method comparison
   */
  static async getPaymentMethodComparison(startDate, endDate) {
    try {
      const analytics = await PaymentAnalytics.find({
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      });

      const comparison = {
        upi: { totalTransactions: 0, totalAmount: 0, successRate: 0 },
        card: { totalTransactions: 0, totalAmount: 0, successRate: 0 },
        netbanking: { totalTransactions: 0, totalAmount: 0, successRate: 0 },
        wallet: { totalTransactions: 0, totalAmount: 0, successRate: 0 },
        cod: { totalTransactions: 0, totalAmount: 0, successRate: 0 },
      };

      analytics.forEach((day) => {
        Object.keys(comparison).forEach((method) => {
          comparison[method].totalTransactions += day.byPaymentMethod[method]?.count || 0;
          comparison[method].totalAmount += day.byPaymentMethod[method]?.amount || 0;
        });
      });

      return comparison;
    } catch (error) {
      throw new Error(`Failed to get payment method comparison: ${error.message}`);
    }
  }

  /**
   * Get fraud metrics
   */
  static async getFraudMetrics(startDate, endDate) {
    try {
      const analytics = await PaymentAnalytics.find({
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      });

      const fraudMetrics = {
        totalDetections: 0,
        totalHighRiskTransactions: 0,
        avgRiskScore: 0,
        trend: [],
      };

      let totalScore = 0;

      analytics.forEach((day) => {
        fraudMetrics.totalDetections += day.fraudDetections;
        fraudMetrics.totalHighRiskTransactions += day.highRiskTransactions;
        totalScore += day.avgRiskScore;

        fraudMetrics.trend.push({
          date: day.date,
          detections: day.fraudDetections,
          highRisk: day.highRiskTransactions,
        });
      });

      fraudMetrics.avgRiskScore = analytics.length > 0 ? totalScore / analytics.length : 0;

      return fraudMetrics;
    } catch (error) {
      throw new Error(`Failed to get fraud metrics: ${error.message}`);
    }
  }

  /**
   * Get success rate metrics
   */
  static async getSuccessRateMetrics(startDate, endDate) {
    try {
      const analytics = await PaymentAnalytics.find({
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      });

      const metrics = {
        overallSuccessRate: 0,
        byPaymentMethod: {},
        trend: [],
      };

      let totalTransactions = 0;
      let totalSuccessful = 0;

      analytics.forEach((day) => {
        totalTransactions += day.totalTransactions;
        totalSuccessful += day.successfulTransactions;

        metrics.trend.push({
          date: day.date,
          successRate: day.totalTransactions > 0 ? 
            (day.successfulTransactions / day.totalTransactions) * 100 : 0,
        });
      });

      metrics.overallSuccessRate = totalTransactions > 0 ? 
        (totalSuccessful / totalTransactions) * 100 : 0;

      return metrics;
    } catch (error) {
      throw new Error(`Failed to get success rate metrics: ${error.message}`);
    }
  }

  /**
   * Get performance metrics
   */
  static async getPerformanceMetrics(startDate, endDate) {
    try {
      const analytics = await PaymentAnalytics.find({
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      });

      const metrics = {
        avgAuthorizationTime: 0,
        avgCaptureTime: 0,
        p95AuthorizationTime: 0,
        p99AuthorizationTime: 0,
      };

      const authTimes = [];
      const captureTimes = [];

      analytics.forEach((day) => {
        metrics.avgAuthorizationTime += day.avgAuthorizationTime;
        metrics.avgCaptureTime += day.avgCaptureTime;
        authTimes.push(day.p95AuthorizationTime);
      });

      if (analytics.length > 0) {
        metrics.avgAuthorizationTime = metrics.avgAuthorizationTime / analytics.length;
        metrics.avgCaptureTime = metrics.avgCaptureTime / analytics.length;
        metrics.p95AuthorizationTime = Math.max(...authTimes);
      }

      return metrics;
    } catch (error) {
      throw new Error(`Failed to get performance metrics: ${error.message}`);
    }
  }

  /**
   * Private: Calculate metrics from payment data
   */
  static _calculateMetrics(payments, period, date) {
    const byPaymentMethod = {
      upi: { count: 0, amount: 0, successRate: 0 },
      card: { count: 0, amount: 0, successRate: 0 },
      netbanking: { count: 0, amount: 0, successRate: 0 },
      wallet: { count: 0, amount: 0, successRate: 0 },
      cod: { count: 0, amount: 0, successRate: 0 },
    };

    const byStatus = {
      pending: 0,
      processing: 0,
      success: 0,
      failed: 0,
      refunded: 0,
    };

    let totalAmount = 0;
    let successfulAmount = 0;
    let failedAmount = 0;
    let refundedAmount = 0;
    let fraudDetections = 0;
    let highRiskCount = 0;
    let uniqueUsers = new Set();
    let totalRiskScore = 0;

    payments.forEach((payment) => {
      const method = payment.paymentMethod;
      const amount = payment.amount;

      // Count by method
      byPaymentMethod[method].count += 1;
      byPaymentMethod[method].amount += amount;

      // Count by status
      byStatus[payment.status] += 1;

      totalAmount += amount;

      if (payment.status === 'success') {
        successfulAmount += amount;
      } else if (payment.status === 'failed') {
        failedAmount += amount;
      } else if (payment.status === 'refunded') {
        refundedAmount += amount;
      }

      // Fraud metrics
      if (payment.fraudFlags && payment.fraudFlags.length > 0) {
        fraudDetections += 1;
      }

      if (payment.riskScore > 70) {
        highRiskCount += 1;
      }

      totalRiskScore += payment.riskScore || 0;
      uniqueUsers.add(payment.userId.toString());
    });

    // Calculate success rates
    Object.keys(byPaymentMethod).forEach((method) => {
      if (byPaymentMethod[method].count > 0) {
        const successCount = payments.filter(
          (p) => p.paymentMethod === method && p.status === 'success'
        ).length;
        byPaymentMethod[method].successRate = 
          (successCount / byPaymentMethod[method].count) * 100;
      }
    });

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    return {
      period,
      date: startOfDay,
      year: startOfDay.getFullYear(),
      month: startOfDay.getMonth() + 1,
      day: startOfDay.getDate(),
      hour: startOfDay.getHours(),
      totalTransactions: payments.length,
      successfulTransactions: byStatus.success,
      failedTransactions: byStatus.failed,
      refundedTransactions: byStatus.refunded,
      totalAmount,
      successfulAmount,
      failedAmount,
      refundedAmount,
      avgTransactionAmount: payments.length > 0 ? totalAmount / payments.length : 0,
      byPaymentMethod,
      byStatus,
      fraudDetections,
      highRiskTransactions: highRiskCount,
      avgRiskScore: payments.length > 0 ? totalRiskScore / payments.length : 0,
      uniqueUsers: uniqueUsers.size,
    };
  }
}

module.exports = PaymentAnalyticsService;
