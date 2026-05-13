const mongoose = require('mongoose');

const freelancerCommissionConfigSchema = new mongoose.Schema(
  {
    configKey: { type: String, required: true, unique: true, trim: true, default: 'default' },
    commissionType: { type: String, enum: ['percentage', 'flat'], default: 'percentage' },
    commissionValue: { type: Number, min: 0, default: 12 },
    sponsoredListingFee: { type: Number, min: 0, default: 5000 },
    leadPurchaseFee: { type: Number, min: 0, default: 300 },
    cancellationPenaltyPercent: { type: Number, min: 0, max: 100, default: 10 },
    refundWindowHours: { type: Number, min: 0, default: 24 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FreelancerCommissionConfig', freelancerCommissionConfigSchema);
