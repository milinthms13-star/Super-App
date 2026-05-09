/**
 * SubscriptionPlan.js
 * Membership tiers and subscription management
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SubscriptionPlanSchema = new Schema(
  {
    planName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
      maxlength: 50
    },
    planTier: {
      type: String,
      enum: ['free', 'silver', 'gold', 'platinum', 'vip'],
      required: true,
      index: true
    },
    description: {
      type: String,
      maxlength: 500,
      default: ''
    },
    monthlyPrice: {
      type: Number,
      required: true,
      min: 0
    },
    annualPrice: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    trialDays: {
      type: Number,
      default: 0,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    // Features
    benefits: [
      {
        name: { type: String, required: true },
        description: { type: String, default: '' },
        enabled: { type: Boolean, default: true }
      }
    ],
    // Discounts
    features: {
      freeShipping: { type: Boolean, default: false },
      freeShippingAboveAmount: { type: Number, default: Infinity },
      flatShippingDiscount: { type: Number, default: 0 }, // In percentage
      orderDiscount: { type: Number, default: 0 }, // In percentage
      prioritySupport: { type: Boolean, default: false },
      dedicatedAccountManager: { type: Boolean, default: false },
      exclusiveDeals: { type: Boolean, default: false },
      earlyAccess: { type: Boolean, default: false },
      personalShopper: { type: Boolean, default: false },
      giftWrapping: { type: Boolean, default: false },
      returnsExtension: { type: Number, default: 0 }, // In days
      replacementGuarantee: { type: Boolean, default: false },
      loyaltyPointsMultiplier: { type: Number, default: 1 },
      cumulativeOffers: [String], // Array of offer codes
      categoryExclusions: [String], // Categories not applicable for discount
      minOrderValue: { type: Number, default: 0 }
    },
    // Limits
    limits: {
      ordersPerMonth: { type: Number, default: Infinity },
      maxOrderValue: { type: Number, default: Infinity },
      minOrderValue: { type: Number, default: 0 },
      maxCashback: { type: Number, default: Infinity },
      billableCycles: { type: Number, default: Infinity } // Max billing cycles for plan
    },
    // Cancellation
    cancellationPolicy: {
      cancellableAfterDays: { type: Number, default: 0 },
      refundPercentage: { type: Number, default: 100, min: 0, max: 100 },
      penaltyFee: { type: Number, default: 0 }
    },
    // Support
    support: {
      emailSupport: { type: Boolean, default: true },
      phoneSupport: { type: Boolean, default: false },
      chatSupport: { type: Boolean, default: false },
      supportSLA: { type: String, default: '48h' },
      dedicatedContactEmail: { type: String, default: '' }
    },
    // Metadata
    displayOrder: {
      type: Number,
      default: 0,
      index: true
    },
    icon: String,
    color: String,
    badgeText: String,
    highlights: [String],
    targetAudience: {
      type: String,
      enum: ['all', 'students', 'professionals', 'businesses', 'sellers'],
      default: 'all'
    },
    subscriptionCount: {
      type: Number,
      default: 0
    },
    activeSubscriptions: {
      type: Number,
      default: 0,
      index: true
    },
    cancellationRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    averageRetention: {
      type: Number, // In months
      default: 0
    },
    // Metadata
    metadata: {
      promoted: { type: Boolean, default: false },
      popular: { type: Boolean, default: false },
      recommended: { type: Boolean, default: false },
      tags: [String]
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

// Indexes
SubscriptionPlanSchema.index({ planTier: 1, isActive: 1 });
SubscriptionPlanSchema.index({ displayOrder: 1, isActive: 1 });
SubscriptionPlanSchema.index({ createdAt: -1 });

// Methods
SubscriptionPlanSchema.methods.getMonthlyEquivalent = function () {
  // Calculate monthly cost if annual option is used
  return (this.annualPrice / 12).toFixed(2);
};

SubscriptionPlanSchema.methods.getAnnualSavings = function () {
  const monthlyTotal = this.monthlyPrice * 12;
  const savings = monthlyTotal - this.annualPrice;
  const savingsPercentage = ((savings / monthlyTotal) * 100).toFixed(2);
  return {
    amount: savings,
    percentage: savingsPercentage
  };
};

SubscriptionPlanSchema.methods.calculateDiscount = function (orderAmount) {
  const discountPercentage = this.features.orderDiscount;
  const discount = (orderAmount * discountPercentage) / 100;
  const maxCashback = this.limits.maxCashback;

  return Math.min(discount, maxCashback);
};

SubscriptionPlanSchema.methods.calculateShippingDiscount = function (shippingAmount) {
  const isFreeShipping =
    this.features.freeShipping ||
    (this.features.freeShippingAboveAmount <= Infinity); // Check against order total

  if (isFreeShipping) {
    return shippingAmount;
  }

  const discountPercentage = this.features.flatShippingDiscount;
  return (shippingAmount * discountPercentage) / 100;
};

SubscriptionPlanSchema.methods.isEligibleForOrder = function (orderAmount, orderCount) {
  if (orderAmount < this.limits.minOrderValue) {
    return { eligible: false, reason: 'Order amount too low' };
  }

  if (orderAmount > this.limits.maxOrderValue) {
    return { eligible: false, reason: 'Order amount exceeds limit' };
  }

  if (orderCount > this.limits.ordersPerMonth) {
    return { eligible: false, reason: 'Monthly order limit exceeded' };
  }

  return { eligible: true };
};

SubscriptionPlanSchema.methods.getFeatureSummary = function () {
  const summary = [];

  if (this.features.freeShipping) {
    summary.push('Free shipping on all orders');
  }
  if (this.features.prioritySupport) {
    summary.push('Priority customer support');
  }
  if (this.features.exclusiveDeals) {
    summary.push('Exclusive deals & early access');
  }
  if (this.features.orderDiscount > 0) {
    summary.push(`${this.features.orderDiscount}% discount on orders`);
  }
  if (this.features.loyaltyPointsMultiplier > 1) {
    summary.push(
      `${this.features.loyaltyPointsMultiplier}x loyalty points multiplier`
    );
  }

  return summary;
};

SubscriptionPlanSchema.methods.calculateTotalBenefit = function (orderAmount, ordersPerMonth) {
  let totalBenefit = 0;

  // Shipping benefit
  totalBenefit += this.calculateShippingDiscount(100); // Example: $100 shipping

  // Order discount
  totalBenefit += this.calculateDiscount(orderAmount);

  // Loyalty points benefit (assuming 1 point = ₹1)
  const pointsMultiplier = this.features.loyaltyPointsMultiplier;
  if (pointsMultiplier > 1) {
    const extraPoints = (orderAmount * (pointsMultiplier - 1)) / 100;
    totalBenefit += extraPoints;
  }

  return totalBenefit;
};

// Statics
SubscriptionPlanSchema.statics.getActivePlans = function () {
  return this.find({ isActive: true }).sort({ displayOrder: 1 });
};

SubscriptionPlanSchema.statics.getByTier = function (tier) {
  return this.findOne({ planTier: tier, isActive: true });
};

SubscriptionPlanSchema.statics.getRecommended = function () {
  return this.findOne({ isActive: true, 'metadata.recommended': true });
};

SubscriptionPlanSchema.statics.getPopular = function () {
  return this.find({ isActive: true, 'metadata.popular': true }).sort({
    activeSubscriptions: -1
  });
};

SubscriptionPlanSchema.statics.compareFeatures = function (planIds) {
  return this.find({ _id: { $in: planIds } }).sort({ displayOrder: 1 });
};

module.exports = mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);
