/**
 * DataProtectionService.js
 * Phase 10: Security & Compliance - User data protection, privacy rights, data handling
 */

const mongoose = require('mongoose');

class DataProtectionService {
  /**
   * Create user consent record
   * @param {string} userId - User ID
   * @param {object} consentData - Consent information
   * @returns {Promise<{success, message, data}>}
   */
  static async createUserConsent(userId, consentData) {
    try {
      const consentCollection = mongoose.connection.collection('userconsents');
      
      const consent = {
        userId,
        consentId: `CONS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        types: {
          personalDataProcessing: consentData.personalDataProcessing || false,
          marketing: consentData.marketing || false,
          analytics: consentData.analytics || false,
          thirdPartySharing: consentData.thirdPartySharing || false,
          cookies: consentData.cookies || false,
          profilingTracking: consentData.profilingTracking || false
        },
        consentedAt: new Date(),
        ipAddress: consentData.ipAddress || 'unknown',
        userAgent: consentData.userAgent || 'unknown',
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        isActive: true,
        version: '1.0'
      };

      await consentCollection.insertOne(consent);

      return {
        success: true,
        message: 'User consent recorded',
        data: {
          consentId: consent.consentId,
          userId,
          consentedAt: consent.consentedAt,
          typesAccepted: Object.entries(consent.types).filter(([, v]) => v).map(([k]) => k)
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Consent creation failed: ${error.message}`
      };
    }
  }

