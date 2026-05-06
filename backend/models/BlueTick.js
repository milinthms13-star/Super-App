/**
 * Blue Tick Verification Schema - Profile Credibility Badge
 * Tracks verification status and automatic/manual issuance
 */

const mongoose = require('mongoose');

const BlueTick = require('../models/BlueTick');

const BlueTickSchema = new mongoose.Schema(
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
      enum: ['not_eligible', 'pending_review', 'approved', 'rejected', 'revoked'],
      default: 'not_eligible',
      index: true,
    },

    // Issuance Information
    issuedAt: Date,
    issuedBy: String, // 'automatic' or admin email
    issueReason: String, // Why issued (e.g., 'kyc_verified_6_months', 'manual_approval')

    // Expiry
    expiryDate: Date, // Optional renewal date
    autoRenew: { type: Boolean, default: true },

    // Revocation Details
    revokedAt: Date,
    revokedBy: String,
    revocationReason: String,
    revocationNotes: String,

    // Requirements Met (for automatic issuance)
    requirementsMet: {
      kycVerified: { type: Boolean, default: false, verifiedAt: Date },
      kyc6MonthsOld: { type: Boolean, default: false },
      noFraudReports: { type: Boolean, default: false },
      activeProfile: { type: Boolean, default: false },
      completeProfile: { type: Boolean, default: false },
      profileAge3Months: { type: Boolean, default: false },
      noUserComplaints: { type: Boolean, default: false },
      passwordSecurityPassed: { type: Boolean, default: false },
    },

    // Eligibility Score
    eligibilityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // Verification Review
    adminReview: {
      reviewedAt: Date,
      reviewedBy: String,
      reviewNotes: String,
      manualVerification: Boolean,
      decision: String, // 'approved', 'rejected', 'needs_more_info'
    },

    // Automatic Renewal Tracking
    renewalHistory: [
      {
        renewedAt: Date,
        renewalScore: Number,
        renewalStatus: String, // 'auto_renewed', 'renewal_pending', 'renewal_failed'
        renewalNotes: String,
      },
    ],

    // Revocation Risk Monitoring
    riskMonitoring: {
      fraudReports: { type: Number, default: 0 },
      userComplaints: { type: Number, default: 0 },
      lastRiskCheckAt: Date,
      riskLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    },

    // Timestamps
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'blue_ticks',
  }
);

// Index for faster queries
BlueTickSchema.index({ status: 1, createdAt: -1 });
BlueTickSchema.index({ eligibilityScore: -1 });
BlueTickSchema.index({ expiryDate: 1 });

module.exports = mongoose.model('BlueTick', BlueTickSchema);
