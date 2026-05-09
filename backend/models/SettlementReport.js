/**
 * Phase 13 - Settlement Report Model
 * Settlement metrics and reconciliation tracking
 */

const mongoose = require('mongoose');

const settlementReportSchema = new mongoose.Schema(
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
    
    // Settlement Summary
    totalSettlements: {
      count: Number,
      totalAmount: Number,
      totalFees: Number,
      netAmount: Number,
    },
    
    // Settlement by Status
    byStatus: {
      pending: { count: Number, amount: Number },
      approved: { count: Number, amount: Number },
      processing: { count: Number, amount: Number },
      completed: { count: Number, amount: Number },
      failed: { count: Number, amount: Number },
      rejected: { count: Number, amount: Number },
    },
    
    // Settlement by Gateway
    byGateway: [
      {
        gateway: String, // razorpay, stripe, paytm, etc.
        settlementCount: Number,
        totalAmount: Number,
        totalFees: Number,
        netAmount: Number,
        successRate: Number, // percentage
        averageProcessingTime: Number, // hours
      },
    ],
    
    // Payout Method Analysis
    byPayoutMethod: [
      {
        method: String, // bank_transfer, wallet, check, card
        settlementCount: Number,
        totalAmount: Number,
        totalFees: Number,
        successRate: Number,
      },
    ],
    
    // Settlement Approval Metrics
    approvalMetrics: {
      totalApprovalRequests: Number,
      approvedCount: Number,
      rejectedCount: Number,
      averageApprovalTime: Number, // hours
      approvalRate: Number, // percentage
    },
    
    // Verification Metrics
    verificationMetrics: {
      bankVerifiedCount: Number,
      documentsVerifiedCount: Number,
      complianceVerifiedCount: Number,
      verificationFailureRate: Number, // percentage
    },
    
    // Processing Metrics
    processingMetrics: {
      totalProcessed: Number,
      successCount: Number,
      failureCount: Number,
      averageProcessingTime: Number, // hours
      processSuccessRate: Number, // percentage
    },
    
    // Fee Analysis
    feeAnalysis: {
      totalFees: Number,
      averageFeePercentage: Number,
      minimumFee: Number,
      maximumFee: Number,
      feeByGateway: [
        {
          gateway: String,
          totalFees: Number,
          averageFeePercentage: Number,
        },
      ],
    },
    
    // Settlement Variance Analysis
    varianceAnalysis: {
      requestedVsProcessed: Number, // difference in amounts
      variancePercentage: Number,
      reconciliationStatus: String, // 'reconciled', 'variance', 'under_review'
      discrepancyCount: Number,
    },
    
    // Processing Delays
    delayMetrics: {
      totalDelayed: Number,
      averageDelayDays: Number,
      delayBuckets: [
        {
          bucket: String, // '0-24 hours', '1-3 days', '3-7 days', '7+ days'
          count: Number,
          percentage: Number,
        },
      ],
    },
    
    // Failed Settlement Analysis
    failureAnalysis: {
      totalFailed: Number,
      totalFailedAmount: Number,
      failureReason: [
        {
          reason: String, // bank_error, gateway_error, invalid_account, etc.
          count: Number,
          amount: Number,
        },
      ],
      retryAttempts: Number,
      retrySuccessRate: Number, // percentage
    },
    
    // Top Recipients (Restaurants/Partners)
    topRecipients: [
      {
        recipientId: String,
        recipientName: String,
        settlementCount: Number,
        totalAmount: Number,
        successRate: Number,
        rank: Number,
      },
    ],
    
    // Daily Settlement Trend
    dailySettlementTrend: [
      {
        date: Date,
        requestCount: Number,
        requestAmount: Number,
        processedCount: Number,
        processedAmount: Number,
        failureCount: Number,
      },
    ],
    
    // Reconciliation Status
    reconciliation: {
      status: String, // 'reconciled', 'in_progress', 'discrepancy'
      lastReconciliationDate: Date,
      reconciliationDifference: Number,
      reconciliationNotes: String,
    },
    
    // SLA (Service Level Agreement) Metrics
    slaMetrics: {
      averageApprovalTime: Number, // hours (target: 2-4 hours)
      averageProcessingTime: Number, // hours (target: 24 hours)
      slaComplianceRate: Number, // percentage
    },
    
    // Previous Period Comparison
    previousPeriodComparison: {
      settlementGrowth: Number, // percentage
      feeGrowth: Number, // percentage
      successRateChange: Number, // percentage points
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
settlementReportSchema.methods.isFinalized = function () {
  return this.status === 'finalized';
};

settlementReportSchema.methods.getTotalNetAmount = function () {
  return this.totalSettlements.netAmount || 0;
};

settlementReportSchema.methods.getProcessSuccessRate = function () {
  if (this.processingMetrics.totalProcessed === 0) return 0;
  return (this.processingMetrics.successCount / this.processingMetrics.totalProcessed) * 100;
};

settlementReportSchema.methods.getApprovalRate = function () {
  const total = this.approvalMetrics.approvedCount + this.approvalMetrics.rejectedCount;
  if (total === 0) return 0;
  return (this.approvalMetrics.approvedCount / total) * 100;
};

settlementReportSchema.methods.getTopRecipient = function () {
  if (this.topRecipients.length === 0) return null;
  return this.topRecipients[0];
};

settlementReportSchema.methods.isReconciled = function () {
  return this.reconciliation.status === 'reconciled';
};

module.exports = mongoose.model('SettlementReport', settlementReportSchema);
