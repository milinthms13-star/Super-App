/**
 * Admin Audit Service - Phase 10 Business Logic
 * Audit log creation, filtering, and reversal
 */

const AdminAuditLog = require('../models/AdminAuditLog');

class AdminAuditService {
  async logAdminAction(
    adminId,
    adminEmail,
    adminRole,
    actionType,
    targetType,
    targetId,
    targetName,
    details,
    ipAddress,
    sessionId,
    userAgent
  ) {
    try {
      const auditId = `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const auditLog = new AdminAuditLog({
        auditId,
        adminId,
        adminEmail,
        adminRole,
        actionType,
        targetType,
        targetId,
        targetName,
        details,
        ipAddress,
        sessionId,
        userAgent,
        timestamp: new Date(),
        severity: this._calculateSeverity(actionType),
      });

      await auditLog.save();

      return {
        success: true,
        data: { auditId },
        message: 'Admin action logged successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to log admin action',
        errors: [error.message],
      };
    }
  }

  async getAuditLogs(filters = {}) {
    try {
      const query = {};

      if (filters.adminId) query.adminId = filters.adminId;
      if (filters.actionType) query.actionType = filters.actionType;
      if (filters.targetType) query.targetType = filters.targetType;
      if (filters.targetId) query.targetId = filters.targetId;
      if (filters.severity) query.severity = filters.severity;

      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
        if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
      }

      const logs = await AdminAuditLog.find(query)
        .sort({ timestamp: -1 })
        .limit(filters.limit || 100)
        .skip(filters.skip || 0);

      const total = await AdminAuditLog.countDocuments(query);

      return {
        success: true,
        data: { logs, total },
        message: 'Audit logs retrieved',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve audit logs',
        errors: [error.message],
      };
    }
  }

  async getAuditLogDetails(auditId) {
    try {
      const log = await AdminAuditLog.findOne({ auditId });

      if (!log) {
        return { success: false, message: 'Audit log not found', statusCode: 404 };
      }

      return {
        success: true,
        data: log,
        message: 'Audit log details retrieved',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve audit log details',
        errors: [error.message],
      };
    }
  }

  async reverseAction(auditId, reversedBy, reversalReason) {
    try {
      const log = await AdminAuditLog.findOne({ auditId });

      if (!log) {
        return { success: false, message: 'Audit log not found', statusCode: 404 };
      }

      if (!log.reversible.isReversible) {
        return { success: false, message: 'This action cannot be reversed', statusCode: 400 };
      }

      log.reverseAction(reversedBy, reversalReason);
      await log.save();

      return {
        success: true,
        data: { auditId },
        message: 'Action reversed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to reverse action',
        errors: [error.message],
      };
    }
  }

  async exportAuditLogs(filters = {}, format = 'csv') {
    try {
      const query = {};

      if (filters.adminId) query.adminId = filters.adminId;
      if (filters.actionType) query.actionType = filters.actionType;

      const logs = await AdminAuditLog.find(query).sort({ timestamp: -1 });

      // Format export based on requested format
      let exportData;
      if (format === 'json') {
        exportData = JSON.stringify(logs, null, 2);
      } else if (format === 'csv') {
        exportData = this._convertToCSV(logs);
      }

      return {
        success: true,
        data: { exportData, count: logs.length },
        message: 'Audit logs exported successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to export audit logs',
        errors: [error.message],
      };
    }
  }

  // Helper methods
  _calculateSeverity(actionType) {
    const criticalActions = ['user_ban', 'restaurant_ban', 'data_export', 'system_config_change'];
    const highActions = ['user_suspend', 'order_refund', 'dispute_resolve', 'payment_reconciliation'];

    if (criticalActions.includes(actionType)) return 'critical';
    if (highActions.includes(actionType)) return 'high';
    return 'medium';
  }

  _convertToCSV(logs) {
    const headers = ['auditId', 'adminId', 'actionType', 'targetType', 'targetId', 'timestamp', 'severity'];
    const rows = logs.map((log) =>
      headers.map((header) => JSON.stringify(log[header] || '')).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }
}

module.exports = new AdminAuditService();
