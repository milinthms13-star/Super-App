const mongoose = require('mongoose');

const tierRuleSchema = new mongoose.Schema(
  {
    dailyAnalysisLimit: { type: Number, min: 0, max: 500, required: true },
    weeklyPlanLengthDays: { type: Number, min: 1, max: 90, required: true },
    allowPremiumReport: { type: Boolean, required: true },
    allowDermatologistReferral: { type: Boolean, required: true },
  },
  { _id: false }
);

const beautySubscriptionRuleSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 40,
      default: 'default',
    },
    free: {
      type: tierRuleSchema,
      required: true,
    },
    premium: {
      type: tierRuleSchema,
      required: true,
    },
    updatedBy: {
      type: String,
      trim: true,
      default: '',
      maxlength: 120,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BeautySubscriptionRule', beautySubscriptionRuleSchema);
