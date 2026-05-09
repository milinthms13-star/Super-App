/**
 * Admin Audit Log Model - Phase 10 Feature 3
 * Comprehensive admin action audit trails with timestamps
 */

const { Schema, model } = require('mongoose');

const AdminAuditLogSchema = new Schema(
  {
    auditId: {
      type: String,
      unique: true,
      index: true,
      description: 'Unique audit log ID',
    },
    adminId: {
      type: String,
      required: true,
      index: true,
      description: 'ID of admin who performed action',
    },
    adminEmail: {
      type: String,
      description: 'Admin email for audit trail',
    },
    adminRole: {
      type: String,
      enum: ['super_admin', 'admin', 'moderator', 'analyst'],
      description: 'Admin role at time of action',
    },
    actionType: {
      type: String,
      enum: [
        'user_suspend',
        'user_ban',
        'user_unsuspend',
        'restaurant_approve',
        'restaurant_reject',
        'restaurant_suspend',
        'restaurant_ban',
        'order_refund',
        'order_cancel',
        'dispute_resolve',
        'commission_modify',
        'promo_create',
        'promo_delete',
        'category_add',
        'category_delete',
        'dispute_escalate',
        'payment_reconciliation',
        'report_generate',
        'system_config_change',
        'security_incident',
        'data_export',
        'user_data_delete',
      ],
      required: true,
      description: 'Type of action performed',
    },
    targetType: {
      type: String,
      enum: ['user', 'restaurant', 'order', 'dispute', 'payment', 'system', 'promo', 'category'],
      description: 'Type of entity being acted upon',
    },
    targetId: {
      type: String,
      required: true,
      index: true,
      description: 'ID of the target entity',
    },
    targetName: {
      type: String,
      description: 'Name of target entity (for easier auditing)',
    },
    details: {
      reason: String,
      description: String,
      notes: String,
      changedFields: [{
        fieldName: String,
        oldValue: Schema.Types.Mixed,
        newValue: Schema.Types.Mixed,
      }],
    },
    result: {
      success: Boolean,
      resultMessage: String,
      errorMessage: String,
    },
    ipAddress: {
      type: String,
      description: 'IP address from which action was performed',
    },
    sessionId: {
      type: String,
      description: 'Admin session ID',
    },
    userAgent: {
      type: String,
      description: 'User agent from request',
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      description: 'Severity level of action',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
      description: 'When action was performed',
    },
    duration: {
      type: Number,
      description: 'Duration of action in milliseconds',
    },
    relatedRecords: {
      affectedUserCount: Number,
      affectedRestaurantCount: Number,
      affectedOrderCount: Number,
      affectedAmount: Number,
    },
    approval: {
      requiredApproval: Boolean,
      approvedBy: String,
      approvalTime: Date,
      approvalStatus: String,
    },
    reversible: {
      isReversible: Boolean,
      reversedBy: String,
      reversalTime: Date,
      reversalReason: String,
    },
  },
  { timestamps: true, collection: 'admin_audit_logs' }
);

// Indexes
AdminAuditLogSchema.index({ adminId: 1, timestamp: -1 });
AdminAuditLogSchema.index({ actionType: 1, timestamp: -1 });
AdminAuditLogSchema.index({ targetType: 1, targetId: 1 });
AdminAuditLogSchema.index({ severity: 1, timestamp: -1 });
AdminAuditLogSchema.index({ timestamp: -1 });
AdminAuditLogSchema.index({ adminId: 1, actionType: 1, timestamp: -1 });

// TTL index - keep for 2 years
AdminAuditLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 63072000 }
);

// Instance methods
AdminAuditLogSchema.methods.markAsApproved = function (approvedBy) {
  this.approval.approvedBy = approvedBy;
  this.approval.approvalTime = new Date();
  this.approval.approvalStatus = 'approved';
};

AdminAuditLogSchema.methods.markAsRejected = function (approvedBy) {
  this.approval.approvedBy = approvedBy;
  this.approval.approvalTime = new Date();
  this.approval.approvalStatus = 'rejected';
};

AdminAuditLogSchema.methods.reverseAction = function (reversedBy, reason) {
  this.reversible.reversedBy = reversedBy;
  this.reversible.reversalTime = new Date();
  this.reversible.reversalReason = reason;
};

module.exports = model('AdminAuditLog', AdminAuditLogSchema);
