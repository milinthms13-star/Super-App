const mongoose = require('mongoose');

const providerReviewSchema = new mongoose.Schema(
  {
    reviewerName: { type: String, trim: true, default: '' },
    reviewerPhone: { type: String, trim: true, default: '' },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

const providerPortfolioSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: '' },
    link: { type: String, trim: true, default: '' },
    mediaUrl: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const freelancerProviderSchema = new mongoose.Schema(
  {
    providerCode: { type: String, required: true, unique: true, index: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    type: { type: String, enum: ['digital', 'local'], required: true, index: true },
    district: { type: String, required: true, trim: true, index: true },
    serviceAreas: [{ type: String, trim: true }],
    language: { type: String, trim: true, default: 'English' },
    languages: [{ type: String, trim: true }],
    budget: { type: String, enum: ['budget', 'medium', 'premium'], default: 'medium' },
    availability: { type: String, enum: ['online-now', 'instant', 'schedule'], default: 'schedule' },
    experience: { type: Number, min: 0, default: 0 },
    responseMinutes: { type: Number, min: 1, default: 30 },
    responseRate: { type: Number, min: 0, max: 100, default: 0 },
    completionRate: { type: Number, min: 0, max: 100, default: 0 },
    hourlyRate: { type: Number, min: 0, default: 0 },
    gigStartsFrom: { type: Number, min: 0, default: 0 },
    about: { type: String, trim: true, default: '' },
    verificationBadges: [{ type: String, trim: true }],
    verified: { type: Boolean, default: false, index: true },
    kycStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    contactPhone: { type: String, trim: true, default: '' },
    contactEmail: { type: String, trim: true, default: '', lowercase: true },
    maskedPhoneEnabled: { type: Boolean, default: true },
    reviews: [providerReviewSchema],
    reviewCount: { type: Number, min: 0, default: 0 },
    rating: { type: Number, min: 0, max: 5, default: 0, index: true },
    portfolio: [providerPortfolioSchema],
    plans: {
      currentPlanId: { type: String, trim: true, default: 'basic' },
      currentPlanName: { type: String, trim: true, default: 'Basic' },
      expiresAt: { type: Date, default: null },
      sponsoredListing: { type: Boolean, default: false },
    },
    leadCredits: { type: Number, min: 0, default: 0 },
    leadPurchaseHistory: [
      {
        jobId: { type: String, trim: true },
        amount: { type: Number, min: 0, default: 0 },
        purchasedAt: { type: Date, default: () => new Date() },
      },
    ],
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

freelancerProviderSchema.index({ name: 'text', category: 'text', district: 'text' });
freelancerProviderSchema.index({ category: 1, district: 1, type: 1, verified: 1 });
freelancerProviderSchema.index({ rating: -1, responseMinutes: 1 });

module.exports = mongoose.model('FreelancerProvider', freelancerProviderSchema);
