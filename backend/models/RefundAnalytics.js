const mongoose = require('mongoose');

const RefundAnalyticsSchema = new mongoose.Schema(
  {
    // Time Period
    period: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly', 'yearly'],
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    year: Number,
    month: Number,
    week: Number,
    day: Number,
    hour: Number,

    // Refund Volume Metrics
    totalRefunds: {
      type: Number,
      default: 0,
    },
    approvedRefunds: {
      type: Number,
      default: 0,
    },
    rejectedRefunds: {
      type: Number,
      default: 0,
    },
    pendingRefunds: {
      type: Number,
      default: 0,
    },
    failedRefunds: {
      type: Number,
      default: 0,
    },
    completedRefunds: {
      type: Number,
      default: 0,
    },

    // Refund Amount Metrics
    totalRefundAmount: {
      type: Number,
      default: 0,
    },
    approvedRefundAmount: {
      type: Number,
      default: 0,
    },
    rejectedRefundAmount: {
      type: Number,
      default: 0,
    },
    completedRefundAmount: {
      type: Number,
      default: 0,
    },
    avgRefundAmount: {
      type: Number,
      default: 0,
    },

    // Refund Reason Breakdown
    byReason: {
      customer_request: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
      order_cancelled: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
      order_not_delivered: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
      poor_quality: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
      wrong_order: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
      restaurant_unavailable: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
      delivery_failed: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
      duplicate_charge: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
      system_error: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
      other: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
    },

    // Refund Method Breakdown
    byMethod: {
      original_payment: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
      wallet: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
      bank_transfer: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
    },

    // Approval Metrics
    refundsRequiringApproval: {
      type: Number,
      default: 0,
    },
    autoApprovedRefunds: {
      type: Number,
      default: 0,
    },
    manualApprovalRate: {
      type: Number,
      default: 0,
    },
    approvalWaitTime: {
      type: Number,
      default: 0,
    },
    avgApprovalTime: {
      type: Number,
      default: 0,
    },

    // Fraud Detection Metrics
    flaggedAsHighRisk: {
      type: Number,
      default: 0,
    },
    fraudPreventedAmount: {
      type: Number,
      default: 0,
    },
    avgFraudScore: {
      type: Number,
      default: 0,
    },

    // Processing Metrics
    avgProcessingTime: {
      type: Number,
      default: 0,
    },
    refundsProcessed: {
      type: Number,
      default: 0,
    },
    pendingProcessing: {
      type: Number,
      default: 0,
    },
    processingFailureRate: {
      type: Number,
      default: 0,
    },

    // Retry Metrics
    totalRetries: {
      type: Number,
      default: 0,
    },
    successfulRetries: {
      type: Number,
      default: 0,
    },
    failedRetries: {
      type: Number,
      default: 0,
    },
    retrySuccessRate: {
      type: Number,
      default: 0,
    },

    // User Metrics
    usersWithRefunds: {
      type: Number,
      default: 0,
    },
    repeatRefundUsers: {
      type: Number,
      default: 0,
    },
    avgRefundsPerUser: {
      type: Number,
      default: 0,
    },
    usersWithMultipleRefunds: {
      type: Number,
      default: 0,
    },

    // Refund Time Analysis
    refundedWithin24Hours: {
      type: Number,
      default: 0,
    },
    refundedWithin48Hours: {
      type: Number,
      default: 0,
    },
    refundedWithin7Days: {
      type: Number,
      default: 0,
    },
    pendingRefundsOlderThan7Days: {
      type: Number,
      default: 0,
    },

    // Geographic Distribution
    byRegion: {
      type: Map,
      of: {
        count: Number,
        amount: Number,
        avgAmount: Number,
      },
    },

    // Order Value Distribution
    byOrderValue: {
      low: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } }, // < 100
      medium: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } }, // 100-500
      high: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } }, // > 500
    },

    // User Category Breakdown
    byUserCategory: {
      newUsers: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
      regularUsers: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
      vipUsers: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
    },

    // Days Since Order Analysis
    within1Day: {
      type: Number,
      default: 0,
    },
    within3Days: {
      type: Number,
      default: 0,
    },
    within7Days: {
      type: Number,
      default: 0,
    },
    within30Days: {
      type: Number,
      default: 0,
    },
    moreThan30Days: {
      type: Number,
      default: 0,
    },

    // Timestamp
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'refund_analytics',
  }
);

// Indexes
RefundAnalyticsSchema.index({ date: -1, period: 1 });
RefundAnalyticsSchema.index({ period: 1, date: -1 });
RefundAnalyticsSchema.index({ year: 1, month: 1, day: 1 });

module.exports = mongoose.model('RefundAnalytics', RefundAnalyticsSchema);
