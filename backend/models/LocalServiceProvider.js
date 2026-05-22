const mongoose = require('mongoose');

const providerReviewSchema = new mongoose.Schema(
  {
    bookingCode: { type: String, trim: true, default: '' },
    reviewerName: { type: String, trim: true, default: '' },
    reviewerPhone: { type: String, trim: true, default: '' },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    comment: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

const providerPackageSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    price: { type: Number, min: 0, default: 0 },
    details: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const localServiceProviderSchema = new mongoose.Schema(
  {
    providerCode: { type: String, required: true, unique: true, index: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    city: { type: String, required: true, trim: true, index: true },
    address: { type: String, trim: true, default: '' },
    serviceAreas: [{ type: String, trim: true }],
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
    priceStart: { type: Number, default: 0, index: true },
    priceMax: { type: Number, default: 0 },
    rating: { type: Number, min: 0, max: 5, default: 0, index: true },
    reviewsCount: { type: Number, min: 0, default: 0 },
    responseMinutes: { type: Number, min: 0, default: 30, index: true },
    verified: { type: Boolean, default: false, index: true },
    premium: { type: Boolean, default: false, index: true },
    fastResponse: { type: Boolean, default: false, index: true },
    phone: { type: String, trim: true, default: '' },
    whatsappNumber: { type: String, trim: true, default: '' },
    image: { type: String, trim: true, default: '' },
    cancellationPolicy: { type: String, trim: true, default: '' },
    availabilityCalendar: {
      unavailableDates: [{ type: String, trim: true }],
      nextAvailableDate: { type: String, trim: true, default: '' },
    },
    packages: [providerPackageSchema],
    portfolio: [{ type: String, trim: true }],
    customerReviews: [providerReviewSchema],
    sourceVendorCode: { type: String, trim: true, index: true, default: '' },
    featured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

localServiceProviderSchema.virtual('id').get(function () {
  return this.providerCode;
});

localServiceProviderSchema.index({ name: 'text', category: 'text', city: 'text', address: 'text', serviceAreas: 'text' });

module.exports = mongoose.model('LocalServiceProvider', localServiceProviderSchema);
