/**
 * PaymentAnalyticsService.js
 * Phase 11: Payment Analytics & Reporting
 * Transaction analytics, revenue reports, payment method analysis, trends
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

class PaymentAnalyticsService {
  /**
   * Get transaction analytics
   */
  static async getTransactionAnalytics(filters = {}) {
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
        .lean()
        .toArray();

      // Calculate metrics
      const analytics = {
        totalTransactions: transactions.length,
        totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
        avgTransactionAmount: transactions.length > 0
          ? Math.round((transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length) * 100) / 100
          : 0,
        completedTransactions: transactions.filter(t => t.status === 'completed').length,
        failedTransactions: transactions.filter(t => t.status === 'failed').length,
        processingTransactions: transactions.filter(t => t.status === 'processing').length,
        successRate: transactions.length > 0
          ? Math.round((transactions.filter(t => t.status === 'completed').length / transactions.length) * 100)
          : 0,
        byStatus: this._groupByStatus(transactions),
        byCurrency: this._groupByCurrency(transactions),
        byPaymentMethod: await this._groupByPaymentMethod(transactions),
        transactionsByDay: this._groupByDay(transactions),
        period: {
          startDate: dateFilter.createdAt.$gte,
          endDate: filters.endDate ? new Date(filters.endDate) : new Date()
        }
      };

      return {
        success: true,
        message: 'Transaction analytics retrieved successfully',
        data: analytics
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get revenue report
   */
  static async getRevenueReport(filters = {}) {
    try {
      const db = mongoose.connection.db;
      const transactionCollection = db.collection('payment_transactions');
      const refundCollection = db.collection('refunds');

      const dateFilter = {
        createdAt: {
          $gte: new Date(filters.startDate || Date.now() - 90 * 24 * 60 * 60 * 1000)
        }
      };

      if (filters.endDate) {
        dateFilter.createdAt.$lte = new Date(filters.endDate);
      }

      // Get transactions
      const completedTransactions = await transactionCollection
        .find({ ...dateFilter, status: 'completed' })
        .lean()
        .toArray();

      // Get refunds
      const refunds = await refundCollection
        .find({ ...dateFilter, status: 'completed' })
        .lean()
        .toArray();

      const grossRevenue = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
      const refundedAmount = refunds.reduce((sum, r) => sum + r.amount, 0);
      const netRevenue = grossRevenue - refundedAmount;

      const report = {
        period: {
          startDate: dateFilter.createdAt.$gte,
          endDate: filters.endDate ? new Date(filters.endDate) : new Date()
        },
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        refundedAmount: Math.round(refundedAmount * 100) / 100,
        netRevenue: Math.round(netRevenue * 100) / 100,
        transactionCount: completedTransactions.length,
        refundCount: refunds.length,
        refundRate: completedTransactions.length > 0
          ? Math.round((refunds.length / completedTransactions.length) * 100)
          : 0,
        avgOrderValue: completedTransactions.length > 0
          ? Math.round((grossRevenue / completedTransactions.length) * 100) / 100
          : 0,
        revenueByCurrency: this._groupByCurrencyWithAmount(completedTransactions),
        revenueByPaymentMethod: await this._groupByPaymentMethodWithAmount(completedTransactions),
        revenueByDay: this._groupByDayWithAmount(completedTransactions),
        topRides: this._getTopRidesByRevenue(completedTransactions, 10),
        topUsers: this._getTopUsersByRevenue(completedTransactions, 10)
      };

      return {
        success: true,
        message: 'Revenue report retrieved successfully',
        data: report
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get payment method analysis
   */
  static async getPaymentMethodAnalysis(filters = {}) {
    try {
      const db = mongoose.connection.db;
      const methodCollection = db.collection('payment_methods');
      const transactionCollection = db.collection('payment_transactions');

      const dateFilter = {
        createdAt: {
          $gte: new Date(filters.startDate || Date.now() - 90 * 24 * 60 * 60 * 1000)
        }
      };

      if (filters.endDate) {
        dateFilter.createdAt.$lte = new Date(filters.endDate);
      }

      // Get all payment methods
      const methods = await methodCollection.find({}).lean().toArray();

      // Get transactions
      const transactions = await transactionCollection
        .find(dateFilter)
        .lean()
        .toArray();

      // Analyze each payment method
      const methodAnalysis = {};

      for (const method of methods) {
        const methodTransactions = transactions.filter(t => t.paymentMethodId === method.paymentMethodId);
        
        if (methodTransactions.length > 0) {
          methodAnalysis[method.methodType] = {
            methodType: method.methodType,
            provider: method.provider,
            count: methodTransactions.length,
            amount: Math.round(methodTransactions.reduce((sum, t) => sum + t.amount, 0) * 100) / 100,
            successfulCount: methodTransactions.filter(t => t.status === 'completed').length,
            failedCount: methodTransactions.filter(t => t.status === 'failed').length,
            successRate: Math.round((methodTransactions.filter(t => t.status === 'completed').length / methodTransactions.length) * 100),
            avgAmount: Math.round((methodTransactions.reduce((sum, t) => sum + t.amount, 0) / methodTransactions.length) * 100) / 100
          };
        }
      }

      return {
        success: true,
        message: 'Payment method analysis retrieved successfully',
        data: {
          methodAnalysis,
        period: {
          startDate: dateFilter.createdAt.$gte,
          endDate: filters.endDate ? new Date(filters.endDate) : new Date()
        }
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get conversion metrics
   */
  static async getConversionMetrics(filters = {}) {
    try {
      const db = mongoose.connection.db;
      const methodCollection = db.collection('payment_methods');
      const transactionCollection = db.collection('payment_transactions');

      const dateFilter = {
        createdAt: {
          $gte: new Date(filters.startDate || Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      };

      if (filters.endDate) {
        dateFilter.createdAt.$lte = new Date(filters.endDate);
      }

      // Count unique users with payment methods
      const usersWithMethods = await methodCollection.distinct('userId');
      
      // Count users with completed transactions
      const transactingUsers = await transactionCollection.distinct('userId', {
        ...dateFilter,
        status: 'completed'
      });

      // Count users with failed transactions
      const failedTransactionUsers = await transactionCollection.distinct('userId', {
        ...dateFilter,
        status: 'failed'
      });

      const metrics = {
        registeredUsers: usersWithMethods.length,
        transactingUsers: transactingUsers.length,
        conversionRate: Math.round((transactingUsers.length / usersWithMethods.length) * 100),
        failureRate: failedTransactionUsers.length > 0
          ? Math.round((failedTransactionUsers.length / transactingUsers.length) * 100)
          : 0,
        repeatCustomerRate: await this._calculateRepeatCustomerRate(transactionCollection, dateFilter),
        averageCustomerLifetimeValue: await this._calculateCLTV(transactionCollection),
        period: {
          startDate: dateFilter.createdAt.$gte,
          endDate: filters.endDate ? new Date(filters.endDate) : new Date()
        }
      };

      return {
        success: true,
        message: 'Conversion metrics retrieved successfully',
        data: metrics
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get payment trends
   */
  static async getPaymentTrends(filters = {}) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('payment_transactions');

      const dateFilter = {
        createdAt: {
          $gte: new Date(filters.startDate || Date.now() - 90 * 24 * 60 * 60 * 1000)
        }
      };

      if (filters.endDate) {
        dateFilter.createdAt.$lte = new Date(filters.endDate);
      }

      const transactions = await collection
        .find(dateFilter)
        .sort({ createdAt: 1 })
        .lean()
        .toArray();

      const trends = {
        dailyTransactionCount: this._getTrendByDay(transactions, 'count'),
        dailyRevenue: this._getTrendByDay(transactions, 'revenue'),
        dailyAverageOrderValue: this._getTrendByDay(transactions, 'aov'),
        weeklyTrend: this._getTrendByWeek(transactions),
        monthlyTrend: this._getTrendByMonth(transactions),
        growthRate: this._calculateGrowthRate(transactions),
        peak: {
          dayOfWeek: this._getPeakDay(transactions),
          hourOfDay: this._getPeakHour(transactions),
          timeOfMonth: this._getPeakTimeOfMonth(transactions)
        },
        forecast: await this._forecastNextPeriod(transactions)
      };

      return {
        success: true,
        message: 'Payment trends retrieved successfully',
        data: trends
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get fraud statistics
   */
  static async getFraudStatistics(filters = {}) {
    try {
      const db = mongoose.connection.db;
      const reportCollection = db.collection('fraud_reports');
      const transactionCollection = db.collection('payment_transactions');

      const dateFilter = {
        createdAt: {
          $gte: new Date(filters.startDate || Date.now() - 90 * 24 * 60 * 60 * 1000)
        }
      };

      if (filters.endDate) {
        dateFilter.createdAt.$lte = new Date(filters.endDate);
      }

      const fraudReports = await reportCollection
        .find(dateFilter)
        .lean()
        .toArray();

      const transactions = await transactionCollection
        .find(dateFilter)
        .lean()
        .toArray();

      const fraudAmount = fraudReports.reduce((sum, r) => sum + r.amount, 0);
      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

      const stats = {
        fraudReportCount: fraudReports.length,
        fraudAmount: Math.round(fraudAmount * 100) / 100,
        fraudRate: transactions.length > 0
          ? Math.round((fraudReports.length / transactions.length) * 100 * 100) / 100
          : 0,
        fraudPercentageOfRevenue: totalAmount > 0
          ? Math.round((fraudAmount / totalAmount) * 100 * 100) / 100
          : 0,
        fraudByType: this._groupFraudByType(fraudReports),
        topFraudUsers: fraudReports.slice(0, 10),
        period: {
          startDate: dateFilter.createdAt.$gte,
          endDate: filters.endDate ? new Date(filters.endDate) : new Date()
        }
      };

      return {
        success: true,
        message: 'Fraud statistics retrieved successfully',
        data: stats
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Export analytics report
   */
  static async exportAnalyticsReport(reportType, filters = {}) {
    try {
      let report;

      switch (reportType) {
        case 'transaction':
          report = await this.getTransactionAnalytics(filters);
          break;
        case 'revenue':
          report = await this.getRevenueReport(filters);
          break;
        case 'payment_method':
          report = await this.getPaymentMethodAnalysis(filters);
          break;
        case 'conversion':
          report = await this.getConversionMetrics(filters);
          break;
        case 'trends':
          report = await this.getPaymentTrends(filters);
          break;
        case 'fraud':
          report = await this.getFraudStatistics(filters);
          break;
        default:
          throw new Error('Invalid report type');
      }

      if (!report.success) {
        throw new Error(report.message);
      }

      const reportId = `rpt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      const db = mongoose.connection.db;
      const collection = db.collection('analytics_reports');

      const reportRecord = {
        reportId,
        reportType,
        filters,
        data: report.data,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };

      await collection.insertOne(reportRecord);

      return {
        success: true,
        message: 'Analytics report generated successfully',
        data: {
          reportId,
          reportType,
          ...report.data
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Helper: Group by status
   */
  static _groupByStatus(transactions) {
    const grouped = {};
    transactions.forEach(t => {
      grouped[t.status] = (grouped[t.status] || 0) + 1;
    });
    return grouped;
  }

  /**
   * Helper: Group by currency
   */
  static _groupByCurrency(transactions) {
    const grouped = {};
    transactions.forEach(t => {
      grouped[t.currency] = (grouped[t.currency] || 0) + 1;
    });
    return grouped;
  }

  /**
   * Helper: Group by currency with amount
   */
  static _groupByCurrencyWithAmount(transactions) {
    const grouped = {};
    transactions.forEach(t => {
      if (!grouped[t.currency]) {
        grouped[t.currency] = { count: 0, amount: 0 };
      }
      grouped[t.currency].count += 1;
      grouped[t.currency].amount += t.amount;
    });
    return grouped;
  }

  /**
   * Helper: Group by payment method
   */
  static async _groupByPaymentMethod(transactions) {
    const grouped = {};
    transactions.forEach(t => {
      const method = t.paymentMethodId || 'unknown';
      grouped[method] = (grouped[method] || 0) + 1;
    });
    return grouped;
  }

  /**
   * Helper: Group by payment method with amount
   */
  static async _groupByPaymentMethodWithAmount(transactions) {
    const grouped = {};
    transactions.forEach(t => {
      const method = t.paymentMethodId || 'unknown';
      if (!grouped[method]) {
        grouped[method] = { count: 0, amount: 0 };
      }
      grouped[method].count += 1;
      grouped[method].amount += t.amount;
    });
    return grouped;
  }

  /**
   * Helper: Group by day
   */
  static _groupByDay(transactions) {
    const grouped = {};
    transactions.forEach(t => {
      const day = t.createdAt.toISOString().split('T')[0];
      grouped[day] = (grouped[day] || 0) + 1;
    });
    return grouped;
  }

  /**
   * Helper: Group by day with amount
   */
  static _groupByDayWithAmount(transactions) {
    const grouped = {};
    transactions.forEach(t => {
      const day = t.createdAt.toISOString().split('T')[0];
      if (!grouped[day]) {
        grouped[day] = { count: 0, amount: 0 };
      }
      grouped[day].count += 1;
      grouped[day].amount += t.amount;
    });
    return grouped;
  }

  /**
   * Helper: Get top rides by revenue
   */
  static _getTopRidesByRevenue(transactions, limit = 10) {
    return transactions
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit)
      .map(t => ({
        rideId: t.rideId,
        amount: t.amount,
        currency: t.currency,
        createdAt: t.createdAt
      }));
  }

  /**
   * Helper: Get top users by revenue
   */
  static _getTopUsersByRevenue(transactions, limit = 10) {
    const grouped = {};
    transactions.forEach(t => {
      if (!grouped[t.userId]) {
        grouped[t.userId] = 0;
      }
      grouped[t.userId] += t.amount;
    });

    return Object.entries(grouped)
      .map(([userId, amount]) => ({ userId, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);
  }

  /**
   * Helper: Calculate repeat customer rate
   */
  static async _calculateRepeatCustomerRate(collection, dateFilter) {
    const userTransactions = await collection.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    const totalUsers = await collection.distinct('userId', dateFilter);
    return totalUsers.length > 0
      ? Math.round((userTransactions.length / totalUsers.length) * 100)
      : 0;
  }

  /**
   * Helper: Calculate customer lifetime value
   */
  static async _calculateCLTV(collection) {
    const result = await collection.aggregate([
      { $group: { _id: '$userId', total: { $sum: '$amount' } } },
      { $group: { _id: null, avg: { $avg: '$total' } } }
    ]).toArray();

    return result.length > 0 ? Math.round(result[0].avg * 100) / 100 : 0;
  }

  /**
   * Helper: Get trend by day
   */
  static _getTrendByDay(transactions, metric) {
    const days = {};
    transactions.forEach(t => {
      const day = t.createdAt.toISOString().split('T')[0];
      if (!days[day]) {
        days[day] = { count: 0, amount: 0 };
      }
      days[day].count += 1;
      days[day].amount += t.amount;
    });

    return Object.entries(days).map(([day, data]) => {
      let value;
      if (metric === 'count') value = data.count;
      else if (metric === 'revenue') value = Math.round(data.amount * 100) / 100;
      else if (metric === 'aov') value = Math.round((data.amount / data.count) * 100) / 100;
      return { date: day, value };
    });
  }

  /**
   * Helper: Get trend by week
   */
  static _getTrendByWeek(transactions) {
    // Implementation for weekly trend
    return [];
  }

  /**
   * Helper: Get trend by month
   */
  static _getTrendByMonth(transactions) {
    // Implementation for monthly trend
    return [];
  }

  /**
   * Helper: Calculate growth rate
   */
  static _calculateGrowthRate(transactions) {
    if (transactions.length < 2) return 0;
    const firstHalf = transactions.slice(0, Math.floor(transactions.length / 2));
    const secondHalf = transactions.slice(Math.floor(transactions.length / 2));
    const firstAvg = firstHalf.reduce((sum, t) => sum + t.amount, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, t) => sum + t.amount, 0) / secondHalf.length;
    return Math.round(((secondAvg - firstAvg) / firstAvg) * 100);
  }

  /**
   * Helper: Get peak day
   */
  static _getPeakDay(transactions) {
    const days = {};
    transactions.forEach(t => {
      const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][t.createdAt.getDay()];
      days[day] = (days[day] || 0) + 1;
    });
    return Object.entries(days).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  }

  /**
   * Helper: Get peak hour
   */
  static _getPeakHour(transactions) {
    const hours = {};
    transactions.forEach(t => {
      const hour = t.createdAt.getHours();
      hours[hour] = (hours[hour] || 0) + 1;
    });
    return Object.entries(hours).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  }

  /**
   * Helper: Get peak time of month
   */
  static _getPeakTimeOfMonth(transactions) {
    const days = {};
    transactions.forEach(t => {
      const day = t.createdAt.getDate();
      days[day] = (days[day] || 0) + 1;
    });
    return Object.entries(days).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  }

  /**
   * Helper: Forecast next period
   */
  static async _forecastNextPeriod(transactions) {
    // Simplified forecasting
    const avgDaily = transactions.length / 30;
    const avgAmount = transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length;
    
    return {
      forecastedTransactions: Math.round(avgDaily * 30),
      forecastedRevenue: Math.round(avgDaily * avgAmount * 30 * 100) / 100
    };
  }

  /**
   * Helper: Group fraud by type
   */
  static _groupFraudByType(reports) {
    const grouped = {};
    reports.forEach(r => {
      grouped[r.fraudType] = (grouped[r.fraudType] || 0) + 1;
    });
    return grouped;
  }
}

module.exports = PaymentAnalyticsService;
