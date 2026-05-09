/**
 * GDPR Compliance Service - Phase 10 Business Logic
 * GDPR compliance and user data management
 */

const GDPRCompliance = require('../models/GDPRCompliance');

class GDPRComplianceService {
  async initializeUserCompliance(userId, userEmail, userCountry) {
    try {
      const complianceId = `GDPR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const isEUResident = this._isEUCountry(userCountry);

      const record = new GDPRCompliance({
        complianceId,
        userId,
        userEmail,
        userCountry,
        isEUResident,
        gdprApplicable: isEUResident,
        consentStatus: {
          marketingEmails: { agreed: false },
          personalizedAds: { agreed: false },
          dataProcessing: { agreed: false },
          cookieTracking: { agreed: false },
          thirdPartySharing: { agreed: false },
        },
      });

      await record.save();

      return {
        success: true,
        data: { complianceId, gdprApplicable: isEUResident },
        message: 'User GDPR compliance record initialized',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to initialize GDPR compliance',
        errors: [error.message],
      };
    }
  }

  async updateConsent(userId, consentType, agreed, version) {
    try {
      const record = await GDPRCompliance.findOne({ userId });

      if (!record) {
        return { success: false, message: 'GDPR compliance record not found', statusCode: 404 };
      }

      record.updateConsentStatus(consentType, agreed, version);
      await record.save();

      return {
        success: true,
        data: { userId },
        message: 'Consent updated',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update consent',
        errors: [error.message],
      };
    }
  }

  async requestDataExport(userId, format = 'json') {
    try {
      const record = await GDPRCompliance.findOne({ userId });

      if (!record) {
        return { success: false, message: 'GDPR compliance record not found', statusCode: 404 };
      }

      const exportId = record.requestDataExport(format);
      await record.save();

      return {
        success: true,
        data: { exportId },
        message: 'Data export request created',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to request data export',
        errors: [error.message],
      };
    }
  }

  async requestDataErasure(userId, reason) {
    try {
      const record = await GDPRCompliance.findOne({ userId });

      if (!record) {
        return { success: false, message: 'GDPR compliance record not found', statusCode: 404 };
      }

      record.requestDataErasure(reason);
      await record.save();

      return {
        success: true,
        data: { userId },
        message: 'Data erasure request created (right to be forgotten)',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to request data erasure',
        errors: [error.message],
      };
    }
  }

  async getComplianceStatus(userId) {
    try {
      const record = await GDPRCompliance.findOne({ userId });

      if (!record) {
        return { success: false, message: 'GDPR compliance record not found', statusCode: 404 };
      }

      return {
        success: true,
        data: {
          userId,
          gdprApplicable: record.gdprApplicable,
          complianceStatus: record.complianceStatus,
          consents: record.consentStatus,
          hasExportRequest: !!record.rightToAccess.requestDate,
          hasErasureRequest: !!record.rightToErasure.requestDate,
        },
        message: 'GDPR compliance status retrieved',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve compliance status',
        errors: [error.message],
      };
    }
  }

  async recordBreachNotification(userId, breachData) {
    try {
      const record = await GDPRCompliance.findOne({ userId });

      if (!record) {
        return { success: false, message: 'GDPR compliance record not found', statusCode: 404 };
      }

      record.breachNotification.push({
        breachId: `BREACH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        breachDate: new Date(breachData.breachDate),
        notificationDate: new Date(breachData.notificationDate),
        dataAffected: breachData.dataAffected,
        numberOfRecords: breachData.numberOfRecords,
        riskAssessment: breachData.riskAssessment,
      });

      await record.save();

      return {
        success: true,
        data: { userId },
        message: 'Breach notification recorded',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to record breach notification',
        errors: [error.message],
      };
    }
  }

  async addAuditEvent(userId, eventType, description, performedBy, ipAddress) {
    try {
      const record = await GDPRCompliance.findOne({ userId });

      if (!record) {
        return { success: false, message: 'GDPR compliance record not found', statusCode: 404 };
      }

      record.addAuditEvent(eventType, description, performedBy, ipAddress);
      await record.save();

      return {
        success: true,
        data: { userId },
        message: 'Audit event recorded',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to record audit event',
        errors: [error.message],
      };
    }
  }

  _isEUCountry(countryCode) {
    const euCountries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];
    return euCountries.includes(countryCode?.toUpperCase());
  }
}

module.exports = new GDPRComplianceService();
