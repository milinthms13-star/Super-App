const mongoose = require('mongoose');

const PaymentAnalyticsSchema = new mongoose.Schema(
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

    // Basic Metrics
    totalTransactions: {
      type: Number,
      default: 0,
    },
    successfulTransactions: {
      type: Number,
      default: 0,
    },
    failedTransactions: {
      type: Number,
      default: 0,
    },
    refundedTransactions: {
      type: Number,
      default: 0,
    },

    // Amount Metrics
    totalAmount: {
      type: Number,
      default: 0,
    },
    successfulAmount: {
      type: Number,
      default: 0,
    },
    failedAmount: {
      type: Number,
      default: 0,
    },
    refundedAmount: {
      type: Number,
      default: 0,
    },
    avgTransactionAmount: {
      type: Number,
      default: 0,
    },

    // Payment Method Breakdown
    byPaymentMethod: {
      upi: {
        count: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
        successRate: { type: Number, default: 0 },
      },
      card: {
        count: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
        successRate: { type: Number, default: 0 },
      },
      netbanking: {
        count: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
        successRate: { type: Number, default: 0 },
      },
      wallet: {
        count: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
        successRate: { type: Number, default: 0 },
      },
      cod: {
        count: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
        successRate: { type: Number, default: 0 },
      },
    },

    // Status Breakdown
    byStatus: {
      pending: { type: Number, default: 0 },
      processing: { type: Number, default: 0 },
      success: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      refunded: { type: Number, default: 0 },
    },

    // Fraud Metrics
    fraudDetections: {
      type: Number,
      default: 0,
    },
    highRiskTransactions: {
      type: Number,
      default: 0,
    },
    avgRiskScore: {
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
    retrySuccessRate: {
      type: Number,
      default: 0,
    },

    // User Metrics
    uniqueUsers: {
      type: Number,
      default: 0,
    },
    newUsers: {
      type: Number,
      default: 0,
    },
    recurringUsers: {
      type: Number,
      default: 0,
    },
    avgTransactionsPerUser: {
      type: Number,
      default: 0,
    },

    // Performance Metrics
    avgAuthorizationTime: {
      type: Number,
      default: 0,
    },
    avgCaptureTime: {
      type: Number,
      default: 0,
    },
    p95AuthorizationTime: {
      type: Number,
      default: 0,
    },
    p99AuthorizationTime: {
      type: Number,
      default: 0,
    },

    // Geographic Distribution
    byRegion: {
      type: Map,
      of: {
        count: Number,
        amount: Number,
      },
    },

    // Device Type Distribution
    byDeviceType: {
      mobile: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
      web: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
      app: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
    },

    // Timestamp
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'payment_analytics',
  }
);

// Indexes for efficient querying
PaymentAnalyticsSchema.index({ date: -1, period: 1 });
PaymentAnalyticsSchema.index({ period: 1, date: -1 });
PaymentAnalyticsSchema.index({ year: 1, month: 1, day: 1 });

module.exports = mongoose.model('PaymentAnalytics', PaymentAnalyticsSchema);
