// backend/models/ReportSchedule.js
const mongoose = require('mongoose');

const ReportScheduleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true
  },
  description: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reportTemplate: {
    type: {
      type: String,
      enum: [
        'DAILY_REVENUE',
        'WEEKLY_SALES',
        'MONTHLY_PNL',
        'SETTLEMENT',
        'COMMISSION',
        'INVOICE_AGING',
        'TAX',
        'TRANSACTION',
        'SUBSCRIPTION',
        'CUSTOMER_ACQUISITION',
        'VENDOR_PERFORMANCE',
        'RECONCILIATION',
        'CUSTOM'
      ],
      required: true,
      index: true
    },
    templateId: mongoose.Schema.Types.ObjectId
  },
  schedule: {
    frequency: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'],
      required: true
    },
    time: String, // HH:mm format
    daysOfWeek: [Number], // 0-6 for WEEKLY
    dayOfMonth: Number, // 1-31 for MONTHLY
    month: Number, // 1-12 for YEARLY
    customCron: String,
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  filters: {
    dateRange: {
      type: String,
      enum: ['LAST_24_HOURS', 'LAST_7_DAYS', 'LAST_30_DAYS', 'CUSTOM'],
      default: 'LAST_24_HOURS'
    },
    customStartDate: Date,
    customEndDate: Date,
    merchantId: [mongoose.Schema.Types.ObjectId],
    restaurantId: [mongoose.Schema.Types.ObjectId],
    category: [String],
    status: [String]
  },
  deliveryOptions: {
    format: {
      type: String,
      enum: ['PDF', 'EXCEL', 'CSV', 'JSON'],
      required: true,
      default: 'PDF'
    },
    recipients: [{
      email: {
        type: String,
        required: true
      },
      name: String,
      role: String
    }],
    deliveryMethod: {
      type: String,
      enum: ['EMAIL', 'SLACK', 'WEBHOOK', 'SFTP'],
      required: true,
      default: 'EMAIL'
    },
    webhookUrl: String,
    sftpConfig: {
      host: String,
      username: String,
      password: String,
      path: String
    },
    slackConfig: {
      webhookUrl: String,
      channel: String
    }
  },
  reportParameters: {
    includeCharts: { type: Boolean, default: true },
    includeSummary: { type: Boolean, default: true },
    includeComparisons: { type: Boolean, default: true },
    includeRawData: { type: Boolean, default: false },
    pageOrientation: {
      type: String,
      enum: ['PORTRAIT', 'LANDSCAPE'],
      default: 'PORTRAIT'
    },
    customParams: mongoose.Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'PAUSED', 'DISABLED', 'ERROR'],
    default: 'ACTIVE',
    index: true
  },
  executionHistory: [{
    executionDate: Date,
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'PARTIAL'],
      required: true
    },
    reportId: mongoose.Schema.Types.ObjectId,
    recordsProcessed: Number,
    duration: Number, // milliseconds
    error: String,
    deliveredAt: Date,
    failureReason: String
  }],
  nextExecutionDate: {
    type: Date,
    index: true
  },
  lastExecutionDate: Date,
  executionCount: {
    type: Number,
    default: 0
  },
  failureCount: {
    type: Number,
    default: 0
  },
  successRate: {
    type: Number,
    default: 100
  },
  notifications: {
    notifyOnSuccess: Boolean,
    notifyOnFailure: { type: Boolean, default: true },
    notificationRecipients: [String]
  },
  tags: [String],
  isTemplate: {
    type: Boolean,
    default: false
  },
  templateName: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'report_schedules'
});

ReportScheduleSchema.index({ createdBy: 1, status: 1 });
ReportScheduleSchema.index({ 'reportTemplate.type': 1 });
ReportScheduleSchema.index({ nextExecutionDate: 1, status: 1 });

module.exports = mongoose.model('ReportSchedule', ReportScheduleSchema);
