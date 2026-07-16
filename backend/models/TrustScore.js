/**
 * Trust Score Model
 * Multi-level trust scoring based on verifications
 */

const mongoose = require('mongoose');

const TrustScoreSchema = new mongoose.Schema(
  {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatrimonialProfile',
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    overallScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    level: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      default: 'bronze',
    },
    verifications: {
      email: {
        verified: { type: Boolean, default: false },
        verifiedAt: Date,
        score: { type: Number, default: 0 },
      },
      phone: {
        verified: { type: Boolean, default: false },
        verifiedAt: Date,
        score: { type: Number, default: 0 },
      },
      photoId: {
        verified: { type: Boolean, default: false },
        verifiedAt: Date,
        documentType: String,
        score: { type: Number, default: 0 },
      },
      income: {
        verified: { type: Boolean, default: false },
        verifiedAt: Date,
        documentType: String,
        score: { type: Number, default: 0 },
      },
      employment: {
        verified: { type: Boolean, default: false },
        verifiedAt: Date,
        method: String, // 'linkedin', 'letter', 'manual'
        score: { type: Number, default: 0 },
      },
      address: {
        verified: { type: Boolean, default: false },
        verifiedAt: Date,
        documentType: String,
        score: { type: Number, default: 0 },
      },
      education: {
        verified: { type: Boolean, default: false },
        verifiedAt: Date,
        documentType: String,
        score: { type: Number, default: 0 },
      },
      videoProfile: {
        verified: { type: Boolean, default: false },
        verifiedAt: Date,
        score: { type: Number, default: 0 },
      },
    },
    badges: [
      {
        type: String,
        enum: [
          'verified_identity',
          'verified_income',
          'verified_employer',
          'verified_education',
          'complete_profile',
          'responsive_user',
          'premium_member',
          'early_adopter',
        ],
      },
    ],
    lastCalculated: {
      type: Date,
      default: Date.now,
    },
    history: [
      {
        score: Number,
        level: String,
        changedAt: Date,
        reason: String,
      },
    ],
  },
  {
    timestamps: true,
    collection: 'matrimonial_trust_scores',
  }
);

// Calculate overall score based on verifications
TrustScoreSchema.methods.calculateScore = function () {
  const weights = {
    email: 10,
    phone: 10,
    photoId: 20,
    income: 15,
    employment: 15,
    address: 10,
    education: 10,
    videoProfile: 10,
  };

  let totalScore = 0;
  
  Object.keys(weights).forEach((key) => {
    if (this.verifications[key]?.verified) {
      totalScore += weights[key];
    }
  });

  this.overallScore = totalScore;

  // Determine level
  if (totalScore >= 80) this.level = 'platinum';
  else if (totalScore >= 60) this.level = 'gold';
  else if (totalScore >= 40) this.level = 'silver';
  else this.level = 'bronze';

  this.lastCalculated = new Date();
};

module.exports = mongoose.model('TrustScore', TrustScoreSchema);
