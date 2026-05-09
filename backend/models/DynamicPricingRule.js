/**
 * Dynamic Pricing Rule Model - Phase 9 Feature D
 * Surge pricing, personalized pricing, time-based pricing
 */

const mongoose = require('mongoose');

const DynamicPricingRuleSchema = new mongoose.Schema(
  {
    pricingRuleId: { type: String, unique: true, required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },

    // Rule Metadata
    ruleName: String,
    description: String,
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 }, // higher = applied first
    applicability: {
      appliedToAll: { type: Boolean, default: false },
      menuItems: [mongoose.Schema.Types.ObjectId],
      categories: [String],
      cuisines: [String],
    },

    // Pricing Strategy Type
    strategyType: {
      type: String,
      enum: ['surge_pricing', 'personalized', 'time_based', 'demand_based', 'competitor_based', 'user_segment'],
    },

    // Surge Pricing
    surgePricing: {
      enabled: Boolean,
      demandThreshold: Number, // orders per minute above which surge activates
      surgeLevels: [
        {
          levelName: String,
          minOrders: Number,
          maxOrders: Number,
          priceMultiplier: Number,
          minPrice: Number,
          maxPrice: Number,
        },
      ],
      cooldownPeriod: Number, // minutes to wait before deactivating surge
    },

    // Time-Based Pricing
    timeBasedPricing: {
      enabled: Boolean,
      timeSlots: [
        {
          slotName: String,
          startTime: String, // HH:MM
          endTime: String, // HH:MM
          daysOfWeek: [String], // Mon, Tue, etc.
          priceModifier: {
            type: { type: String, enum: ['multiplier', 'fixed_discount', 'percentage_discount'] },
            value: Number,
          },
        },
      ],
    },

    // Personalized Pricing
    personalizedPricing: {
      enabled: Boolean,
      userSegments: [
        {
          segmentName: String,
          criteria: {
            loyaltyTier: [String],
            totalOrdersRange: { min: Number, max: Number },
            avgOrderValue: { min: Number, max: Number },
            lastOrderDaysAgo: Number,
            referredStatus: Boolean,
          },
          priceModifier: {
            type: { type: String, enum: ['multiplier', 'fixed_discount', 'percentage_discount'] },
            value: Number,
          },
          capDiscount: Number, // max discount percentage
        },
      ],
    },

    // Demand-Based Pricing
    demandBasedPricing: {
      enabled: Boolean,
      demandMetrics: {
        orderFrequency: Number, // orders per hour
        averageItemPrice: Number,
        inventoryLevel: { type: String, enum: ['low', 'medium', 'high'] },
      },
      demandTiers: [
        {
          tier: String,
          minOrdersPerHour: Number,
          maxOrdersPerHour: Number,
          priceModifier: Number,
        },
      ],
    },

    // Competitor-Based Pricing
    competitorPricing: {
      enabled: Boolean,
      monitoredCompetitors: [
        {
          competitorId: String,
          competitorName: String,
          itemId: String,
          competitorPrice: Number,
          lastUpdated: Date,
          ourPrice: Number,
          priceDifference: Number,
          undercut: Boolean,
        },
      ],
      strategyRule: {
        matchCompetitorPrice: Boolean,
        undercut: Boolean,
        undercutPercentage: Number,
        premium: Boolean,
        premiumPercentage: Number,
      },
      refreshFrequency: Number, // minutes between price updates
    },

    // Minimum & Maximum Prices
    priceConstraints: {
      basePrice: Number,
      minimumPrice: Number,
      maximumPrice: Number,
      minimumMarginPercentage: Number,
    },

    // Effective Date Range
    effectiveFrom: { type: Date, required: true },
    effectiveTo: Date,
    timezone: { type: String, default: 'Asia/Kolkata' },

    // Testing & Rollout
    isTest: { type: Boolean, default: false },
    testPercentageOfUsers: { type: Number, min: 0, max: 100, default: 100 },
    rolloutPhase: { type: String, enum: ['planning', 'testing', 'gradual', 'full'], default: 'full' },
    rolloutPercentage: { type: Number, default: 100 },

    // Analytics & Performance
    analytics: {
      impressions: { type: Number, default: 0 },
      orders: { type: Number, default: 0 },
      conversionRate: Number,
      revenueImpact: Number,
      profitMarginImpact: Number,
      userAcceptanceRate: Number,
      complaintCount: { type: Number, default: 0 },
    },

    // Compliance & Governance
    compliance: {
      antiDumpingCompliant: { type: Boolean, default: true },
      fairPricingCompliant: { type: Boolean, default: true },
      regulatoryApproved: { type: Boolean, default: true },
      approvalDate: Date,
      reviewedBy: String,
    },

    // Audit Trail
    auditLog: [
      {
        action: String,
        changedBy: String,
        changedAt: Date,
        previousValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
      },
    ],

    status: { type: String, enum: ['draft', 'scheduled', 'active', 'paused', 'ended'], default: 'draft' },
  },
  { timestamps: true, collection: 'dynamicpricingrules' }
);

// Indexes
DynamicPricingRuleSchema.index({ restaurantId: 1, isActive: 1 });
DynamicPricingRuleSchema.index({ strategyType: 1, priority: -1 });
DynamicPricingRuleSchema.index({ effectiveFrom: 1, effectiveTo: 1 });
DynamicPricingRuleSchema.index({ status: 1 });

// Instance Methods
DynamicPricingRuleSchema.methods.calculatePriceModifier = function (orderData) {
  let finalModifier = 1;

  if (this.surgePricing && this.surgePricing.enabled) {
    const surgeLevel = this.surgePricing.surgeLevels.find(
      (sl) => orderData.currentOrders >= sl.minOrders && orderData.currentOrders <= sl.maxOrders
    );
    if (surgeLevel) finalModifier *= surgeLevel.priceMultiplier;
  }

  if (this.timeBasedPricing && this.timeBasedPricing.enabled) {
    const currentSlot = this.timeBasedPricing.timeSlots.find((ts) => {
      const now = new Date();
      const dayName = now.toLocaleDateString('en-US', { weekday: 'short' });
      return ts.daysOfWeek.includes(dayName);
    });
    if (currentSlot && currentSlot.priceModifier) {
      finalModifier *= currentSlot.priceModifier.value;
    }
  }

  return finalModifier;
};

module.exports = mongoose.model('DynamicPricingRule', DynamicPricingRuleSchema);
