const express = require('express');
const router = express.Router();
const auditLogService = require('../services/auditLogService');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/audit-logs
 * @desc    Get audit logs with filters
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
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
      endDate,
      page,
      limit,
      sortBy,
      sortOrder
    } = req.query;

    const filters = {};
    if (userId) filters.userId = userId;
    if (businessId) filters.businessId = businessId;
    if (action) filters.action = action;
    if (resourceType) filters.resourceType = resourceType;
    if (resourceId) filters.resourceId = resourceId;
    if (severity) filters.severity = severity;
    if (success !== undefined) filters.success = success === 'true';
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const options = {};
    if (page) options.page = parseInt(page);
    if (limit) options.limit = parseInt(limit);
    if (sortBy) options.sortBy = sortBy;
    if (sortOrder) options.sortOrder = sortOrder;

    const result = await auditLogService.getAuditLogs(filters, options);

    res.json({
      success: true,
      message: 'Audit logs retrieved successfully',
      data: result
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch audit logs'
    });
  }
});

/**
 * @route   GET /api/audit-logs/resource/:resourceType/:resourceId
 * @desc    Get audit trail for a specific resource
 * @access  Private
 */
router.get('/resource/:resourceType/:resourceId', authenticate, async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;

    const auditTrail = await auditLogService.getResourceAuditTrail(
      resourceType,
      resourceId
    );

    res.json({
      success: true,
      message: 'Audit trail retrieved successfully',
      data: auditTrail
    });
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch audit trail'
    });
  }
});

/**
 * @route   GET /api/audit-logs/user/:userId/summary
 * @desc    Get user activity summary
 * @access  Private
 */
router.get('/user/:userId/summary', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const dateRange = {};
    if (startDate) dateRange.startDate = startDate;
    if (endDate) dateRange.endDate = endDate;

    const summary = await auditLogService.getUserActivitySummary(
      userId,
      dateRange
    );

    res.json({
      success: true,
      message: 'User activity summary retrieved',
      data: summary
    });
  } catch (error) {
    console.error('Error fetching user activity summary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user activity summary'
    });
  }
});

/**
 * @route   GET /api/audit-logs/business/:businessId/summary
 * @desc    Get business activity summary
 * @access  Private
 */
router.get('/business/:businessId/summary', authenticate, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { startDate, endDate } = req.query;

    const dateRange = {};
    if (startDate) dateRange.startDate = startDate;
    if (endDate) dateRange.endDate = endDate;

    const summary = await auditLogService.getBusinessActivitySummary(
      businessId,
      dateRange
    );

    res.json({
      success: true,
      message: 'Business activity summary retrieved',
      data: summary
    });
  } catch (error) {
    console.error('Error fetching business activity summary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch business activity summary'
    });
  }
});

/**
 * @route   POST /api/audit-logs
 * @desc    Create audit log entry (for testing/manual logging)
 * @access  Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const logData = {
      userId: req.user.id,
      ...req.body
    };

    const auditLog = await auditLogService.log(logData);

    res.status(201).json({
      success: true,
      message: 'Audit log created successfully',
      data: auditLog
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create audit log'
    });
  }
});

/**
 * @route   GET /api/audit-logs/export/csv
 * @desc    Export audit logs to CSV
 * @access  Private
 */
router.get('/export/csv', authenticate, async (req, res) => {
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
    } = req.query;

    const filters = {};
    if (userId) filters.userId = userId;
    if (businessId) filters.businessId = businessId;
    if (action) filters.action = action;
    if (resourceType) filters.resourceType = resourceType;
    if (resourceId) filters.resourceId = resourceId;
    if (severity) filters.severity = severity;
    if (success !== undefined) filters.success = success === 'true';
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const csvData = await auditLogService.exportToCSV(filters);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
    res.send(csvData);
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to export audit logs'
    });
  }
});

/**
 * @route   DELETE /api/audit-logs/cleanup
 * @desc    Cleanup old audit logs (admin only)
 * @access  Private (Admin)
 */
router.delete('/cleanup', authenticate, async (req, res) => {
  try {
    // TODO: Add admin check middleware
    const { daysToKeep = 90 } = req.body;

    const result = await auditLogService.cleanupOldLogs(daysToKeep);

    res.json({
      success: true,
      message: `Cleaned up audit logs older than ${daysToKeep} days`,
      data: result
    });
  } catch (error) {
    console.error('Error cleaning up audit logs:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cleanup audit logs'
    });
  }
});

/**
 * @route   GET /api/audit-logs/actions
 * @desc    Get list of available audit actions
 * @access  Private
 */
router.get('/actions', authenticate, async (req, res) => {
  try {
    const actions = [
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
      'data.export'
    ];

    res.json({
      success: true,
      message: 'Available audit actions',
      data: actions
    });
  } catch (error) {
    console.error('Error fetching audit actions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit actions'
    });
  }
});

/**
 * @route   GET /api/audit-logs/stats
 * @desc    Get audit log statistics
 * @access  Private
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const AuditLog = auditLogService.AuditLog;

    const query = {};
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const [
      totalLogs,
      successfulActions,
      failedActions,
      byAction,
      byResourceType,
      bySeverity
    ] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.countDocuments({ ...query, success: true }),
      AuditLog.countDocuments({ ...query, success: false }),
      AuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      AuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$resourceType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      AuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      success: true,
      message: 'Audit log statistics retrieved',
      data: {
        totalLogs,
        successfulActions,
        failedActions,
        successRate: totalLogs > 0 ? ((successfulActions / totalLogs) * 100).toFixed(2) : 0,
        topActions: byAction.map(item => ({ action: item._id, count: item.count })),
        byResourceType: byResourceType.map(item => ({ resourceType: item._id, count: item.count })),
        bySeverity: bySeverity.map(item => ({ severity: item._id, count: item.count }))
      }
    });
  } catch (error) {
    console.error('Error fetching audit log stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch audit log statistics'
    });
  }
});

module.exports = router;
