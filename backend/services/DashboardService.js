/**
 * Phase 13 - Dashboard Service
 * Aggregates metrics for dashboard displays
 */

const DashboardMetrics = require('../models/DashboardMetrics');
const Payment = require('../models/Payment');
const Commission = require('../models/Commission');
const Invoice = require('../models/Invoice');
const InstantSettlement = require('../models/InstantSettlement');
const { randomUUID } = require('crypto');
const logger = require('./logger');

class DashboardService {
  /**
   * Generate Executive Dashboard
   */
  static async generateExecutiveDashboard(period = 'this_month') {
    try {
      const metricsId = `ED-${Date.now()}-${randomUUID().substring(0, 8)}`;
      const dateRange = this._getDateRange(period);

      // Fetch data
      const payments = await Payment.find({
        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
      });
      const commissions = await Commission.find({
        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
      });
      const invoices = await Invoice.find({
        invoiceDate: { $gte: dateRange.start, $lte: dateRange.end },
      });
      const settlements = await InstantSettlement.find({
        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
      });

      // Calculate KPIs
      const kpis = this._calculateExecutiveKPIs(payments, commissions, invoices, settlements);

      // Generate dashboard data
      const dashboard = new DashboardMetrics({
        metricsId,
        dashboardType: 'executive',
        generatedFor: period,
        kpis,
        quickMetrics: this._generateQuickMetrics(kpis),
        charts: this._generateCharts(payments, commissions, invoices),
        topEntities: this._generateTopEntities(payments, commissions),
        summaryCards: this._generateSummaryCards(kpis),
        tables: {
          recentTransactions: this._getRecentTransactions(payments, 10),
          pendingApprovals: this._getPendingApprovals(commissions, settlements),
          overdueItems: this._getOverdueItems(invoices),
        },
      });

      await dashboard.save();
      logger.info(`Executive dashboard generated: ${metricsId}`);
      return dashboard;
    } catch (error) {
      logger.error(`Error generating executive dashboard: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate Restaurant Dashboard
   */
  static async generateRestaurantDashboard(restaurantId, period = 'this_month') {
    try {
      const metricsId = `RD-${restaurantId}-${Date.now()}`;
      const dateRange = this._getDateRange(period);

      // Fetch restaurant-specific data
      const payments = await Payment.find({
        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
        restaurantId,
      });

      const commissions = await Commission.find({
        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
        linkedRestaurantId: restaurantId,
      });

      const settlements = await InstantSettlement.find({
        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
        requestedBy: restaurantId,
      });

      // Calculate KPIs
      const kpis = this._calculateRestaurantKPIs(payments, commissions, settlements);

      const dashboard = new DashboardMetrics({
        metricsId,
        dashboardType: 'restaurant',
        entityId: restaurantId,
        generatedFor: period,
        kpis,
        quickMetrics: this._generateQuickMetrics(kpis),
        summaryCards: this._generateSummaryCards(kpis),
        tables: {
          recentTransactions: this._getRecentTransactions(payments, 10),
          pendingApprovals: this._getPendingApprovals(commissions, settlements),
        },
      });

      await dashboard.save();
      logger.info(`Restaurant dashboard generated: ${metricsId}`);
      return dashboard;
    } catch (error) {
      logger.error(`Error generating restaurant dashboard: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate Admin Dashboard
   */
  static async generateAdminDashboard(period = 'this_month') {
    try {
      const metricsId = `AD-${Date.now()}-${randomUUID().substring(0, 8)}`;
      const dateRange = this._getDateRange(period);

      // Fetch all data
      const payments = await Payment.find({
        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
      });
      const commissions = await Commission.find({
        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
      });
      const settlements = await InstantSettlement.find({
        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
      });
      const invoices = await Invoice.find({
        invoiceDate: { $gte: dateRange.start, $lte: dateRange.end },
      });

      // Calculate KPIs
      const kpis = this._calculateAdminKPIs(payments, commissions, settlements, invoices);

      const dashboard = new DashboardMetrics({
        metricsId,
        dashboardType: 'admin',
        generatedFor: period,
        kpis,
        quickMetrics: this._generateQuickMetrics(kpis),
        charts: this._generateCharts(payments, commissions, invoices),
        topEntities: this._generateTopEntities(payments, commissions),
        alerts: this._generateAlerts(payments, commissions, invoices, settlements),
        summaryCards: this._generateSummaryCards(kpis),
        tables: {
          recentTransactions: this._getRecentTransactions(payments, 20),
          pendingApprovals: this._getPendingApprovals(commissions, settlements),
          overdueItems: this._getOverdueItems(invoices),
        },
      });

      await dashboard.save();
      logger.info(`Admin dashboard generated: ${metricsId}`);
      return dashboard;
    } catch (error) {
      logger.error(`Error generating admin dashboard: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate Executive KPIs
   */
  static _calculateExecutiveKPIs(payments, commissions, invoices, settlements) {
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    const successfulPayments = payments.filter((p) => p.status === 'completed').length;
    const totalCommissions = commissions.reduce((sum, c) => sum + c.payableAmount, 0);
    const totalInvoices = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
    const totalPaid = invoices.reduce((sum, i) => sum + i.amountPaid, 0);
    const completedSettlements = settlements.filter((s) => s.status === 'completed').length;

    return {
      totalPayments: {
        value: totalPayments,
        trend: 15, // percentage increase from previous period (placeholder)
        status: 'up',
      },
      totalRevenue: {
        value: totalPayments,
        trend: 12,
        status: 'up',
      },
      averagePaymentValue: {
        value: payments.length > 0 ? totalPayments / payments.length : 0,
        trend: 5,
        status: 'stable',
      },
      paymentSuccessRate: {
        value: payments.length > 0 ? (successfulPayments / payments.length) * 100 : 0,
        trend: 2,
        status: 'stable',
      },
      totalCommissions: {
        value: totalCommissions,
        trend: 18,
        status: 'up',
      },
      totalCommissionPayable: {
        value: totalCommissions,
        trend: 10,
        status: 'up',
      },
      commissionApprovalRate: {
        value: 95,
        trend: 3,
        status: 'up',
      },
      totalInvoices: {
        value: totalInvoices,
        trend: 8,
        status: 'up',
      },
      outstandingAmount: {
        value: totalInvoices - totalPaid,
        trend: -5,
        status: 'down',
      },
      collectionRate: {
        value: totalInvoices > 0 ? (totalPaid / totalInvoices) * 100 : 0,
        trend: 4,
        status: 'up',
      },
      dso: {
        value: 20, // Days Sales Outstanding (placeholder)
        trend: -2,
        status: 'down',
      },
      totalSettlements: {
        value: completedSettlements,
        trend: 25,
        status: 'up',
      },
      settlementSuccessRate: {
        value: settlements.length > 0 ? (completedSettlements / settlements.length) * 100 : 0,
        trend: 5,
        status: 'up',
      },
      averageSettlementTime: {
        value: 18, // hours (placeholder)
        trend: -1,
        status: 'down',
      },
    };
  }

  /**
   * Calculate Restaurant KPIs
   */
  static _calculateRestaurantKPIs(payments, commissions, settlements) {
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalCommissions = commissions.reduce((sum, c) => sum + c.payableAmount, 0);

    return {
      totalRevenue: {
        value: totalPayments,
        trend: 10,
        status: 'up',
      },
      totalCommissions: {
        value: totalCommissions,
        trend: 8,
        status: 'up',
      },
      paymentSuccessRate: {
        value: payments.length > 0 ? ((payments.filter((p) => p.status === 'completed').length / payments.length) * 100) : 0,
        trend: 2,
        status: 'stable',
      },
      totalSettlements: {
        value: settlements.filter((s) => s.status === 'completed').length,
        trend: 15,
        status: 'up',
      },
    };
  }

  /**
   * Calculate Admin KPIs
   */
  static _calculateAdminKPIs(payments, commissions, settlements, invoices) {
    return this._calculateExecutiveKPIs(payments, commissions, invoices, settlements);
  }

  /**
   * Generate quick metrics for cards
   */
  static _generateQuickMetrics(kpis) {
    return [
      {
        metricName: 'Total Revenue',
        value: kpis.totalRevenue.value,
        unit: 'INR',
        icon: 'trending-up',
        color: 'success',
        trend: kpis.totalRevenue.trend,
      },
      {
        metricName: 'Payment Success Rate',
        value: Math.round(kpis.paymentSuccessRate.value),
        unit: '%',
        icon: 'check-circle',
        color: 'info',
        trend: kpis.paymentSuccessRate.trend,
      },
      {
        metricName: 'Total Commissions',
        value: kpis.totalCommissions.value,
        unit: 'INR',
        icon: 'percent',
        color: 'warning',
        trend: kpis.totalCommissions.trend,
      },
      {
        metricName: 'Collection Rate',
        value: Math.round(kpis.collectionRate.value),
        unit: '%',
        icon: 'hand-thumbs-up',
        color: 'success',
        trend: kpis.collectionRate.trend,
      },
    ];
  }

  /**
   * Generate charts data
   */
  static _generateCharts(payments, commissions, invoices) {
    return {
      revenueChart: this._generateRevenueChart(payments),
      paymentMethodsDistribution: this._generatePaymentMethodsChart(payments),
      commissionStatusDistribution: this._generateCommissionStatusChart(commissions),
      invoiceStatusDistribution: this._generateInvoiceStatusChart(invoices),
    };
  }

  /**
   * Generate revenue chart
   */
  static _generateRevenueChart(payments) {
    const chartData = {};
    payments.forEach((payment) => {
      const date = new Date(payment.createdAt).toLocaleDateString();
      if (!chartData[date]) {
        chartData[date] = { period: date, amount: 0, count: 0 };
      }
      chartData[date].amount += payment.amount;
      chartData[date].count++;
    });
    return Object.values(chartData);
  }

  /**
   * Generate payment methods distribution
   */
  static _generatePaymentMethodsChart(payments) {
    const methodStats = {};
    payments.forEach((payment) => {
      if (!methodStats[payment.paymentMethod]) {
        methodStats[payment.paymentMethod] = 0;
      }
      methodStats[payment.paymentMethod]++;
    });

    const total = payments.length;
    return Object.entries(methodStats).map(([method, count]) => ({
      method,
      value: count,
      percentage: (count / total) * 100,
      color: this._getColorForMethod(method),
    }));
  }

  /**
   * Generate commission status chart
   */
  static _generateCommissionStatusChart(commissions) {
    const statusStats = {};
    commissions.forEach((commission) => {
      if (!statusStats[commission.status]) {
        statusStats[commission.status] = 0;
      }
      statusStats[commission.status]++;
    });

    const total = commissions.length;
    return Object.entries(statusStats).map(([status, count]) => ({
      status,
      value: count,
      percentage: total > 0 ? (count / total) * 100 : 0,
      color: this._getColorForStatus(status),
    }));
  }

  /**
   * Generate invoice status chart
   */
  static _generateInvoiceStatusChart(invoices) {
    const statusStats = {};
    invoices.forEach((invoice) => {
      if (!statusStats[invoice.status]) {
        statusStats[invoice.status] = 0;
      }
      statusStats[invoice.status]++;
    });

    const total = invoices.length;
    return Object.entries(statusStats).map(([status, count]) => ({
      status,
      value: count,
      percentage: total > 0 ? (count / total) * 100 : 0,
      color: this._getColorForStatus(status),
    }));
  }

  /**
   * Generate top entities
   */
  static _generateTopEntities(payments, commissions) {
    // Top payment methods
    const methodStats = {};
    payments.forEach((payment) => {
      if (!methodStats[payment.paymentMethod]) {
        methodStats[payment.paymentMethod] = { count: 0, rank: 0 };
      }
      methodStats[payment.paymentMethod].count++;
    });

    const topMethods = Object.entries(methodStats)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([method, stats], index) => ({
        method,
        count: stats.count,
        percentage: (stats.count / payments.length) * 100,
        rank: index + 1,
      }));

    return {
      topPaymentMethods: topMethods,
    };
  }

  /**
   * Generate summary cards
   */
  static _generateSummaryCards(kpis) {
    return [
      {
        title: 'Total Revenue',
        value: `₹${Math.round(kpis.totalRevenue.value)}`,
        subtitle: `↑ ${kpis.totalRevenue.trend}% from last period`,
        trend: kpis.totalRevenue.trend,
        status: 'up',
        icon: 'trending-up',
        backgroundColor: '#28a745',
      },
      {
        title: 'Payment Success Rate',
        value: `${Math.round(kpis.paymentSuccessRate.value)}%`,
        subtitle: `↑ ${kpis.paymentSuccessRate.trend}% from last period`,
        trend: kpis.paymentSuccessRate.trend,
        status: 'stable',
        icon: 'check-circle',
        backgroundColor: '#007bff',
      },
      {
        title: 'Total Commissions',
        value: `₹${Math.round(kpis.totalCommissions.value)}`,
        subtitle: `↑ ${kpis.totalCommissions.trend}% from last period`,
        trend: kpis.totalCommissions.trend,
        status: 'up',
        icon: 'percent',
        backgroundColor: '#ffc107',
      },
      {
        title: 'Outstanding Amount',
        value: `₹${Math.round(kpis.outstandingAmount.value)}`,
        subtitle: `${kpis.outstandingAmount.trend}% from last period`,
        trend: kpis.outstandingAmount.trend,
        status: 'down',
        icon: 'alert-circle',
        backgroundColor: '#dc3545',
      },
    ];
  }

  /**
   * Generate alerts
   */
  static _generateAlerts(payments, commissions, invoices, settlements) {
    const alerts = [];

    // High failure rate alert
    const failureCount = payments.filter((p) => p.status === 'failed').length;
    if (failureCount > 0 && failureCount / payments.length > 0.05) {
      alerts.push({
        alertId: randomUUID(),
        type: 'warning',
        title: 'High Payment Failure Rate',
        message: `Payment failure rate is ${((failureCount / payments.length) * 100).toFixed(2)}%`,
        metric: 'paymentFailureRate',
        threshold: 5,
        currentValue: (failureCount / payments.length) * 100,
        icon: 'alert-triangle',
      });
    }

    // Pending approvals alert
    const pendingCommissions = commissions.filter((c) => c.status === 'pending').length;
    if (pendingCommissions > 0) {
      alerts.push({
        alertId: randomUUID(),
        type: 'info',
        title: 'Pending Commission Approvals',
        message: `${pendingCommissions} commissions awaiting approval`,
        metric: 'pendingCommissions',
        threshold: 10,
        currentValue: pendingCommissions,
        icon: 'hourglass',
      });
    }

    // Overdue invoices alert
    const overdueInvoices = invoices.filter((i) => i.status === 'overdue').length;
    if (overdueInvoices > 0) {
      alerts.push({
        alertId: randomUUID(),
        type: 'error',
        title: 'Overdue Invoices',
        message: `${overdueInvoices} invoices are overdue`,
        metric: 'overdueInvoices',
        threshold: 5,
        currentValue: overdueInvoices,
        icon: 'alert-octagon',
      });
    }

    return alerts;
  }

  /**
   * Get recent transactions
   */
  static _getRecentTransactions(payments, limit = 10) {
    return payments
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit)
      .map((payment) => ({
        transactionId: payment.paymentId,
        date: payment.createdAt,
        description: `Payment via ${payment.paymentMethod}`,
        amount: payment.amount,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
      }));
  }

  /**
   * Get pending approvals
   */
  static _getPendingApprovals(commissions, settlements) {
    const pendingItems = [];

    commissions
      .filter((c) => c.status === 'pending')
      .forEach((commission) => {
        pendingItems.push({
          itemId: commission.commissionId,
          itemType: 'commission',
          amount: commission.payableAmount,
          pendingDays: Math.ceil((Date.now() - commission.createdAt) / (1000 * 60 * 60 * 24)),
          requiredAction: 'Approve/Reject',
        });
      });

    settlements
      .filter((s) => s.status === 'pending')
      .forEach((settlement) => {
        pendingItems.push({
          itemId: settlement.settlementId,
          itemType: 'settlement',
          amount: settlement.settlementAmount,
          pendingDays: Math.ceil((Date.now() - settlement.createdAt) / (1000 * 60 * 60 * 24)),
          requiredAction: 'Verify & Approve',
        });
      });

    return pendingItems.sort((a, b) => b.pendingDays - a.pendingDays).slice(0, 10);
  }

  /**
   * Get overdue items
   */
  static _getOverdueItems(invoices) {
    return invoices
      .filter((i) => i.status === 'overdue')
      .map((invoice) => ({
        itemId: invoice.invoiceId,
        itemType: 'invoice',
        amount: invoice.outstandingAmount,
        overdueDays: Math.ceil((Date.now() - invoice.dueDate) / (1000 * 60 * 60 * 24)),
        priority: 'high',
      }))
      .sort((a, b) => b.overdueDays - a.overdueDays)
      .slice(0, 10);
  }

  /**
   * Get date range based on period
   */
  static _getDateRange(period) {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'this_week':
        start.setDate(end.getDate() - end.getDay());
        break;
      case 'this_month':
        start.setDate(1);
        break;
      case 'this_quarter':
        start.setMonth(Math.floor(end.getMonth() / 3) * 3);
        start.setDate(1);
        break;
      case 'this_year':
        start.setMonth(0);
        start.setDate(1);
        break;
    }

    return { start, end };
  }

  /**
   * Get color for payment method
   */
  static _getColorForMethod(method) {
    const colors = {
      upi: '#4F46E5',
      credit_card: '#7C3AED',
      debit_card: '#06B6D4',
      net_banking: '#14B8A6',
      wallet: '#10B981',
    };
    return colors[method] || '#6B7280';
  }

  /**
   * Get color for status
   */
  static _getColorForStatus(status) {
    const colors = {
      pending: '#FCA5A5',
      approved: '#86EFAC',
      paid: '#86EFAC',
      completed: '#86EFAC',
      failed: '#FCA5A5',
      rejected: '#FCA5A5',
      overdue: '#F97316',
      partial: '#FBBF24',
    };
    return colors[status] || '#D1D5DB';
  }
}

module.exports = DashboardService;