  /**
   * Get user consent status
   * @param {string} userId - User ID
   * @returns {Promise<{success, message, data}>}
   */
  static async getUserConsentStatus(userId) {
    try {
      const consentCollection = mongoose.connection.collection('userconsents');
      
      const latestConsent = await consentCollection
        .findOne({ userId, isActive: true }, { sort: { consentedAt: -1 } });

      if (!latestConsent) {
        return {
          success: true,
          message: 'No consent record found',
          data: {
            userId,
            hasConsent: false,
            consentTypes: {
              personalDataProcessing: false,
              marketing: false,
              analytics: false,
              thirdPartySharing: false,
              cookies: false,
              profilingTracking: false
            }
          }
        };
      }

      return {
        success: true,
        message: 'User consent status retrieved',
        data: {
          userId,
          consentId: latestConsent.consentId,
          hasConsent: true,
          consentTypes: latestConsent.types,
          consentedAt: latestConsent.consentedAt,
          expiresAt: latestConsent.expiryDate,
          version: latestConsent.version
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to retrieve consent status: ${error.message}`
      };
    }
  }

  /**
   * Request data access (GDPR Right to Access)
   * @param {string} userId - User ID
   * @param {object} requestData - Request details
   * @returns {Promise<{success, message, data}>}
   */
  static async requestDataAccess(userId, requestData = {}) {
    try {
      const requestCollection = mongoose.connection.collection('datarequests');
      const userCollection = mongoose.connection.collection('users');
      
      // Gather user data
      const userData = await userCollection.findOne({ _id: new mongoose.Types.ObjectId(userId) });
      
      if (!userData) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const request = {
        requestId: `DAR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        requestType: 'data_access',
        status: 'pending',
        requestedAt: new Date(),
        requestedBy: requestData.requestedBy || userId,
        processingDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days GDPR
        dataCategories: [
          'personal_information',
          'transaction_history',
          'profile_data',
          'activity_logs',
          'communication_history'
        ],
        exportFormat: requestData.exportFormat || 'json'
      };

      await requestCollection.insertOne(request);

      return {
        success: true,
        message: 'Data access request created',
        data: {
          requestId: request.requestId,
          userId,
          status: 'pending',
          processingDeadline: request.processingDeadline,
          dataCategories: request.dataCategories
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Data access request failed: ${error.message}`
      };
    }
  }

  /**
   * Export user data (fulfill GDPR request)
   * @param {string} userId - User ID
   * @param {object} exportOptions - Export configuration
   * @returns {Promise<{success, message, data}>}
   */
  static async exportUserData(userId, exportOptions = {}) {
    try {
      const format = exportOptions.format || 'json';
      const categories = exportOptions.categories || ['all'];

      // Gather data from multiple collections
      const userCollection = mongoose.connection.collection('users');
      const transactionCollection = mongoose.connection.collection('transactions');
      const activityCollection = mongoose.connection.collection('activitylogs');
      
      const userObjectId = new mongoose.Types.ObjectId(userId);

      const userData = await userCollection.findOne({ _id: userObjectId });
      const transactions = await transactionCollection
        .find({ userId: userObjectId })
        .lean()
        .toArray();
      const activities = await activityCollection
        .find({ userId: userObjectId })
        .lean()
        .toArray();

      const exportData = {
        exportId: `EXP-${Date.now()}`,
        userId,
        exportedAt: new Date(),
        format,
        data: {
          personalInformation: {
            name: userData?.name,
            email: userData?.email,
            phone: userData?.phone,
            profilePicture: userData?.profilePicture,
            joinDate: userData?.createdAt
          },
          transactionHistory: transactions.slice(0, 100), // Last 100 transactions
          activityLogs: activities.slice(0, 50), // Last 50 activities
          preferences: userData?.preferences || {},
          settings: userData?.settings || {}
        },
        dataSizeKB: JSON.stringify({ userData, transactions, activities }).length / 1024
      };

      return {
        success: true,
        message: 'User data exported successfully',
        data: {
          exportId: exportData.exportId,
          userId,
          exportedAt: exportData.exportedAt,
          format: exportData.format,
          dataSizeKB: exportData.dataSizeKB,
          dataPreview: {
            transactionCount: transactions.length,
            activityCount: activities.length,
            personalDataIncluded: true
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Data export failed: ${error.message}`
      };
    }
  }

  /**
   * Request data erasure (GDPR Right to be Forgotten)
   * @param {string} userId - User ID
   * @param {object} erasureOptions - Erasure configuration
   * @returns {Promise<{success, message, data}>}
   */
  static async requestDataErasure(userId, erasureOptions = {}) {
    try {
      const requestCollection = mongoose.connection.collection('datarequests');
      
      const request = {
        requestId: `DER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        requestType: 'data_erasure',
        status: 'pending',
        requestedAt: new Date(),
        requestedBy: erasureOptions.requestedBy || userId,
        processingDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        erasureScope: erasureOptions.scope || 'all_personal_data',
        retainedCategories: erasureOptions.retainedCategories || [
          'transaction_records', // Legal requirement
          'audit_logs' // Compliance requirement
        ],
        reason: erasureOptions.reason || 'user_request'
      };

      await requestCollection.insertOne(request);

      return {
        success: true,
        message: 'Data erasure request created',
        data: {
          requestId: request.requestId,
          userId,
          status: 'pending',
          processingDeadline: request.processingDeadline,
          scope: request.erasureScope,
          retainedCategories: request.retainedCategories
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Data erasure request failed: ${error.message}`
      };
    }
  }

  /**
   * Request data rectification (GDPR Right to Correction)
   * @param {string} userId - User ID
   * @param {object} rectificationData - Data corrections
   * @returns {Promise<{success, message, data}>}
   */
  static async requestDataRectification(userId, rectificationData) {
    try {
      const requestCollection = mongoose.connection.collection('datarequests');
      
      const request = {
        requestId: `DRE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        requestType: 'data_rectification',
        status: 'pending',
        requestedAt: new Date(),
        corrections: {
          fields: rectificationData.fields || [],
          newValues: rectificationData.newValues || {},
          reason: rectificationData.reason || 'accuracy'
        },
        processingDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      await requestCollection.insertOne(request);

      return {
        success: true,
        message: 'Data rectification request created',
        data: {
          requestId: request.requestId,
          userId,
          status: 'pending',
          correctionsRequested: rectificationData.fields?.length || 0,
          processingDeadline: request.processingDeadline
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Data rectification request failed: ${error.message}`
      };
    }
  }

  /**
   * Get data processing agreement
   * @param {string} userId - User ID
   * @returns {Promise<{success, message, data}>}
   */
  static async getDataProcessingAgreement(userId) {
    try {
      const dpaCollection = mongoose.connection.collection('dataprocessingagreements');
      
      const dpa = await dpaCollection.findOne({ userId });

      if (!dpa) {
        // Create default DPA
        const defaultDPA = {
          userId,
          dpaId: `DPA-${Date.now()}`,
          createdAt: new Date(),
          processingPurposes: [
            'Service delivery',
            'Account management',
            'Communication',
            'Fraud prevention'
          ],
          dataCategories: [
            'Name and contact information',
            'Transaction history',
            'Device information',
            'Location data'
          ],
          recipients: ['Service providers', 'Legal compliance', 'Internal teams'],
          processingDuration: '365 days',
          userRights: [
            'access',
            'rectification',
            'erasure',
            'restrict_processing',
            'data_portability'
          ]
        };

        await dpaCollection.insertOne(defaultDPA);
        return {
          success: true,
          message: 'Data processing agreement retrieved',
          data: defaultDPA
        };
      }

      return {
        success: true,
        message: 'Data processing agreement retrieved',
        data: dpa
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to retrieve DPA: ${error.message}`
      };
    }
  }

  /**
   * Get data breach notification history
   * @param {string} userId - User ID (optional - get all if not provided)
   * @returns {Promise<{success, message, data}>}
   */
  static async getDataBreachNotifications(userId) {
    try {
      const breachCollection = mongoose.connection.collection('databreachnotifications');
      
      let query = {};
      if (userId) {
        query.affectedUsers = userId;
      }

      const breaches = await breachCollection
        .find(query)
        .sort({ discoveredAt: -1 })
        .lean()
        .toArray();

      return {
        success: true,
        message: `Retrieved ${breaches.length} breach notifications`,
        data: {
          breachCount: breaches.length,
          breaches: breaches.map(b => ({
            breachId: b.breachId,
            type: b.type,
            severity: b.severity,
            discoveredAt: b.discoveredAt,
            affectedRecords: b.affectedRecords?.length || 0,
            notificationDate: b.notificationDate,
            remediationStatus: b.remediationStatus
          }))
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to retrieve breach notifications: ${error.message}`
      };
    }
  }

  /**
   * Log data processing activity
   * @param {object} activityData - Activity details
   * @returns {Promise<{success, message, data}>}
   */
  static async logDataProcessingActivity(activityData) {
    try {
      const processingLogCollection = mongoose.connection.collection('dataprocessinglogs');
      
      const activity = {
        activityId: `DPA-${Date.now()}`,
        userId: activityData.userId,
        actionType: activityData.actionType, // read, write, delete, export, etc
        dataCategory: activityData.dataCategory,
        purposeOfProcessing: activityData.purpose || 'service_delivery',
        timestamp: new Date(),
        ipAddress: activityData.ipAddress,
        userAgent: activityData.userAgent,
        status: activityData.status || 'completed',
        details: activityData.details || {}
      };

      await processingLogCollection.insertOne(activity);

      return {
        success: true,
        message: 'Data processing activity logged',
        data: {
          activityId: activity.activityId,
          timestamp: activity.timestamp
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to log activity: ${error.message}`
      };
    }
  }

  /**
   * Get data retention analysis
   * @param {string} userId - User ID
   * @returns {Promise<{success, message, data}>}
   */
  static async getDataRetentionAnalysis(userId) {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      const collections = [
        { name: 'users', retention: '3 years' },
        { name: 'transactions', retention: '7 years' },
        { name: 'activitylogs', retention: '1 year' },
        { name: 'communications', retention: '2 years' }
      ];

      const analysis = {
        userId,
        analyzedAt: new Date(),
        dataStorageLocation: [
          'MongoDB Primary',
          'MongoDB Backup',
          'Cloud Storage Archive'
        ],
        retentionSchedule: collections.map(c => ({
          collection: c.name,
          retentionPeriod: c.retention,
          autoDeleteDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        })),
        storageBreakdown: {
          activeRecords: '2.5 MB',
          archiveRecords: '15 MB',
          total: '17.5 MB'
        }
      };

      return {
        success: true,
        message: 'Data retention analysis completed',
        data: analysis
      };
    } catch (error) {
      return {
        success: false,
        message: `Retention analysis failed: ${error.message}`
      };
    }
  }

  /**
   * Create privacy policy acceptance
   * @param {string} userId - User ID
   * @param {object} acceptanceData - Acceptance details
   * @returns {Promise<{success, message, data}>}
   */
  static async acceptPrivacyPolicy(userId, acceptanceData = {}) {
    try {
      const acceptanceCollection = mongoose.connection.collection('privacypolicyacceptances');
      
      const acceptance = {
        userId,
        acceptanceId: `PPA-${Date.now()}`,
        policyVersion: acceptanceData.policyVersion || '1.0',
        acceptedAt: new Date(),
        ipAddress: acceptanceData.ipAddress || 'unknown',
        userAgent: acceptanceData.userAgent || 'unknown',
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        acknowledged: true
      };

      await acceptanceCollection.insertOne(acceptance);

      return {
        success: true,
        message: 'Privacy policy accepted',
        data: {
          acceptanceId: acceptance.acceptanceId,
          userId,
          policyVersion: acceptance.policyVersion,
          acceptedAt: acceptance.acceptedAt,
          validUntil: acceptance.validUntil
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Policy acceptance failed: ${error.message}`
      };
    }
  }
}

module.exports = DataProtectionService;
