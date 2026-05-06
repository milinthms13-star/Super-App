/**
 * KYC Verification Schema - Identity & Fraud Prevention
 * Stores KYC artifacts and verification status
 */

const mongoose = require('mongoose');

const KYCSchema = new mongoose.Schema(
  {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatrimonialProfile',
      required: true,
      unique: true,
      index: true,
    },

    // Verification Status
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'under_review', 'expired'],
      default: 'pending',
      index: true,
    },

    // Identity Documents
    documents: {
      // Aadhaar Card
      aadhaar: {
        documentId: String, // Last 4 digits
        uploadedAt: Date,
        url: String, // S3 URL to encrypted document
        fileName: String,
        status: { type: String, enum: ['pending', 'verified', 'rejected'] },
        verifiedAt: Date,
        notes: String,
      },

      // PAN Card
      pan: {
        documentId: String,
        uploadedAt: Date,
        url: String,
        fileName: String,
        status: { type: String, enum: ['pending', 'verified', 'rejected'] },
        verifiedAt: Date,
        notes: String,
      },

      // Passport
      passport: {
        documentId: String,
        uploadedAt: Date,
        url: String,
        fileName: String,
        status: { type: String, enum: ['pending', 'verified', 'rejected'] },
        verifiedAt: Date,
        notes: String,
      },

      // Voter ID
      voterId: {
        documentId: String,
        uploadedAt: Date,
        url: String,
        fileName: String,
        status: { type: String, enum: ['pending', 'verified', 'rejected'] },
        verifiedAt: Date,
        notes: String,
      },

      // Driving License
      drivingLicense: {
        documentId: String,
        uploadedAt: Date,
        url: String,
        fileName: String,
        status: { type: String, enum: ['pending', 'verified', 'rejected'] },
        verifiedAt: Date,
        notes: String,
      },
    },

    // Biometric Verification
    selfie: {
      uploadedAt: Date,
      url: String, // S3 URL to selfie
      fileName: String,
      livenessScore: Number, // 0-100, checks if person is real
      faceMatchScore: Number, // % match with document photo
      status: { type: String, enum: ['pending', 'verified', 'rejected'] },
      verifiedAt: Date,
      notes: String,
    },

    // Verification History
    verificationHistory: [
      {
        status: String,
        timestamp: Date,
        reviewedBy: String, // Admin email
        notes: String,
        documentType: String, // Which document triggered update
      },
    ],

    // Risk Assessment
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50, // 0=trusted, 100=suspicious
    },

    riskFactors: [
      {
        factor: String, // 'duplicate_profile', 'suspicious_photo', 'mismatched_info', etc.
        severity: { type: String, enum: ['low', 'medium', 'high'] },
        detectedAt: Date,
        notes: String,
      },
    ],

    // Approval Details
    approvedAt: Date,
    approvedBy: String, // Admin email
    approvalNotes: String,

    // Rejection Details
    rejectedAt: Date,
    rejectedBy: String,
    rejectionReason: String,
    rejectionNotes: String,
    canReapply: { type: Boolean, default: true },
    reapplyAfterDays: { type: Number, default: 30 },

    // Expiry Management
    expiryDate: Date, // When KYC verification expires
    isExpired: { type: Boolean, default: false },

    // Fraud Detection Flags
    flags: {
      duplicateProfile: { type: Boolean, default: false },
      suspiciousActivity: { type: Boolean, default: false },
      reportedByUsers: { type: Boolean, default: false },
      failedLivenesCheck: { type: Boolean, default: false },
      faceMatchFailed: { type: Boolean, default: false },
    },

    // Additional Verification
    phoneVerified: { type: Boolean, default: false },
    phoneVerifiedAt: Date,
    emailVerified: { type: Boolean, default: false },
    emailVerifiedAt: Date,

    // Notes & Comments
    internalNotes: String, // Private notes for admins

    // Timestamps
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'kyc_verifications',
  }
);

// Indexes for faster queries
KYCSchema.index({ status: 1, createdAt: -1 });
KYCSchema.index({ riskScore: -1 });
KYCSchema.index({ 'flags.duplicateProfile': 1 });

module.exports = mongoose.model('KYC', KYCSchema);
