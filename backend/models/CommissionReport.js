/**
 * Phase 13 - Commission Report Model
 * Commission payout reports and aggregations
 */

const mongoose = require('mongoose');

const commissionReportSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      unique: true,
      required: true,
    },
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    
    // Commission Summary
    totalCommissions: {
      count: Number,
      totalAmount: Number,
      totalTax: Number,
      totalPayable: Number,
    },
    
    // Commission by Status
    byStatus: {
      pending: { count: Number, amount: Number },
      approved: { count: Number, amount: Number },
      settled: { count: Number, amount: Number },
      rejected: { count: Number, amount: Number },
      onHold: { count: Number, amount: Number },
    },
    
    // Commission by Type
    byType: [
      {
        type: String, // restaurant, delivery_partner, promo, platform, other
        count: Number,
        totalAmount: Number,
        percentage: Number,
      },
    ],
    
    // Commission by Restaurant
    byRestaurant: [
      {
        restaurantId: String,
        restaurantName: String,
        commissionCount: Number,
        totalAmount: Number,
        totalPayable: Number,
        averageCommission: Number,
        payoutStatus: String, // not_paid, processing, paid
      },
    ],
    
    // Commission Approval Metrics
    approvalMetrics: {
      totalApprovalRequests: Number,
      approvedCount: Number,
      rejectedCount: Number,
      averageApprovalTime: Number, // hours
      approvalRate: Number, // percentage
    },
    
    // Payout Metrics
    payoutMetrics: {
      totalPayouts: Number,
      totalPayoutAmount: Number,
      averagePayoutAmount: Number,
      successfulPayouts: Number,
      failedPayouts: Number,
      pendingPayouts: Number,
      payoutSuccessRate: Number, // percentage
    },
    
    // Tax Analysis
    taxAnalysis: {
      totalTax: Number,
      taxRate: Number,
      byTaxType: {
        sgst: Number,
        cgst: Number,
        igst: Number,
        other: Number,
      },
    },
    
    // Commission Rate Analysis
    commissionRateAnalysis: [
      {
        rate: Number, // percentage
        count: Number,
        totalAmount: Number,
        percentage: Number,
      },
    ],
    
    // Hold Analysis
    onHoldAnalysis: {
      totalOnHold: Number,
      totalOnHoldAmount: Number,
      averageHoldDuration: Number, // days
      byReason: [
        {
          reason: String,
          count: Number,
          amount: Number,
        },
      ],
    },
    
    // Top Restaurants by Commission
    topRestaurants: [
      {
        restaurantId: String,
        restaurantName: String,
        totalCommission: Number,
        totalPayable: Number,
        rank: Number,
      },
    ],
    
    // Commission Trends
    dailyCommissionTrend: [
      {
        date: Date,
        count: Number,
        totalAmount: Number,
        averageAmount: Number,
      },
    ],
    
    // Dispute & Holds
    disputeMetrics: {
      disputedCount: Number,
      disputedAmount: Number,
      resolvedCount: Number,
        rejectedCount: Number,
      pendingCount: Number,
    },
    
    // Performance Metrics
    averageCommissionValue: Number,
    medianCommissionValue: Number,
    highestCommissionValue: Number,
    lowestCommissionValue: Number,
    
    // Comparison with Previous Period
    previousPeriodComparison: {
      commissionGrowth: Number, // percentage
      payoutGrowth: Number, // percentage
      restaurantGrowth: Number, // percentage
    },
    
    // Status
    status: {
      type: String,
      enum: ['draft', 'finalized', 'archived'],
      default: 'draft',
    },
    
    // Metadata
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    generatedBy: String,
    notes: String,
  },
  {
    timestamps: true,
    indexes: [
      { period: 1, startDate: -1 },
      { startDate: 1, endDate: 1 },
    ],
  }
);

// Helper Methods
commissionReportSchema.methods.isFinalized = function () {
  return this.status === 'finalized';
};

commissionReportSchema.methods.getTotalCommissionAmount = function () {
  return this.totalCommissions.totalAmount || 0;
};

commissionReportSchema.methods.getPayoutSuccessRate = function () {
  if (this.payoutMetrics.totalPayouts === 0) return 0;
  return (this.payoutMetrics.successfulPayouts / this.payoutMetrics.totalPayouts) * 100;
};

commissionReportSchema.methods.getApprovalRate = function () {
  const total = this.approvalMetrics.approvedCount + this.approvalMetrics.rejectedCount;
  if (total === 0) return 0;
  return (this.approvalMetrics.approvedCount / total) * 100;
};

commissionReportSchema.methods.getTopRestaurant = function () {
  if (this.topRestaurants.length === 0) return null;
  return this.topRestaurants[0];
};

commissionReportSchema.methods.getOnHoldPercentage = function () {
  if (this.totalCommissions.count === 0) return 0;
  return (this.byStatus.onHold.count / this.totalCommissions.count) * 100;
};

module.exports = mongoose.model('CommissionReport', commissionReportSchema);
