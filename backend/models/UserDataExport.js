/**
 * User Data Export Model - Phase 10 Feature 11
 * User data export requests and management (GDPR compliance)
 */

const { Schema, model } = require('mongoose');

const UserDataExportSchema = new Schema(
  {
    exportId: {
      type: String,
      unique: true,
      index: true,
      description: 'Unique export request ID',
    },
    userId: {
      type: String,
      required: true,
      index: true,
      description: 'User who requested data export',
    },
    userEmail: {
      type: String,
      description: 'User email for export delivery',
    },
    requestDate: {
      type: Date,
      default: Date.now,
      index: true,
      description: 'When export was requested',
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'expired'],
      default: 'pending',
      index: true,
      description: 'Current status of export request',
    },
    priority: {
      type: String,
      enum: ['normal', 'urgent'],
      default: 'normal',
    },
    dataIncluded: {
      type: [{
        dataType: String, // profile, addresses, orders, payments, preferences, communications, activity
        included: Boolean,
        count: Number,
        size: Number, // bytes
      }],
      default: [],
      description: 'What data is included in export',
    },
    exportFormat: {
      type: String,
      enum: ['json', 'csv', 'xml', 'pdf', 'html'],
      default: 'json',
      description: 'Format of exported data',
    },
    scope: {
      type: String,
      enum: ['all', 'profile_only', 'transactions_only', 'custom'],
      default: 'all',
      description: 'Scope of data to export',
    },
    customFields: {
      type: [String],
      default: [],
      description: 'Custom fields to include in export',
    },
    startDate: {
      type: Date,
      description: 'Start date for data range (if applicable)',
    },
    endDate: {
      type: Date,
      description: 'End date for data range (if applicable)',
    },
    processingStarted: {
      type: Date,
      description: 'When processing started',
    },
    processingCompleted: {
      type: Date,
      description: 'When processing completed',
    },
    processingDuration: {
      type: Number,
      description: 'Processing duration in milliseconds',
    },
    exportedData: {
      totalRecords: Number,
      totalSize: Number, // bytes
      fileFormat: String,
      fileName: String,
      checksum: String, // SHA-256 hash for integrity verification
      encryptionMethod: String,
      encryptionKey: String, // reference to encryption key
    },
    deliveryMethod: {
      type: String,
      enum: ['email', 'download_link', 'secure_portal', 'postal_mail'],
      default: 'email',
    },
    downloadLink: {
      url: String,
      createdDate: Date,
      expiryDate: Date,
      downloadCount: Number,
      maxDownloads: Number,
      password: String, // if link is password protected
      downloaded: Boolean,
      downloadDate: Date,
      downloadedBy: String, // IP address
    },
    emailDelivery: {
      sent: Boolean,
      sentDate: Date,
      sentTo: String,
      deliveryStatus: String, // sent, bounced, failed, spam
      trackingId: String,
    },
    notifications: {
      type: [{
        notificationDate: Date,
        notificationType: String, // request_received, processing_started, processing_completed, download_ready
        notificationMethod: String, // email, sms, push
        sent: Boolean,
      }],
      default: [],
    },
    dataQuality: {
      recordsIncluded: Number,
      recordsExcluded: Number,
      recordsWithErrors: Number,
      validationPassed: Boolean,
      validationErrors: [String],
    },
    compliance: {
      gdprCompliant: Boolean,
      ccpaCompliant: Boolean,
      capaCompliant: Boolean,
      complianceNotes: String,
    },
    security: {
      encrypted: Boolean,
      encryptionMethod: String,
      passwordProtected: Boolean,
      digitallySigned: Boolean,
      antivirusScan: Boolean,
      scanResult: String,
    },
    auditTrail: {
      type: [{
        eventDate: Date,
        eventType: String, // requested, processing_started, completed, downloaded, expired
        description: String,
        performedBy: String, // user or system
        ipAddress: String,
        details: Schema.Types.Mixed,
      }],
      default: [],
    },
    expiry: {
      expiryDate: Date,
      autoDelete: Boolean,
      deletionDate: Date,
      deleteAfterDownload: Boolean,
    },
    failureReason: {
      type: String,
      description: 'Reason for export failure (if applicable)',
    },
    retryAttempts: {
      type: Number,
      default: 0,
      description: 'Number of retry attempts',
    },
    maxRetryAttempts: {
      type: Number,
      default: 3,
      description: 'Maximum retry attempts allowed',
    },
    notes: {
      type: String,
      description: 'Admin notes about this export',
    },
    processedBy: {
      type: String,
      description: 'System or admin that processed this export',
    },
    requestReference: {
      type: String,
      description: 'Reference to GDPR or other compliance request',
    },
  },
  { timestamps: true, collection: 'user_data_exports' }
);

// Indexes
UserDataExportSchema.index({ userId: 1, requestDate: -1 });
UserDataExportSchema.index({ status: 1 });
UserDataExportSchema.index({ exportId: 1 });
UserDataExportSchema.index({ requestDate: -1 });
UserDataExportSchema.index({ 'downloadLink.expiryDate': 1 });
UserDataExportSchema.index({ 'expiry.expiryDate': 1 });

// TTL index - auto-delete expired exports after 30 days
UserDataExportSchema.index(
  { 'expiry.expiryDate': 1 },
  { expireAfterSeconds: 2592000 } // 30 days
);

// Instance methods
UserDataExportSchema.methods.markAsProcessing = function () {
  this.status = 'processing';
  this.processingStarted = new Date();
};

UserDataExportSchema.methods.markAsCompleted = function (totalRecords, totalSize) {
  this.status = 'completed';
  this.processingCompleted = new Date();
  this.processingDuration = this.processingCompleted - this.processingStarted;
  this.exportedData.totalRecords = totalRecords;
  this.exportedData.totalSize = totalSize;
};

UserDataExportSchema.methods.markAsFailed = function (reason) {
  this.status = 'failed';
  this.failureReason = reason;
  this.retryAttempts += 1;
};

UserDataExportSchema.methods.markAsExpired = function () {
  this.status = 'expired';
  this.expiry.deletionDate = new Date();
};

UserDataExportSchema.methods.markAsDownloaded = function (ipAddress) {
  this.downloadLink.downloaded = true;
  this.downloadLink.downloadDate = new Date();
  this.downloadLink.downloadedBy = ipAddress;
  this.downloadLink.downloadCount += 1;
};

UserDataExportSchema.methods.addAuditEvent = function (eventType, description, performedBy, ipAddress, details) {
  this.auditTrail.push({
    eventDate: new Date(),
    eventType,
    description,
    performedBy,
    ipAddress,
    details,
  });
};

UserDataExportSchema.methods.isLinkExpired = function () {
  if (!this.downloadLink.expiryDate) return false;
  return new Date() > this.downloadLink.expiryDate;
};

UserDataExportSchema.methods.canRetry = function () {
  return this.status === 'failed' && this.retryAttempts < this.maxRetryAttempts;
};

module.exports = model('UserDataExport', UserDataExportSchema);
