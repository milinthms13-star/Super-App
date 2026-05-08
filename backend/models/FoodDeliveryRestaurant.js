const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Category Schema
const CategorySchema = new Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,
    name: {
      type: String,
      required: true,
      trim: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

// Addon Group Schema (for customizations like "Extra Toppings")
const AddonGroupSchema = new Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,
    name: {
      type: String,
      required: true,
      trim: true,
    },
    maxSelection: {
      type: Number,
      default: 1,
    },
    isRequired: {
      type: Boolean,
      default: false,
    },
    addons: [
      {
        name: String,
        price: { type: Number, default: 0, min: 0 },
      },
    ],
  },
  { _id: true }
);

// Variant Schema (half/full sizes, etc.)
const VariantSchema = new Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,
    name: {
      type: String,
      required: true,
      enum: ['half', 'full', 'large', 'small', 'regular', 'combo'],
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    available: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

// Operating Hours Schema
const OperatingHoursSchema = new Schema(
  {
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true,
    },
    openTime: String, // HH:mm format
    closeTime: String, // HH:mm format
    isClosed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

// Review Schema
const ReviewSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDeliveryUser',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
    },
    foodQuality: {
      type: Number,
      min: 1,
      max: 5,
    },
    delivery: {
      type: Number,
      min: 1,
      max: 5,
    },
    packaging: {
      type: Number,
      min: 1,
      max: 5,
    },
    isVerifiedOrder: {
      type: Boolean,
      default: false,
    },
    helpful: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// Restaurant Schema
const RestaurantSchema = new Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    cuisineTypes: {
      type: [String],
      default: [],
      index: true,
    },

    // Contact & Location
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      streetAddress: String,
      city: String,
      state: String,
      postalCode: String,
      landmark: String,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        index: '2dsphere',
      },
    },

    // Pricing & Delivery
    minDeliveryAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    deliveryCharges: {
      type: Number,
      default: 0,
      min: 0,
    },
    deliveryTime: {
      type: Number, // minutes
      default: 30,
      min: 10,
      max: 120,
    },
    priceRange: {
      type: String,
      enum: ['budget', 'moderate', 'premium', 'luxury'],
      default: 'moderate',
    },

    // Images & Media
    profileImage: String, // S3 URL
    bannerImage: String, // S3 URL
    images: [String], // Gallery images (S3 URLs)

    // Ratings & Reviews
    ratings: {
      average: {
        type: Number,
        default: 4.0,
        min: 1,
        max: 5,
      },
      foodQuality: {
        type: Number,
        default: 4.0,
        min: 1,
        max: 5,
      },
      delivery: {
        type: Number,
        default: 4.0,
        min: 1,
        max: 5,
      },
      packaging: {
        type: Number,
        default: 4.0,
        min: 1,
        max: 5,
      },
      totalRatings: {
        type: Number,
        default: 0,
      },
    },
    reviews: [ReviewSchema],

    // Operating Info
    operatingHours: [OperatingHoursSchema],
    isOpen: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPromoted: {
      type: Boolean,
      default: false,
    },

    // Dietary & Special Info
    vegOnly: {
      type: Boolean,
      default: false,
    },
    hasNonVeg: {
      type: Boolean,
      default: true,
    },
    hasVeg: {
      type: Boolean,
      default: true,
    },

    // Special Offers
    offers: [
      {
        title: String,
        description: String,
        discountPercentage: { type: Number, min: 0, max: 100 },
        discountAmount: Number,
        minOrderAmount: { type: Number, default: 0 },
        validUntil: Date,
        code: String,
      },
    ],

    // Menu Data
    categories: [CategorySchema],
    addonGroups: [AddonGroupSchema],

    // Metadata
    totalOrders: {
      type: Number,
      default: 0,
    },
    popularItems: [mongoose.Schema.Types.ObjectId], // refs to MenuItem
    metrics: {
      cancellationRate: {
        type: Number,
        default: 0,
      },
      averageDeliveryTime: {
        type: Number,
        default: 30,
      },
      orderCount30Days: {
        type: Number,
        default: 0,
      },
    },

    // Admin
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'pending'],
      default: 'active',
      index: true,
    },
    licenseNumber: String,
    licenseExpiry: Date,
    verificationStatus: {
      type: String,
      enum: ['verified', 'pending', 'rejected'],
      default: 'pending',
    },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Indexes
