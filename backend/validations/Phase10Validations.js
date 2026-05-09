/**
 * Phase 10 Validations - Input validation for all security & compliance endpoints
 */

const { body, param, query } = require('express-validator');

class Phase10Validations {
  // ==================== DELIVERY OTP VALIDATIONS ====================
  static generateOTPValidation() {
    return [
      body('orderId').notEmpty().withMessage('Order ID is required').isString(),
      body('userId').notEmpty().withMessage('User ID is required').isString(),
      body('deliveryPartnerId').notEmpty().withMessage('Delivery Partner ID is required').isString(),
      body('phoneNumber').notEmpty().withMessage('Phone number is required').isMobilePhone(),
      body('method').optional().isIn(['sms', 'voice_call', 'email', 'app_push']),
    ];
  }

  static verifyOTPValidation() {
    return [
      body('verificationId').notEmpty().withMessage('Verification ID is required').isString(),
      body('otpCode').notEmpty().withMessage('OTP code is required').isLength({ min: 6, max: 6 }),
      body('deviceId').notEmpty().withMessage('Device ID is required').isString(),
      body('ipAddress').notEmpty().withMessage('IP address is required').isIP(),
    ];
  }

  static resendOTPValidation() {
    return [
      body('verificationId').notEmpty().withMessage('Verification ID is required').isString(),
      body('method').optional().isIn(['sms', 'voice_call', 'email', 'app_push']),
    ];
  }

  static verificationIdParamValidation() {
    return [param('verificationId').isString().withMessage('Invalid verification ID')];
  }

  // ==================== FRAUD DETECTION VALIDATIONS ====================
  static detectFraudValidation() {
    return [
      body('orderId').notEmpty().withMessage('Order ID is required'),
      body('userId').notEmpty().withMessage('User ID is required'),
      body('fraudData').isObject().withMessage('Fraud data is required'),
    ];
  }

  static fraudIdParamValidation() {
    return [param('fraudId').isString().withMessage('Invalid fraud ID')];
  }

  static escalateCaseValidation() {
    return [
      param('fraudId').isString().withMessage('Invalid fraud ID'),
      body('escalationLevel').isInt({ min: 1, max: 5 }).withMessage('Escalation level must be 1-5'),
      body('reason').notEmpty().withMessage('Escalation reason is required').isString(),
      body('escalatedTo').notEmpty().withMessage('Escalated to is required').isString(),
    ];
  }

  static resolveFraudCaseValidation() {
    return [
      param('fraudId').isString().withMessage('Invalid fraud ID'),
      body('outcome').notEmpty().withMessage('Outcome is required').isIn(['confirmed', 'rejected', 'pending']),
      body('disposition').optional().isObject(),
    ];
  }

  // ==================== ADMIN AUDIT VALIDATIONS ====================
  static logAdminActionValidation() {
    return [
      body('adminId').notEmpty().withMessage('Admin ID is required'),
      body('adminEmail').notEmpty().withMessage('Admin email is required').isEmail(),
      body('adminRole').notEmpty().withMessage('Admin role is required').isIn(['super_admin', 'admin', 'moderator', 'analyst']),
      body('actionType').notEmpty().withMessage('Action type is required'),
      body('targetType').notEmpty().withMessage('Target type is required'),
      body('targetId').notEmpty().withMessage('Target ID is required'),
      body('targetName').optional().isString(),
      body('details').optional().isObject(),
    ];
  }

  static auditIdParamValidation() {
    return [param('auditId').isString().withMessage('Invalid audit ID')];
  }

  static reverseActionValidation() {
    return [
      param('auditId').isString().withMessage('Invalid audit ID'),
      body('reversedBy').notEmpty().withMessage('Reversed by is required'),
      body('reversalReason').notEmpty().withMessage('Reversal reason is required'),
    ];
  }

  // ==================== ACTIVITY LOG VALIDATIONS ====================
  static logActivityValidation() {
    return [
      body('userId').notEmpty().withMessage('User ID is required'),
      body('userType').notEmpty().withMessage('User type is required').isIn(['customer', 'restaurant', 'delivery_partner', 'admin']),
      body('activityType').notEmpty().withMessage('Activity type is required'),
      body('details').optional().isObject(),
    ];
  }

