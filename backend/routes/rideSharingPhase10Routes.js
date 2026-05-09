/**
 * rideSharingPhase10Routes.js
 * Phase 10: Security & Compliance - Encryption, compliance, data protection, audit logging
 * 32+ endpoints for security and compliance management
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const SecurityEncryptionService = require('../services/ridesharing/SecurityEncryptionService');
const CompliancePolicyService = require('../services/ridesharing/CompliancePolicyService');
const DataProtectionService = require('../services/ridesharing/DataProtectionService');
const AuditLoggingService = require('../services/ridesharing/AuditLoggingService');

// ==================== SECURITY & ENCRYPTION ENDPOINTS ====================

/**
 * POST /api/ridesharing/phase10/security/generate-key
 * Generate new encryption key
 */
router.post('/security/generate-key', auth, async (req, res) => {
  try {
    const result = await SecurityEncryptionService.generateEncryptionKey(
      req.body.keyType,
      req.body.algorithm
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase10/security/rotate-key
 * Rotate encryption key
 */
router.post('/security/rotate-key', auth, async (req, res) => {
  try {
    const result = await SecurityEncryptionService.rotateEncryptionKey(req.body.keyId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase10/security/encrypt
 * Encrypt data
 */
router.post('/security/encrypt', auth, async (req, res) => {
  try {
    const result = await SecurityEncryptionService.encryptData(
      req.body.data,
      req.body.keyId
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase10/security/decrypt
 * Decrypt data
 */
router.post('/security/decrypt', auth, async (req, res) => {
  try {
    const result = await SecurityEncryptionService.decryptData(
      req.body.encryptedData,
      req.body.keyId,
      req.body.authTag
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase10/security/hash
 * Hash data (one-way)
 */
router.post('/security/hash', async (req, res) => {
  try {
    const result = await SecurityEncryptionService.hashData(
      req.body.data,
      req.body.algorithm
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase10/security/verify-hash
 * Verify hashed data
 */
router.post('/security/verify-hash', async (req, res) => {
  try {
    const result = await SecurityEncryptionService.verifyHash(
      req.body.data,
      req.body.hash,
      req.body.algorithm
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase10/security/key-status/:keyId
 * Get encryption key status
 */
router.get('/security/key-status/:keyId', auth, async (req, res) => {
  try {
    const result = await SecurityEncryptionService.getKeyStatus(req.params.keyId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase10/security/report-compromise
 * Report key compromise
 */
router.post('/security/report-compromise', auth, async (req, res) => {
  try {
    const result = await SecurityEncryptionService.reportKeyCompromise(
      req.body.keyId,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase10/security/active-keys
 * Get active encryption keys
 */
router.get('/security/active-keys', auth, async (req, res) => {
  try {
    const result = await SecurityEncryptionService.getActiveKeys(req.query.keyType);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase10/security/configure-tls
 * Configure TLS/SSL encryption
 */
router.post('/security/configure-tls', auth, async (req, res) => {
  try {
    const result = await SecurityEncryptionService.configureTLSEncryption(
      req.body.certificatePath,
      req.body.keyPath
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase10/security/generate-session
 * Generate secure session token
 */
router.post('/security/generate-session', auth, async (req, res) => {
  try {
    const result = await SecurityEncryptionService.generateSecureSessionToken(
      req.user.id,
      req.body.metadata
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase10/security/revoke-session
 * Revoke security session
 */
router.post('/security/revoke-session', auth, async (req, res) => {
  try {
    const result = await SecurityEncryptionService.revokeSession(req.body.sessionId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== COMPLIANCE POLICY ENDPOINTS ====================

/**
 * GET /api/ridesharing/phase10/compliance/status
 * Get compliance status
 */
router.get('/compliance/status', async (req, res) => {
  try {
    const result = await CompliancePolicyService.getComplianceStatus(req.query.type);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase10/compliance/pci-dss-audit
 * Run PCI DSS compliance audit
 */
router.post('/compliance/pci-dss-audit', auth, async (req, res) => {
  try {
    const result = await CompliancePolicyService.runPCIDSSAudit(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase10/compliance/gdpr-audit
 * Run GDPR compliance audit
 */
router.post('/compliance/gdpr-audit', auth, async (req, res) => {
  try {
    const result = await CompliancePolicyService.runGDPRAudit(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase10/compliance/create-policy
 * Create compliance policy
 */
router.post('/compliance/create-policy', auth, async (req, res) => {
  try {
    const result = await CompliancePolicyService.createCompliancePolicy(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase10/compliance/retention-policy
 * Get data retention policy
 */
router.get('/compliance/retention-policy', async (req, res) => {
  try {
    const result = await CompliancePolicyService.getDataRetentionPolicy(req.query.dataType);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase10/compliance/update-checklist
 * Update compliance checklist
 */
router.post('/compliance/update-checklist', auth, async (req, res) => {
  try {
    const result = await CompliancePolicyService.updateComplianceChecklist(
      req.body.complianceType,
      req.body.items
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase10/compliance/report
 * Export compliance report
 */
router.get('/compliance/report', auth, async (req, res) => {
  try {
    const result = await CompliancePolicyService.exportComplianceReport(
      req.query.type,
      req.query
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase10/compliance/log-event
 * Log compliance event
 */
router.post('/compliance/log-event', auth, async (req, res) => {
  try {
    const result = await CompliancePolicyService.logComplianceEvent(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase10/compliance/violations
 * Get compliance violations
 */
router.get('/compliance/violations', auth, async (req, res) => {
  try {
    const result = await CompliancePolicyService.getComplianceViolations(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase10/compliance/certify
 * Certify compliance
 */
router.post('/compliance/certify', auth, async (req, res) => {
  try {
    const result = await CompliancePolicyService.certifyCompliance(
      req.body.complianceType,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== DATA PROTECTION ENDPOINTS ====================

/**
 * POST /api/ridesharing/phase10/data-protection/consent
 * Create user consent record
 */
router.post('/data-protection/consent', auth, async (req, res) => {
  try {
    const result = await DataProtectionService.createUserConsent(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase10/data-protection/consent-status
 * Get user consent status
 */
router.get('/data-protection/consent-status', auth, async (req, res) => {
  try {
    const result = await DataProtectionService.getUserConsentStatus(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase10/data-protection/request-access
 * Request data access (GDPR)
 */
router.post('/data-protection/request-access', auth, async (req, res) => {
  try {
    const result = await DataProtectionService.requestDataAccess(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase10/data-protection/export
 * Export user data
 */
router.get('/data-protection/export', auth, async (req, res) => {
  try {
    const result = await DataProtectionService.exportUserData(req.user.id, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase10/data-protection/request-erasure
 * Request data erasure (GDPR Right to be Forgotten)
 */
router.post('/data-protection/request-erasure', auth, async (req, res) => {
  try {
    const result = await DataProtectionService.requestDataErasure(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase10/data-protection/request-rectification
 * Request data rectification
 */
router.post('/data-protection/request-rectification', auth, async (req, res) => {
  try {
    const result = await DataProtectionService.requestDataRectification(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase10/data-protection/dpa
 * Get data processing agreement
 */
router.get('/data-protection/dpa', auth, async (req, res) => {
  try {
    const result = await DataProtectionService.getDataProcessingAgreement(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase10/data-protection/breach-notifications
 * Get data breach notifications
 */
router.get('/data-protection/breach-notifications', auth, async (req, res) => {
  try {
    const result = await DataProtectionService.getDataBreachNotifications(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase10/data-protection/log-processing
 * Log data processing activity
 */
router.post('/data-protection/log-processing', auth, async (req, res) => {
  try {
    const result = await DataProtectionService.logDataProcessingActivity(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase10/data-protection/retention-analysis
 * Get data retention analysis
 */
router.get('/data-protection/retention-analysis', auth, async (req, res) => {
  try {
    const result = await DataProtectionService.getDataRetentionAnalysis(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase10/data-protection/accept-privacy-policy
 * Accept privacy policy
 */
router.post('/data-protection/accept-privacy-policy', auth, async (req, res) => {
  try {
    const result = await DataProtectionService.acceptPrivacyPolicy(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== AUDIT LOGGING ENDPOINTS ====================

/**
 * POST /api/ridesharing/phase10/audit/log-security-event
 * Log security event
 */
router.post('/audit/log-security-event', auth, async (req, res) => {
  try {
    const result = await AuditLoggingService.logSecurityEvent(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase10/audit/log-admin-action
 * Log admin action
 */
router.post('/audit/log-admin-action', auth, async (req, res) => {
  try {
    const result = await AuditLoggingService.logAdminAction({
      ...req.body,
      adminId: req.user.id
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase10/audit/reverse-action
 * Reverse admin action
 */
router.post('/audit/reverse-action', auth, async (req, res) => {
  try {
    const result = await AuditLoggingService.reverseAdminAction(
      req.body.actionId,
      { ...req.body, adminId: req.user.id }
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase10/audit/log-user-activity
 * Log user activity
 */
router.post('/audit/log-user-activity', auth, async (req, res) => {
  try {
    const result = await AuditLoggingService.logUserActivity({
      ...req.body,
      userId: req.user.id
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase10/audit/activity-history
 * Get user activity history
 */
router.get('/audit/activity-history', auth, async (req, res) => {
  try {
    const result = await AuditLoggingService.getUserActivityHistory(req.user.id, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase10/audit/suspicious-activity
 * Detect suspicious activity
 */
router.get('/audit/suspicious-activity', auth, async (req, res) => {
  try {
    const result = await AuditLoggingService.detectSuspiciousActivity(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase10/audit/export-trail
 * Export audit trail
 */
router.get('/audit/export-trail', auth, async (req, res) => {
  try {
    const result = await AuditLoggingService.exportAuditTrail(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase10/audit/statistics
 * Get audit statistics
 */
router.get('/audit/statistics', auth, async (req, res) => {
  try {
    const result = await AuditLoggingService.getAuditStatistics(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase10/audit/compliance-report
 * Create compliance report
 */
router.post('/audit/compliance-report', auth, async (req, res) => {
  try {
    const result = await AuditLoggingService.createComplianceReport(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
