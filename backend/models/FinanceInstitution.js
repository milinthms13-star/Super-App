const mongoose = require('mongoose');

const financeInstitutionSchema = new mongoose.Schema(
  {
    partnerCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ['bank', 'nbfc', 'co-operative', 'microfinance', 'fintech'],
      index: true,
    },
    onboardingStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
      index: true,
    },
    verifiedPartner: { type: Boolean, default: false, index: true },
    branchAddress: { type: String, default: '', trim: true },
    contactPerson: {
      name: { type: String, default: '', trim: true },
      phone: { type: String, default: '', trim: true },
      email: { type: String, default: '', trim: true, lowercase: true },
    },
    serviceDistricts: [{ type: String, trim: true }],
    loanCategories: [{ type: String, trim: true }],
    commissionModel: {
      type: {
        type: String,
        enum: ['percentage', 'flat'],
        default: 'percentage',
      },
      value: { type: Number, min: 0, default: 1.5 },
      payoutCycle: {
        type: String,
        enum: ['weekly', 'monthly', 'quarterly'],
        default: 'monthly',
      },
      notes: { type: String, default: '', trim: true },
    },
    approvalTime: {
      minDays: { type: Number, min: 0, default: 2 },
      maxDays: { type: Number, min: 0, default: 7 },
    },
    processingFee: {
      type: {
        type: String,
        enum: ['percentage', 'flat'],
        default: 'percentage',
      },
      value: { type: Number, min: 0, default: 1.0 },
      description: { type: String, default: '', trim: true },
    },
    interestRange: {
      min: { type: Number, min: 0, default: 8.5 },
      max: { type: Number, min: 0, default: 16.0 },
    },
    ratings: {
      average: { type: Number, min: 0, max: 5, default: 4.2 },
      totalReviews: { type: Number, min: 0, default: 0 },
    },
    reviews: [
      {
        reviewerName: { type: String, trim: true, default: '' },
        rating: { type: Number, min: 1, max: 5, required: true },
        comment: { type: String, trim: true, default: '' },
        createdAt: { type: Date, default: () => new Date() },
      },
    ],
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

financeInstitutionSchema.index({ name: 'text', branchAddress: 'text' });
financeInstitutionSchema.index({ type: 1, isActive: 1 });
financeInstitutionSchema.index({ verifiedPartner: 1, isActive: 1 });

module.exports = mongoose.model('FinanceInstitution', financeInstitutionSchema);
