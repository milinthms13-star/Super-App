/**
 * Food Safety Certification Model - Phase 9 Feature B
 * Vendor certifications, compliance, food safety standards
 */

const mongoose = require('mongoose');

const FoodSafetyCertificationSchema = new mongoose.Schema(
  {
    certificationId: { type: String, unique: true, required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },

    // FSSAI Certification (India)
    fssai: {
      registered: { type: Boolean, default: false },
      licenseNumber: String,
      licenseIssueDate: Date,
      licenseExpiryDate: Date,
      isActive: Boolean,
      certificateUrl: String,
      verifiedAt: Date,
    },

    // Food Safety Standards
    certifications: [
      {
        certificationName: String,
        certificationBody: String,
        issueDate: Date,
        expiryDate: Date,
        certificateNumber: String,
        status: { type: String, enum: ['active', 'expired', 'pending', 'revoked'] },
        documentUrl: String,
        verifiedAt: Date,
      },
    ],

    // Hygiene & Sanitation Compliance
    hygieneCompliance: {
      lastInspectionDate: Date,
      nextInspectionDate: Date,
      inspectionScore: { type: Number, min: 0, max: 100 },
      kitchenCleanliness: { type: Number, min: 1, max: 5 },
      staffHygiene: { type: Number, min: 1, max: 5 },
      storageConditions: { type: Number, min: 1, max: 5 },
      wasteManagement: { type: Number, min: 1, max: 5 },
      overallHygieneScore: { type: Number, min: 0, max: 100 },
      violations: [
        {
          violationType: String,
          severity: { type: String, enum: ['critical', 'major', 'minor'] },
          description: String,
          dateFound: Date,
          dateResolved: Date,
        },
      ],
      correctionPhotos: [String],
    },

    // Allergen Management
    allergenManagement: {
      hasAllergenMenu: Boolean,
      trainingCompleted: Boolean,
      lastTrainingDate: Date,
      allergensCovered: [String],
      kitchenSeparation: Boolean,
      crossContaminationRisk: { type: String, enum: ['low', 'medium', 'high'] },
      allergenControlProcedures: String,
    },

    // Cold Chain Management (if applicable)
    coldChainCompliance: {
      hasRefrigerators: Boolean,
      refrigerationEquipmentCount: Number,
      temperatureMonitoring: Boolean,
      lastTemperatureCheck: Date,
      storageProcedures: String,
      averageTemperature: Number, // Celsius
      temperatureAlarms: [
        {
          alarmTime: Date,
          temperature: Number,
          reason: String,
          resolution: String,
        },
      ],
    },

    // Staff Training & Certifications
    staffTraining: {
      foodHandlersCertified: { type: Number, default: 0 },
      sanitationSpecialistsCertified: { type: Number, default: 0 },
      lastTrainingDate: Date,
      trainingFrequency: { type: String, enum: ['quarterly', 'biannually', 'annually'] },
      trainingDocumentation: [
        {
          staffName: String,
          certificationType: String,
          certificationDate: Date,
          expiryDate: Date,
          documentUrl: String,
        },
      ],
    },

    // Supplier Verification
    supplierVerification: {
      verifiedSuppliers: { type: Number, default: 0 },
      sourceTracking: Boolean,
      qualityCertificates: [
        {
          supplierId: String,
          supplierName: String,
          productCategory: String,
          certificationStatus: { type: String, enum: ['verified', 'pending', 'failed'] },
          lastVerifiedDate: Date,
          certificateExpiryDate: Date,
        },
      ],
    },

    // Testing & Quality Control
    qualityControl: {
      microbiologicalTesting: Boolean,
      lastTestDate: Date,
      testResults: [
        {
          testType: String,
          testDate: Date,
          result: String,
          status: { type: String, enum: ['pass', 'fail', 'pending'] },
          labName: String,
          reportUrl: String,
        },
      ],
      internalQAProcess: String,
      defectRate: Number, // percentage
    },

    // Complaint & Incident History
    complaints: [
      {
        complaintId: String,
        complaintType: {
          type: String,
          enum: ['contamination', 'illness', 'labeling', 'adulteration', 'other'],
        },
        dateReported: Date,
        description: String,
        resolution: String,
        resolutionDate: Date,
        status: { type: String, enum: ['open', 'closed', 'pending'] },
      },
    ],

    // Compliance Score & Rating
    overallComplianceScore: { type: Number, min: 0, max: 100 },
    complianceRating: { type: String, enum: ['A', 'B', 'C', 'D', 'F'] },
    lastAuditDate: Date,
    nextAuditDate: Date,
    auditFrequency: { type: String, enum: ['monthly', 'quarterly', 'biannually', 'annually'] },

    // Documentation
    documentationStatus: {
      menuTranslated: Boolean,
      allergenInfoDisplayed: Boolean,
      certificationDisplayed: Boolean,
      complaintProcedurePosted: Boolean,
    },

    // Regulatory History
    regulatoryActions: [
      {
        actionType: String,
        actionDate: Date,
        authority: String,
        description: String,
        penalty: String,
        status: String,
      },
    ],

    status: { type: String, enum: ['compliant', 'non_compliant', 'pending', 'suspended'], default: 'pending' },
  },
  { timestamps: true, collection: 'foodsafetycertifications' }
);

// Indexes
FoodSafetyCertificationSchema.index({ restaurantId: 1 });
FoodSafetyCertificationSchema.index({ status: 1 });
FoodSafetyCertificationSchema.index({ 'fssai.licenseExpiryDate': 1 });
FoodSafetyCertificationSchema.index({ overallComplianceScore: -1 });

// Instance Methods
FoodSafetyCertificationSchema.methods.calculateComplianceScore = function () {
  let score = 0;
  let maxPoints = 0;

  // FSSAI: 20 points
  if (this.fssai && this.fssai.isActive) {
    score += 20;
  }
  maxPoints += 20;

  // Hygiene: 25 points
  if (this.hygieneCompliance && this.hygieneCompliance.overallHygieneScore) {
    score += (this.hygieneCompliance.overallHygieneScore / 100) * 25;
  }
  maxPoints += 25;

  // Staff Training: 20 points
  if (this.staffTraining && this.staffTraining.foodHandlersCertified > 0) {
    score += 20;
  }
  maxPoints += 20;

  // Quality Control: 20 points
  if (this.qualityControl && this.qualityControl.microbiologicalTesting) {
    score += 20;
  }
  maxPoints += 20;

  // Complaint History: 15 points
  const openComplaints = this.complaints ? this.complaints.filter((c) => c.status === 'open').length : 0;
  score += Math.max(0, 15 - openComplaints * 5);
  maxPoints += 15;

  this.overallComplianceScore = Math.min(100, (score / maxPoints) * 100);

  // Assign rating
  if (this.overallComplianceScore >= 90) this.complianceRating = 'A';
  else if (this.overallComplianceScore >= 80) this.complianceRating = 'B';
  else if (this.overallComplianceScore >= 70) this.complianceRating = 'C';
  else if (this.overallComplianceScore >= 60) this.complianceRating = 'D';
  else this.complianceRating = 'F';

  return this.save();
};

module.exports = mongoose.model('FoodSafetyCertification', FoodSafetyCertificationSchema);
