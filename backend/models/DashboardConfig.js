// backend/models/DashboardConfig.js
const mongoose = require('mongoose');

const DashboardConfigSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  userRole: {
    type: String,
    enum: ['ADMIN', 'MERCHANT', 'RESTAURANT', 'FINANCE', 'CUSTOMER'],
    required: true,
    index: true
  },
  layout: {
    type: String,
    enum: ['GRID', 'FLEX', 'CUSTOM'],
    default: 'GRID'
  },
  theme: {
    type: String,
    enum: ['LIGHT', 'DARK', 'AUTO'],
    default: 'LIGHT'
  },
  refreshInterval: {
    type: Number,
    default: 60000, // milliseconds
    min: 5000,
    max: 600000
  },
  widgets: [{
    id: {
      type: String,
      unique: true
    },
    type: {
      type: String,
      enum: [
        'REVENUE_CHART',
        'TRANSACTION_COUNT',
        'SUCCESS_RATE',
        'SETTLEMENT_STATUS',
        'INVOICE_AGING',
        'COMMISSION_BREAKDOWN',
        'KPI_CARD',
        'TABLE',
        'PIE_CHART',
        'LINE_CHART',
        'BAR_CHART',
        'HEATMAP',
        'METRIC_CARD'
      ],
      required: true
    },
    title: String,
    description: String,
    position: {
      row: Number,
      col: Number,
      width: { type: Number, default: 1 },
      height: { type: Number, default: 1 }
    },
    dataSource: {
      metric: String,
      dimension: String,
      filters: mongoose.Schema.Types.Mixed
    },
    visualization: {
      chartType: String,
      colors: [String],
      options: mongoose.Schema.Types.Mixed
    },
    isVisible: {
      type: Boolean,
      default: true
    },
    isPinned: {
      type: Boolean,
      default: false
    },
    customSettings: mongoose.Schema.Types.Mixed,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  reports: [{
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report'
    },
    title: String,
    order: Number,
    isPinned: Boolean,
    frequency: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM', 'NONE']
    }
  }],
  filters: {
    dateRange: {
      type: {
        type: String,
        enum: ['LAST_7_DAYS', 'LAST_30_DAYS', 'LAST_90_DAYS', 'THIS_MONTH', 'CUSTOM'],
        default: 'LAST_30_DAYS'
      },
      customStart: Date,
      customEnd: Date
    },
    merchantId: [mongoose.Schema.Types.ObjectId],
    category: [String],
    paymentMethod: [String],
    status: [String]
  },
  defaultComparison: {
    enabled: Boolean,
    type: {
      type: String,
      enum: ['PREVIOUS_PERIOD', 'YEAR_OVER_YEAR', 'CUSTOM']
    }
  },
  savedViews: [{
    name: String,
    filters: mongoose.Schema.Types.Mixed,
    widgets: [String],
    createdAt: Date
  }],
  notifications: {
    enabled: Boolean,
    emailAlerts: Boolean,
    slackAlerts: Boolean,
    alertThresholds: mongoose.Schema.Types.Mixed
  },
  exports: {
    defaultFormat: {
      type: String,
      enum: ['PDF', 'EXCEL', 'CSV', 'JSON'],
      default: 'PDF'
    },
    scheduledExports: [{
      id: String,
      frequency: String,
      recipients: [String],
      format: String,
      active: Boolean
    }]
  },
  sharing: {
    isShared: Boolean,
    shareToken: String,
    sharedWith: [{
      userId: mongoose.Schema.Types.ObjectId,
      permission: {
        type: String,
        enum: ['VIEW', 'EDIT', 'ADMIN']
      }
    }]
  },
  isDefault: {
    type: Boolean,
    default: false
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
  collection: 'dashboard_configs'
});

DashboardConfigSchema.index({ userId: 1 });
DashboardConfigSchema.index({ userRole: 1 });
DashboardConfigSchema.index({ 'widgets.type': 1 });

module.exports = mongoose.model('DashboardConfig', DashboardConfigSchema);
