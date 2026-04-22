const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

/**
 * Audit log for classified listings - tracks all important actions
 */

const ClassifiedAuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        'listing-created',
        'listing-updated',
        'listing-deleted',
        'listing-moderated',
        'message-sent',
        'review-added',
        'report-filed',
        'user-blocked',
        'spam-flagged',
        'promotion-applied',
        'subscription-updated',
      ],
      required: true,
      index: true,
    },
    listingId: {
      type: String,
      index: true,
    },
    performedBy: {
      email: String,
      name: String,
      role: String,
    },
    targetUser: {
      email: String,
      name: String,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
    },
    ipAddress: String,
    userAgent: String,
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: 'classified_audit_logs',
  }
);

ClassifiedAuditLogSchema.index({ timestamp: -1 });
ClassifiedAuditLogSchema.index({ performedBy: 1, timestamp: -1 });
ClassifiedAuditLogSchema.index({ action: 1, timestamp: -1 });

const ClassifiedAuditLog = mongoose.model('ClassifiedAuditLog', ClassifiedAuditLogSchema);

/**
 * Log an action
 */
const logAction = async (actionData) => {
  try {
    const {
      action,
      listingId,
      performedBy,
      targetUser,
      details,
      severity = 'info',
      ipAddress,
      userAgent,
    } = actionData;

    const logEntry = {
      action,
      listingId,
      performedBy: performedBy || {},
      targetUser: targetUser || {},
      details,
      severity,
      ipAddress,
      userAgent,
    };

    if (mongoose.connection.readyState === 1) {
      await ClassifiedAuditLog.create(logEntry);
    }

    // Also log to file for backup
    logToFile(logEntry);

    return true;
  } catch (error) {
    console.error('Error logging action:', error);
    logToFile({ error: error.message, ...actionData }, 'error');
    return false;
  }
};

/**
 * Log to file
 */
const logToFile = (logEntry, type = 'audit') => {
  try {
    const logsDir = path.join(__dirname, '../../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const date = new Date().toISOString().split('T')[0];
    const fileName = path.join(logsDir, `${type}-${date}.log`);

    const logLine = `${new Date().toISOString()} | ${JSON.stringify(logEntry)}\n`;
    fs.appendFileSync(fileName, logLine);
  } catch (error) {
    console.error('Error writing to log file:', error);
  }
};

/**
 * Get audit logs with filters
 */
const getAuditLogs = async (filters = {}, options = {}) => {
  if (mongoose.connection.readyState !== 1) {
    return [];
  }

  const {
    action,
    listingId,
    performedByEmail,
    startDate,
    endDate,
    severity,
  } = filters;

  const { limit = 100, skip = 0 } = options;

  let query = {};

  if (action) query.action = action;
  if (listingId) query.listingId = listingId;
  if (performedByEmail) query['performedBy.email'] = performedByEmail;
  if (severity) query.severity = severity;

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  const logs = await ClassifiedAuditLog.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit);

  const total = await ClassifiedAuditLog.countDocuments(query);

  return {
    logs,
    pagination: {
      total,
      skip,
      limit,
    },
  };
};

/**
 * Get user activity
 */
const getUserActivity = async (email, options = {}) => {
  if (mongoose.connection.readyState !== 1) {
    return [];
  }

  const { limit = 50, skip = 0 } = options;

  const logs = await ClassifiedAuditLog.find({
    $or: [
      { 'performedBy.email': email },
      { 'targetUser.email': email },
    ],
  })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit);

  return logs;
};

/**
 * Get action summary
 */
const getActionSummary = async (days = 7) => {
  if (mongoose.connection.readyState !== 1) {
    return {};
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const summary = await ClassifiedAuditLog.aggregate([
    { $match: { timestamp: { $gte: startDate } } },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  return summary.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
};

/**
 * Get high-risk activities
 */
const getHighRiskActivities = async (days = 7, threshold = 5) => {
  if (mongoose.connection.readyState !== 1) {
    return [];
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const activities = await ClassifiedAuditLog.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate },
        severity: { $in: ['warning', 'critical'] },
      },
    },
    {
      $group: {
        _id: '$performedBy.email',
        count: { $sum: 1 },
        actions: { $push: '$action' },
      },
    },
    { $match: { count: { $gte: threshold } } },
    { $sort: { count: -1 } },
  ]);

  return activities;
};

module.exports = {
  logAction,
  getAuditLogs,
  getUserActivity,
  getActionSummary,
  getHighRiskActivities,
  ClassifiedAuditLog,
};
