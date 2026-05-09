/**
 * Vendor & Restaurant Catalog Model - Phase 9 Feature E
 * Multi-cuisine vendor information, ratings, certifications, service areas
 */

const mongoose = require('mongoose');

const VendorSchema = new mongoose.Schema(
  {
    vendorId: { type: String, unique: true, required: true },

    // Basic Information
    restaurantName: { type: String, required: true },
    displayName: String,
    description: String,
    cuisine: [String], // ['Italian', 'Chinese', 'Indian', etc.]
    cuisineCategory: [String], // ['Fine Dining', 'Casual', 'Fast Food', etc.]
    priceRange: { type: String, enum: ['budget', 'moderate', 'premium', 'luxury'] },
    restaurantType: [String], // ['cloud_kitchen', 'standalone', 'chain', 'food_court', etc.]

    // Contact & Location
    phoneNumber: String,
    email: String,
    website: String,
    location: {
      address: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      coordinates: {
        type: { type: String, default: 'Point' },
        coordinates: [Number], // [longitude, latitude]
      },
      landmark: String,
      areaName: String,
    },

    // Service Information
    serviceAreas: [
      {
        areaName: String,
        deliveryTime: Number, // minutes
        deliveryCharge: Number,
        minimumOrder: Number,
        maximumOrder: Number,
        isActive: Boolean,
      },
    ],

    operatingHours: [
      {
        dayOfWeek: String,
        openTime: String, // HH:MM
        closeTime: String, // HH:MM
        isClosed: Boolean,
        specialHours: {
          holiday: Boolean,
          holidayName: String,
          holidayOpenTime: String,
          holidayCloseTime: String,
        },
      },
    ],

    deliveryModes: [String], // ['delivery', 'pickup', 'dine_in', 'catering', 'takeout']
    onlineOrdersAccepted: { type: Boolean, default: true },
    pickupAvailable: { type: Boolean, default: true },
    dineInAvailable: { type: Boolean, default: true },

    // Ratings & Reviews
    ratings: {
      overallRating: { type: Number, min: 0, max: 5, default: 0 },
      foodQuality: { type: Number, min: 0, max: 5, default: 0 },
      delivery: { type: Number, min: 0, max: 5, default: 0 },
      cleanliness: { type: Number, min: 0, max: 5, default: 0 },
      service: { type: Number, min: 0, max: 5, default: 0 },
      value: { type: Number, min: 0, max: 5, default: 0 },
      totalRatings: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
      ratingDistribution: {
        fiveStars: { type: Number, default: 0 },
        fourStars: { type: Number, default: 0 },
        threeStars: { type: Number, default: 0 },
        twoStars: { type: Number, default: 0 },
        oneStar: { type: Number, default: 0 },
      },
    },

    // Performance Metrics
    performance: {
      onTimeDeliveryPercentage: { type: Number, min: 0, max: 100, default: 0 },
      acceptanceRate: { type: Number, min: 0, max: 100, default: 0 },
      cancellationRate: { type: Number, min: 0, max: 100, default: 0 },
      averagePreparationTime: Number, // minutes
      totalOrdersCompleted: { type: Number, default: 0 },
      monthlySales: { type: Number, default: 0 },
      averageOrderValue: { type: Number, default: 0 },
      customerRetentionRate: { type: Number, min: 0, max: 100, default: 0 },
    },

    // Certifications & Compliance
    certifications: [
      {
        certificationType: String, // FSSAI, ISO, etc.
        certificateNumber: String,
        issueDate: Date,
        expiryDate: Date,
        certificateUrl: String,
        isValid: Boolean,
      },
    ],
    hygieneScore: { type: Number, min: 0, max: 100 },
    lastHygieneInspectionDate: Date,
    nextHygieneInspectionDate: Date,
    complianceStatus: { type: String, enum: ['compliant', 'non_compliant', 'pending_inspection'], default: 'pending_inspection' },

    // Featured & Promotional
    isFeatured: { type: Boolean, default: false },
    featuredUntil: Date,
    promotionalBadges: [String], // ['newly_joined', 'popular', 'fast_delivery', 'eco_friendly', etc.]
    trendingScore: { type: Number, min: 0, max: 100, default: 0 },

    // Specialties & Features
    specialties: [String], // ['weekend brunch', 'late night delivery', 'vegetarian', etc.]
    offersVegetarian: { type: Boolean, default: false },
    offersVegan: { type: Boolean, default: false },
    offersGlutenFree: { type: Boolean, default: false },
    partnershipPrograms: [String], // loyalty, cloud kitchen, ghost kitchen, etc.

    // Media & Branding
    logo: String,
    bannerImage: String,
    photos: [String],
    videoUrl: String,
    socialMediaLinks: {
      facebook: String,
      instagram: String,
      twitter: String,
    },

    // Menu Information
    menuStats: {
      totalItems: { type: Number, default: 0 },
      availableItems: { type: Number, default: 0 },
      categories: { type: Number, default: 0 },
      lastMenuUpdated: Date,
    },

    // Verification & Onboarding
    verificationStatus: { type: String, enum: ['unverified', 'pending', 'verified', 'rejected'], default: 'unverified' },
    verifiedAt: Date,
    verifiedBy: String,
    onboardingStatus: { type: String, enum: ['incomplete', 'pending_docs', 'verified', 'active', 'suspended'], default: 'incomplete' },
    onboardingDate: Date,

    // Owner & Management
    ownerName: String,
    ownerPhoneNumber: String,
    ownerEmail: String,
    managerName: String,
    managerPhoneNumber: String,
    managerEmail: String,

    // Bank & Payment Details
    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      bankName: String,
      ifscCode: String,
      panNumber: String,
      gstNumber: String,
      verificationStatus: String,
    },

    // Settlement & Financials
    commissionPercentage: { type: Number, default: 0 },
    settlementCycle: { type: String, enum: ['daily', 'weekly', 'bi_weekly', 'monthly'], default: 'weekly' },
    lastSettlementDate: Date,
    pendingSettlementAmount: { type: Number, default: 0 },

    // Admin Notes & Tags
    adminNotes: String,
    tags: [String],
    suspensionReasons: [String],
    suspendedUntil: Date,

    status: { type: String, enum: ['active', 'inactive', 'suspended', 'permanently_closed', 'on_boarding'], default: 'on_boarding' },
  },
  { timestamps: true, collection: 'vendors' }
);

