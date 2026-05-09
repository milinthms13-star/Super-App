/**
 * Phase 13 - Metrics Service
 * Real-time metrics calculation and tracking
 */

const Payment = require('../models/Payment');
const Commission = require('../models/Commission');
const Invoice = require('../models/Invoice');
const InstantSettlement = require('../models/InstantSettlement');
const logger = require('./logger');

class MetricsService {
  /**
   * Calculate payment metrics for a date range
   */
  static async getPaymentMetrics(startDate, endDate) {
    try {
      const payments = await Payment.find({
        createdAt: { $gte: startDate, $lte: endDate },
      });

      const completed = payments.filter((p) => p.status === 'completed');
      const failed = payments.filter((p) => p.status === 'failed');

      return {
        totalTransactions: payments.length,
        successfulTransactions: completed.length,
        failedTransactions: failed.length,
        totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
        successAmount: completed.reduce((sum, p) => sum + p.amount, 0),
        failAmount: failed.reduce((sum, p) => sum + p.amount, 0),
        successRate: payments.length > 0 ? (completed.length / payments.length) * 100 : 0,
        failureRate: payments.length > 0 ? (failed.length / payments.length) * 100 : 0,
        averageAmount: payments.length > 0 ? payments.reduce((sum, p) => sum + p.amount, 0) / payments.length : 0,
      };
    } catch (error) {
      logger.error(`Error calculating payment metrics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate commission metrics
   */
  static async getCommissionMetrics(startDate, endDate) {
    try {
      const commissions = await Commission.find({
        createdAt: { $gte: startDate, $lte: endDate },
      });

      const approved = commissions.filter((c) => c.status === 'approved');
      const pending = commissions.filter((c) => c.status === 'pending');
      const settled = commissions.filter((c) => c.status === 'settled');

      return {
        totalCommissions: commissions.length,
        totalAmount: commissions.reduce((sum, c) => sum + c.commissionAmount, 0),
        totalTax: commissions.reduce((sum, c) => sum + c.totalTax, 0),
        totalPayable: commissions.reduce((sum, c) => sum + c.payableAmount, 0),
        pendingCount: pending.length,
        approvedCount: approved.length,
        settledCount: settled.length,
        approvalRate: commissions.length > 0 ? (approved.length / commissions.length) * 100 : 0,
        averageCommission: commissions.length > 0 ? commissions.reduce((sum, c) => sum + c.commissionAmount, 0) / commissions.length : 0,
      };
    } catch (error) {
      logger.error(`Error calculating commission metrics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate invoice metrics
   */
  static async getInvoiceMetrics(startDate, endDate) {
    try {
      const invoices = await Invoice.find({
        invoiceDate: { $gte: startDate, $lte: endDate },
      });

      const paid = invoices.filter((i) => i.status === 'paid');
      const overdue = invoices.filter((i) => i.status === 'overdue');

      return {
        totalInvoices: invoices.length,
        totalAmount: invoices.reduce((sum, i) => sum + i.totalAmount, 0),
        totalTax: invoices.reduce((sum, i) => sum + i.totalAmount * 0.18, 0),
        totalPaid: invoices.reduce((sum, i) => sum + i.amountPaid, 0),
        totalOutstanding: invoices.reduce((sum, i) => sum + i.outstandingAmount, 0),
        paidInvoices: paid.length,
        overdueInvoices: overdue.length,
        collectionRate: invoices.length > 0 ? (paid.length / invoices.length) * 100 : 0,
        averageInvoiceValue: invoices.length > 0 ? invoices.reduce((sum, i) => sum + i.totalAmount, 0) / invoices.length : 0,
      };
    } catch (error) {
      logger.error(`Error calculating invoice metrics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate settlement metrics
   */
  static async getSettlementMetrics(startDate, endDate) {
    try {
      const settlements = await InstantSettlement.find({
        createdAt: { $gte: startDate, $lte: endDate },
      });

      const completed = settlements.filter((s) => s.status === 'completed');
      const pending = settlements.filter((s) => s.status === 'pending');
      const failed = settlements.filter((s) => s.status === 'failed');

      return {
        totalSettlements: settlements.length,
        totalAmount: settlements.reduce((sum, s) => sum + s.settlementAmount, 0),
        totalFees: settlements.reduce((sum, s) => sum + s.settlementFee, 0),
        netAmount: settlements.reduce((sum, s) => sum + s.netAmount, 0),
        pendingCount: pending.length,
        completedCount: completed.length,
        failedCount: failed.length,
        successRate: settlements.length > 0 ? (completed.length / settlements.length) * 100 : 0,
        averageAmount: settlements.length > 0 ? settlements.reduce((sum, s) => sum + s.settlementAmount, 0) / settlements.length : 0,
      };
    } catch (error) {
      logger.error(`Error calculating settlement metrics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate combined business metrics
   */
  static async getBusinessMetrics(startDate, endDate) {
    try {
      const [paymentMetrics, commissionMetrics, invoiceMetrics, settlementMetrics] = await Promise.all([
        this.getPaymentMetrics(startDate, endDate),
        this.getCommissionMetrics(startDate, endDate),
        this.getInvoiceMetrics(startDate, endDate),
        this.getSettlementMetrics(startDate, endDate),
      ]);

      return {
        payments: paymentMetrics,
        commissions: commissionMetrics,
        invoices: invoiceMetrics,
        settlements: settlementMetrics,
        combinedMetrics: {
          totalRevenue: paymentMetrics.totalAmount,
          totalCosts: commissionMetrics.totalPayable + invoiceMetrics.totalTax,
          netProfit: paymentMetrics.totalAmount - (commissionMetrics.totalPayable + invoiceMetrics.totalTax),
          profitMargin:
            paymentMetrics.totalAmount > 0
              ? ((paymentMetrics.totalAmount - (commissionMetrics.totalPayable + invoiceMetrics.totalTax)) /
                  paymentMetrics.totalAmount) *
                100
              : 0,
        },
      };
    } catch (error) {
      logger.error(`Error calculating business metrics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get trend data for period comparison
   */
  static async getTrendData(metric, startDate, endDate, interval = 'daily') {
    try {
      let data = [];

      switch (metric) {
        case 'revenue':
          data = await this._getRevenueTrend(startDate, endDate, interval);
          break;
        case 'commissions':
          data = await this._getCommissionTrend(startDate, endDate, interval);
          break;
        case 'invoices':
          data = await this._getInvoiceTrend(startDate, endDate, interval);
          break;
        case 'settlements':
          data = await this._getSettlementTrend(startDate, endDate, interval);
          break;
      }

      return data;
    } catch (error) {
      logger.error(`Error getting trend data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get revenue trend
   */
  static async _getRevenueTrend(startDate, endDate, interval) {
    const payments = await Payment.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'completed',
    });

    return this._aggregateByInterval(payments, interval, (p) => p.amount);
  }

  /**
   * Get commission trend
   */
  static async _getCommissionTrend(startDate, endDate, interval) {
    const commissions = await Commission.find({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    return this._aggregateByInterval(commissions, interval, (c) => c.payableAmount);
  }

  /**
   * Get invoice trend
   */
  static async _getInvoiceTrend(startDate, endDate, interval) {
    const invoices = await Invoice.find({
      invoiceDate: { $gte: startDate, $lte: endDate },
    });

    return this._aggregateByInterval(invoices, interval, (i) => i.totalAmount);
  }

  /**
   * Get settlement trend
   */
  static async _getSettlementTrend(startDate, endDate, interval) {
    const settlements = await InstantSettlement.find({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    return this._aggregateByInterval(settlements, interval, (s) => s.settlementAmount);
  }

  /**
   * Aggregate data by interval
   */
  static _aggregateByInterval(items, interval, valueExtractor) {
    const aggregated = {};

    items.forEach((item) => {
      const date = new Date(item.createdAt || item.invoiceDate);
      const key = this._getIntervalKey(date, interval);

      if (!aggregated[key]) {
        aggregated[key] = { period: key, value: 0, count: 0 };
      }

      aggregated[key].value += valueExtractor(item);
      aggregated[key].count++;
    });

    return Object.values(aggregated).sort((a, b) => new Date(a.period) - new Date(b.period));
  }

  /**
   * Get interval key for date
   */
  static _getIntervalKey(date, interval) {
    switch (interval) {
      case 'daily':
        return date.toLocaleDateString('en-IN');
      case 'weekly':
        const week = Math.ceil(date.getDate() / 7);
        return `${date.getFullYear()}-W${week}`;
      case 'monthly':
        return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });
      case 'yearly':
        return date.getFullYear().toString();
      default:
        return date.toLocaleDateString('en-IN');
    }
  }

  /**
   * Get comparison with previous period
   */
  static async getPeriodComparison(metric, currentStart, currentEnd, previousStart, previousEnd) {
    try {
      const currentMetrics = await this.getBusinessMetrics(currentStart, currentEnd);
      const previousMetrics = await this.getBusinessMetrics(previousStart, previousEnd);

      const metricsKey = metric.toLowerCase();
      const current = currentMetrics[metricsKey] || currentMetrics.combinedMetrics;
      const previous = previousMetrics[metricsKey] || previousMetrics.combinedMetrics;

      const comparison = {};
      Object.keys(current).forEach((key) => {
        const currentValue = current[key];
        const previousValue = previous[key] || 0;

        if (typeof currentValue === 'number') {
          const growth = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
          comparison[key] = {
            current: currentValue,
            previous: previousValue,
            growth,
            status: growth > 0 ? 'up' : growth < 0 ? 'down' : 'stable',
          };
        }
      });

      return comparison;
    } catch (error) {
      logger.error(`Error getting period comparison: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get KPI snapshot
   */
  static async getKPISnapshot() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const metrics = await this.getBusinessMetrics(today, tomorrow);

      return {
        timestamp: new Date(),
        dailyMetrics: {
          revenue: metrics.payments.totalAmount,
          transactions: metrics.payments.totalTransactions,
          successRate: metrics.payments.successRate,
          commissions: metrics.commissions.totalAmount,
          invoices: metrics.invoices.totalInvoices,
          collections: metrics.invoices.totalPaid,
          settlements: metrics.settlements.completedCount,
        },
      };
    } catch (error) {
      logger.error(`Error getting KPI snapshot: ${error.message}`);
      throw error;
    }
  }
}

module.exports = MetricsService;
