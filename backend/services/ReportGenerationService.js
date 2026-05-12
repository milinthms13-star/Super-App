/**
 * Phase 13 - Report Generation Service
 * Generates payment, commission, invoice, and settlement reports
 */

const PaymentAnalytics = require('../models/PaymentAnalytics');
const CommissionReport = require('../models/CommissionReport');
const InvoiceAnalytics = require('../models/InvoiceAnalytics');
const SettlementReport = require('../models/SettlementReport');
const Payment = require('../models/Payment');
const Commission = require('../models/Commission');
const Invoice = require('../models/Invoice');
const InstantSettlement = require('../models/InstantSettlement');
const { randomUUID } = require('crypto');
const logger = require('./logger');

class ReportGenerationService {
  /**
   * Generate Payment Analytics Report
   */
  static async generatePaymentAnalytics(startDate, endDate, period) {
    try {
      const analyticsId = `PA-${Date.now()}-${randomUUID().substring(0, 8)}`;

      // Fetch payments in range
      const payments = await Payment.find({
        createdAt: { $gte: startDate, $lte: endDate },
      });

      if (payments.length === 0) {
        return this._createEmptyPaymentAnalytics(analyticsId, startDate, endDate, period);
      }

      // Calculate metrics
      const metrics = this._calculatePaymentMetrics(payments);

      const analytics = new PaymentAnalytics({
        analyticsId,
        period,
        startDate,
        endDate,
        totalPayments: metrics.totalPayments,
        revenue: metrics.revenue,
        successRate: metrics.successRate,
        averagePaymentValue: metrics.averagePaymentValue,
        medianPaymentValue: metrics.medianPaymentValue,
        largestPaymentValue: metrics.largestPaymentValue,
        smallestPaymentValue: metrics.smallestPaymentValue,
        paymentMethodBreakdown: metrics.paymentMethodBreakdown,
        gatewayPerformance: metrics.gatewayPerformance,
        hourlyDistribution: metrics.hourlyDistribution,
        dayOfWeekDistribution: metrics.dayOfWeekDistribution,
        uniqueCustomers: metrics.uniqueCustomers,
        returningCustomerPercentage: metrics.returningCustomerPercentage,
        newCustomerCount: metrics.newCustomerCount,
        averageTransactionsPerCustomer: metrics.averageTransactionsPerCustomer,
        topMerchants: metrics.topMerchants,
        topCustomers: metrics.topCustomers,
        status: 'finalized',
      });

      await analytics.save();
      logger.info(`Payment analytics report generated: ${analyticsId}`);
      return analytics;
    } catch (error) {
      logger.error(`Error generating payment analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate Commission Report
   */
  static async generateCommissionReport(startDate, endDate, period) {
    try {
      const reportId = `CR-${Date.now()}-${randomUUID().substring(0, 8)}`;

      // Fetch commissions in range
      const commissions = await Commission.find({
        createdAt: { $gte: startDate, $lte: endDate },
      });

      if (commissions.length === 0) {
        return this._createEmptyCommissionReport(reportId, startDate, endDate, period);
      }

      // Calculate metrics
      const metrics = this._calculateCommissionMetrics(commissions);

      const report = new CommissionReport({
        reportId,
        period,
        startDate,
        endDate,
        totalCommissions: metrics.totalCommissions,
        byStatus: metrics.byStatus,
        byType: metrics.byType,
        byRestaurant: metrics.byRestaurant,
        approvalMetrics: metrics.approvalMetrics,
        payoutMetrics: metrics.payoutMetrics,
        taxAnalysis: metrics.taxAnalysis,
        commissionRateAnalysis: metrics.commissionRateAnalysis,
        onHoldAnalysis: metrics.onHoldAnalysis,
        topRestaurants: metrics.topRestaurants,
        dailyCommissionTrend: metrics.dailyCommissionTrend,
        disputeMetrics: metrics.disputeMetrics,
        status: 'finalized',
      });

      await report.save();
      logger.info(`Commission report generated: ${reportId}`);
      return report;
    } catch (error) {
      logger.error(`Error generating commission report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate Invoice Analytics Report
   */
  static async generateInvoiceAnalytics(startDate, endDate, period) {
    try {
      const analyticsId = `IA-${Date.now()}-${randomUUID().substring(0, 8)}`;

      // Fetch invoices in range
      const invoices = await Invoice.find({
        invoiceDate: { $gte: startDate, $lte: endDate },
      });

      if (invoices.length === 0) {
        return this._createEmptyInvoiceAnalytics(analyticsId, startDate, endDate, period);
      }

      // Calculate metrics
      const metrics = this._calculateInvoiceMetrics(invoices);

      const analytics = new InvoiceAnalytics({
        analyticsId,
        period,
        startDate,
        endDate,
        totalInvoices: metrics.totalInvoices,
        byStatus: metrics.byStatus,
        agingBucket: metrics.agingBucket,
        collectionMetrics: metrics.collectionMetrics,
        valueAnalysis: metrics.valueAnalysis,
        byInvoiceType: metrics.byInvoiceType,
        paymentMethodBreakdown: metrics.paymentMethodBreakdown,
        taxAnalysis: metrics.taxAnalysis,
        sendChannelAnalysis: metrics.sendChannelAnalysis,
        overdueAnalysis: metrics.overdueAnalysis,
        topCustomers: metrics.topCustomers,
        dailyInvoiceTrend: metrics.dailyInvoiceTrend,
        dso: metrics.dso,
        discountAnalysis: metrics.discountAnalysis,
        status: 'finalized',
      });

      await analytics.save();
      logger.info(`Invoice analytics report generated: ${analyticsId}`);
      return analytics;
    } catch (error) {
      logger.error(`Error generating invoice analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate Settlement Report
   */
  static async generateSettlementReport(startDate, endDate, period) {
    try {
      const reportId = `SR-${Date.now()}-${randomUUID().substring(0, 8)}`;

      // Fetch settlements in range
      const settlements = await InstantSettlement.find({
        createdAt: { $gte: startDate, $lte: endDate },
      });

      if (settlements.length === 0) {
        return this._createEmptySettlementReport(reportId, startDate, endDate, period);
      }

      // Calculate metrics
      const metrics = this._calculateSettlementMetrics(settlements);

      const report = new SettlementReport({
        reportId,
        period,
        startDate,
        endDate,
        totalSettlements: metrics.totalSettlements,
        byStatus: metrics.byStatus,
        byGateway: metrics.byGateway,
        byPayoutMethod: metrics.byPayoutMethod,
        approvalMetrics: metrics.approvalMetrics,
        verificationMetrics: metrics.verificationMetrics,
        processingMetrics: metrics.processingMetrics,
        feeAnalysis: metrics.feeAnalysis,
        varianceAnalysis: metrics.varianceAnalysis,
        delayMetrics: metrics.delayMetrics,
        failureAnalysis: metrics.failureAnalysis,
        topRecipients: metrics.topRecipients,
        dailySettlementTrend: metrics.dailySettlementTrend,
        status: 'finalized',
      });

      await report.save();
      logger.info(`Settlement report generated: ${reportId}`);
      return report;
    } catch (error) {
      logger.error(`Error generating settlement report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate payment metrics
   */
  static _calculatePaymentMetrics(payments) {
    const metrics = {
      totalPayments: {
        count: payments.length,
        successCount: 0,
        failureCount: 0,
        pendingCount: 0,
      },
      revenue: {
        totalAmount: 0,
        byPaymentMethod: {
          upi: 0,
          creditCard: 0,
          debitCard: 0,
          netBanking: 0,
          wallet: 0,
          other: 0,
        },
        byGateway: {
          razorpay: 0,
          stripe: 0,
          paytm: 0,
        },
      },
      paymentMethodBreakdown: [],
      gatewayPerformance: [],
      hourlyDistribution: [],
      dayOfWeekDistribution: [],
    };

    // Aggregate by status, method, gateway
    const methodStats = {};
    const gatewayStats = {};

    payments.forEach((payment) => {
      // Status counts
      metrics.totalPayments[`${payment.status}Count`]++;
      metrics.revenue.totalAmount += payment.amount;

      // Payment method
      if (payment.paymentMethod && metrics.revenue.byPaymentMethod[payment.paymentMethod] !== undefined) {
        metrics.revenue.byPaymentMethod[payment.paymentMethod] += payment.amount;
      }

      // Gateway
      if (payment.paymentGateway && metrics.revenue.byGateway[payment.paymentGateway] !== undefined) {
        metrics.revenue.byGateway[payment.paymentGateway] += payment.amount;
      }

      // Method stats
      if (!methodStats[payment.paymentMethod]) {
        methodStats[payment.paymentMethod] = { count: 0, amount: 0, success: 0 };
      }
      methodStats[payment.paymentMethod].count++;
      methodStats[payment.paymentMethod].amount += payment.amount;
      if (payment.status === 'completed') methodStats[payment.paymentMethod].success++;

      // Gateway stats
      if (!gatewayStats[payment.paymentGateway]) {
        gatewayStats[payment.paymentGateway] = { count: 0, amount: 0, success: 0 };
      }
      gatewayStats[payment.paymentGateway].count++;
      gatewayStats[payment.paymentGateway].amount += payment.amount;
      if (payment.status === 'completed') gatewayStats[payment.paymentGateway].success++;
    });

    // Build method breakdown
    Object.entries(methodStats).forEach(([method, stats]) => {
      metrics.paymentMethodBreakdown.push({
        method,
        totalTransactions: stats.count,
        totalAmount: stats.amount,
        successRate: (stats.success / stats.count) * 100,
        averageValue: stats.amount / stats.count,
      });
    });

    // Build gateway performance
    Object.entries(gatewayStats).forEach(([gateway, stats]) => {
      metrics.gatewayPerformance.push({
        gateway,
        totalTransactions: stats.count,
        totalAmount: stats.amount,
        successRate: (stats.success / stats.count) * 100,
        averageProcessingTime: 500, // placeholder
        failureRate: ((stats.count - stats.success) / stats.count) * 100,
      });
    });

    // Calculate overall success rate
    metrics.successRate = (metrics.totalPayments.successCount / metrics.totalPayments.count) * 100;

    // Calculate payment values
    const amounts = payments.map((p) => p.amount).sort((a, b) => a - b);
    metrics.averagePaymentValue = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    metrics.medianPaymentValue = amounts[Math.floor(amounts.length / 2)];
    metrics.largestPaymentValue = Math.max(...amounts);
    metrics.smallestPaymentValue = Math.min(...amounts);

    // Unique customers (simplified)
    const uniqueCustomers = new Set(payments.map((p) => p.userId));
    metrics.uniqueCustomers = uniqueCustomers.size;
    metrics.averageTransactionsPerCustomer = payments.length / metrics.uniqueCustomers;

    return metrics;
  }

  /**
   * Calculate commission metrics
   */
  static _calculateCommissionMetrics(commissions) {
    const metrics = {
      totalCommissions: {
        count: commissions.length,
        totalAmount: 0,
        totalTax: 0,
        totalPayable: 0,
      },
      byStatus: {},
      byType: [],
    };

    commissions.forEach((commission) => {
      metrics.totalCommissions.totalAmount += commission.commissionAmount;
      metrics.totalCommissions.totalTax += commission.totalTax;
      metrics.totalCommissions.totalPayable += commission.payableAmount;

      // By status
      if (!metrics.byStatus[commission.status]) {
        metrics.byStatus[commission.status] = { count: 0, amount: 0 };
      }
      metrics.byStatus[commission.status].count++;
      metrics.byStatus[commission.status].amount += commission.payableAmount;
    });

    return metrics;
  }

  /**
   * Calculate invoice metrics
   */
  static _calculateInvoiceMetrics(invoices) {
    const metrics = {
      totalInvoices: {
        count: invoices.length,
        totalAmount: 0,
        totalTaxAmount: 0,
        totalAmountPaid: 0,
        totalOutstanding: 0,
      },
      byStatus: {},
      collectionMetrics: {
        paidInvoices: 0,
        unpaidInvoices: 0,
        collectionRate: 0,
      },
    };

    invoices.forEach((invoice) => {
      metrics.totalInvoices.totalAmount += invoice.totalAmount;
      metrics.totalInvoices.totalTaxAmount += invoice.totalAmount * 0.18; // GST 18%
      metrics.totalInvoices.totalAmountPaid += invoice.amountPaid;
      metrics.totalInvoices.totalOutstanding += invoice.outstandingAmount;

      if (invoice.status === 'paid') metrics.collectionMetrics.paidInvoices++;
      if (invoice.outstandingAmount > 0) metrics.collectionMetrics.unpaidInvoices++;
    });

    metrics.collectionMetrics.collectionRate =
      (metrics.totalInvoices.totalAmountPaid / metrics.totalInvoices.totalAmount) * 100;

    return metrics;
  }

  /**
   * Calculate settlement metrics
   */
  static _calculateSettlementMetrics(settlements) {
    const metrics = {
      totalSettlements: {
        count: settlements.length,
        totalAmount: 0,
        totalFees: 0,
        netAmount: 0,
      },
      byStatus: {},
    };

    settlements.forEach((settlement) => {
      metrics.totalSettlements.totalAmount += settlement.settlementAmount;
      metrics.totalSettlements.totalFees += settlement.settlementFee;
      metrics.totalSettlements.netAmount += settlement.netAmount;

      if (!metrics.byStatus[settlement.status]) {
        metrics.byStatus[settlement.status] = { count: 0, amount: 0 };
      }
      metrics.byStatus[settlement.status].count++;
      metrics.byStatus[settlement.status].amount += settlement.settlementAmount;
    });

    return metrics;
  }

  /**
   * Create empty analytics (no data)
   */
  static _createEmptyPaymentAnalytics(id, startDate, endDate, period) {
    return new PaymentAnalytics({
      analyticsId: id,
      period,
      startDate,
      endDate,
      totalPayments: { count: 0, successCount: 0, failureCount: 0, pendingCount: 0 },
      revenue: {
        totalAmount: 0,
        byPaymentMethod: {},
        byGateway: {},
      },
      successRate: 0,
      status: 'finalized',
    });
  }

  /**
   * Create empty commission report
   */
  static _createEmptyCommissionReport(id, startDate, endDate, period) {
    return new CommissionReport({
      reportId: id,
      period,
      startDate,
      endDate,
      totalCommissions: { count: 0, totalAmount: 0, totalTax: 0, totalPayable: 0 },
      byStatus: {},
      status: 'finalized',
    });
  }

  /**
   * Create empty invoice analytics
   */
  static _createEmptyInvoiceAnalytics(id, startDate, endDate, period) {
    return new InvoiceAnalytics({
      analyticsId: id,
      period,
      startDate,
      endDate,
      totalInvoices: { count: 0, totalAmount: 0, totalTaxAmount: 0, totalAmountPaid: 0, totalOutstanding: 0 },
      byStatus: {},
      status: 'finalized',
    });
  }

  /**
   * Create empty settlement report
   */
  static _createEmptySettlementReport(id, startDate, endDate, period) {
    return new SettlementReport({
      reportId: id,
      period,
      startDate,
      endDate,
      totalSettlements: { count: 0, totalAmount: 0, totalFees: 0, netAmount: 0 },
      byStatus: {},
      status: 'finalized',
    });
  }
}

module.exports = ReportGenerationService;