// Indexes
VendorSchema.index({ 'location.coordinates': '2dsphere' });
VendorSchema.index({ restaurantName: 'text', cuisine: 'text', description: 'text' });
VendorSchema.index({ 'ratings.overallRating': -1, status: 1 });
VendorSchema.index({ status: 1, 'location.city': 1 });
VendorSchema.index({ cuisine: 1, priceRange: 1 });
VendorSchema.index({ isFeatured: 1, featuredUntil: 1 });
VendorSchema.index({ verificationStatus: 1, onboardingStatus: 1 });

// Instance Methods
VendorSchema.methods.isOpenNow = function () {
  const now = new Date();
  const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

  const todayHours = this.operatingHours.find((h) => h.dayOfWeek === dayOfWeek);
  if (!todayHours || todayHours.isClosed) return false;

  return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
};

VendorSchema.methods.getDeliveryTime = function (userLocation) {
  const serviceArea = this.serviceAreas.find((sa) => sa.isActive);
  return serviceArea ? serviceArea.deliveryTime : 30; // default 30 mins
};

VendorSchema.methods.canDeliverTo = function (deliveryArea) {
  return this.serviceAreas.some((sa) => sa.areaName === deliveryArea && sa.isActive);
};

module.exports = mongoose.model('Vendor', VendorSchema);
