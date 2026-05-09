/**
 * Phase 13 Utilities - Analytics & Reporting
 * Helper functions for analytics calculations and formatting
 */

class Phase13Utils {
  /**
   * Calculate date range based on period
   */
  static calculateDateRange(period) {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();

    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'this_week':
        start.setDate(end.getDate() - end.getDay());
        start.setHours(0, 0, 0, 0);
        break;
      case 'last_week':
        start.setDate(end.getDate() - end.getDay() - 7);
        end.setDate(end.getDate() - end.getDay() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'this_month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'last_month':
        start.setMonth(end.getMonth() - 1);
        start.setDate(1);
        end.setDate(0);
        start.setHours(0, 0, 0, 0);
        break;
      case 'this_quarter':
        start.setMonth(Math.floor(end.getMonth() / 3) * 3);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'this_year':
        start.setMonth(0);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'all_time':
        start.setFullYear(2020);
        start.setMonth(0);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
    }

    return { start, end };
  }

  /**
   * Calculate growth percentage
   */
  static calculateGrowth(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Calculate success rate
   */
  static calculateSuccessRate(successCount, totalCount) {
    if (totalCount === 0) return 0;
    return (successCount / totalCount) * 100;
  }

  /**
   * Calculate failure rate
   */
  static calculateFailureRate(failureCount, totalCount) {
    if (totalCount === 0) return 0;
    return (failureCount / totalCount) * 100;
  }

  /**
   * Calculate average value
   */
  static calculateAverage(values) {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  /**
   * Calculate median value
   */
  static calculateMedian(values) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Format currency value
   */
  static formatCurrency(amount, currency = 'INR') {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(amount);
  }

  /**
   * Format percentage
   */
  static formatPercentage(value) {
    return `${Math.round(value * 100) / 100}%`;
  }

  /**
   * Format number with commas
   */
  static formatNumber(value) {
    return value.toLocaleString('en-IN');
  }

  /**
   * Get aging bucket label
   */
  static getAgingBucketLabel(daysOutstanding) {
    if (daysOutstanding <= 30) return '0-30 days';
    if (daysOutstanding <= 60) return '31-60 days';
    if (daysOutstanding <= 90) return '61-90 days';
    return '90+ days';
  }

  /**
   * Calculate DSO (Days Sales Outstanding)
   */
  static calculateDSO(totalOutstanding, dailyRevenue) {
    if (dailyRevenue === 0) return 0;
    return Math.ceil(totalOutstanding / dailyRevenue);
  }

  /**
   * Get trend status
   */
  static getTrendStatus(growth) {
    if (growth > 0) return 'up';
    if (growth < 0) return 'down';
    return 'stable';
  }

  /**
   * Get trend icon
   */
  static getTrendIcon(status) {
    switch (status) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      default:
        return 'minus';
    }
  }

  /**
   * Get status color
   */
  static getStatusColor(status) {
    const colors = {
      pending: '#FCA5A5',
      approved: '#86EFAC',
      completed: '#86EFAC',
      paid: '#86EFAC',
      failed: '#FCA5A5',
      rejected: '#FCA5A5',
      overdue: '#F97316',
      partial: '#FBBF24',
      processing: '#60A5FA',
      cancelled: '#9CA3AF',
    };
    return colors[status] || '#D1D5DB';
  }

  /**
   * Get payment method label
   */
  static getPaymentMethodLabel(method) {
    const labels = {
      upi: 'UPI',
      credit_card: 'Credit Card',
      debit_card: 'Debit Card',
      net_banking: 'Net Banking',
      wallet: 'Wallet',
      other: 'Other',
    };
    return labels[method] || method;
  }

  /**
   * Aggregates data by property
   */
  static aggregateBy(items, propertyName) {
    const aggregated = {};

    items.forEach((item) => {
      const key = item[propertyName];
      if (!aggregated[key]) {
        aggregated[key] = {
          [propertyName]: key,
          count: 0,
          total: 0,
          items: [],
        };
      }
      aggregated[key].count++;
      if (item.amount) aggregated[key].total += item.amount;
      aggregated[key].items.push(item);
    });

    return Object.values(aggregated);
  }

  /**
   * Group items by date
   */
  static groupByDate(items, dateProperty = 'createdAt') {
    const grouped = {};

    items.forEach((item) => {
      const date = new Date(item[dateProperty]).toLocaleDateString('en-IN');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(item);
    });

    return grouped;
  }

  /**
   * Calculate percentages for distribution
   */
  static calculateDistribution(items, valueProperty = 'amount') {
    const total = items.reduce((sum, item) => sum + item[valueProperty], 0);

    return items.map((item) => ({
      ...item,
      percentage: total > 0 ? (item[valueProperty] / total) * 100 : 0,
    }));
  }

  /**
   * Get top N items by property
   */
  static getTopItems(items, limit = 5, sortProperty = 'amount') {
    return items.sort((a, b) => b[sortProperty] - a[sortProperty]).slice(0, limit);
  }

  /**
   * Calculate metric trend
   */
  static calculateMetricTrend(current, previous) {
    if (previous === 0) {
      return current > 0 ? { growth: 100, status: 'up' } : { growth: 0, status: 'stable' };
    }

    const growth = ((current - previous) / previous) * 100;
    const status = growth > 0 ? 'up' : growth < 0 ? 'down' : 'stable';

    return { growth: Math.round(growth * 100) / 100, status };
  }

  /**
   * Format date
   */
  static formatDate(date) {
    return new Date(date).toLocaleDateString('en-IN');
  }

  /**
   * Format date time
   */
  static formatDateTime(date) {
    return new Date(date).toLocaleString('en-IN');
  }

  /**
   * Get quarter from date
   */
  static getQuarter(date) {
    const month = new Date(date).getMonth() + 1;
    return `Q${Math.ceil(month / 3)}`;
  }

  /**
   * Generate report summary
   */
  static generateReportSummary(report) {
    return {
      reportId: report.reportId || report.analyticsId,
      period: report.period,
      generatedAt: report.generatedAt,
      status: report.status,
      totalItems: report.totalCommissions?.count || report.totalPayments?.count || report.totalInvoices?.count || report.totalSettlements?.count || 0,
      totalAmount: report.totalCommissions?.totalAmount || report.totalPayments?.totalAmount || report.totalInvoices?.totalAmount || report.totalSettlements?.totalAmount || 0,
    };
  }

  /**
   * Validate date range
   */
  static validateDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      throw new Error('Start date must be before end date');
    }

