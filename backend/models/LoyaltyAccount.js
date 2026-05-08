/**
 * LoyaltyAccount Schema
 * User loyalty points, tiers, rewards, and membership
 * Tracks loyalty program participation and benefits
 */

const mongoose = require('mongoose');

const loyaltyAccountSchema = new mongoose.Schema(
  {
    loyaltyAccountId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    points: {
      currentBalance: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalEarned: {
        type: Number,
        default: 0,
      },
      totalRedeemed: {
        type: Number,
        default: 0,
      },
      expiringPoints: [
        {
          amount: Number,
          expiryDate: Date,
        },
      ],
    },

    tier: {
      currentTier: {
        type: String,
        enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
        default: 'bronze',
        index: true,
      },
      tierLevel: {
        type: Number,
        default: 1,
        min: 1,
        max: 5,
      },
      pointsToNextTier: Number,
      achievedAt: Date,
      benefits: {
        pointsMultiplier: {
          type: Number,
          default: 1,
        },
        cashbackPercentage: {
          type: Number,
          default: 0,
          min: 0,
          max: 10,
        },
        freeDeliveryPerMonth: Number,
        prioritySupport: Boolean,
        exclusiveOffers: [String],
      },
    },

    transactions: [
      {
        transactionId: String,
        type: {
          type: String,
          enum: ['earn', 'redeem', 'expire', 'bonus', 'adjustment'],
        },
        amount: Number,
        source: String,
        orderId: mongoose.Schema.Types.ObjectId,
        description: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    rewards: {
      available: [
        {
          rewardId: String,
          name: String,
          pointsCost: Number,
          description: String,
          expiryDate: Date,
          category: String,
        },
      ],
      redeemed: [
        {
          rewardId: String,
          name: String,
          pointsUsed: Number,
          redeemedAt: Date,
          expiryDate: Date,
          usedAt: Date,
        },
      ],
    },

    earningRules: {
      pointsPerRupee: {
        type: Number,
        default: 1,
      },
      minimumOrderValue: {
        type: Number,
        default: 100,
      },
      categoriesBonusPoints: {
        type: Map,
        of: Number,
        description: 'Extra points for specific restaurant categories',
      },
    },

    membership: {
      status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'cancelled'],
        default: 'active',
        index: true,
      },
      joinedAt: {
        type: Date,
        default: Date.now,
      },
      renewalDate: Date,
      annualFee: {
        type: Number,
        default: 0,
      },
      premiumTierUnlocked: {
        type: Boolean,
        default: false,
      },
    },

    preferences: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      smsNotifications: {
        type: Boolean,
        default: true,
      },
      autoRedeemPoints: {
        type: Boolean,
        default: false,
      },
      minPointsToAutoRedeem: Number,
    },

    stats: {
      totalOrdersPlaced: {
        type: Number,
        default: 0,
      },
      totalSpent: {
        type: Number,
        default: 0,
      },
      averageOrderValue: Number,
      lastOrderDate: Date,
      frequentRestaurantIds: [mongoose.Schema.Types.ObjectId],
    },

    referralCode: String,
    referredUsers: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        joinedAt: Date,
        pointsEarned: Number,
      },
    ],
  },
  {
    timestamps: true,
    collection: 'loyaltyaccounts',
  }
);

// Indexes
loyaltyAccountSchema.index({ userId: 1 });
loyaltyAccountSchema.index({ 'tier.currentTier': 1 });
loyaltyAccountSchema.index({ 'points.currentBalance': -1 });
loyaltyAccountSchema.index({ createdAt: -1 });

// Methods
loyaltyAccountSchema.methods.addPoints = function (amount, source, orderId = null) {
  this.points.currentBalance += amount;
  this.points.totalEarned += amount;

  this.transactions.push({
    transactionId: `txn_${Date.now()}`,
    type: 'earn',
    amount,
    source,
    orderId,
    description: `Earned ${amount} points from ${source}`,
    timestamp: new Date(),
  });

  return this.save();
};

loyaltyAccountSchema.methods.redeemPoints = function (amount, rewardId, rewardName) {
  if (this.points.currentBalance < amount) {
    throw new Error('Insufficient points');
  }

  this.points.currentBalance -= amount;
  this.points.totalRedeemed += amount;

  this.transactions.push({
    transactionId: `txn_${Date.now()}`,
    type: 'redeem',
    amount,
    description: `Redeemed ${amount} points for ${rewardName}`,
    timestamp: new Date(),
  });

  return this.save();
};

loyaltyAccountSchema.methods.upgradeTier = function (newTier) {
  this.tier.currentTier = newTier;
  this.tier.tierLevel = ['bronze', 'silver', 'gold', 'platinum', 'diamond'].indexOf(newTier) + 1;
  this.tier.achievedAt = new Date();
  return this.save();
};

loyaltyAccountSchema.methods.getAvailableRewards = function () {
  return this.rewards.available.filter((r) => new Date() < r.expiryDate);
};

module.exports = mongoose.model('LoyaltyAccount', loyaltyAccountSchema);
