/**
 * User Badge & Achievements Model - Phase 9 Feature C
 * Gamification: badges, achievements, unlocked rewards
 */

const mongoose = require('mongoose');

const UserBadgeSchema = new mongoose.Schema(
  {
    badgeId: { type: String, unique: true, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Badge Definitions
    badges: [
      {
        badgeType: {
          type: String,
          enum: [
            'first_order',
            'loyal_customer',
            'food_critic',
            'speed_seeker',
            'explorer',
            'health_conscious',
            'social_butterfly',
            'collector',
            'milestone_10',
            'milestone_50',
            'milestone_100',
            'referrer',
            'reviewer',
            'sustainable_eater',
            'night_owl',
            'early_bird',
            'weekend_warrior',
            'vip_member',
            'foodie',
            'deal_hunter',
          ],
        },
        name: String,
        description: String,
        icon: String, // URL to badge icon
        color: String,
        unlockedAt: Date,
        progress: { type: Number, min: 0, max: 100 }, // % progress to unlock (0-100)
        nextMilestone: {
          requirement: String,
          currentValue: Number,
          targetValue: Number,
        },
        rarity: { type: String, enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'] },
        displayOnProfile: { type: Boolean, default: true },
      },
    ],

    // Achievement Tracking
    achievements: [
      {
        achievementId: String,
        achievementType: {
          type: String,
          enum: [
            'order_quantity',
            'spend_amount',
            'rating_given',
            'review_written',
            'friends_referred',
            'consecutive_days',
            'cuisines_tried',
            'restaurants_visited',
            'items_tasted',
            'promotion_used',
            'loyalty_tier',
            'delivery_feedback',
            'quality_score',
          ],
        },
        title: String,
        description: String,
        unlockCondition: String,
        unlockedAt: Date,
        reward: {
          type: { type: String, enum: ['points', 'discount', 'item', 'tier_upgrade'] },
          value: Number,
          redeemed: Boolean,
        },
        shareScore: { type: Number, default: 0 }, // how many times shared
      },
    ],

    // Streaks & Consistency
    streaks: {
      orderingStreak: {
        currentStreak: { type: Number, default: 0 }, // consecutive days
        longestStreak: { type: Number, default: 0 },
        lastOrderDate: Date,
      },
      reviewingStreak: {
        currentStreak: { type: Number, default: 0 },
        longestStreak: { type: Number, default: 0 },
        lastReviewDate: Date,
      },
      referralStreak: {
        currentStreak: { type: Number, default: 0 },
        longestStreak: { type: Number, default: 0 },
        lastReferralDate: Date,
      },
    },

    // Collections (Badges user is collecting towards)
    collections: [
      {
        collectionName: String,
        description: String,
        badgesInCollection: [String], // badge types
        collected: { type: Number, default: 0 },
        total: Number,
        completedAt: Date,
        reward: {
          type: String,
          rewardDescription: String,
          value: Number,
        },
      },
    ],

    // Leaderboard Position
    leaderboardPositions: {
      totalOrdersRank: Number,
      spendingRank: Number,
      reviewsRank: Number,
      referralsRank: Number,
      pointsRank: Number,
      globalRank: Number,
      cityRank: Number,
    },

    // Gamification Scores
    gamificationScores: {
      engagementScore: { type: Number, min: 0, max: 100, default: 0 },
      loyaltyScore: { type: Number, min: 0, max: 100, default: 0 },
      communityScore: { type: Number, min: 0, max: 100, default: 0 }, // reviews, referrals
      explorationScore: { type: Number, min: 0, max: 100, default: 0 }, // trying new places
      overallGameScore: { type: Number, min: 0, max: 100, default: 0 },
    },

    // Level System
    level: {
      currentLevel: { type: Number, default: 1, min: 1, max: 50 },
      experience: { type: Number, default: 0 },
      experienceToNextLevel: Number,
      levelName: String, // Bronze, Silver, Gold, Platinum, Diamond, Legend, etc.
      achievedAt: Date,
    },

    // Daily/Weekly Challenges
    activeChallenges: [
      {
        challengeId: String,
        challengeType: {
          type: String,
          enum: ['daily', 'weekly', 'seasonal'],
        },
        title: String,
        description: String,
        objective: String,
        progress: { type: Number, default: 0 },
        target: Number,
        startDate: Date,
        endDate: Date,
        reward: {
          type: { type: String, enum: ['points', 'badge', 'discount'] },
          value: Number,
        },
        completed: { type: Boolean, default: false },
        completedAt: Date,
      },
    ],

    // Notification Preferences
    notificationPreferences: {
      notifyBadgeUnlock: { type: Boolean, default: true },
      notifyStreakMilestone: { type: Boolean, default: true },
      notifyLeaderboardChange: { type: Boolean, default: false },
      notifyNewChallenge: { type: Boolean, default: true },
      notifyCollectionProgress: { type: Boolean, default: true },
    },

    // History
    badgeHistory: [
      {
        action: { type: String, enum: ['unlocked', 'shared', 'archived'] },
        badgeType: String,
        timestamp: Date,
      },
    ],

    status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active' },
  },
  { timestamps: true, collection: 'userbadges' }
);

// Indexes
UserBadgeSchema.index({ userId: 1 });
UserBadgeSchema.index({ 'badges.unlockedAt': -1 });
UserBadgeSchema.index({ 'leaderboardPositions.globalRank': 1 });
UserBadgeSchema.index({ 'level.currentLevel': -1 });

// Instance Methods
UserBadgeSchema.methods.unlockBadge = function (badgeType, rarity = 'common') {
  const existingBadge = this.badges.find((b) => b.badgeType === badgeType);
  if (!existingBadge) {
    this.badges.push({
      badgeType,
      name: badgeType.replace(/_/g, ' ').toUpperCase(),
      unlockedAt: new Date(),
      rarity,
      progress: 100,
    });

    this.badgeHistory.push({
      action: 'unlocked',
      badgeType,
      timestamp: new Date(),
    });
  }
  return this.save();
};

UserBadgeSchema.methods.updateStreak = function (streakType) {
  const streak = this.streaks[streakType];
  if (streak) {
    const today = new Date();
    const lastDate = streakType === 'orderingStreak' ? streak.lastOrderDate : streak.lastReviewDate;

    if (lastDate) {
      const daysDiff = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
      if (daysDiff === 1) {
        streak.currentStreak += 1;
      } else if (daysDiff > 1) {
        streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
        streak.currentStreak = 1;
      }
    } else {
      streak.currentStreak = 1;
    }

    if (streakType === 'orderingStreak') streak.lastOrderDate = today;
    else if (streakType === 'reviewingStreak') streak.lastReviewDate = today;
    else if (streakType === 'referralStreak') streak.lastReferralDate = today;
  }
  return this.save();
};

UserBadgeSchema.methods.addExperience = function (amount) {
  this.level.experience += amount;
  this.gamificationScores.engagementScore = Math.min(100, this.level.experience / 10);
  return this.save();
};

module.exports = mongoose.model('UserBadge', UserBadgeSchema);