RestaurantSchema.index({ name: 'text', cuisineTypes: 'text', 'address.city': 'text' });
RestaurantSchema.index({ 'location.coordinates': '2dsphere' });
RestaurantSchema.index({ isFeatured: 1, isOpen: 1 });
RestaurantSchema.index({ status: 1, verificationStatus: 1 });

// Virtual: Days until license expiry
RestaurantSchema.virtual('daysUntilLicenseExpiry').get(function () {
  if (!this.licenseExpiry) return null;
  const now = new Date();
  const diff = this.licenseExpiry - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Virtual: Is open right now
RestaurantSchema.virtual('isOpenNow').get(function () {
  if (!this.isOpen) return false;

  const now = new Date();
  const day = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    now.getDay()
  ];
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
    2,
    '0'
  )}`;

  const todayHours = this.operatingHours.find((h) => h.day === day);
  if (!todayHours || todayHours.isClosed) return false;

  return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
});

// Methods

/**
 * Update ratings based on review
 */
RestaurantSchema.methods.updateRatings = async function (review) {
  const { rating, foodQuality, delivery, packaging } = review;

  const totalRatings = this.ratings.totalRatings + 1;
  this.ratings.average = (this.ratings.average * (totalRatings - 1) + rating) / totalRatings;
  this.ratings.foodQuality =
    (this.ratings.foodQuality * (totalRatings - 1) + (foodQuality || 0)) / totalRatings;
  this.ratings.delivery =
    (this.ratings.delivery * (totalRatings - 1) + (delivery || 0)) / totalRatings;
  this.ratings.packaging =
    (this.ratings.packaging * (totalRatings - 1) + (packaging || 0)) / totalRatings;
  this.ratings.totalRatings = totalRatings;

  await this.save();
};

/**
 * Add review to restaurant
 */
RestaurantSchema.methods.addReview = async function (reviewData) {
  const review = new ReviewSchema(reviewData);
  this.reviews.push(review);
  await this.updateRatings(reviewData);
  return review;
};

/**
 * Get operating hours for specific day
 */
RestaurantSchema.methods.getOperatingHours = function (day) {
  return this.operatingHours.find((h) => h.day === day);
};

/**
 * Update operating hours
 */
RestaurantSchema.methods.updateOperatingHours = function (day, openTime, closeTime, isClosed) {
  const index = this.operatingHours.findIndex((h) => h.day === day);
  if (index !== -1) {
    this.operatingHours[index] = {
      day,
      openTime,
      closeTime,
      isClosed,
    };
  } else {
    this.operatingHours.push({
      day,
      openTime,
      closeTime,
      isClosed,
    });
  }
};

/**
 * Add category to restaurant
 */
RestaurantSchema.methods.addCategory = function (categoryData) {
  const category = {
    _id: new mongoose.Types.ObjectId(),
    name: categoryData.name,
    displayOrder: categoryData.displayOrder || 0,
  };
  this.categories.push(category);
  return category;
};

/**
 * Add addon group to restaurant
 */
RestaurantSchema.methods.addAddonGroup = function (groupData) {
  const group = {
    _id: new mongoose.Types.ObjectId(),
    name: groupData.name,
    maxSelection: groupData.maxSelection || 1,
    isRequired: groupData.isRequired || false,
    addons: groupData.addons || [],
  };
  this.addonGroups.push(group);
  return group;
};

/**
 * Get all active offers
 */
RestaurantSchema.methods.getActiveOffers = function () {
  const now = new Date();
  return this.offers.filter((offer) => offer.validUntil > now);
};

/**
 * Record order for metrics
 */
RestaurantSchema.methods.recordOrder = async function () {
  this.totalOrders += 1;
  this.metrics.orderCount30Days += 1;
  await this.save();
};

/**
 * Check if restaurant has item in stock
 */
RestaurantSchema.methods.isItemAvailable = function (itemId) {
  return true; // Will be verified via MenuItem model
};

/**
 * Get restaurant data for public display (exclude sensitive info)
 */
RestaurantSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.adminId;
  delete obj.licenseNumber;
  delete obj.licenseExpiry;
  delete obj.metrics;
  return obj;
};

module.exports = mongoose.model('FoodDeliveryRestaurant', RestaurantSchema);
