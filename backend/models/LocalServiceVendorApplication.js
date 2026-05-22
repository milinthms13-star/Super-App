const mongoose = require('mongoose');

const localServiceVendorApplicationSchema = new mongoose.Schema(
  {
    vendorCode: { type: String, required: true, unique: true, index: true, trim: true, uppercase: true },
    businessName: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    whatsappNumber: { type: String, trim: true, default: '' },
    packageName: { type: String, required: true, trim: true },
    packagePrice: { type: Number, required: true, min: 0 },
    portfolioItems: { type: Number, min: 0, default: 0 },
    verificationDone: { type: Boolean, default: false },
    serviceAreas: [{ type: String, trim: true }],
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    featured: { type: Boolean, default: false },
    commissionPercent: { type: Number, min: 0, max: 100, default: 12 },
    moderationNote: { type: String, trim: true, default: '' },
    sourceProviderCode: { type: String, trim: true, default: '' },
    createdByUserId: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
    approvedAt: { type: Date },
    approvedBy: { type: String, trim: true, default: '' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

localServiceVendorApplicationSchema.virtual('id').get(function () {
  return this.vendorCode;
});

module.exports = mongoose.model('LocalServiceVendorApplication', localServiceVendorApplicationSchema);
