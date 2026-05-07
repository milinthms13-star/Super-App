const mongoose = require('mongoose');

/**
 * AdminLog Model - Phase 2 Feature 3
 * Audit trail for all moderation actions
 * 
 * Fields:
 * - admin: Admin who performed action
 * - action: Type of action (warn, suspend, ban, remove_message, etc)
 * - targetUser: User affected by action
 * - targetContent: Content affected
 * - reason: Why action was taken
 * - details: Additional details
 * - status: Action status (pending, executed, rolled_back)
 */

const adminLogSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    action: {
      type: String,
      enum: [
        'warn_user',
        'suspend_user',
        'ban_user',
        'unban_user',
        'remove_message',
        'remove_report',
        'resolve_report',
        'dismiss_report',
        'escalate_report',
        'update_user_status',
        'view_report',
        'export_data',
        'system_configuration',
        'role_change'
      ],
      required: true,
      index: true
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      description: 'User affected by the action'
    },
    targetContent: {
      type: mongoose.Schema.Types.ObjectId,
      description: 'Message or content affected'
    },
    abuseReport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AbuseReport',
      index: true,
      description: 'Related abuse report'
    },
    reason: {
      type: String,
      required: true,
      maxlength: 500
    },
    details: {
      warnings: Number,
      suspensionDays: Number,
      previousStatus: String,
      newStatus: String,
      messageContent: String,
      removalReason: String
    },
    status: {
      type: String,
      enum: ['pending', 'executed', 'rolled_back', 'failed'],
      default: 'executed',
      index: true
    },
    ipAddress: String,
    userAgent: String,
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed
    },
    // Rollback capability
    canRollback: {
      type: Boolean,
      default: true
    },
    rolledBackBy: mongoose.Schema.Types.ObjectId,
    rolledBackAt: Date,
    rollbackReason: String,

    // Additional metadata
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    impact: {
      affectedUsers: Number,
      affectedContent: Number
    }
  },
  {
    timestamps: true,
    collection: 'admin_logs'
  }
);

// Indexes
adminLogSchema.index({ admin: 1, createdAt: -1 });
adminLogSchema.index({ action: 1, status: 1 });
adminLogSchema.index({ targetUser: 1, action: 1 });
adminLogSchema.index({ createdAt: -1 });
adminLogSchema.index({ abuseReport: 1 });

// TTL Index: Keep logs for 1 year
adminLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Static Methods

/**
 * Log admin action
 */
adminLogSchema.statics.logAction = async function(logData) {
  try {
    const log = new this({
      admin: logData.admin,
      action: logData.action,
      targetUser: logData.targetUser,
      targetContent: logData.targetContent,
      abuseReport: logData.abuseReport,
      reason: logData.reason,
      details: logData.details || {},
      status: logData.status || 'executed',
      ipAddress: logData.ipAddress,
      userAgent: logData.userAgent,
      changes: logData.changes,
      severity: logData.severity || 'medium'
    });

    await log.save();
    return log;
  } catch (error) {
    throw error;
  }
};

/**
 * Get logs by admin
 */
adminLogSchema.statics.getAdminLogs = async function(adminId, limit = 50) {
  return this.find({ admin: adminId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('targetUser', 'name email')
    .populate('abuseReport', 'reason status');
};

/**
 * Get logs for user (audit history)
 */
adminLogSchema.statics.getUserLogs = async function(userId) {
  return this.find({ targetUser: userId })
    .sort({ createdAt: -1 })
    .select('action reason admin createdAt severity')
    .populate('admin', 'name');
};

/**
 * Get logs for action type
 */
adminLogSchema.statics.getActionLogs = async function(action, days = 7) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return this.find({
    action,
    createdAt: { $gte: startDate }
  })
    .sort({ createdAt: -1 })
    .populate('admin', 'name')
    .populate('targetUser', 'name');
};

/**
 * Get audit trail for user (all actions affecting them)
 */
adminLogSchema.statics.getAuditTrail = async function(userId) {
  return this.find({ targetUser: userId })
    .sort({ createdAt: -1 })
    .select('action reason admin severity createdAt details')
    .populate('admin', 'name email');
};

/**
 * Get admin activity report
 */
adminLogSchema.statics.getAdminActivityReport = async function(adminId, days = 7) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const stats = await this.aggregate([
    {
      $match: {
        admin: adminId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        criticalCount: {
          $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
        }
      }
    },
    { $sort: { count: -1 } }
  ]);

  return stats;
};

/**
 * Get moderation statistics
 */
adminLogSchema.statics.getModerationStats = async function(days = 7) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        bySeverity: {
          $push: {
            severity: '$severity',
            count: 1
          }
        }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

/**
 * Detect suspicious admin activity
 */
adminLogSchema.statics.getSuspiciousActivity = async function(days = 7) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Find admins taking excessive actions
  const suspiciousAdmins = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        severity: { $in: ['high', 'critical'] }
      }
    },
    {
      $group: {
        _id: '$admin',
        actionCount: { $sum: 1 },
        criticalActions: {
          $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
        }
      }
    },
    { $match: { criticalActions: { $gte: 5 } } }
  ]);

  return suspiciousAdmins;
};

// Instance Methods

/**
 * Rollback action
 */
adminLogSchema.methods.rollback = function(rolledBackBy, reason) {
  if (!this.canRollback) {
    throw new Error('This action cannot be rolled back');
  }

  this.status = 'rolled_back';
  this.rolledBackBy = rolledBackBy;
  this.rolledBackAt = new Date();
  this.rollbackReason = reason;

  return this.save();
};

/**
 * Get action description
 */
adminLogSchema.methods.getDescription = function() {
  const descriptions = {
    'warn_user': `Warned user ${this.targetUser} for: ${this.reason}`,
    'suspend_user': `Suspended user ${this.targetUser} for ${this.details.suspensionDays} days`,
    'ban_user': `Banned user ${this.targetUser}`,
    'remove_message': `Removed message for: ${this.reason}`,
    'resolve_report': `Resolved abuse report`,
    'escalate_report': `Escalated abuse report`
  };

  return descriptions[this.action] || `Admin action: ${this.action}`;
};

module.exports = mongoose.model('AdminLog', adminLogSchema);
