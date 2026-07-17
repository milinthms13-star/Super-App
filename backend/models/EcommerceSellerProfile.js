/**
 * Ecommerce Seller Profile Model
 * Professional seller account with subscription management
 */

const mongoose = require('mongoose');

const SellerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sellerEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    businessType: {
      type: String,
      enum: ['individual', 'sole_proprietor', 'partnership', 'llp', 'private_limited', 'public_limited'],
      required: true,
    },
    storeName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    storeSlug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
    },
    storeDescription: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    storeLogo: {
      type: String,
      default: '',
    },
    storeBanner: {
      type: String,
      default: '',
    },
    
    // Contact Information
    contactPerson: {
      name: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      alternatePhone: String,
    },
    
    // Business Address
    businessAddress: {
      street: String,
      city: String,
      state: String,
      country: {
        type: String,
        default: 'India',
      },
      postalCode: String,
      landmark: String,
    },
    
    // Tax & Legal Information
    taxInfo: {
      gstNumber: String,
      panNumber: String,
      gstCertificate: String,
      panCard: String,
      verified: {
        type: Boolean,
        default: false,
      },
      verifiedAt: Date,
    },
    
    // Bank Details
    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      branchName: String,
      accountType: {
        type: String,
        enum: ['savings', 'current'],
      },
      verified: {
        type: Boolean,
        default: false,
      },
      verifiedAt: Date,
    },
    
    // Subscription Plan
    subscription: {
      plan: {
        type: String,
        enum: ['free', 'basic', 'premium', 'enterprise'],
        default: 'free',
        index: true,
      },
      startDate: Date,
      endDate: Date,
      status: {
        type: String,
        enum: ['active', 'expired', 'cancelled', 'trial'],
        default: 'trial',
        index: true,
      },
      autoRenew: {
        type: Boolean,
        default: true,
      },
      paymentHistory: [
        {
          amount: Number,
          currency: {
            type: String,
            default: 'INR',
          },
          paymentDate: Date,
          paymentMethod: String,
          transactionId: String,
          planDuration: String, // 'monthly', 'quarterly', 'yearly'
          status: String,
        },
      ],
      trialEndsAt: Date,
    },
    
    // Commission Configuration
    commissionConfig: {
      type: {
        type: String,
        enum: ['percentage', 'flat', 'tiered'],
        default: 'percentage',
      },
      rate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      flatAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
      categoryWiseRates: [
        {
          category: String,
          rate: Number,
          flatAmount: Number,
        },
      ],
      minimumCommission: {
        type: Number,
        default: 0,
      },
      maximumCommission: Number,
    },
    
    // Performance Metrics
    metrics: {
      totalProducts: {
        type: Number,
        default: 0,
      },
      activeProducts: {
        type: Number,
        default: 0,
      },
      totalOrders: {
        type: Number,
        default: 0,
      },
      completedOrders: {
        type: Number,
        default: 0,
      },
      totalRevenue: {
        type: Number,
        default: 0,
      },
      totalCommissionPaid: {
        type: Number,
        default: 0,
      },
      averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      totalReviews: {
        type: Number,
        default: 0,
      },
      responseRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      fulfillmentRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      lastMonthRevenue: {
        type: Number,
        default: 0,
      },
      currentMonthRevenue: {
        type: Number,
        default: 0,
      },
    },
    
    // Verification Status
    verification: {
      status: {
        type: String,
        enum: ['pending', 'in_review', 'verified', 'rejected'],
        default: 'pending',
        index: true,
      },
      kycStatus: {
        type: String,
        enum: ['not_submitted', 'pending', 'verified', 'rejected'],
        default: 'not_submitted',
      },
      documentsSubmitted: {
        type: Boolean,
        default: false,
      },
      bankVerified: {
        type: Boolean,
        default: false,
      },
      addressVerified: {
        type: Boolean,
        default: false,
      },
      verifiedAt: Date,
      verifiedBy: String,
      rejectionReason: String,
      notes: String,
    },
    
    // Categories Seller Deals In
    categories: [
      {
        type: String,
        trim: true,
      },
    ],
    
    // Operational Settings
    settings: {
      autoApproveOrders: {
        type: Boolean,
        default: true,
      },
      defaultProcessingDays: {
        type: Number,
        default: 2,
      },
      returnAccepted: {
        type: Boolean,
        default: true,
      },
      defaultReturnWindow: {
        type: Number,
        default: 7,
      },
      holidayMode: {
        enabled: {
          type: Boolean,
          default: false,
        },
        startDate: Date,
        endDate: Date,
        message: String,
      },
      notificationPreferences: {
        email: {
          type: Boolean,
          default: true,
        },
        sms: {
          type: Boolean,
          default: false,
        },
        push: {
          type: Boolean,
          default: true,
        },
      },
    },
    
    // Account Status
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'deactivated', 'banned'],
      default: 'active',
      index: true,
    },
    suspensionReason: String,
    suspendedAt: Date,
    suspendedBy: String,
    
    // Featured Seller Badge
    featuredSeller: {
      type: Boolean,
      default: false,
    },
    featuredUntil: Date,
    
    // Timestamps
    onboardedAt: {
      type: Date,
      default: Date.now,
    },
    lastActiveAt: Date,
    
    // Agreement & Terms
    agreementAccepted: {
      type: Boolean,
      default: false,
    },
    agreementAcceptedAt: Date,
    agreementVersion: String,
    
    // Product Templates
    productTemplates: [
      {
        name: {
          type: String,
          required: true,
        },
        data: {
          type: mongoose.Schema.Types.Mixed,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
SellerProfileSchema.index({ 'subscription.plan': 1, 'subscription.status': 1 });
SellerProfileSchema.index({ 'verification.status': 1 });
SellerProfileSchema.index({ accountStatus: 1, createdAt: -1 });
SellerProfileSchema.index({ storeSlug: 1 });
SellerProfileSchema.index({ 'metrics.totalRevenue': -1 });

// Virtual for subscription status check
SellerProfileSchema.virtual('hasActiveSubscription').get(function () {
  return (
    this.subscription.status === 'active' &&
    this.subscription.endDate &&
    new Date(this.subscription.endDate) > new Date()
  );
});

// Methods
SellerProfileSchema.methods.canListProducts = function () {
  return (
    this.verification.status === 'verified' &&
    this.accountStatus === 'active' &&
    (this.hasActiveSubscription || this.subscription.plan === 'free')
  );
};

SellerProfileSchema.methods.getProductLimit = function () {
  const limits = {
    free: 10,
    basic: 100,
    premium: 1000,
    enterprise: -1, // unlimited
  };
  return limits[this.subscription.plan] || 10;
};

SellerProfileSchema.methods.getCommissionRate = function (category, orderAmount) {
  // Check for category-specific rate
  if (this.commissionConfig.categoryWiseRates?.length > 0) {
    const categoryRate = this.commissionConfig.categoryWiseRates.find(
      (r) => r.category === category
    );
    if (categoryRate) {
      if (this.commissionConfig.type === 'flat') {
        return categoryRate.flatAmount || this.commissionConfig.flatAmount;
      }
      return categoryRate.rate || this.commissionConfig.rate;
    }
  }
  
  // Default subscription-based rates
  const defaultRates = {
    free: 15, // 15% commission
    basic: 10, // 10% commission
    premium: 5, // 5% commission
    enterprise: 3, // 3% commission
  };
  
  if (this.commissionConfig.type === 'flat') {
    return this.commissionConfig.flatAmount || 0;
  }
  
  return this.commissionConfig.rate || defaultRates[this.subscription.plan] || 15;
};

SellerProfileSchema.methods.calculateCommission = function (orderAmount, category) {
  let commission = 0;
  
  if (this.commissionConfig.type === 'flat') {
    commission = this.getCommissionRate(category, orderAmount);
  } else {
    const rate = this.getCommissionRate(category, orderAmount);
    commission = (orderAmount * rate) / 100;
  }
  
  // Apply min/max limits
  if (this.commissionConfig.minimumCommission && commission < this.commissionConfig.minimumCommission) {
    commission = this.commissionConfig.minimumCommission;
  }
  
  if (this.commissionConfig.maximumCommission && commission > this.commissionConfig.maximumCommission) {
    commission = this.commissionConfig.maximumCommission;
  }
  
  return Math.round(commission * 100) / 100;
};

SellerProfileSchema.methods.isInHolidayMode = function () {
  if (!this.settings.holidayMode.enabled) return false;
  
  const now = new Date();
  const start = this.settings.holidayMode.startDate;
  const end = this.settings.holidayMode.endDate;
  
  return start && end && now >= start && now <= end;
};

SellerProfileSchema.methods.updateMetrics = function (updates) {
  Object.keys(updates).forEach((key) => {
    if (this.metrics[key] !== undefined) {
      this.metrics[key] = updates[key];
    }
  });
};

// Pre-save hook to generate store slug
SellerProfileSchema.pre('save', function (next) {
  if (this.isModified('storeName') && !this.storeSlug) {
    this.storeSlug = this.storeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

module.exports = mongoose.model('EcommerceSellerProfile', SellerProfileSchema);
