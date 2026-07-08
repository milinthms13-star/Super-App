const mongoose = require('mongoose');

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      // Business actions
      'business.create', 'business.update', 'business.delete', 'business.view',
      // Mini app actions
      'miniapp.create', 'miniapp.update', 'miniapp.delete', 'miniapp.publish', 'miniapp.unpublish',
      // Product actions
      'product.create', 'product.update', 'product.delete',
      // Order actions
      'order.create', 'order.update', 'order.cancel', 'order.complete',
      // Invoice actions
      'invoice.create', 'invoice.send', 'invoice.pay', 'invoice.void',
      // Lead actions
      'lead.create', 'lead.update', 'lead.convert', 'lead.delete',
      // Asset actions
      'asset.upload', 'asset.delete',
      // Auth actions
      'auth.login', 'auth.logout', 'auth.password_change',
      // Settings actions
      'settings.update', 'webhook.configure',
      // Export actions
      'data.export',
      // Other
      'other'
    ],
    index: true
  },
  resourceType: {
    type: String,
    required: true,
    enum: ['Business', 'MiniApp', 'Product', 'Order', 'Invoice', 'Lead', 'Asset', 'User', 'Settings', 'Other'],
    index: true
  },
  resourceId: {
    type: String,
    index: true
  },
  resourceName: String,
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    fields: [String]
  },
  metadata: {
    ip: String,
    userAgent: String,
    method: String,
    endpoint: String,
    statusCode: Number,
    duration: Number,
    errorMessage: String
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info',
    index: true
  },
  success: {
    type: Boolean,
    default: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ businessId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

class AuditLogService {
  /**
   * Create an audit log entry
   * @param {Object} logData - Audit log data
   * @returns {Promise<Object>} Created audit log
   */
  async log(logData) {
    try {
      const {
        userId,
        action,
        resourceType,
        resourceId,
        resourceName,
        changes,
        metadata = {},
        severity = 'info',
        success = true,
        businessId
      } = logData;

      const auditLog = await AuditLog.create({
        userId,
        action,
        resourceType,
        resourceId,
        resourceName,
        changes,
        metadata,
        severity,
        success,
        businessId,
        timestamp: new Date()
      });

      return auditLog;
    } catch (error) {
      console.error('Error creating audit log:', error);
      // Don't throw error to prevent breaking main operations
      return null;
    }
  }

  /**
   * Log business action
   * @param {Object} data - Action data
   */
  async logBusinessAction(data) {
    const { userId, action, business, changes, metadata, success = true } = data;

    return await this.log({
      userId,
      action: `business.${action}`,
      resourceType: 'Business',
      resourceId: business._id || business.id,
      resourceName: business.name,
      changes,
      metadata,
      success,
      businessId: business._id || business.id
    });
  }

  /**
   * Log mini app action
   * @param {Object} data - Action data
   */
  async logMiniAppAction(data) {
    const { userId, action, miniApp, changes, metadata, success = true } = data;

    return await this.log({
      userId,
      action: `miniapp.${action}`,
      resourceType: 'MiniApp',
      resourceId: miniApp._id || miniApp.id,
      resourceName: miniApp.name,
      changes,
      metadata,
      success,
      businessId: miniApp.businessId
    });
  }

  /**
   * Log order action
   * @param {Object} data - Action data
   */
  async logOrderAction(data) {
    const { userId, action, order, changes, metadata, success = true } = data;

    return await this.log({
      userId,
      action: `order.${action}`,
      resourceType: 'Order',
      resourceId: order._id || order.id,
      resourceName: order.orderNumber,
      changes,
      metadata,
      success,
      businessId: order.businessId
    });
  }

  /**
   * Log invoice action
   * @param {Object} data - Action data
   */
  async logInvoiceAction(data) {
    const { userId, action, invoice, changes, metadata, success = true } = data;

    return await this.log({
      userId,
      action: `invoice.${action}`,
      resourceType: 'Invoice',
      resourceId: invoice._id || invoice.id,
      resourceName: invoice.invoiceNumber,
      changes,
      metadata,
      success,
      businessId: invoice.businessId
    });
  }

  /**
   * Log lead action
   * @param {Object} data - Action data
   */
  async logLeadAction(data) {
    const { userId, action, lead, changes, metadata, success = true } = data;

    return await this.log({
      userId,
      action: `lead.${action}`,
      resourceType: 'Lead',
      resourceId: lead._id || lead.id,
      resourceName: lead.name,
      changes,
      metadata,
      success,
      businessId: lead.businessId
    });
  }

  /**
   * Log authentication action
   * @param {Object} data - Action data
   */
  async logAuthAction(data) {
    const { userId, action, metadata, success = true } = data;

    return await this.log({
      userId,
      action: `auth.${action}`,
      resourceType: 'User',
      resourceId: userId,
      metadata,
      success,
      severity: success ? 'info' : 'warning'
    });
  }

  /**
   * Get audit logs with filters
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options (pagination, sorting)
   * @returns {Promise<Object>} Audit logs and metadata
   */
  async getAuditLogs(filters = {}, options = {}) {
    try {
      const {
        userId,
        businessId,
        action,
        resourceType,
        resourceId,
        severity,
        success,
        startDate,
        endDate
      } = filters;

      const {
        page = 1,
        limit = 50,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = options;

      const query = {};

      if (userId) query.userId = userId;
      if (businessId) query.businessId = businessId;
      if (action) query.action = action;
      if (resourceType) query.resourceType = resourceType;
      if (resourceId) query.resourceId = resourceId;
      if (severity) query.severity = severity;
      if (success !== undefined) query.success = success;

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        AuditLog.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('userId', 'name email')
          .populate('businessId', 'name')
          .lean(),
        AuditLog.countDocuments(query)
      ]);

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw new Error(`Failed to fetch audit logs: ${error.message}`);
    }
  }

  /**
   * Get audit trail for a specific resource
   * @param {string} resourceType - Resource type
   * @param {string} resourceId - Resource ID
   * @returns {Promise<Array>} Audit trail
   */
  async getResourceAuditTrail(resourceType, resourceId) {
    try {
      const logs = await AuditLog.find({
        resourceType,
        resourceId
      })
        .sort({ timestamp: -1 })
        .populate('userId', 'name email')
        .lean();

      return logs;
    } catch (error) {
      console.error('Error fetching resource audit trail:', error);
      throw new Error(`Failed to fetch audit trail: ${error.message}`);
    }
  }

  /**
   * Get user activity summary
   * @param {string} userId - User ID
   * @param {Object} dateRange - Date range
   * @returns {Promise<Object>} Activity summary
   */
  async getUserActivitySummary(userId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      const query = { userId };

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      const [
        totalActions,
        actionBreakdown,
        recentActivity,
        failedActions
      ] = await Promise.all([
        AuditLog.countDocuments(query),
        AuditLog.aggregate([
          { $match: query },
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        AuditLog.find(query)
          .sort({ timestamp: -1 })
          .limit(10)
          .populate('businessId', 'name')
          .lean(),
        AuditLog.countDocuments({ ...query, success: false })
      ]);

      return {
        userId,
        totalActions,
        failedActions,
        successRate: totalActions > 0 ? ((totalActions - failedActions) / totalActions * 100).toFixed(2) : 0,
        actionBreakdown: actionBreakdown.map(item => ({
          action: item._id,
          count: item.count
        })),
        recentActivity
      };
    } catch (error) {
      console.error('Error fetching user activity summary:', error);
      throw new Error(`Failed to fetch activity summary: ${error.message}`);
    }
  }

  /**
   * Get business activity summary
   * @param {string} businessId - Business ID
   * @param {Object} dateRange - Date range
   * @returns {Promise<Object>} Activity summary
   */
  async getBusinessActivitySummary(businessId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      const query = { businessId };

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      const [
        totalActions,
        actionBreakdown,
        userBreakdown,
        recentActivity
      ] = await Promise.all([
        AuditLog.countDocuments(query),
        AuditLog.aggregate([
          { $match: query },
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        AuditLog.aggregate([
          { $match: query },
          { $group: { _id: '$userId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 }
        ]),
        AuditLog.find(query)
          .sort({ timestamp: -1 })
          .limit(20)
          .populate('userId', 'name email')
          .lean()
      ]);

      return {
        businessId,
        totalActions,
        actionBreakdown: actionBreakdown.map(item => ({
          action: item._id,
          count: item.count
        })),
        topUsers: userBreakdown.map(item => ({
          userId: item._id,
          actionsCount: item.count
        })),
        recentActivity
      };
    } catch (error) {
      console.error('Error fetching business activity summary:', error);
      throw new Error(`Failed to fetch business activity summary: ${error.message}`);
    }
  }

  /**
   * Delete old audit logs (data retention)
   * @param {number} daysToKeep - Number of days to keep logs
   * @returns {Promise<Object>} Deletion result
   */
  async cleanupOldLogs(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await AuditLog.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      return {
        success: true,
        deletedCount: result.deletedCount,
        cutoffDate
      };
    } catch (error) {
      console.error('Error cleaning up old audit logs:', error);
      throw new Error(`Failed to cleanup audit logs: ${error.message}`);
    }
  }

  /**
   * Export audit logs to CSV
   * @param {Object} filters - Filter criteria
   * @returns {Promise<string>} CSV data
   */
  async exportToCSV(filters = {}) {
    try {
      const { logs } = await this.getAuditLogs(filters, { limit: 10000 });

      const csvHeader = 'Timestamp,User,Action,Resource Type,Resource ID,Resource Name,Success,Severity,IP Address\n';
      const csvRows = logs.map(log => {
        const user = log.userId ? (log.userId.email || log.userId.name || log.userId._id) : 'System';
        const timestamp = new Date(log.timestamp).toISOString();
        const ip = log.metadata?.ip || '-';
        
        return `${timestamp},"${user}","${log.action}","${log.resourceType}","${log.resourceId || '-'}","${log.resourceName || '-'}",${log.success},${log.severity},"${ip}"`;
      }).join('\n');

      return csvHeader + csvRows;
    } catch (error) {
      console.error('Error exporting audit logs to CSV:', error);
      throw new Error(`Failed to export audit logs: ${error.message}`);
    }
  }
}

module.exports = new AuditLogService();
module.exports.AuditLog = AuditLog;
