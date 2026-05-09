/**
 * Challenge & Quest Model - Phase 9 Feature C
 * Time-based challenges, quests, seasonal events, leaderboards
 */

const mongoose = require('mongoose');

const ChallengeSchema = new mongoose.Schema(
  {
    challengeId: { type: String, unique: true, required: true },

    // Challenge Metadata
    name: { type: String, required: true },
    description: String,
    category: {
      type: String,
      enum: [
        'ordering',
        'spending',
        'exploration',
        'review',
        'referral',
        'community',
        'seasonal',
        'special_event',
      ],
    },

    // Challenge Type & Duration
    type: { type: String, enum: ['daily', 'weekly', 'monthly', 'seasonal', 'special_event'] },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },

    // Challenge Objective
    objective: String,
    instructions: String,
    requirements: {
      targetType: {
        type: String,
        enum: ['orders', 'spending', 'reviews', 'referrals', 'restaurants', 'cuisines', 'items'],
      },
      targetValue: Number,
      minOrderValue: Number,
      maxOrderValue: Number,
      specificRestaurants: [mongoose.Schema.Types.ObjectId],
      specificCuisines: [String],
      dayOfWeek: [String], // Mon, Tue, etc.
      timeWindow: {
        startTime: String, // HH:MM
        endTime: String, // HH:MM
      },
    },

    // Rewards & Incentives
    rewards: {
      completionReward: {
        type: String,
        enum: ['points', 'badge', 'discount_code', 'tier_upgrade', 'custom_item'],
      },
      rewardValue: Number,
      rewardDescription: String,
      bonusMultiplier: { type: Number, default: 1 },
    },

    // Tier-Based Rewards (higher achievement = bigger reward)
    tierRewards: [
      {
        tier: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'] },
        completionPercentage: Number, // 25, 50, 75, 100
        reward: {
          type: String,
          enum: ['points', 'badge', 'discount_code', 'free_item'],
        },
        rewardValue: Number,
      },
    ],

    // Leaderboard
    leaderboard: {
      enabled: { type: Boolean, default: true },
      scope: { type: String, enum: ['global', 'city', 'restaurant', 'friend_group'], default: 'global' },
      maxDisplayRank: { type: Number, default: 100 },
      rankings: [
        {
          rank: Number,
          userId: mongoose.Schema.Types.ObjectId,
          username: String,
          score: Number,
          progress: Number,
          lastUpdateTime: Date,
          badge: String,
        },
      ],
      leaderboardUpdatedAt: Date,
    },

    // Participation Tracking
    participants: {
      totalEnrolled: { type: Number, default: 0 },
      totalCompleted: { type: Number, default: 0 },
      completionRate: { type: Number, min: 0, max: 100, default: 0 },
      abandonmentRate: { type: Number, min: 0, max: 100, default: 0 },
      averageProgress: { type: Number, min: 0, max: 100, default: 0 },
    },

    // Individual Progress
    participantProgress: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        enrolledAt: Date,
        progress: { type: Number, min: 0, max: 100, default: 0 },
        currentScore: { type: Number, default: 0 },
        completedAt: Date,
        rewardClaimed: { type: Boolean, default: false },
        rewardClaimedAt: Date,
        earlyCompletion: Boolean, // completed before end date
        status: { type: String, enum: ['active', 'completed', 'abandoned', 'failed'], default: 'active' },
      },
    ],

    // Bonus Mechanics
    bonusMechanics: {
      earlyBirdBonus: {
        enabled: Boolean,
        bonusMultiplier: Number,
        cutoffDate: Date,
      },
      speedBonus: {
        enabled: Boolean,
        targetCompletionDays: Number,
        bonusPercentage: Number,
      },
      streakBonus: {
        enabled: Boolean,
        requiredConsecutiveCompletions: Number,
        bonusPoints: Number,
      },
      teamBonus: {
        enabled: Boolean,
        minTeamSize: Number,
        teamBonusMultiplier: Number,
      },
    },

    // Social Features
    social: {
      sharingEnabled: { type: Boolean, default: true },
      shareReward: Number,
      socialChallenge: Boolean, // invite friends to challenge
      friendInviteReward: Number,
      leaderboardVisibility: { type: String, enum: ['public', 'private', 'friends_only'], default: 'public' },
    },

    // Analytics & Tracking
    analytics: {
      viewCount: { type: Number, default: 0 },
      enrollmentRate: { type: Number, min: 0, max: 100, default: 0 },
      avgTimeToComplete: Number, // minutes
      successMetrics: {
        metricsType: [String],
        values: [Number],
      },
    },

    // Sponsored Challenges
    sponsorship: {
      isSponsoredByRestaurant: { type: Boolean, default: false },
      sponsorRestaurantId: mongoose.Schema.Types.ObjectId,
      sponsorName: String,
      sponsoredBudget: Number,
      sponsorRewardPercentage: Number,
    },

    // Challenge Status & Management
    status: { type: String, enum: ['draft', 'scheduled', 'active', 'paused', 'ended', 'archived'], default: 'draft' },
    visibility: { type: String, enum: ['public', 'private', 'invitation_only'], default: 'public' },
    featured: { type: Boolean, default: false },
    featuredUntil: Date,

    // Difficulty Level
    difficultyLevel: { type: String, enum: ['easy', 'medium', 'hard', 'extreme'], default: 'medium' },
    estimatedCompletionTime: Number, // hours

    // Notifications
    notificationTemplate: {
      enrollmentMessage: String,
      reminderMessage: String,
      completionMessage: String,
    },
  },
  { timestamps: true, collection: 'challenges' }
);

// Indexes
ChallengeSchema.index({ startDate: 1, endDate: 1, isActive: 1 });
ChallengeSchema.index({ type: 1, status: 1 });
ChallengeSchema.index({ 'leaderboard.rankings': 1 });
ChallengeSchema.index({ category: 1, status: 1 });

// Instance Methods
ChallengeSchema.methods.enrollUser = function (userId) {
  if (!this.participantProgress.find((p) => p.userId === userId)) {
    this.participantProgress.push({
      userId,
      enrolledAt: new Date(),
    });
    this.participants.totalEnrolled += 1;
  }
  return this.save();
};

ChallengeSchema.methods.updateUserProgress = function (userId, progressUpdate) {
  const participant = this.participantProgress.find((p) => p.userId.toString() === userId.toString());
  if (participant) {
    participant.progress = Math.min(100, progressUpdate);
    if (participant.progress === 100 && !participant.completedAt) {
      participant.completedAt = new Date();
      participant.status = 'completed';
      this.participants.totalCompleted += 1;
    }
  }
  return this.save();
};

ChallengeSchema.methods.updateLeaderboard = function () {
  this.leaderboard.rankings = this.participantProgress
    .sort((a, b) => b.currentScore - a.currentScore || b.progress - a.progress)
    .slice(0, this.leaderboard.maxDisplayRank)
    .map((p, idx) => ({
      rank: idx + 1,
      userId: p.userId,
      score: p.currentScore,
      progress: p.progress,
    }));
  this.leaderboard.leaderboardUpdatedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Challenge', ChallengeSchema);