  static userIdParamValidation() {
    return [param('userId').isString().withMessage('Invalid user ID')];
  }

  static logIdParamValidation() {
    return [param('logId').isString().withMessage('Invalid log ID')];
  }

  // ==================== RBAC VALIDATIONS ====================
  static createRoleValidation() {
    return [
      body('roleName').notEmpty().withMessage('Role name is required').isString(),
      body('description').optional().isString(),
      body('permissions').optional().isArray(),
      body('modules').optional().isObject(),
    ];
  }

  static roleIdParamValidation() {
    return [param('roleId').isString().withMessage('Invalid role ID')];
  }

  static addPermissionValidation() {
    return [
      param('roleId').isString().withMessage('Invalid role ID'),
      body('permissionName').notEmpty().withMessage('Permission name is required'),
      body('resource').notEmpty().withMessage('Resource is required'),
      body('action').notEmpty().withMessage('Action is required'),
      body('level').optional().isInt({ min: 1, max: 5 }),
    ];
  }

  static permissionIdParamValidation() {
    return [
      param('roleId').isString().withMessage('Invalid role ID'),
      param('permissionId').isString().withMessage('Invalid permission ID'),
    ];
  }

  static checkPermissionValidation() {
    return [
      body('userId').notEmpty().withMessage('User ID is required'),
      body('resource').notEmpty().withMessage('Resource is required'),
      body('action').notEmpty().withMessage('Action is required'),
    ];
  }

  static updatePermissionsValidation() {
    return [
      param('roleId').isString().withMessage('Invalid role ID'),
      body('permissions').isArray().withMessage('Permissions must be an array'),
    ];
  }

  // ==================== PCI DSS COMPLIANCE VALIDATIONS ====================
  static createComplianceRecordValidation() {
    return [
      body('organizationName').notEmpty().withMessage('Organization name is required'),
      body('assessmentYear').notEmpty().withMessage('Assessment year is required').isInt(),
    ];
  }

  static complianceIdParamValidation() {
    return [param('complianceId').isString().withMessage('Invalid compliance ID')];
  }

  static updateRequirementStatusValidation() {
    return [
      param('complianceId').isString().withMessage('Invalid compliance ID'),
      param('requirementId').isString().withMessage('Invalid requirement ID'),
      body('status').notEmpty().withMessage('Status is required').isIn(['compliant', 'non_compliant', 'remediation_in_progress']),
      body('findings').optional().isString(),
      body('remediation').optional().isString(),
    ];
  }

  static scheduleAuditValidation() {
    return [
      param('complianceId').isString().withMessage('Invalid compliance ID'),
      body('auditDate').notEmpty().withMessage('Audit date is required').isISO8601(),
      body('auditorName').notEmpty().withMessage('Auditor name is required'),
      body('auditorCertification').optional().isString(),
    ];
  }

  static recordIncidentValidation() {
    return [
      param('complianceId').isString().withMessage('Invalid compliance ID'),
      body('incidentDate').notEmpty().withMessage('Incident date is required').isISO8601(),
      body('incidentType').notEmpty().withMessage('Incident type is required'),
      body('description').notEmpty().withMessage('Description is required'),
      body('cardsAffected').notEmpty().withMessage('Cards affected is required').isInt({ min: 0 }),
    ];
  }

  // ==================== GDPR COMPLIANCE VALIDATIONS ====================
  static initializeComplianceValidation() {
    return [
      body('userId').notEmpty().withMessage('User ID is required'),
      body('userEmail').notEmpty().withMessage('User email is required').isEmail(),
      body('userCountry').optional().isLength({ min: 2, max: 2 }),
    ];
  }

  static updateConsentValidation() {
    return [
      param('userId').isString().withMessage('Invalid user ID'),
      body('consentType').notEmpty().withMessage('Consent type is required'),
      body('agreed').notEmpty().withMessage('Agreed status is required').isBoolean(),
      body('version').optional().isString(),
    ];
  }

  static requestDataExportValidation() {
    return [
      param('userId').isString().withMessage('Invalid user ID'),
      body('format').optional().isIn(['json', 'csv', 'xml', 'pdf', 'html']),
    ];
  }

  static requestDataErasureValidation() {
    return [
      param('userId').isString().withMessage('Invalid user ID'),
      body('reason').notEmpty().withMessage('Reason is required'),
    ];
  }

