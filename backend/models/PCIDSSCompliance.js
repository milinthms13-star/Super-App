/**
 * PCI DSS Compliance Model - Phase 10 Feature 6
 * PCI DSS compliance for payment processing
 */

const { Schema, model } = require('mongoose');

const PCIDSSComplianceSchema = new Schema(
  {
    complianceId: {
      type: String,
      unique: true,
      index: true,
      description: 'Unique PCI DSS compliance record ID',
    },
    organizationName: {
      type: String,
      required: true,
      description: 'Organization being assessed for PCI DSS compliance',
    },
    assessmentYear: {
      type: Number,
      required: true,
      index: true,
      description: 'Year of assessment',
    },
    complianceLevel: {
      type: String,
      enum: ['1', '2', '3', '4', 'non_compliant'],
      description: 'PCI DSS compliance level (1-4 or non-compliant)',
    },
    assessmentDate: {
      type: Date,
      description: 'Date of PCI DSS assessment',
    },
    expiryDate: {
      type: Date,
      index: true,
      description: 'Date when compliance certification expires',
    },
    assessmentStatus: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'remediation_required', 'revoked'],
      default: 'pending',
    },
    requirements: {
      type: [{
        requirementId: String, // e.g., 1.1.1, 2.2.1
        requirementName: String,
        description: String,
        status: String, // compliant, non_compliant, remediation_in_progress
        findings: String,
        remediation: String,
        dueDate: Date,
        completionDate: Date,
        evidence: [String], // URLs or document references
      }],
      default: [],
      description: '12 PCI DSS requirements and their compliance status',
    },
    dataSecurityControls: {
      firewall: { implemented: Boolean, certifiedDate: Date, nextReviewDate: Date },
      passwordProtection: { implemented: Boolean, certifiedDate: Date, nextReviewDate: Date },
      malwareProtection: { implemented: Boolean, certifiedDate: Date, nextReviewDate: Date },
      dataEncryption: { implemented: Boolean, encryptionMethod: String, certifiedDate: Date },
      accessControl: { implemented: Boolean, certifiedDate: Date, nextReviewDate: Date },
      vulnerabilityManagement: { implemented: Boolean, certifiedDate: Date, nextReviewDate: Date },
      securityPolicies: { implemented: Boolean, certifiedDate: Date, nextReviewDate: Date },
      employeeTraining: { implemented: Boolean, trainingDate: Date, nextTrainingDate: Date },
      incidentResponse: { implemented: Boolean, planDocumentDate: Date, lastTestDate: Date },
      regularTesting: { implemented: Boolean, lastTestDate: Date, nextTestDate: Date },
      accessReview: { implemented: Boolean, lastReviewDate: Date, nextReviewDate: Date },
      vendorCompliance: { implemented: Boolean, vendorsAssessed: Number, lastReviewDate: Date },
    },
    paymentProcessing: {
      acceptedCardTypes: [String], // Visa, Mastercard, Amex, Discover
      paymentGatewayProvider: String,
      tokenizationUsed: Boolean,
      encryptionUsed: Boolean,
      transactionMonitoring: Boolean,
      fraudDetectionEnabled: Boolean,
      chargebackRate: Number,
      averageTransactionValue: Number,
      monthlyTransactionVolume: Number,
    },
    vulnerabilityAssessment: {
      lastAssessmentDate: Date,
      nextAssessmentDate: Date,
      vulnerabilitiesFound: Number,
      vulnerabilitiesResolved: Number,
      criticalVulnerabilities: Number,
      highRiskVulnerabilities: Number,
      assessmentMethod: String, // internal, external, qualified_assessor
      assessor: String,
      assessorCertification: String,
    },
    penTestResults: {
      lastPenTestDate: Date,
      nextPenTestDate: Date,
      penTestProvider: String,
      criticalFindings: Number,
      highFindings: Number,
      mediumFindings: Number,
      lowFindings: Number,
      remediationStatus: String,
    },
    networkScan: {
      lastScanDate: Date,
      nextScanDate: Date,
      scanProvider: String,
      passedScan: Boolean,
      failureReasons: [String],
      remediationPlan: String,
    },
    incidents: {
      type: [{
        incidentId: String,
        incidentDate: Date,
        incidentType: String,
        description: String,
        cardsAffected: Number,
        reportedToVisa: Boolean,
        reportedToMastercard: Boolean,
        resolved: Boolean,
        resolutionDate: Date,
        resolutionDetails: String,
      }],
      default: [],
    },
    auditLog: {
      type: [{
        auditDate: Date,
        auditorName: String,
        auditorCertification: String,
        findings: String,
        recommendations: [String],
        followUpRequired: Boolean,
      }],
      default: [],
    },
    certification: {
      certified: Boolean,
      certificateNumber: String,
      certificateFile: String,
      certificateIssuer: String,
      certificateExpiry: Date,
      attestationOfCompliance: Boolean,
      declarationOfCompliance: Boolean,
    },
    remediation: {
      type: [{
        issueId: String,
        issueType: String,
        severity: String,
        remediationPlan: String,
        targetDate: Date,
        completionDate: Date,
        status: String,
      }],
      default: [],
    },
  },
  { timestamps: true, collection: 'pci_dss_compliance' }
);

// Indexes
PCIDSSComplianceSchema.index({ organizationName: 1 });
PCIDSSComplianceSchema.index({ assessmentYear: -1 });
PCIDSSComplianceSchema.index({ complianceLevel: 1 });
PCIDSSComplianceSchema.index({ expiryDate: 1 });

// Instance methods
PCIDSSComplianceSchema.methods.updateRequirementStatus = function (requirementId, status, findings, remediation) {
  const req = this.requirements.find((r) => r.requirementId === requirementId);
  if (req) {
    req.status = status;
    req.findings = findings;
    req.remediation = remediation;
  }
};

PCIDSSComplianceSchema.methods.isCompliant = function () {
  const nonCompliant = this.requirements.filter((r) => r.status === 'non_compliant');
  return nonCompliant.length === 0;
};

PCIDSSComplianceSchema.methods.getDaysUntilExpiry = function () {
  if (!this.expiryDate) return null;
  const now = new Date();
  const diff = this.expiryDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

module.exports = model('PCIDSSCompliance', PCIDSSComplianceSchema);
