/**
 * Aging Analysis Service - Phase 13
 * Invoice and payment aging analysis
 */

const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const logger = require('./logger');

class AgingAnalysisService {
  /**
   * Calculate aging buckets for invoices
   */
  static async getInvoiceAgingAnalysis(filters = {}) {
    try {
      const invoices = await Invoice.find({
        ...filters,
        status: { $ne: 'cancelled' }
      });

      const agingBuckets = {
        current: {
          name: 'Current (0-30 days)',
          invoices: [],
          count: 0,
          totalAmount: 0,
          percentage: 0,
          oldestDate: null
        },
        days31_60: {
          name: '31-60 days',
          invoices: [],
          count: 0,
          totalAmount: 0,
          percentage: 0,
          oldestDate: null
        },
        days61_90: {
          name: '61-90 days',
          invoices: [],
          count: 0,
          totalAmount: 0,
          percentage: 0,
          oldestDate: null
        },
        days91_120: {
          name: '91-120 days',
          invoices: [],
          count: 0,
          totalAmount: 0,
          percentage: 0,
          oldestDate: null
        },
        days120plus: {
          name: '120+ days',
          invoices: [],
          count: 0,
          totalAmount: 0,
          percentage: 0,
          oldestDate: null
        }
      };

      const now = new Date();
      let totalAmount = 0;

      invoices.forEach(invoice => {
        const daysOverdue = this.calculateDaysOld(invoice.createdAt, now);
        const invoiceAmount = invoice.totalAmount || 0;

        let bucket;
        if (daysOverdue <= 30) {
          bucket = agingBuckets.current;
        } else if (daysOverdue <= 60) {
          bucket = agingBuckets.days31_60;
        } else if (daysOverdue <= 90) {
          bucket = agingBuckets.days61_90;
        } else if (daysOverdue <= 120) {
          bucket = agingBuckets.days91_120;
        } else {
          bucket = agingBuckets.days120plus;
        }

        bucket.invoices.push({
          invoiceId: invoice._id,
          amount: invoiceAmount,
          daysOverdue: daysOverdue,
          dueDate: invoice.dueDate,
          customer: invoice.billTo?.name || 'Unknown',
          status: invoice.status
        });

        bucket.count += 1;
        bucket.totalAmount += invoiceAmount;
        totalAmount += invoiceAmount;

        if (!bucket.oldestDate || invoice.createdAt < bucket.oldestDate) {
          bucket.oldestDate = invoice.createdAt;
        }
      });

      // Calculate percentages
      Object.keys(agingBuckets).forEach(key => {
        if (totalAmount > 0) {
          agingBuckets[key].percentage = ((agingBuckets[key].totalAmount / totalAmount) * 100).toFixed(2);
        }
      });

      logger.info('Invoice aging analysis completed', {
        totalInvoices: invoices.length,
        totalAmount
      });

      return {
        summary: {
          totalInvoices: invoices.length,
          totalOutstandingAmount: totalAmount,
          analysisDate: now
        },
        agingBuckets,
        overallStats: this.calculateOverallStats(agingBuckets)
      };
    } catch (error) {
      logger.error('Error calculating invoice aging:', error);
      throw error;
    }
  }

  /**
   * Calculate payment aging analysis
   */
  static async getPaymentAgingAnalysis(filters = {}) {
    try {
      const payments = await Payment.find({
        ...filters,
        status: 'completed'
      });

      const agingBuckets = {
        recent: {
          name: 'Recent (0-7 days)',
          payments: [],
          count: 0,
          totalAmount: 0,
          percentage: 0
        },
        week_2: {
          name: '8-14 days',
          payments: [],
          count: 0,
          totalAmount: 0,
          percentage: 0
        },
        week_3_4: {
          name: '15-30 days',
          payments: [],
          count: 0,
          totalAmount: 0,
          percentage: 0
        },
        month_2: {
          name: '31-60 days',
          payments: [],
          count: 0,
          totalAmount: 0,
          percentage: 0
        },
        older: {
          name: '60+ days',
          payments: [],
          count: 0,
          totalAmount: 0,
          percentage: 0
        }
      };

      const now = new Date();
      let totalAmount = 0;

      payments.forEach(payment => {
        const daysOld = this.calculateDaysOld(payment.createdAt, now);
        const paymentAmount = payment.amount || 0;

        let bucket;
        if (daysOld <= 7) {
          bucket = agingBuckets.recent;
        } else if (daysOld <= 14) {
          bucket = agingBuckets.week_2;
        } else if (daysOld <= 30) {
          bucket = agingBuckets.week_3_4;
        } else if (daysOld <= 60) {
          bucket = agingBuckets.month_2;
        } else {
          bucket = agingBuckets.older;
        }

        bucket.payments.push({
          paymentId: payment._id,
          amount: paymentAmount,
          method: payment.paymentMethod,
          date: payment.createdAt
        });

        bucket.count += 1;
        bucket.totalAmount += paymentAmount;
        totalAmount += paymentAmount;
      });

      // Calculate percentages
      Object.keys(agingBuckets).forEach(key => {
        if (totalAmount > 0) {
          agingBuckets[key].percentage = ((agingBuckets[key].totalAmount / totalAmount) * 100).toFixed(2);
        }
      });

      return {
        summary: {
          totalPayments: payments.length,
          totalAmount,
          analysisDate: now
        },
        agingBuckets
      };
    } catch (error) {
      logger.error('Error calculating payment aging:', error);
      throw error;
    }
  }

