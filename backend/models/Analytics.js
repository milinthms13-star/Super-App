// backend/models/Analytics.js
const mongoose = require('mongoose');

const AnalyticsEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  eventType: {
    type: String,
    enum: [
      'PAGE_VIEW',
      'TRANSACTION',
      'PAYMENT_SUCCESS',
      'PAYMENT_FAILURE',
      'SETTLEMENT_REQUEST',
      'INVOICE_GENERATED',
      'SUBSCRIPTION_CREATED',
      'SUBSCRIPTION_CANCELLED',
      'REPORT_GENERATED',
      'EXPORT_DOWNLOADED',
      'DASHBOARD_VIEW',
      'SEARCH',
      'FILTER_APPLIED',
      'CUSTOM_EVENT'
    ],
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true
  },
  metadata: {
    transactionId: String,
    paymentId: String,
    settlementId: String,
    invoiceId: String,
    subscriptionId: String,
    amount: Number,
    currency: String,
    category: String,
    status: String,
    duration: Number,
    customData: mongoose.Schema.Types.Mixed
  },
  context: {
    userAgent: String,
    ipAddress: String,
    deviceType: String,
    browser: String,
    location: {
      country: String,
      state: String,
      city: String
    }
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  date: {
    type: Date,
    index: true
  }
}, {
  timestamps: true,
  collection: 'analytics_events'
});

// Index for efficient querying
AnalyticsEventSchema.index({ userId: 1, timestamp: -1 });
AnalyticsEventSchema.index({ eventType: 1, timestamp: -1 });
AnalyticsEventSchema.index({ date: 1, eventType: 1 });
AnalyticsEventSchema.index({ 'metadata.transactionId': 1 });

// Aggregated Metrics Schema
const MetricSchema = new mongoose.Schema({
  dimension: {
    type: String,
    enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM'],
    required: true,
    index: true
  },
  period: {
    startDate: {
      type: Date,
      required: true,
      index: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  category: {
    type: String,
    enum: [
      'REVENUE',
      'TRANSACTIONS',
      'SUBSCRIPTIONS',
      'SETTLEMENTS',
      'INVOICES',
      'COMMISSIONS',
      'CUSTOMERS',
      'VENDORS',
      'PAYMENTS'
    ],
    required: true,
    index: true
  },
  metrics: {
    totalCount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    averageAmount: { type: Number, default: 0 },
    minAmount: { type: Number, default: 0 },
    maxAmount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 },
    customMetrics: mongoose.Schema.Types.Mixed
  },
  breakdown: {
    byStatus: mongoose.Schema.Types.Mixed,
    byPaymentMethod: mongoose.Schema.Types.Mixed,
    byCategory: mongoose.Schema.Types.Mixed,
    byRegion: mongoose.Schema.Types.Mixed
  },
  comparisons: {
    previousPeriod: {
      change: Number,
      percentageChange: Number
    },
    yearOverYear: {
      change: Number,
      percentageChange: Number
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'analytics_metrics'
});

MetricSchema.index({ dimension: 1, 'period.startDate': -1 });
MetricSchema.index({ category: 1, 'period.startDate': -1 });
MetricSchema.index({ 'period.startDate': 1, 'period.endDate': 1 });

// KPI Schema
const KPISchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  description: String,
  category: {
    type: String,
    enum: ['REVENUE', 'OPERATIONS', 'CUSTOMERS', 'PERFORMANCE', 'FINANCIAL'],
    required: true
  },
  type: {
    type: String,
    enum: ['RATE', 'COUNT', 'AMOUNT', 'RATIO', 'PERCENTAGE'],
    required: true
  },
  calculation: {
    formula: String,
    dependencies: [String]
  },
  target: {
    value: Number,
    period: String,
    threshold: String
  },
  current: {
    value: Number,
    timestamp: Date
  },
  trend: {
    direction: {
      type: String,
      enum: ['UP', 'DOWN', 'STABLE']
    },
    changePercent: Number,
    lastUpdated: Date
  },
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'analytics_kpis'
});

KPISchema.index({ category: 1, active: 1 });

module.exports = {
  Analytics: mongoose.model('Analytics', AnalyticsEventSchema),
  Metric: mongoose.model('Metric', MetricSchema),
  KPI: mongoose.model('KPI', KPISchema)
};
