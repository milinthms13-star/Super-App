/**
 * Security Configuration Model - Phase 10 Feature 8
 * System-wide security settings and configuration
 */

const { Schema, model } = require('mongoose');

const SecurityConfigurationSchema = new Schema(
  {
    configId: {
      type: String,
      unique: true,
      index: true,
      description: 'Unique security configuration ID',
    },
    configName: {
      type: String,
      required: true,
      description: 'Name of security configuration',
    },
    securityPolicies: {
      passwordPolicy: {
        minLength: { type: Number, default: 12 },
        requireUppercase: { type: Boolean, default: true },
        requireLowercase: { type: Boolean, default: true },
        requireNumbers: { type: Boolean, default: true },
        requireSpecialChars: { type: Boolean, default: true },
        expiryDays: { type: Number, default: 90 },
        historyCount: { type: Number, default: 5 },
        lockoutAfterAttempts: { type: Number, default: 5 },
        lockoutDurationMinutes: { type: Number, default: 30 },
      },
      sessionPolicy: {
        sessionTimeout: { type: Number, default: 30 }, // minutes
        maxConcurrentSessions: { type: Number, default: 3 },
        requireMFA: { type: Boolean, default: true },
        forceMFAAfterDays: { type: Number, default: 30 },
        sessionAcrossDevices: { type: Boolean, default: false },
      },
      encryptionPolicy: {
        dataAtRest: Boolean,
        dataInTransit: Boolean,
        encryptionAlgorithm: String, // AES-256, etc.
        keyRotationDays: Number,
        tlsVersion: String, // TLS 1.2, TLS 1.3
      },
      accessPolicy: {
        ipWhitelistEnabled: Boolean,
        ipWhitelist: [String],
        ipBlacklistEnabled: Boolean,
        ipBlacklist: [String],
        requireVPN: Boolean,
        requireDeviceCompliance: Boolean,
      },
      auditPolicy: {
        logAllAccess: Boolean,
        logDataAccess: Boolean,
        logFailedAttempts: Boolean,
        retentionDays: Number,
      },
    },
    dataProtection: {
      piiEncryption: Boolean,
      creditCardEncryption: Boolean,
      tokenization: Boolean,
      masking: {
        maskEmail: Boolean,
        maskPhone: Boolean,
        maskPaymentInfo: Boolean,
        maskSSN: Boolean,
      },
      anonymization: {
        enabled: Boolean,
        afterDays: Number,
      },
    },
    threatProtection: {
      doslimitPerIP: Number,
      rateLimitPerUser: Number,
      botDetectionEnabled: Boolean,
      geoBlockingEnabled: Boolean,
      suspiciousActivityThreshold: Number,
      autoBlockAfterViolations: Number,
    },
    complianceSettings: {
      gdprEnabled: Boolean,
      pciDSSEnabled: Boolean,
      hipaaEnabled: Boolean,
      iso27001Enabled: Boolean,
      soc2Enabled: Boolean,
      dataResidency: [String], // list of allowed countries
    },
    apiSecurity: {
      apiRateLimitPerMinute: Number,
      requireAPIKey: Boolean,
      requireSignature: Boolean,
      corsOrigins: [String],
      enableCORS: Boolean,
      requireHTTPS: Boolean,
    },
    mfaSettings: {
      mfaRequired: Boolean,
      mfaMethods: [String], // totp, sms, email, hardware_token
      smsProviderEnabled: Boolean,
      emailProviderEnabled: Boolean,
      totpEnabled: Boolean,
      hardwareTokenEnabled: Boolean,
      backupCodesEnabled: Boolean,
    },
    incidentResponse: {
      incidentResponseTeam: [String],
      incidentResponsePlan: String,
      breachNotificationRequired: Boolean,
      breachNotificationDays: Number,
      incidentLoggingEnabled: Boolean,
      automaticIncidentDetection: Boolean,
    },
    vendorSecurity: {
      vendorSecurityAssessmentRequired: Boolean,
      vendorDPARequired: Boolean,
      vendorAuditFrequency: String, // annual, biannual, quarterly
      vendorAccessControl: Boolean,
      vendorListMaintained: Boolean,
    },
    backupSecurity: {
      backupEncryption: Boolean,
      backupFrequency: String, // daily, weekly, real-time
      backupRetention: Number, // days
      backupTesting: String, // never, quarterly, monthly
      offSiteBackup: Boolean,
      backupAccessControl: Boolean,
    },
    networkSecurity: {
      firewallEnabled: Boolean,
      firewallType: String,
      wafEnabled: Boolean,
      idpsEnabled: Boolean,
      networkSegmentation: Boolean,
      vpnRequired: Boolean,
      zeroTrustEnabled: Boolean,
    },
    applicationSecurity: {
      dependencyScanning: Boolean,
      staticAnalysis: Boolean,
      dynamicAnalysis: Boolean,
      penetrationTestingFrequency: String,
      vulnerabilityDisclosureProgram: Boolean,
      secureCodeReviewRequired: Boolean,
    },
    enabledAt: {
      type: Date,
      default: Date.now,
    },
    disabledAt: {
      type: Date,
      description: 'When configuration was disabled (if applicable)',
    },
    createdBy: {
      type: String,
      description: 'Admin who created this configuration',
    },
    updatedBy: {
      type: String,
      description: 'Admin who last updated this configuration',
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedBy: {
      type: String,
      description: 'Admin who approved this configuration',
    },
  },
  { timestamps: true, collection: 'security_configurations' }
);

// Indexes
SecurityConfigurationSchema.index({ configName: 1 });
SecurityConfigurationSchema.index({ approvalStatus: 1 });

// Instance methods
SecurityConfigurationSchema.methods.approve = function (approvedBy) {
  this.approvalStatus = 'approved';
  this.approvedBy = approvedBy;
};

SecurityConfigurationSchema.methods.reject = function () {
  this.approvalStatus = 'rejected';
};

module.exports = model('SecurityConfiguration', SecurityConfigurationSchema);