  /**
   * Get collection status and metrics
   */
  static async getCollectionMetrics(filters = {}) {
    try {
      const unpaidInvoices = await Invoice.find({
        ...filters,
        status: { $in: ['draft', 'sent', 'viewed'] }
      });

      const paidInvoices = await Invoice.find({
        ...filters,
        status: 'paid'
      });

      const totalInvoiced = unpaidInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0) +
        paidInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
      const totalCollected = paidInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
      const collectionRate = totalInvoiced > 0 ? ((totalCollected / totalInvoiced) * 100).toFixed(2) : 0;

      // Calculate average days to payment
      const paidWithDates = paidInvoices.filter(i => i.createdAt && i.paidDate);
      const averageDaysToPayment = paidWithDates.length > 0
        ? (paidWithDates.reduce((sum, i) => {
          return sum + this.calculateDaysOld(i.createdAt, i.paidDate);
        }, 0) / paidWithDates.length).toFixed(2)
        : 0;

      // Trend analysis
      const trend = this.analyzeTrend(unpaidInvoices, paidInvoices);

      return {
        metrics: {
          totalInvoiced,
          totalCollected,
          outstanding: totalInvoiced - totalCollected,
          collectionRate,
          averageDaysToPayment,
          invoiceCount: unpaidInvoices.length + paidInvoices.length,
          outstandingCount: unpaidInvoices.length,
          paidCount: paidInvoices.length
        },
        trend,
        topDelinquent: this.getTopDelinquentInvoices(unpaidInvoices, 10)
      };
    } catch (error) {
      logger.error('Error calculating collection metrics:', error);
      throw error;
    }
  }

  /**
   * Get delinquent invoices
   */
  static async getDelinquentInvoices(filters = {}, limit = 20) {
    try {
      const invoices = await Invoice.find({
        ...filters,
        status: { $in: ['draft', 'sent', 'viewed'] },
        dueDate: { $lt: new Date() }
      })
        .sort({ dueDate: 1 })
        .limit(limit);

      return invoices.map(inv => ({
        invoiceId: inv._id,
        amount: inv.totalAmount,
        daysOverdue: this.calculateDaysOld(inv.dueDate, new Date()),
        customer: inv.billTo?.name || 'Unknown',
        dueDate: inv.dueDate,
        status: inv.status,
        priority: this.assignPriority(inv.dueDate)
      }));
    } catch (error) {
      logger.error('Error fetching delinquent invoices:', error);
      throw error;
    }
  }

  /**
   * Calculate days between two dates
   */
  static calculateDaysOld(startDate, endDate) {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((endDate - new Date(startDate)) / msPerDay);
  }

  /**
   * Assign priority based on days overdue
   */
  static assignPriority(dueDate) {
    const daysOverdue = this.calculateDaysOld(dueDate, new Date());
    if (daysOverdue > 120) return 'critical';
    if (daysOverdue > 60) return 'high';
    if (daysOverdue > 30) return 'medium';
    return 'low';
  }

  /**
   * Get top delinquent invoices
   */
  static getTopDelinquentInvoices(invoices, limit = 10) {
    return invoices
      .sort((a, b) => this.calculateDaysOld(b.createdAt, new Date()) - this.calculateDaysOld(a.createdAt, new Date()))
      .slice(0, limit)
      .map(inv => ({
        invoiceId: inv._id,
        amount: inv.totalAmount,
        daysOverdue: this.calculateDaysOld(inv.createdAt, new Date()),
        customer: inv.billTo?.name || 'Unknown',
        priority: this.assignPriority(inv.dueDate)
      }));
  }

  /**
   * Analyze collection trend
   */
  static analyzeTrend(unpaidInvoices, paidInvoices) {
    const now = new Date();
    const weeks = [];

    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);

      const weekPaid = paidInvoices.filter(inv => {
        const invoiceWeek = new Date(inv.paidDate);
        return invoiceWeek >= weekStart && invoiceWeek <= new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      });

      weeks.unshift({
        week: i,
        collected: weekPaid.reduce((sum, i) => sum + (i.totalAmount || 0), 0),
        invoiceCount: weekPaid.length
      });
    }

    return weeks;
  }

  /**
   * Calculate overall stats
   */
  static calculateOverallStats(agingBuckets) {
    const totalAmount = Object.values(agingBuckets).reduce((sum, bucket) => sum + bucket.totalAmount, 0);
    const totalInvoices = Object.values(agingBuckets).reduce((sum, bucket) => sum + bucket.count, 0);

    const highRisk = (agingBuckets.days91_120.totalAmount + agingBuckets.days120plus.totalAmount) / totalAmount * 100 || 0;

    return {
      totalAmount,
      totalInvoices,
      highRiskPercentage: highRiskPercentage.toFixed(2),
      mostCommonBucket: this.getMostCommonBucket(agingBuckets)
    };
  }

  /**
   * Get most common aging bucket
   */
  static getMostCommonBucket(agingBuckets) {
    let maxBucket = null;
    let maxAmount = 0;

    Object.entries(agingBuckets).forEach(([key, bucket]) => {
      if (bucket.totalAmount > maxAmount) {
        maxAmount = bucket.totalAmount;
        maxBucket = bucket.name;
      }
    });

    return maxBucket;
  }
}

module.exports = AgingAnalysisService;
