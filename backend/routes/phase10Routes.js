/**
 * Phase 10 Routes - Security & Compliance
 * Consolidated routes for all Phase 10 security and compliance endpoints
 */

const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');

// Controllers
const DeliveryOTPController = require('../controllers/DeliveryOTPController');
const FraudDetectionController = require('../controllers/FraudDetectionController');
const AdminAuditController = require('../controllers/AdminAuditController');
const ActivityLogController = require('../controllers/ActivityLogController');
const RBACController = require('../controllers/RBACController');
const PCIDSSComplianceController = require('../controllers/PCIDSSComplianceController');
const GDPRComplianceController = require('../controllers/GDPRComplianceController');
const DataEncryptionKeyController = require('../controllers/DataEncryptionKeyController');
const RateLimiterController = require('../controllers/RateLimiterController');
const UserDataExportController = require('../controllers/UserDataExportController');

// All routes require JWT authentication
router.use(authenticateToken);

// ==================== DELIVERY OTP ROUTES ====================
router.post('/otp/generate', DeliveryOTPController.generateOTP);
router.post('/otp/verify', DeliveryOTPController.verifyOTP);
router.post('/otp/resend', DeliveryOTPController.resendOTP);
router.get('/otp/:verificationId/status', DeliveryOTPController.getVerificationStatus);

// ==================== FRAUD DETECTION ROUTES ====================
router.post('/fraud/detect', FraudDetectionController.detectFraud);
router.get('/fraud/:fraudId', FraudDetectionController.getFraudCaseDetails);
router.post('/fraud/:fraudId/escalate', FraudDetectionController.escalateCase);
router.post('/fraud/:fraudId/resolve', FraudDetectionController.resolveFraudCase);
router.get('/fraud', FraudDetectionController.listFraudCases);

// ==================== ADMIN AUDIT LOG ROUTES ====================
router.get('/audit-logs', AdminAuditController.getAuditLogs);
router.get('/audit-logs/:auditId', AdminAuditController.getAuditLogDetails);
router.post('/audit-logs', AdminAuditController.logAdminAction);
router.post('/audit-logs/:auditId/reverse', AdminAuditController.reverseAction);
router.get('/audit-logs/export', AdminAuditController.exportAuditLogs);

// ==================== ACTIVITY LOG ROUTES ====================
router.post('/activity-logs', ActivityLogController.logActivity);
router.get('/activity-logs/user/:userId', ActivityLogController.getUserActivityLog);
router.get('/activity-logs/:logId', ActivityLogController.getActivityDetails);
router.get('/activity-logs/user/:userId/anomalies', ActivityLogController.getAnomalousActivity);
router.get('/activity-logs/user/:userId/export', ActivityLogController.exportActivityLogs);

// ==================== RBAC ROUTES ====================
router.post('/rbac/roles', RBACController.createRole);
router.get('/rbac/roles', RBACController.getAllRoles);
router.get('/rbac/roles/:roleId', RBACController.getRoleDetails);
router.post('/rbac/roles/:roleId/permissions', RBACController.addPermission);
router.delete('/rbac/roles/:roleId/permissions/:permissionId', RBACController.removePermission);
router.put('/rbac/roles/:roleId/permissions', RBACController.updatePermissions);
router.post('/rbac/roles/:roleId/deactivate', RBACController.deactivateRole);
router.post('/rbac/roles/:roleId/reactivate', RBACController.reactivateRole);
router.post('/rbac/check-permission', RBACController.checkPermission);

// ==================== PCI DSS COMPLIANCE ROUTES ====================
router.post('/pci-dss/compliance', PCIDSSComplianceController.createComplianceRecord);
router.get('/pci-dss/compliance/:complianceId', PCIDSSComplianceController.getComplianceStatus);
router.put('/pci-dss/compliance/:complianceId/requirements/:requirementId', PCIDSSComplianceController.updateRequirementStatus);
router.post('/pci-dss/compliance/:complianceId/audit', PCIDSSComplianceController.scheduleAudit);
router.post('/pci-dss/compliance/:complianceId/incidents', PCIDSSComplianceController.recordIncident);
router.get('/pci-dss/compliance/:complianceId/certification', PCIDSSComplianceController.getCertificationDetails);

// ==================== GDPR COMPLIANCE ROUTES ====================
router.post('/gdpr/compliance/initialize', GDPRComplianceController.initializeCompliance);
router.get('/gdpr/compliance/:userId', GDPRComplianceController.getComplianceStatus);
router.put('/gdpr/compliance/:userId/consent', GDPRComplianceController.updateConsent);
router.post('/gdpr/compliance/:userId/data-export', GDPRComplianceController.requestDataExport);
router.post('/gdpr/compliance/:userId/data-erasure', GDPRComplianceController.requestDataErasure);
router.post('/gdpr/compliance/:userId/breach', GDPRComplianceController.recordBreach);
router.post('/gdpr/compliance/:userId/audit-event', GDPRComplianceController.addAuditEvent);

// ==================== DATA ENCRYPTION KEY ROUTES ====================
router.post('/encryption-keys', DataEncryptionKeyController.createKey);
router.get('/encryption-keys', DataEncryptionKeyController.listAllKeys);
router.get('/encryption-keys/expiring', DataEncryptionKeyController.getExpiringKeys);
router.get('/encryption-keys/:keyId', DataEncryptionKeyController.getKeyDetails);
router.post('/encryption-keys/:keyId/rotate', DataEncryptionKeyController.rotateKey);
router.post('/encryption-keys/:keyId/schedule-rotation', DataEncryptionKeyController.scheduleRotation);
router.post('/encryption-keys/:keyId/mark-compromised', DataEncryptionKeyController.markAsCompromised);
router.post('/encryption-keys/:keyId/usage', DataEncryptionKeyController.logUsage);

// ==================== RATE LIMITER ROUTES ====================
router.post('/rate-limiters', RateLimiterController.createRateLimiter);
router.get('/rate-limiters', RateLimiterController.getAllRateLimiters);
router.get('/rate-limiters/:limiterId', RateLimiterController.getRateLimiterDetails);
router.post('/rate-limiters/:limiterId/check', RateLimiterController.checkRateLimit);
router.post('/rate-limiters/:limiterId/whitelist-ip', RateLimiterController.whitelistIP);
router.post('/rate-limiters/:limiterId/blacklist-ip', RateLimiterController.blacklistIP);
router.post('/rate-limiters/:limiterId/whitelist-user', RateLimiterController.whitelistUser);
router.post('/rate-limiters/:limiterId/disable', RateLimiterController.disableRateLimiter);
router.post('/rate-limiters/:limiterId/enable', RateLimiterController.enableRateLimiter);

// ==================== USER DATA EXPORT ROUTES ====================
router.post('/data-export/request', UserDataExportController.createExportRequest);
router.get('/data-export/:exportId', UserDataExportController.getExportStatus);
router.post('/data-export/:exportId/start', UserDataExportController.startProcessing);
router.post('/data-export/:exportId/complete', UserDataExportController.completeProcessing);
router.post('/data-export/:exportId/failed', UserDataExportController.markAsFailed);
router.get('/data-export/:exportId/download', UserDataExportController.downloadExportFile);
router.get('/data-export/user/:userId', UserDataExportController.getUserExports);
router.delete('/data-export/:exportId', UserDataExportController.cancelExportRequest);

module.exports = router;