    const maxDays = 365;
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > maxDays) {
      throw new Error(`Date range cannot exceed ${maxDays} days`);
    }

    return true;
  }

  /**
   * Get SLA compliance status
   */
  static getSLAComplianceStatus(actualTime, targetTime) {
    if (actualTime <= targetTime) return 'compliant';
    if (actualTime <= targetTime * 1.1) return 'warning'; // 10% over
    return 'breach';
  }

  /**
   * Calculate commission breakdown
   */
  static calculateCommissionBreakdown(amount, rate, tax = 18) {
    const commissionAmount = (amount * rate) / 100;
    const taxAmount = (commissionAmount * tax) / 100;
    const totalPayable = commissionAmount + taxAmount;

    return {
      commissionAmount,
      taxAmount,
      totalPayable,
      rate,
      tax,
    };
  }

  /**
   * Get collection rate status
   */
  static getCollectionRateStatus(collectionRate) {
    if (collectionRate >= 90) return 'excellent';
    if (collectionRate >= 75) return 'good';
    if (collectionRate >= 50) return 'average';
    return 'poor';
  }

  /**
   * Get DSO status
   */
  static getDSOStatus(dso, benchmark = 30) {
    if (dso <= benchmark) return 'good';
    if (dso <= benchmark * 1.5) return 'warning';
    return 'critical';
  }

  /**
   * Generate export filename
   */
  static generateExportFilename(reportType, format, date = new Date()) {
    const timestamp = date.toISOString().split('T')[0];
    return `${reportType}_report_${timestamp}.${format}`;
  }
}

module.exports = Phase13Utils;
