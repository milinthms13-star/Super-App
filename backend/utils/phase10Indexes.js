/**
 * Phase 10 Indexes & Seeds - MongoDB indexes and initialization data
 */

const DeliveryOTPVerification = require('../models/DeliveryOTPVerification');
const FraudDetection = require('../models/FraudDetection');
const AdminAuditLog = require('../models/AdminAuditLog');
const ActivityLog = require('../models/ActivityLog');
const RoleBasedAccess = require('../models/RoleBasedAccess');
const PCIDSSCompliance = require('../models/PCIDSSCompliance');
const GDPRCompliance = require('../models/GDPRCompliance');
const SecurityConfiguration = require('../models/SecurityConfiguration');
const DataEncryptionKey = require('../models/DataEncryptionKey');
const RateLimiterConfig = require('../models/RateLimiterConfig');

class Phase10Indexes {
  static async createAllIndexes() {
    try {
      console.log('🔄 Creating Phase 10 indexes...');

      // DeliveryOTPVerification Indexes
      await DeliveryOTPVerification.collection.createIndex({ verificationId: 1 }, { unique: true });
      await DeliveryOTPVerification.collection.createIndex({ orderId: 1, status: 1 });
      await DeliveryOTPVerification.collection.createIndex({ userId: 1, createdAt: -1 });
      await DeliveryOTPVerification.collection.createIndex({ deliveryPartnerId: 1, isVerified: 1 });
      await DeliveryOTPVerification.collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 });

      // FraudDetection Indexes
      await FraudDetection.collection.createIndex({ fraudId: 1 }, { unique: true });
      await FraudDetection.collection.createIndex({ orderId: 1 });
      await FraudDetection.collection.createIndex({ userId: 1, createdAt: -1 });
      await FraudDetection.collection.createIndex({ riskLevel: 1, status: 1 });
      await FraudDetection.collection.createIndex({ fraudType: 1 });
      await FraudDetection.collection.createIndex({ 'mlAnalysis.anomalyScore': -1 });

      // AdminAuditLog Indexes
      await AdminAuditLog.collection.createIndex({ auditId: 1 }, { unique: true });
      await AdminAuditLog.collection.createIndex({ adminId: 1, timestamp: -1 });
      await AdminAuditLog.collection.createIndex({ actionType: 1, timestamp: -1 });
      await AdminAuditLog.collection.createIndex({ targetType: 1, targetId: 1 });
      await AdminAuditLog.collection.createIndex({ severity: 1, timestamp: -1 });
      await AdminAuditLog.collection.createIndex({ timestamp: -1 });
      await AdminAuditLog.collection.createIndex({ adminId: 1, actionType: 1, timestamp: -1 });
      await AdminAuditLog.collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

      // ActivityLog Indexes
      await ActivityLog.collection.createIndex({ logId: 1 }, { unique: true });
      await ActivityLog.collection.createIndex({ userId: 1, timestamp: -1 });
      await ActivityLog.collection.createIndex({ activityType: 1, timestamp: -1 });
      await ActivityLog.collection.createIndex({ entityType: 1, entityId: 1 });
      await ActivityLog.collection.createIndex({ module: 1, timestamp: -1 });
      await ActivityLog.collection.createIndex({ timestamp: -1 });
      await ActivityLog.collection.createIndex({ sessionId: 1 });
      await ActivityLog.collection.createIndex({ userType: 1, timestamp: -1 });
      await ActivityLog.collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

      // RoleBasedAccess Indexes
      await RoleBasedAccess.collection.createIndex({ rbacId: 1 }, { unique: true });
      await RoleBasedAccess.collection.createIndex({ roleName: 1 }, { unique: true });
      await RoleBasedAccess.collection.createIndex({ isActive: 1 });

      // PCIDSSCompliance Indexes
      await PCIDSSCompliance.collection.createIndex({ complianceId: 1 }, { unique: true });
      await PCIDSSCompliance.collection.createIndex({ organizationName: 1 });
      await PCIDSSCompliance.collection.createIndex({ assessmentYear: -1 });
      await PCIDSSCompliance.collection.createIndex({ complianceLevel: 1 });
      await PCIDSSCompliance.collection.createIndex({ expiryDate: 1 });

