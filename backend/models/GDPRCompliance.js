/**
 * GDPR Compliance Model - Phase 10 Feature 7
 * GDPR compliance and data export functionality
 */

const { Schema, model } = require('mongoose');

const GDPRComplianceSchema = new Schema(
  {
    complianceId: {
      type: String,
      unique: true,
      index: true,
      description: 'Unique GDPR compliance record ID',
    },
    userId: {
      type: String,
      required: true,
      index: true,
      description: 'User for whom GDPR compliance is tracked',
    },
    userEmail: {
      type: String,
      description: 'User email for GDPR requests',
    },
    userCountry: {
      type: String,
      description: 'User country (determines GDPR applicability)',
    },
    isEUResident: {
      type: Boolean,
      description: 'Whether user is EU resident (GDPR applies)',
    },
    gdprApplicable: {
      type: Boolean,
      description: 'Whether GDPR regulations apply to this user',
    },
    consentStatus: {
      marketingEmails: { agreed: Boolean, agreedDate: Date, version: String },
      personalizedAds: { agreed: Boolean, agreedDate: Date, version: String },
      dataProcessing: { agreed: Boolean, agreedDate: Date, version: String },
      cookieTracking: { agreed: Boolean, agreedDate: Date, version: String },
      thirdPartySharing: { agreed: Boolean, agreedDate: Date, version: String },
    },
    dataCollection: {
      type: [{
        dataType: String, // name, email, phone, address, payment_info, location, behavioral
        collectionDate: Date,
        collectionMethod: String, // form, api, third_party
        purpose: String,
        legalBasis: String, // consent, contract, legal_obligation, vital_interests, public_task, legitimate_interests
        processingPurpose: String,
        retentionPeriod: String, // e.g., "1 year after account deletion"
        thirdParties: [String], // who has access to this data
      }],
      default: [],
    },
    dataProcessing: {
      processor: String,
      processingLocation: String,
      processingMethod: String,
      encryptionUsed: Boolean,
      pseudonymized: Boolean,
      automaticDecisionMaking: Boolean,
      profilingUsed: Boolean,
    },
    rightToAccess: {
      requestDate: Date,
      requestedData: [String],
      responseDate: Date,
      responseData: String, // URL or file reference
      status: String, // pending, completed, denied
    },
    rightToErasure: {
      requestDate: Date,
      reason: String,
      approved: Boolean,
      approvalDate: Date,
      erasureDate: Date,
      erasureStatus: String, // pending, completed
      erasureNotes: String,
    },
    rightToRectification: {
      type: [{
        requestDate: Date,
        dataField: String,
        correctionRequested: String,
        correctionMade: Boolean,
        correctionDate: Date,
        status: String,
      }],
      default: [],
    },
    rightToRestrict: {
      requestDate: Date,
      processingRestricted: Boolean,
      restrictionStartDate: Date,
      restrictionEndDate: Date,
      reason: String,
    },
    rightToPortability: {
      requestDate: Date,
      dataFormat: String, // JSON, CSV, XML
      responseDate: Date,
      responseFile: String,
      status: String,
    },
    dataExports: {
      type: [{
        exportId: String,
        exportDate: Date,
        exportFormat: String, // JSON, CSV, XML
        dataIncluded: [String],
        fileSize: Number,
        downloadUrl: String,
        expiryDate: Date,
        downloaded: Boolean,
        downloadDate: Date,
      }],
      default: [],
    },
    dpia: {
      required: Boolean,
      conductedDate: Date,
      dpiaDocument: String,
      riskLevel: String, // low, medium, high
      mitigationMeasures: [String],
      supervisoryAuthorityConsultation: Boolean,
    },
    breachNotification: {
      type: [{
        breachId: String,
        breachDate: Date,
        notificationDate: Date,
        dataAffected: [String],
        numberOfRecords: Number,
        riskAssessment: String,
        mitigationActions: [String],
        supervisoryAuthorityNotified: Boolean,
        supervisoryAuthorityDate: Date,
      }],
      default: [],
    },
    thirdPartyProcessors: {
      type: [{
        processorName: String,
        dataProcessed: [String],
        processingLocation: String,
        dataProcessingAgreement: String, // URL or file reference
        dpaSignedDate: Date,
        securityMeasures: [String],
      }],
      default: [],
    },
    auditTrail: {
      type: [{
        eventDate: Date,
        eventType: String, // consent_given, data_accessed, data_exported, erasure_requested
        description: String,
        performedBy: String,
        ipAddress: String,
      }],
      default: [],
    },
    complianceStatus: {
      type: String,
      enum: ['compliant', 'non_compliant', 'remediation_required'],
      default: 'compliant',
    },
    lastAuditDate: {
      type: Date,
      description: 'Last GDPR compliance audit date',
    },
    nextAuditDate: {
      type: Date,
      description: 'Next scheduled GDPR compliance audit',
    },
  },
  { timestamps: true, collection: 'gdpr_compliance' }
);

// Indexes
GDPRComplianceSchema.index({ userId: 1 });
GDPRComplianceSchema.index({ isEUResident: 1, gdprApplicable: 1 });
GDPRComplianceSchema.index({ complianceStatus: 1 });
GDPRComplianceSchema.index({ 'rightToErasure.requestDate': 1 });

// Instance methods
GDPRComplianceSchema.methods.requestDataExport = function (format = 'JSON') {
  const exportId = `EXPORT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const exportRecord = {
    exportId,
    exportDate: new Date(),
    exportFormat: format,
    status: 'pending',
  };
  this.dataExports.push(exportRecord);
  return exportId;
};

GDPRComplianceSchema.methods.requestDataErasure = function (reason) {
  this.rightToErasure = {
    requestDate: new Date(),
    reason,
    status: 'pending',
  };
};

GDPRComplianceSchema.methods.updateConsentStatus = function (consentType, agreed, version) {
  if (this.consentStatus[consentType]) {
    this.consentStatus[consentType] = {
      agreed,
      agreedDate: agreed ? new Date() : null,
      version,
    };
  }
};

GDPRComplianceSchema.methods.addAuditEvent = function (eventType, description, performedBy, ipAddress) {
  this.auditTrail.push({
    eventDate: new Date(),
    eventType,
    description,
    performedBy,
    ipAddress,
  });
};

module.exports = model('GDPRCompliance', GDPRComplianceSchema);
