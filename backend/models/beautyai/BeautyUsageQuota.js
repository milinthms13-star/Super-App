const mongoose = require('mongoose');

const beautyUsageQuotaSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 16,
      index: true,
    },
    tier: {
      type: String,
      enum: ['free', 'premium'],
      default: 'free',
    },
    counts: {
      analyzeSelfie: { type: Number, min: 0, default: 0 },
      plan: { type: Number, min: 0, default: 0 },
    },
  },
  { timestamps: true }
);

beautyUsageQuotaSchema.index({ userId: 1, dateKey: 1 }, { unique: true });

module.exports = mongoose.model('BeautyUsageQuota', beautyUsageQuotaSchema);
