const mongoose = require('mongoose');

const ReferralProgramSchema = new mongoose.Schema(
  {
    referralId: {
      type: String,
      unique: true,
      required: true,
      default: () => `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    referrerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    referrerName: String,
    referralCode: {
      type: String,
      unique: true,
      required: true,
      uppercase: true,
      match: /^[A-Z0-9]{8}$/,
    },
    referredUsers: [
      {
        email: {
          type: String,
          lowercase: true,
          trim: true,
        },
        name: String,
        referredAt: {
          type: Date,
          default: Date.now,
        },
        signedUpAt: Date,
        conversionStatus: {
          type: String,
          enum: ['Pending', 'Converted', 'Inactive'],
          default: 'Pending',
        },
        rewardStatus: {
          type: String,
          enum: ['Pending', 'Credited', 'Revoked'],
          default: 'Pending',
        },
      },
    ],
    totalReferrals: {
      type: Number,
      default: 0,
    },
    successfulReferrals: {
      type: Number,
      default: 0,
    },
    totalRewardsEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    rewardType: {
      type: String,
      enum: ['Cashback', 'Wallet Credits', 'Discount Voucher'],
      default: 'Wallet Credits',
    },
    rewardAmount: {
      type: Number,
      default: 100, // Default reward amount
    },
    tier: {
      type: String,
      enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
      default: 'Bronze',
    },
    tierBenefits: {
      rewardPercentage: {
        type: Number,
        default: 5, // 5% extra reward
      },
      exclusiveOffers: {
        type: Boolean,
        default: false,
      },
      prioritySupport: {
        type: Boolean,
        default: false,
      },
    },
    status: {
      type: String,
      enum: ['Active', 'Paused', 'Closed'],
      default: 'Active',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
ReferralProgramSchema.index({ referrerEmail: 1, createdAt: -1 });
ReferralProgramSchema.index({ referralCode: 1 });

module.exports = mongoose.model('ReferralProgram', ReferralProgramSchema);
