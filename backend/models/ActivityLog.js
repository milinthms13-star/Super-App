/**
 * Activity Log Model - Phase 10 Feature 4
 * Comprehensive activity logging for all operations
 */

const { Schema, model } = require('mongoose');

const ActivityLogSchema = new Schema(
  {
    logId: {
      type: String,
      unique: true,
      index: true,
      description: 'Unique activity log ID',
    },
    userId: {
      type: String,
      required: true,
      index: true,
      description: 'User who performed the activity',
    },
    userType: {
      type: String,
      enum: ['customer', 'restaurant', 'delivery_partner', 'admin'],
      description: 'Type of user',
    },
    activityType: {
      type: String,
      enum: [
        'login',
        'logout',
        'signup',
        'profile_update',
        'password_change',
        'address_add',
        'address_update',
        'address_delete',
        'search',
        'restaurant_view',
        'menu_view',
        'add_to_cart',
        'remove_from_cart',
        'place_order',
        'cancel_order',
        'apply_coupon',
        'payment_success',
        'payment_failure',
        'refund_request',
        'rate_restaurant',
        'rate_delivery',
        'write_review',
        'upload_document',
        'status_update',
        'menu_publish',
        'menu_unpublish',
        'accept_order',
        'reject_order',
        'start_delivery',
        'complete_delivery',
        'request_sos',
        'dispute_filed',
        'dispute_resolved',
        'api_call',
        'data_export',
        'report_generate',
        'system_access',
      ],
      required: true,
      description: 'Type of activity performed',
    },
    module: {
      type: String,
      enum: [
        'auth',
        'profile',
        'discovery',
        'cart',
        'checkout',
        'order',
        'payment',
        'tracking',
        'review',
        'restaurant',
        'delivery',
        'admin',
        'api',
        'report',
        'support',
      ],
      description: 'Module or area where activity occurred',
    },
    entityType: {
      type: String,
      enum: ['order', 'restaurant', 'user', 'payment', 'dispute', 'review', 'coupon', 'cart'],
      description: 'Type of entity involved',
    },
    entityId: {
      type: String,
      description: 'ID of the entity involved',
    },
    entityName: {
      type: String,
      description: 'Name of the entity (for easier auditing)',
    },
    details: {
      description: String,
      oldValue: Schema.Types.Mixed,
      newValue: Schema.Types.Mixed,
      amount: Number,
      currency: String,
      status: String,
      metadata: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      description: 'IP address from which activity originated',
    },
    deviceInfo: {
      deviceId: String,
      deviceType: String, // mobile, web, tablet
      osName: String,
      osVersion: String,
      browserName: String,
      browserVersion: String,
      userAgent: String,
      appVersion: String,
    },
    location: {
      latitude: Number,
      longitude: Number,
      city: String,
      country: String,
      countryCode: String,
    },
    duration: {
      type: Number,
      description: 'Duration of activity in milliseconds',
    },
    result: {
      success: Boolean,
      statusCode: Number,
      errorMessage: String,
      errorCode: String,
    },
    sessionId: {
      type: String,
      index: true,
      description: 'User session ID',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
      description: 'When activity occurred',
    },
    sensitiveData: {
      isDataAccessLog: Boolean,
      accessedFields: [String],
      dataClassification: String, // public, internal, confidential, restricted
    },
    complianceFlags: {
      requiresLogging: Boolean,
      requiresAudit: Boolean,
      requiresApproval: Boolean,
      relatedCompliance: [String],
    },
  },
  { timestamps: true, collection: 'activity_logs' }
);

// Indexes
ActivityLogSchema.index({ userId: 1, timestamp: -1 });
ActivityLogSchema.index({ activityType: 1, timestamp: -1 });
ActivityLogSchema.index({ entityType: 1, entityId: 1 });
ActivityLogSchema.index({ module: 1, timestamp: -1 });
ActivityLogSchema.index({ timestamp: -1 });
ActivityLogSchema.index({ sessionId: 1 });
ActivityLogSchema.index({ userType: 1, timestamp: -1 });

// TTL index - keep for 1 year
ActivityLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 31536000 }
);

// Instance methods
ActivityLogSchema.methods.setDeviceInfo = function (userAgent) {
  // Parse user agent and set device info
  this.deviceInfo.userAgent = userAgent;
};

ActivityLogSchema.methods.setLocation = function (lat, lng, city, country) {
  this.location = { latitude: lat, longitude: lng, city, country };
};

ActivityLogSchema.methods.markSensitive = function (fields, classification = 'confidential') {
  this.sensitiveData.isDataAccessLog = true;
  this.sensitiveData.accessedFields = fields;
  this.sensitiveData.dataClassification = classification;
};

module.exports = model('ActivityLog', ActivityLogSchema);
