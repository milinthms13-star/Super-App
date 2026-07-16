/**
 * Verification Document Model
 * Stores user-submitted verification documents
 */

const mongoose = require('mongoose');

const VerificationDocumentSchema = new mongoose.Schema(
  {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatrimonialProfile',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      enum: [
        'aadhaar',
        'pan',
        'passport',
        'driving_license',
        'voter_id',
        'income_proof',
        'salary_slip',
        'itr',
        'employment_letter',
        'linkedin',
        'address_proof',
        'education_certificate',
        'video_intro',
      ],
      required: true,
    },
    documentNumber: {
      type: String,
      trim: true,
    },
    documentUrl: {
      type: String,
      required: true,
    },
    backSideUrl: String,
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'expired'],
      default: 'pending',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: Date,
    expiryDate: Date,
    rejectionReason: String,
    extractedData: {
      name: String,
      dateOfBirth: Date,
      address: String,
      photo: String,
      gender: String,
      fatherName: String,
      income: Number,
      employerName: String,
      designation: String,
    },
    verificationNotes: String,
    confidenceScore: Number,
    autoVerified: {
      type: Boolean,
      default: false,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'matrimonial_verification_documents',
  }
);

// Indexes
VerificationDocumentSchema.index({ profileId: 1, documentType: 1 });
VerificationDocumentSchema.index({ verificationStatus: 1, submittedAt: -1 });

module.exports = mongoose.model('VerificationDocument', VerificationDocumentSchema);
