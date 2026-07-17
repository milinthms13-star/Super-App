/**
 * Ecommerce Subscription Plan Model
 * Defines subscription tiers for sellers
 */

const mongoose = require('mongoose');

const EcommerceSubscriptionPlanSchema = new mongoose.Schema(
  {
    planId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      enum: ['Free', 'Basic', 'Premium', 'Enterprise'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: true,
    },
    tagline: {
      type: String,
      default: '',
    },
    
    // Pricing
    pricing: {
      monthly: {
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        currency: {
          type: String,
          default: 'INR',
        },
      },
      quarterly: {
        amount: {
          type: Number,
          min: 0,
        },
        currency: {
          type: String,
          default: 'INR',
        },
        discount: {
          type: Number,
          default: 0,
        },
      },
      yearly: {
        amount: {
          type: Number,
          min: 0,
        },
        currency: {
          type: String,
          default: 'INR',
        },
        discount: {
          type: Number,
          default: 0,
        },
      },
    },
    
    // Features & Limits
    features: {
      productListingLimit: {
        type: Number,
        default: -1, // -1 means unlimited
      },
      imagePerProduct: {
        type: Number,
        default: 5,
      },
      bulkUpload: {
        type: Boolean,
        default: false,
      },
      advancedAnalytics: {
        type: Boolean,
        default: false,
      },
      prioritySupport: {
        type: Boolean,
        default: false,
      },
      customStorefront: {
        type: Boolean,
        default: false,
      },
      promotionalBanner: {
        type: Boolean,
        default: false,
      },
      featuredListing: {
        count: {
          type: Number,
          default: 0,
        },
      },
      apiAccess: {
        type: Boolean,
        default: false,
      },
      multiUserAccess: {
        type: Boolean,
        default: false,
      },
      warehouseManagement: {
        type: Boolean,
        default: false,
      },
      dedicatedAccountManager: {
        type: Boolean,
        default: false,
      },
    },
    
    // Commission Structure
    commission: {
      type: {
        type: String,
        enum: ['percentage', 'flat'],
        default: 'percentage',
      },
      defaultRate: {
        type: Number,
        required: true,
        min: 0,
      },
      minimumAmount: {
        type: Number,
        default: 0,
      },
      categoryRates: [
        {
          category: String,
          rate: Number,
          description: String,
        },
      ],
    },
    
    // Trial Period
    trial: {
      available: {
        type: Boolean,
        default: false,
      },
      durationDays: {
        type: Number,
        default: 0,
      },
    },
    
    // Plan Status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    
    // Display Order
    displayOrder: {
      type: Number,
      default: 0,
    },
    
    // Recommended Badge
    isRecommended: {
      type: Boolean,
      default: false,
    },
    
    // Terms & Conditions
    termsAndConditions: {
      type: String,
      default: '',
    },
    
    // Benefits List for Display
    benefits: [
      {
        title: String,
        description: String,
        icon: String,
      },
    ],
    
    // Restrictions
    restrictions: {
      categoriesAllowed: {
        type: [String],
        default: [],
      },
      categoriesRestricted: {
        type: [String],
        default: [],
      },
      maxOrderValue: Number,
      maxMonthlyOrders: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
EcommerceSubscriptionPlanSchema.index({ slug: 1 });
EcommerceSubscriptionPlanSchema.index({ isActive: 1, displayOrder: 1 });

// Methods
EcommerceSubscriptionPlanSchema.methods.getPrice = function (duration = 'monthly') {
  return this.pricing[duration]?.amount || 0;
};

EcommerceSubscriptionPlanSchema.methods.getDiscountedPrice = function (duration = 'monthly') {
  const pricing = this.pricing[duration];
  if (!pricing) return 0;
  
  const baseAmount = pricing.amount;
  const discount = pricing.discount || 0;
  
  return baseAmount - (baseAmount * discount) / 100;
};

EcommerceSubscriptionPlanSchema.methods.isFree = function () {
  return this.slug === 'free' || this.pricing.monthly.amount === 0;
};

EcommerceSubscriptionPlanSchema.methods.canAccessFeature = function (featureName) {
  return this.features[featureName] === true;
};

EcommerceSubscriptionPlanSchema.methods.getProductLimit = function () {
  return this.features.productListingLimit;
};

EcommerceSubscriptionPlanSchema.methods.getCommissionRate = function (category) {
  if (this.commission.categoryRates?.length > 0) {
    const categoryRate = this.commission.categoryRates.find(
      (r) => r.category === category
    );
    if (categoryRate) return categoryRate.rate;
  }
  return this.commission.defaultRate;
};

// Static methods
EcommerceSubscriptionPlanSchema.statics.getActivePlans = function () {
  return this.find({ isActive: true, isPublic: true }).sort({ displayOrder: 1 });
};

EcommerceSubscriptionPlanSchema.statics.getFreePlan = function () {
  return this.findOne({ slug: 'free', isActive: true });
};

EcommerceSubscriptionPlanSchema.statics.getPlanBySlug = function (slug) {
  return this.findOne({ slug, isActive: true });
};

module.exports = mongoose.model('EcommerceSubscriptionPlan', EcommerceSubscriptionPlanSchema);