      // GDPRCompliance Indexes
      await GDPRCompliance.collection.createIndex({ complianceId: 1 }, { unique: true });
      await GDPRCompliance.collection.createIndex({ userId: 1 }, { unique: true });
      await GDPRCompliance.collection.createIndex({ isEUResident: 1, gdprApplicable: 1 });
      await GDPRCompliance.collection.createIndex({ complianceStatus: 1 });
      await GDPRCompliance.collection.createIndex({ 'rightToErasure.requestDate': 1 });

      // SecurityConfiguration Indexes
      await SecurityConfiguration.collection.createIndex({ configId: 1 }, { unique: true });
      await SecurityConfiguration.collection.createIndex({ configName: 1 });
      await SecurityConfiguration.collection.createIndex({ approvalStatus: 1 });

      // DataEncryptionKey Indexes
      await DataEncryptionKey.collection.createIndex({ keyId: 1 }, { unique: true });
      await DataEncryptionKey.collection.createIndex({ status: 1 });
      await DataEncryptionKey.collection.createIndex({ expiryDate: 1 });
      await DataEncryptionKey.collection.createIndex({ nextRotationDate: 1 });
      await DataEncryptionKey.collection.createIndex({ keyType: 1 });
      await DataEncryptionKey.collection.createIndex({ purpose: 1 });

      // RateLimiterConfig Indexes
      await RateLimiterConfig.collection.createIndex({ limiterId: 1 }, { unique: true });
      await RateLimiterConfig.collection.createIndex({ targetType: 1 });
      await RateLimiterConfig.collection.createIndex({ targetEndpoint: 1 });
      await RateLimiterConfig.collection.createIndex({ targetUser: 1 });
      await RateLimiterConfig.collection.createIndex({ targetIP: 1 });
      await RateLimiterConfig.collection.createIndex({ enabled: 1 });
      await RateLimiterConfig.collection.createIndex({ priority: -1 });

