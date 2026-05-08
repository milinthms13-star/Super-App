const RefundAnalytics = require('../models/RefundAnalytics');
const FoodDeliveryRefund = require('../models/FoodDeliveryRefund');

class RefundAnalyticsService {
  /**
   * Generate daily refund analytics
   */
  static async generateDailyAnalytics(date = new Date()) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const refunds = await FoodDeliveryRefund.find({
        initiatedAt: { $gte: startOfDay, $lte: endOfDay },
      });

      if (refunds.length === 0) {
        return null;
      }

      const analytics = this._calculateMetrics(refunds, 'daily', date);
      await RefundAnalytics.updateOne(
        {
          date: startOfDay,
          period: 'daily',
        },
        analytics,
        { upsert: true }
      );

      return analytics;
    } catch (error) {
      throw new Error(`Daily refund analytics failed: ${error.message}`);
    }
  }

  /**
   * Get refund analytics range
   */
  static async getAnalyticsRange(startDate, endDate, period = 'daily') {
    try {
      const analytics = await RefundAnalytics.find({
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
        period,
      }).sort({ date: -1 });

      return analytics;
    } catch (error) {
      throw new Error(`Failed to fetch refund analytics: ${error.message}`);
    }
  }

  /**
   * Get refund rate metrics
   */
  static async getRefundRateMetrics(startDate, endDate) {
    try {
      const analytics = await RefundAnalytics.find({
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      });

      const metrics = {
        totalRefunds: 0,
        approvalRate: 0,
        completionRate: 0,
        trend: [],
      };

      let totalRequests = 0;
      let totalApproved = 0;
      let totalCompleted = 0;

      analytics.forEach((day) => {
        totalRequests += day.totalRefunds;
        totalApproved += day.approvedRefunds;
        totalCompleted += day.completedRefunds;

        metrics.trend.push({
          date: day.date,
          total: day.totalRefunds,
          approved: day.approvedRefunds,
          completed: day.completedRefunds,
        });
      });

      metrics.totalRefunds = totalRequests;
      metrics.approvalRate = totalRequests > 0 ? (totalApproved / totalRequests) * 100 : 0;
      metrics.completionRate = totalRequests > 0 ? (totalCompleted / totalRequests) * 100 : 0;

      return metrics;
    } catch (error) {
      throw new Error(`Failed to get refund rate metrics: ${error.message}`);
    }
  }

  /**
   * Get refund reason analysis
   */
  static async getRefundReasonAnalysis(startDate, endDate) {
    try {
      const analytics = await RefundAnalytics.find({
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      });

      const reasons = {};

      analytics.forEach((day) => {
        Object.entries(day.byReason).forEach(([reason, data]) => {
          if (!reasons[reason]) {
            reasons[reason] = { count: 0, amount: 0 };
          }
          reasons[reason].count += data.count;
          reasons[reason].amount += data.amount;
        });
      });

      return reasons;
    } catch (error) {
      throw new Error(`Failed to get refund reason analysis: ${error.message}`);
    }
  }

  /**
   * Get refund method distribution
   */
  static async getRefundMethodDistribution(startDate, endDate) {
    try {
      const analytics = await RefundAnalytics.find({
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      });

      const methods = {
        original_payment: { count: 0, amount: 0 },
        wallet: { count: 0, amount: 0 },
        bank_transfer: { count: 0, amount: 0 },
      };

      analytics.forEach((day) => {
        Object.entries(day.byMethod).forEach(([method, data]) => {
          methods[method].count += data.count;
          methods[method].amount += data.amount;
        });
      });

      return methods;
    } catch (error) {
      throw new Error(`Failed to get refund method distribution: ${error.message}`);
    }
  }

  /**
   * Get approval workflow metrics
   */
  static async getApprovalMetrics(startDate, endDate) {
    try {
      const analytics = await RefundAnalytics.find({
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      });

      const metrics = {
        autoApprovedPercentage: 0,
        manualApprovalAvgTime: 0,
        approvalThroughput: 0,
      };

      let totalRefunds = 0;
      let totalAutoApproved = 0;
      let totalApprovalTime = 0;

      analytics.forEach((day) => {
        totalRefunds += day.totalRefunds;
        totalAutoApproved += day.autoApprovedRefunds;
        totalApprovalTime += day.avgApprovalTime;
      });

      if (totalRefunds > 0) {
        metrics.autoApprovedPercentage = (totalAutoApproved / totalRefunds) * 100;
        metrics.approvalThroughput = totalRefunds / analytics.length;
      }

      metrics.manualApprovalAvgTime = analytics.length > 0 ? 
        totalApprovalTime / analytics.length : 0;

      return metrics;
    } catch (error) {
      throw new Error(`Failed to get approval metrics: ${error.message}`);
    }
  }

  /**
   * Get refund processing time analysis
   */
  static async getProcessingTimeAnalysis(startDate, endDate) {
    try {
      const analytics = await RefundAnalytics.find({
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      });

      const analysis = {
        refundedWithin24Hours: 0,
        refundedWithin48Hours: 0,
        refundedWithin7Days: 0,
        pending: 0,
        avgProcessingTime: 0,
      };

      let totalProcessingTime = 0;

      analytics.forEach((day) => {
        analysis.refundedWithin24Hours += day.refundedWithin24Hours;
        analysis.refundedWithin48Hours += day.refundedWithin48Hours;
        analysis.refundedWithin7Days += day.refundedWithin7Days;
        analysis.pending += day.pendingRefundsOlderThan7Days;
        totalProcessingTime += day.avgProcessingTime;
      });

      analysis.avgProcessingTime = analytics.length > 0 ? 
        totalProcessingTime / analytics.length : 0;

      return analysis;
    } catch (error) {
      throw new Error(`Failed to get processing time analysis: ${error.message}`);
    }
  }

  /**
   * Get fraud risk metrics
   */
  static async getFraudMetrics(startDate, endDate) {
    try {
      const analytics = await RefundAnalytics.find({
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      });

      const metrics = {
        flaggedAsHighRisk: 0,
        fraudPreventedAmount: 0,
        avgFraudScore: 0,
        trend: [],
      };

      let totalScore = 0;

      analytics.forEach((day) => {
        metrics.flaggedAsHighRisk += day.flaggedAsHighRisk;
        metrics.fraudPreventedAmount += day.fraudPreventedAmount;
        totalScore += day.avgFraudScore;

        metrics.trend.push({
          date: day.date,
          flagged: day.flaggedAsHighRisk,
          prevented: day.fraudPreventedAmount,
        });
      });

      metrics.avgFraudScore = analytics.length > 0 ? totalScore / analytics.length : 0;

      return metrics;
    } catch (error) {
      throw new Error(`Failed to get fraud metrics: ${error.message}`);
    }
  }

  /**
   * Private: Calculate refund metrics
   */
  static _calculateMetrics(refunds, period, date) {
    const byReason = {
      customer_request: { count: 0, amount: 0 },
      order_cancelled: { count: 0, amount: 0 },
      order_not_delivered: { count: 0, amount: 0 },
      poor_quality: { count: 0, amount: 0 },
      wrong_order: { count: 0, amount: 0 },
      restaurant_unavailable: { count: 0, amount: 0 },
      delivery_failed: { count: 0, amount: 0 },
      duplicate_charge: { count: 0, amount: 0 },
      system_error: { count: 0, amount: 0 },
      other: { count: 0, amount: 0 },
    };

    const byMethod = {
      original_payment: { count: 0, amount: 0 },
      wallet: { count: 0, amount: 0 },
      bank_transfer: { count: 0, amount: 0 },
    };

    const byStatus = {
      initiated: 0,
      processing: 0,
      approved: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    let totalAmount = 0;
    let approvedAmount = 0;
    let completedAmount = 0;
    let totalRiskScore = 0;
    let highRiskCount = 0;

    refunds.forEach((refund) => {
      const amount = refund.refundAmount;

      byStatus[refund.status] = (byStatus[refund.status] || 0) + 1;

      if (byReason[refund.reason]) {
        byReason[refund.reason].count += 1;
        byReason[refund.reason].amount += amount;
      }

      if (byMethod[refund.refundMethod]) {
        byMethod[refund.refundMethod].count += 1;
        byMethod[refund.refundMethod].amount += amount;
      }

      totalAmount += amount;

      if (refund.status === 'approved') {
        approvedAmount += amount;
      } else if (refund.status === 'completed') {
        completedAmount += amount;
      }

      if (refund.riskScore > 70) {
        highRiskCount += 1;
      }

      totalRiskScore += refund.riskScore || 0;
    });

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    return {
      period,
      date: startOfDay,
      year: startOfDay.getFullYear(),
      month: startOfDay.getMonth() + 1,
      day: startOfDay.getDate(),
      totalRefunds: refunds.length,
      approvedRefunds: byStatus.approved,
      rejectedRefunds: byStatus.cancelled,
      completedRefunds: byStatus.completed,
      failedRefunds: byStatus.failed,
      totalRefundAmount: totalAmount,
      approvedRefundAmount: approvedAmount,
      completedRefundAmount: completedAmount,
      avgRefundAmount: refunds.length > 0 ? totalAmount / refunds.length : 0,
      byReason,
      byMethod,
      flaggedAsHighRisk: highRiskCount,
      avgFraudScore: refunds.length > 0 ? totalRiskScore / refunds.length : 0,
    };
  }
}

module.exports = RefundAnalyticsService;
