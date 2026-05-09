/**
 * Promotion & Discount Model - Phase 9 Feature D
 * Coupons, promo codes, time-limited offers, seasonal discounts
 */

const mongoose = require('mongoose');

const PromotionSchema = new mongoose.Schema(
  {
    promotionId: { type: String, unique: true, required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },

    // Promotion Metadata
    promotionName: { type: String, required: true },
    description: String,
    promotionType: {
      type: String,
      enum: ['coupon_code', 'flat_discount', 'percentage_discount', 'free_item', 'buy_one_get_one', 'free_delivery', 'seasonal', 'loyalty_reward'],
      required: true,
    },
    category: { type: String, enum: ['flash_sale', 'seasonal', 'loyalty', 'referral', 'first_time', 'retention', 'bulk_order', 'midnight', 'bundle'] },

    // Coupon Code (if applicable)
    couponCode: {
      code: String,
      isUnique: Boolean,
      usageLimit: Number,
      usedCount: { type: Number, default: 0 },
      perUserLimit: { type: Number, default: 1 },
      codeStatus: { type: String, enum: ['active', 'paused', 'exhausted', 'expired'], default: 'active' },
    },

    // Discount Details
    discount: {
      discountType: {
        type: String,
        enum: ['percentage', 'flat_amount', 'buy_x_get_y', 'free_item', 'free_delivery'],
      },
      discountValue: Number, // % or amount
      discountCap: Number, // max discount allowed
      minOrderValue: Number,
      maxDiscountAmount: Number,
    },

    // Applicable Items
    applicability: {
      appliedToAll: { type: Boolean, default: false },
      menuItems: [mongoose.Schema.Types.ObjectId],
      categories: [String],
      cuisines: [String],
      excludedItems: [mongoose.Schema.Types.ObjectId],
      requiresMinQuantity: Number,
    },

    // Target Audience Segmentation
    targetAudience: {
      allUsers: { type: Boolean, default: true },
      loyaltyTiers: [String], // bronze, silver, gold, etc.
      userSegments: [String], // new, returning, high_spend, etc.
      specificUserIds: [mongoose.Schema.Types.ObjectId],
      geoLocation: {
        appliedToAreas: [String],
        geofenceCoordinates: {
          type: { type: String, default: 'Polygon' },
          coordinates: [[[Number]]], // [[[long, lat], ...]]
        },
      },
      excludedUsers: [mongoose.Schema.Types.ObjectId],
    },

    // Promotion Duration
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    timeBasedRules: {
      applicableOn: [String], // days of week
      startTime: String, // HH:MM
      endTime: String, // HH:MM
    },
    isRecurring: Boolean,
    recurringSchedule: {
      frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
      daysOfWeek: [String],
    },

    // Redemption Rules
    redemptionRules: {
      minimumOrderValue: Number,
      maximumOrderValue: Number,
      applicableDeliveryModes: [String], // delivery, pickup, dine_in
      stackableWithOtherPromos: { type: Boolean, default: false },
      excludedRestaurants: [mongoose.Schema.Types.ObjectId],
    },

    // Performance Metrics
    metrics: {
      totalRedemptions: { type: Number, default: 0 },
      uniqueUsers: { type: Number, default: 0 },
      conversionRate: Number,
      averageOrderValue: Number,
      totalDiscountGiven: { type: Number, default: 0 },
      totalRevenueGenerated: { type: Number, default: 0 },
      roi: Number,
      views: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
    },

    // Redemption History
    redemptionHistory: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        orderId: mongoose.Schema.Types.ObjectId,
        redeemedAt: Date,
        discountAmount: Number,
        orderValue: Number,
        finalAmount: Number,
      },
    ],

    // Marketing & Visibility
    marketing: {
      displayBanner: Boolean,
      bannerImage: String,
      isFeatured: Boolean,
      featuredUntil: Date,
      priority: { type: Number, default: 0 },
      visibility: { type: String, enum: ['public', 'email_only', 'app_only', 'logged_in_users'], default: 'public' },
      promotionChannels: [String], // email, push, in_app, sms, social_media
    },

    // Sponsorship & Budget
    sponsorship: {
      isSponsoredPromo: Boolean,
      sponsorName: String,
      sponsorBudget: Number,
      budgetUtilized: Number,
      cpa: Number, // cost per acquisition
      maxCpa: Number,
    },

    // Approval & Compliance
    approvalStatus: { type: String, enum: ['draft', 'pending', 'approved', 'rejected', 'archived'], default: 'draft' },
    approvedBy: String,
    approvedAt: Date,
    complianceNotes: String,
    marketingApproval: Boolean,
    legalApproval: Boolean,

    // A/B Testing
    abTesting: {
      isTestPromo: Boolean,
      testPercentage: Number,
      controlGroupSize: Number,
      testGroupSize: Number,
      variant: String, // A, B, C, etc.
    },

    // Promotional Campaign
    campaignId: mongoose.Schema.Types.ObjectId,
    campaignName: String,
    campaignObjective: String,

    status: { type: String, enum: ['draft', 'scheduled', 'active', 'paused', 'ended', 'archived'], default: 'draft' },
  },
  { timestamps: true, collection: 'promotions' }
);

// Indexes
PromotionSchema.index({ restaurantId: 1, status: 1 });
PromotionSchema.index({ promotionType: 1, startDate: 1, endDate: 1 });
PromotionSchema.index({ 'couponCode.code': 1 });
PromotionSchema.index({ isFeatured: 1, endDate: -1 });
PromotionSchema.index({ status: 1, startDate: 1 });

// Instance Methods
PromotionSchema.methods.isValidForOrder = function (orderData) {
  const now = new Date();
  if (now < this.startDate || now > this.endDate) return false;

  if (this.discount.minOrderValue && orderData.orderValue < this.discount.minOrderValue) return false;

  if (this.couponCode && this.couponCode.usageLimit && this.couponCode.usedCount >= this.couponCode.usageLimit) return false;

  return true;
};

PromotionSchema.methods.calculateDiscount = function (orderValue) {
  let discountAmount = 0;

  if (this.discount.discountType === 'percentage') {
    discountAmount = (orderValue * this.discount.discountValue) / 100;
  } else if (this.discount.discountType === 'flat_amount') {
    discountAmount = this.discount.discountValue;
  }

  if (this.discount.maxDiscountAmount) {
    discountAmount = Math.min(discountAmount, this.discount.maxDiscountAmount);
  }

  if (this.discount.discountCap) {
    discountAmount = Math.min(discountAmount, this.discount.discountCap);
  }

  return discountAmount;
};

PromotionSchema.methods.redeemPromotion = function (userId, orderId, orderValue) {
  this.redemptionHistory.push({
    userId,
    orderId,
    redeemedAt: new Date(),
    orderValue,
  });
  this.metrics.totalRedemptions += 1;
  if (this.couponCode) {
    this.couponCode.usedCount += 1;
  }
  return this.save();
};

module.exports = mongoose.model('Promotion', PromotionSchema);