      console.log('✅ All Phase 10 indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating indexes:', error.message);
      throw error;
    }
  }

  static async seedDefaultRoles() {
    try {
      const existingRoles = await RoleBasedAccess.countDocuments();
      if (existingRoles > 0) {
        console.log('ℹ️ Roles already seeded, skipping...');
        return;
      }

      const defaultRoles = [
        {
          rbacId: `ROLE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          roleId: 'super_admin_role',
          roleName: 'super_admin',
          description: 'Super administrator with full system access',
          permissions: [],
          modules: {
            auth: { allowed: true, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
            users: { allowed: true, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
            restaurants: { allowed: true, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
            orders: { allowed: true, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
            payments: { allowed: true, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
            disputes: { allowed: true, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
            reports: { allowed: true, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
            settings: { allowed: true, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
            audit: { allowed: true, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
            promos: { allowed: true, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
            categories: { allowed: true, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
          },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          rbacId: `ROLE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          roleId: 'admin_role',
          roleName: 'admin',
          description: 'Administrator with limited system access',
          permissions: [],
          modules: {
            auth: { allowed: true, canCreate: false, canRead: true, canUpdate: true, canDelete: false },
            users: { allowed: true, canCreate: true, canRead: true, canUpdate: true, canDelete: false },
            restaurants: { allowed: true, canCreate: true, canRead: true, canUpdate: true, canDelete: false },
            orders: { allowed: true, canCreate: false, canRead: true, canUpdate: true, canDelete: false },
            payments: { allowed: true, canCreate: false, canRead: true, canUpdate: true, canDelete: false },
            disputes: { allowed: true, canCreate: false, canRead: true, canUpdate: true, canDelete: false },
            reports: { allowed: true, canCreate: false, canRead: true, canUpdate: false, canDelete: false },
            settings: { allowed: false, canCreate: false, canRead: false, canUpdate: false, canDelete: false },
            audit: { allowed: true, canCreate: false, canRead: true, canUpdate: false, canDelete: false },
            promos: { allowed: true, canCreate: true, canRead: true, canUpdate: true, canDelete: false },
            categories: { allowed: true, canCreate: true, canRead: true, canUpdate: true, canDelete: false },
          },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          rbacId: `ROLE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          roleId: 'moderator_role',
          roleName: 'moderator',
          description: 'Moderator with content management access',
          permissions: [],
          modules: {
            auth: { allowed: false, canCreate: false, canRead: false, canUpdate: false, canDelete: false },
            users: { allowed: true, canCreate: false, canRead: true, canUpdate: true, canDelete: false },
            restaurants: { allowed: true, canCreate: false, canRead: true, canUpdate: true, canDelete: false },
            orders: { allowed: true, canCreate: false, canRead: true, canUpdate: true, canDelete: false },
            payments: { allowed: false, canCreate: false, canRead: false, canUpdate: false, canDelete: false },
            disputes: { allowed: true, canCreate: false, canRead: true, canUpdate: true, canDelete: false },
            reports: { allowed: true, canCreate: false, canRead: true, canUpdate: false, canDelete: false },
            settings: { allowed: false, canCreate: false, canRead: false, canUpdate: false, canDelete: false },
            audit: { allowed: true, canCreate: false, canRead: true, canUpdate: false, canDelete: false },
            promos: { allowed: true, canCreate: false, canRead: true, canUpdate: true, canDelete: false },
            categories: { allowed: true, canCreate: false, canRead: true, canUpdate: true, canDelete: false },
          },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          rbacId: `ROLE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          roleId: 'analyst_role',
          roleName: 'analyst',
          description: 'Analyst with read-only and reporting access',
          permissions: [],
          modules: {
            auth: { allowed: false, canCreate: false, canRead: false, canUpdate: false, canDelete: false },
            users: { allowed: true, canCreate: false, canRead: true, canUpdate: false, canDelete: false },
            restaurants: { allowed: true, canCreate: false, canRead: true, canUpdate: false, canDelete: false },
            orders: { allowed: true, canCreate: false, canRead: true, canUpdate: false, canDelete: false },
            payments: { allowed: true, canCreate: false, canRead: true, canUpdate: false, canDelete: false },
            disputes: { allowed: true, canCreate: false, canRead: true, canUpdate: false, canDelete: false },
            reports: { allowed: true, canCreate: false, canRead: true, canUpdate: false, canDelete: false },
            settings: { allowed: false, canCreate: false, canRead: false, canUpdate: false, canDelete: false },
            audit: { allowed: true, canCreate: false, canRead: true, canUpdate: false, canDelete: false },
            promos: { allowed: true, canCreate: false, canRead: true, canUpdate: false, canDelete: false },
            categories: { allowed: true, canCreate: false, canRead: true, canUpdate: false, canDelete: false },
          },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await RoleBasedAccess.insertMany(defaultRoles);
      console.log('✅ Default RBAC roles seeded successfully');
    } catch (error) {
      console.error('❌ Error seeding roles:', error.message);
      throw error;
    }
  }

  static async seedSecurityConfiguration() {
    try {
      const existingConfig = await SecurityConfiguration.countDocuments();
      if (existingConfig > 0) {
        console.log('ℹ️ Security configuration already seeded, skipping...');
        return;
      }

      const defaultConfig = {
        configId: `SEC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        configName: 'Default Security Configuration',
        securityPolicies: {
          passwordPolicy: {
            minLength: 12,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true,
            expiryDays: 90,
            historyCount: 5,
            lockoutAfterAttempts: 5,
            lockoutDurationMinutes: 30,
          },
          sessionPolicy: {
            sessionTimeout: 1800,
            maxConcurrentSessions: 5,
            requireMFA: true,
            forceMFAAfterDays: 30,
            sessionAcrossDevices: false,
          },
          encryptionPolicy: {
            dataAtRestEncryption: 'aes-256',
            dataInTransitEncryption: 'tls-1.3',
            tokenization: true,
          },
          accessPolicy: {
            ipWhitelisting: false,
            geoBlocking: false,
            requireMFA: true,
          },
        },
        dataProtection: {
          piiEncryption: true,
          creditCardEncryption: true,
          tokenization: true,
          masking: {
            enabled: true,
            fields: ['creditCard', 'ssn', 'phone', 'email'],
          },
          anonymization: {
            enabled: true,
            retentionDays: 365,
          },
        },
        threatProtection: {
          dosLimitPerIP: 1000,
          rateLimitPerUser: 100,
          botDetectionEnabled: true,
          geoBlockingEnabled: false,
          suspiciousActivityThreshold: 75,
          autoBlockAfterViolations: 5,
        },
        complianceSettings: {
          gdprEnabled: true,
          pciDSSEnabled: true,
          hipaaEnabled: false,
          iso27001Enabled: true,
          soc2Enabled: true,
          dataResidency: ['EU', 'US'],
        },
        enabledAt: new Date(),
        approvalStatus: 'approved',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await SecurityConfiguration.create(defaultConfig);
      console.log('✅ Default security configuration seeded successfully');
    } catch (error) {
      console.error('❌ Error seeding security configuration:', error.message);
      throw error;
    }
  }

  static async seedMasterEncryptionKey() {
    try {
      const existingKeys = await DataEncryptionKey.countDocuments({ purpose: 'master_key' });
      if (existingKeys > 0) {
        console.log('ℹ️ Master encryption key already seeded, skipping...');
        return;
      }

      const masterKey = {
        keyId: `KEK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        keyName: 'Master Encryption Key',
        keyType: 'master_key',
        algorithm: 'AES',
        keySize: 256,
        purpose: 'master_key',
        status: 'active',
        creationDate: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        nextRotationDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        usageLog: [],
        accessControl: {
          allowedRoles: ['super_admin'],
          requiresApproval: true,
          approvalRoles: ['super_admin'],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await DataEncryptionKey.create(masterKey);
      console.log('✅ Master encryption key seeded successfully');
    } catch (error) {
      console.error('❌ Error seeding master encryption key:', error.message);
      throw error;
    }
  }

  static async seedDefaultRateLimiter() {
    try {
      const existingLimiters = await RateLimiterConfig.countDocuments();
      if (existingLimiters > 0) {
        console.log('ℹ️ Rate limiters already seeded, skipping...');
        return;
      }

      const defaultLimiter = {
        limiterId: `RATELIM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: 'Default API Rate Limiter',
        targetType: 'endpoint',
        rateLimit: {
          requestsPerSecond: 10,
          requestsPerMinute: 500,
          requestsPerHour: 10000,
          requestsPerDay: 100000,
          concurrent: 50,
        },
        windowType: 'sliding',
        burstAllowed: true,
        burstSize: 20,
        actionOnLimitExceeded: 'reject',
        responseStatus: 429,
        bypassConditions: [],
        whitelistedIPs: ['127.0.0.1', '::1'],
        logViolations: true,
        enabled: true,
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await RateLimiterConfig.create(defaultLimiter);
      console.log('✅ Default rate limiter seeded successfully');
    } catch (error) {
      console.error('❌ Error seeding rate limiter:', error.message);
      throw error;
    }
  }

  static async initializePhase10() {
    try {
      console.log('🚀 Initializing Phase 10 indexes and seeds...\n');

      await Phase10Indexes.createAllIndexes();
      console.log('');

      await Phase10Indexes.seedDefaultRoles();
      await Phase10Indexes.seedSecurityConfiguration();
      await Phase10Indexes.seedMasterEncryptionKey();
      await Phase10Indexes.seedDefaultRateLimiter();

      console.log('\n✨ Phase 10 initialization completed successfully\n');
    } catch (error) {
      console.error('❌ Phase 10 initialization failed:', error.message);
      throw error;
    }
  }
}

module.exports = Phase10Indexes;
