/**
 * Admin Audit Controller - Phase 10 REST Endpoints
 * Admin audit log viewing and management endpoints
 */

const { validationResult } = require('express-validator');
const AdminAuditService = require('../services/AdminAuditService');

class AdminAuditController {
  async getAuditLogs(req, res) {
    try {
      const filters = {
        adminId: req.query.adminId,
        actionType: req.query.actionType,
        targetType: req.query.targetType,
        targetId: req.query.targetId,
        severity: req.query.severity,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        limit: parseInt(req.query.limit) || 100,
        skip: parseInt(req.query.skip) || 0,
      };

      const result = await AdminAuditService.getAuditLogs(filters);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve audit logs',
        errors: [error.message],
      });
    }
  }

  async getAuditLogDetails(req, res) {
    try {
      const { auditId } = req.params;

      const result = await AdminAuditService.getAuditLogDetails(auditId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve audit log details',
        errors: [error.message],
      });
    }
  }

  async reverseAction(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { auditId } = req.params;
      const { reversedBy, reversalReason } = req.body;

      const result = await AdminAuditService.reverseAction(auditId, reversedBy, reversalReason);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to reverse action',
        errors: [error.message],
      });
    }
  }

  async exportAuditLogs(req, res) {
    try {
      const filters = {
        adminId: req.query.adminId,
        actionType: req.query.actionType,
      };

      const format = req.query.format || 'csv';

      const result = await AdminAuditService.exportAuditLogs(filters, format);

      if (result.success) {
        res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs.${format === 'json' ? 'json' : 'csv'}"`);
        return res.send(result.data.exportData);
      }

      return res.status(400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to export audit logs',
        errors: [error.message],
      });
    }
  }

  async logAdminAction(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { adminId, adminEmail, adminRole, actionType, targetType, targetId, targetName, details } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      const result = await AdminAuditService.logAdminAction(
        adminId,
        adminEmail,
        adminRole,
        actionType,
        targetType,
        targetId,
        targetName,
        details,
        ipAddress,
        req.sessionID,
        userAgent
      );

      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to log admin action',
        errors: [error.message],
      });
    }
  }
}

module.exports = new AdminAuditController();
