const mongoose = require('mongoose');

const CustomReportSchema = new mongoose.Schema(
  {
    // Report Identification
    reportId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    reportName: {
      type: String,
      required: true,
    },
    description: String,
    reportType: {
      type: String,
      enum: ['payment', 'wallet', 'refund', 'custom', 'fraud', 'performance'],
      required: true,
      index: true,
    },

    // Report Configuration
    frequency: {
      type: String,
      enum: ['once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      default: 'once',
    },
    schedule: {
      dayOfWeek: { type: Number, min: 0, max: 6 }, // 0 = Sunday
      dayOfMonth: { type: Number, min: 1, max: 31 },
      timeOfDay: String, // HH:MM format
    },

    // Report Scope
    dateRange: {
      startDate: Date,
      endDate: Date,
    },
    metrics: [String], // List of metrics to include
    dimensions: [String], // Break down by: region, payment_method, user_segment, etc.
    filters: mongoose.Schema.Types.Mixed, // Dynamic filters

    // Report Generation
    status: {
      type: String,
      enum: ['scheduled', 'generating', 'generated', 'failed', 'archived'],
      default: 'scheduled',
      index: true,
    },
    lastGeneratedAt: Date,
    nextGenerationAt: Date,
    generationDuration: Number, // milliseconds
    generationError: String,

    // Report Data
    dataPoints: [{
      timestamp: Date,
      label: String,
      values: mongoose.Schema.Types.Mixed,
    }],
    summary: {
      totalRecords: Number,
      dataCompleteness: Number, // percentage
      anomalies: [String],
    },

    // Report Distribution
    recipients: [
      {
        email: String,
        notificationMethod: {
          type: String,
          enum: ['email', 'slack', 'webhook'],
        },
        isActive: Boolean,
      },
    ],
    lastSentAt: Date,
    sendNotification: {
      type: Boolean,
      default: false,
    },

    // Report Output
    outputFormats: {
      type: [String],
      enum: ['pdf', 'excel', 'csv', 'json'],
      default: ['pdf'],
    },
    fileLocation: {
      bucket: String,
      key: String,
      downloadUrl: String,
    },
    fileSize: Number,
    expiresAt: Date, // When to delete the file

    // Owner & Permissions
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    accessControl: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        role: {
          type: String,
          enum: ['view', 'edit', 'delete'],
        },
      },
    ],

    // Metadata
    tags: [String],
    notes: String,
    isTemplate: {
      type: Boolean,
      default: false,
    },

    // Timestamp
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: Date,
  },
  {
    timestamps: true,
    collection: 'custom_reports',
  }
);

// Indexes
CustomReportSchema.index({ createdBy: 1, createdAt: -1 });
CustomReportSchema.index({ reportType: 1, status: 1 });
CustomReportSchema.index({ nextGenerationAt: 1, frequency: 1 });

module.exports = mongoose.model('CustomReport', CustomReportSchema);