  static recordBreachValidation() {
    return [
      param('userId').isString().withMessage('Invalid user ID'),
      body('breachDate').notEmpty().withMessage('Breach date is required').isISO8601(),
      body('dataAffected').notEmpty().withMessage('Data affected is required').isArray(),
      body('numberOfRecords').notEmpty().withMessage('Number of records is required').isInt(),
    ];
  }

  // ==================== ENCRYPTION KEY VALIDATIONS ====================
  static createKeyValidation() {
    return [
      body('keyName').notEmpty().withMessage('Key name is required'),
      body('keyType').notEmpty().withMessage('Key type is required').isIn(['aes-256', 'aes-128', 'rsa-2048', 'rsa-4096', 'ec-256', 'master_key']),
      body('algorithm').optional().isIn(['AES', 'RSA', 'ECC', 'HMAC']),
      body('keySize').optional().isInt(),
      body('purpose').notEmpty().withMessage('Purpose is required'),
    ];
  }

  static keyIdParamValidation() {
    return [param('keyId').isString().withMessage('Invalid key ID')];
  }

  static scheduleRotationValidation() {
    return [
      param('keyId').isString().withMessage('Invalid key ID'),
      body('rotationDate').notEmpty().withMessage('Rotation date is required').isISO8601(),
    ];
  }

  static markAsCompromisedValidation() {
    return [
      param('keyId').isString().withMessage('Invalid key ID'),
      body('reason').notEmpty().withMessage('Reason is required'),
      body('revokedBy').notEmpty().withMessage('Revoked by is required'),
    ];
  }

  static logUsageValidation() {
    return [
      param('keyId').isString().withMessage('Invalid key ID'),
      body('operation').notEmpty().withMessage('Operation is required'),
      body('dataType').optional().isString(),
      body('status').notEmpty().withMessage('Status is required'),
      body('userId').optional().isString(),
    ];
  }

  // ==================== RATE LIMITER VALIDATIONS ====================
  static createRateLimiterValidation() {
    return [
      body('name').notEmpty().withMessage('Name is required'),
      body('targetType').notEmpty().withMessage('Target type is required').isIn(['endpoint', 'user', 'ip', 'api_key', 'combination']),
      body('rateLimit').notEmpty().withMessage('Rate limit is required').isObject(),
      body('actionOnLimitExceeded').optional().isIn(['reject', 'queue', 'throttle', 'redirect']),
    ];
  }

  static limiterIdParamValidation() {
    return [param('limiterId').isString().withMessage('Invalid limiter ID')];
  }

  static whitelistIPValidation() {
    return [
      param('limiterId').isString().withMessage('Invalid limiter ID'),
      body('ip').notEmpty().withMessage('IP is required').isIP(),
    ];
  }

  static whitelistUserValidation() {
    return [
      param('limiterId').isString().withMessage('Invalid limiter ID'),
      body('userId').notEmpty().withMessage('User ID is required'),
    ];
  }

  // ==================== DATA EXPORT VALIDATIONS ====================
  static createExportRequestValidation() {
    return [
      body('userId').notEmpty().withMessage('User ID is required'),
      body('userEmail').notEmpty().withMessage('User email is required').isEmail(),
      body('format').optional().isIn(['json', 'csv', 'xml', 'pdf', 'html']),
      body('scope').optional().isIn(['all', 'profile_only', 'transactions_only', 'custom']),
      body('customFields').optional().isArray(),
    ];
  }

  static exportIdParamValidation() {
    return [param('exportId').isString().withMessage('Invalid export ID')];
  }

  static completeProcessingValidation() {
    return [
      param('exportId').isString().withMessage('Invalid export ID'),
      body('totalRecords').notEmpty().withMessage('Total records is required').isInt(),
      body('totalSize').notEmpty().withMessage('Total size is required').isInt(),
      body('fileName').notEmpty().withMessage('File name is required'),
      body('checksum').notEmpty().withMessage('Checksum is required'),
    ];
  }

  static markAsFailedValidation() {
    return [
      param('exportId').isString().withMessage('Invalid export ID'),
      body('reason').notEmpty().withMessage('Reason is required'),
    ];
  }
}

module.exports = Phase10Validations;
