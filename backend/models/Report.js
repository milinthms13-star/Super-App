// backend/models/Report.js
const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  reportName: {
    type: String,
    required: true,
    index: true
  },
  reportType: {
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
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  generatedFrom: {
    type: String,
    enum: ['SCHEDULED', 'ON_DEMAND', 'WEBHOOK'],
    required: true
  },
  scheduleId: mongoose.Schema.Types.ObjectId,
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
  filters: mongoose.Schema.Types.Mixed,
  status: {
    type: String,
    enum: ['GENERATING', 'GENERATED', 'FAILED', 'EXPIRED'],
    default: 'GENERATING',
    index: true
  },
  summary: {
    totalRecords: Number,
    totalAmount: Number,
    averageAmount: Number,
    recordsWithIssues: Number,
    customSummary: mongoose.Schema.Types.Mixed
  },
  data: {
    rawData: [{
      _id: false,
      customData: mongoose.Schema.Types.Mixed
    }],
    aggregatedData: mongoose.Schema.Types.Mixed,
    comparisons: mongoose.Schema.Types.Mixed
  },
  format: {
    type: String,
    enum: ['PDF', 'EXCEL', 'CSV', 'JSON'],
    required: true
  },
  fileInfo: {
    filename: String,
    filepath: String,
    size: Number,
    uploadedAt: Date,
    expiresAt: {
      type: Date,
      index: true
    }
  },
  delivery: [{
    recipientEmail: String,
    deliveryMethod: String,
    sentAt: Date,
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED', 'BOUNCED'],
      default: 'PENDING'
    },
    failureReason: String
  }],
  downloads: [{
    downloadedBy: mongoose.Schema.Types.ObjectId,
    downloadedAt: Date,
    ipAddress: String
  }],
  tags: [String],
  isArchived: {
    type: Boolean,
    default: false
  },
  generationTime: Number, // milliseconds
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
  }
}, {
  collection: 'reports'
});

ReportSchema.index({ generatedBy: 1, createdAt: -1 });
ReportSchema.index({ reportType: 1, createdAt: -1 });
ReportSchema.index({ status: 1 });
ReportSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Report', ReportSchema);
