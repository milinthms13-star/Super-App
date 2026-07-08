const mongoose = require('mongoose');

const seasonalPricingSchema = new mongoose.Schema({
  season: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  price: { type: Number, required: true },
}, { _id: false });

const tourismPackageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Package title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  destination: {
    type: String,
    required: [true, 'Destination is required'],
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['Honeymoon', 'Houseboat', 'Wildlife', 'Nature', 'Beach', 'Pilgrimage', 'Wellness', 'Family', 'Student', 'NRI', 'Local Experience'],
    default: 'Nature',
  },
  travelerType: {
    type: String,
    enum: ['Couple', 'Family', 'Group', 'Solo', 'Student', 'NRI', 'Any'],
    default: 'Family',
  },
  durationDays: {
    type: Number,
    required: true,
    min: [1, 'Duration must be at least 1 day'],
    max: [30, 'Duration cannot exceed 30 days'],
  },
  startPrice: {
    type: Number,
    required: [true, 'Start price is required'],
    min: [0, 'Price cannot be negative'],
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviewsCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  pickupCities: [{
    type: String,
    trim: true,
  }],
  hotelCategory: {
    type: String,
    enum: ['budget', '3-star', '4-star', 'luxury'],
    default: '3-star',
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TourismVendor',
    required: true,
  },
  vendor: {
    type: String,
    required: true,
  },
  vendorVerified: {
    type: Boolean,
    default: false,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  inclusions: [{
    type: String,
    trim: true,
  }],
  exclusions: [{
    type: String,
    trim: true,
  }],
  cancellationPolicy: {
    type: String,
    required: true,
    default: 'Standard cancellation policy applies',
  },
  childPricing: {
    type: String,
    default: '0-5 years free, 6-11 years 50% of adult cost',
  },
  gstAndServiceCharge: {
    type: String,
    default: '5% GST + 2% service charge',
  },
  availableDates: [{
    type: String,
  }],
  mapHighlights: {
    type: String,
    trim: true,
  },
  itinerary: [{
    type: String,
  }],
  imageGallery: [{
    type: String,
  }],
  seasonalPricing: [seasonalPricingSchema],
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  commissionPercent: {
    type: Number,
    default: 8,
    min: 0,
    max: 30,
  },
  fraudRisk: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low',
  },
  kycStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
  },
  emergencyContact: {
    type: String,
    trim: true,
  },
  insuranceSupport: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  views: {
    type: Number,
    default: 0,
  },
  bookingsCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for better query performance
tourismPackageSchema.index({ destination: 1, category: 1 });
tourismPackageSchema.index({ vendorId: 1 });
tourismPackageSchema.index({ approvalStatus: 1, isActive: 1 });
tourismPackageSchema.index({ startPrice: 1 });
tourismPackageSchema.index({ rating: -1 });
tourismPackageSchema.index({ createdAt: -1 });

// Virtual for reviews
tourismPackageSchema.virtual('reviews', {
  ref: 'TourismReview',
  localField: '_id',
  foreignField: 'packageId',
});

// Method to increment views
tourismPackageSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Method to update rating
tourismPackageSchema.methods.updateRating = async function() {
  const TourismReview = mongoose.model('TourismReview');
  const reviews = await TourismReview.find({ packageId: this._id });
  
  if (reviews.length > 0) {
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    this.rating = Number((totalRating / reviews.length).toFixed(1));
    this.reviewsCount = reviews.length;
  } else {
    this.rating = 0;
    this.reviewsCount = 0;
  }
  
  return this.save();
};

const TourismPackage = mongoose.model('TourismPackage', tourismPackageSchema);

module.exports = TourismPackage;
