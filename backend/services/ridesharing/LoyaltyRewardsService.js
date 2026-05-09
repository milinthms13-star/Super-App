/**
 * LoyaltyRewardsService.js
 * Phase 14: Loyalty Programs & Gamification
 * 
 * Manages loyalty points, rewards, achievements, and gamification features.
 * All methods are static for stateless, scalable operations.
 */

const User = require('../models/User');
const Ride = require('../models/Ride');
const LoyaltyAccount = require('../models/LoyaltyAccount');
const Achievement = require('../models/Achievement');

class LoyaltyRewardsService {
  /**
   * Get or create loyalty account for user
   */
  static async getLoyaltyAccount(userId) {
    try {
      let account = await LoyaltyAccount.findOne({ userId }).lean();

      if (!account) {
        // Create new loyalty account
        account = await LoyaltyAccount.create({
          userId,
          points: 0,
          totalPointsEarned: 0,
          totalPointsRedeemed: 0,
          tier: 'bronze',
          achievements: [],
          rewards: [],
          createdAt: new Date()
        });
      }

      return {
        success: true,
        message: 'Loyalty account retrieved',
        data: account
      };
    } catch (error) {
      return { success: false, message: error.message, data: null };
    }
  }

  /**
   * Award loyalty points for ride completion
   */
  static async awardRidePoints(rideId) {
    try {
      const ride = await Ride.findById(rideId)
        .select('riderId fare distance duration rating createdAt')
        .lean();

      if (!ride) return { success: false, message: 'Ride not found', data: null };

      // Calculate base points (1 point per ₹10 spent)
      let basePoints = Math.floor(ride.fare / 10);

      // Bonus multipliers
      let multiplier = 1.0;

      // Distance bonus: 1.5x for long rides (>10 km)
      if (ride.distance > 10) multiplier *= 1.5;

      // Rating bonus: 1.2x for 5-star rides
      if (ride.rating === 5) multiplier *= 1.2;

      // Time-of-day bonus: 1.1x for off-peak rides (1 AM - 6 AM)
      const hour = new Date(ride.createdAt).getHours();
      if (hour >= 1 && hour <= 6) multiplier *= 1.1;

      const totalPoints = Math.floor(basePoints * multiplier);

      // Update loyalty account
      const account = await LoyaltyAccount.findOneAndUpdate(
        { userId: ride.riderId },
        {
          $inc: {
            points: totalPoints,
            totalPointsEarned: totalPoints
          }
        },
        { upsert: true, new: true }
      );

      // Check for tier upgrade
      const newTier = this.calculateTier(account.totalPointsEarned);
      if (newTier !== account.tier) {
        await LoyaltyAccount.updateOne(
          { _id: account._id },
          { tier: newTier }
        );
      }

      return {
        success: true,
        message: 'Loyalty points awarded',
        data: {
          userId: ride.riderId,
          rideId,
          pointsAwarded: totalPoints,
          breakdown: {
            basePoints,
            multiplier: parseFloat(multiplier.toFixed(2)),
            bonusReason: [
              ride.distance > 10 ? 'Long ride bonus (1.5x)' : null,
              ride.rating === 5 ? '5-star rating bonus (1.2x)' : null,
              (hour >= 1 && hour <= 6) ? 'Off-peak bonus (1.1x)' : null
            ].filter(Boolean)
          },
          totalPoints: account.points + totalPoints,
          tier: newTier || account.tier
        }
      };
    } catch (error) {
      return { success: false, message: error.message, data: null };
    }
  }

  /**
   * Redeem loyalty points for rewards
   */
  static async redeemPoints(userId, points) {
    try {
      const account = await LoyaltyAccount.findOne({ userId }).lean();

      if (!account) return { success: false, message: 'Loyalty account not found', data: null };
      if (account.points < points) return { success: false, message: 'Insufficient points', data: null };

      // Update account
      await LoyaltyAccount.updateOne(
        { userId },
        {
          $inc: {
            points: -points,
            totalPointsRedeemed: points
          }
        }
      );

      // Calculate reward value (₹1 per 100 points)
      const rewardValue = (points / 100) * 100;

      return {
        success: true,
        message: 'Points redeemed successfully',
        data: {
          userId,
          pointsRedeemed: points,
          rewardValue: parseFloat(rewardValue.toFixed(2)),
          remainingPoints: account.points - points,
          rewardType: 'ride_credit'
        }
      };
    } catch (error) {
      return { success: false, message: error.message, data: null };
    }
  }

  /**
   * Calculate and update user tier
   */
  static calculateTier(totalPointsEarned) {
    if (totalPointsEarned >= 10000) return 'platinum';
    if (totalPointsEarned >= 5000) return 'gold';
    if (totalPointsEarned >= 2000) return 'silver';
    if (totalPointsEarned >= 500) return 'bronze';
    return 'bronze';
  }

  /**
   * Get loyalty tier benefits
   */
  static getTierBenefits(tier) {
    const benefits = {
      platinum: {
        pointMultiplier: 2.0,
        rideDiscount: '15%',
        prioritySupport: true,
        exclusiveOffers: true,
        benefits: [
          '2x points on all rides',
          '15% discount on rides',
          '24/7 priority support',
          'Exclusive VIP offers',
          'Birthday bonus: 500 points'
        ]
      },
      gold: {
        pointMultiplier: 1.75,
        rideDiscount: '10%',
        prioritySupport: true,
        exclusiveOffers: true,
        benefits: [
          '1.75x points on all rides',
          '10% discount on rides',
          'Priority support (8 AM - 10 PM)',
          'Premium offers',
          'Birthday bonus: 250 points'
        ]
      },
      silver: {
        pointMultiplier: 1.5,
        rideDiscount: '5%',
        prioritySupport: false,
        exclusiveOffers: true,
        benefits: [
          '1.5x points on all rides',
          '5% discount on rides',
          'Exclusive offers',
          'Birthday bonus: 100 points'
        ]
      },
      bronze: {
        pointMultiplier: 1.0,
        rideDiscount: '0%',
        prioritySupport: false,
        exclusiveOffers: false,
        benefits: [
          '1 point per ride',
          'Standard support',
          'Occasional offers'
        ]
      }
    };

    return benefits[tier] || benefits.bronze;
  }

  /**
   * Get user achievements
   */
  static async getUserAchievements(userId) {
    try {
      const user = await User.findById(userId)
        .select('totalRides rating totalEarnings')
        .lean();

      if (!user) return { success: false, message: 'User not found', data: null };

      const achievements = [];
      const unlockedAt = new Date();

      // Achievement definitions
      const achievementDefs = {
        first_ride: { condition: user.totalRides >= 1, points: 50 },
        ten_rides: { condition: user.totalRides >= 10, points: 150 },
        fifty_rides: { condition: user.totalRides >= 50, points: 500 },
        hundred_rides: { condition: user.totalRides >= 100, points: 1000 },
        five_hundred_rides: { condition: user.totalRides >= 500, points: 3000 },
        thousand_rides: { condition: user.totalRides >= 1000, points: 5000 },
        five_star_hunter: { condition: user.rating >= 4.8, points: 500 },
        perfect_rating: { condition: user.rating === 5, points: 1000 },
        generous_tipper: { condition: user.totalEarnings > 50000, points: 750 },
        super_saver: { condition: user.totalEarnings > 100000, points: 2000 },
        community_hero: { condition: user.totalRides >= 100 && user.rating >= 4.5, points: 1500 }
      };

      for (const [key, def] of Object.entries(achievementDefs)) {
        if (def.condition) {
          achievements.push({
            achievementId: key,
            title: key.replace(/_/g, ' ').toUpperCase(),
            description: `Unlocked by ${key}`,
            points: def.points,
            unlockedAt
          });
        }
      }

      // Get stored achievements
      const storedAchievements = await Achievement.find({ userId }).lean();

      // Check for new achievements to award
      const newAchievements = achievements.filter(
        a => !storedAchievements.find(sa => sa.achievementId === a.achievementId)
      );

      if (newAchievements.length > 0) {
        await Achievement.insertMany(
          newAchievements.map(a => ({ userId, ...a }))
        );
      }

      return {
        success: true,
        message: 'Achievements retrieved',
        data: {
          userId,
          totalAchievements: storedAchievements.length + newAchievements.length,
          achievements: storedAchievements.concat(newAchievements),
          newAchievements: newAchievements.length > 0 ? newAchievements : null
        }
      };
    } catch (error) {
      return { success: false, message: error.message, data: null };
    }
  }

  /**
   * Get leaderboard rankings
   */
  static async getLeaderboard(metric = 'points', limit = 100, period = '30days') {
    try {
      let leaderboard = [];

      if (metric === 'points') {
        leaderboard = await LoyaltyAccount.find({})
          .select('userId points tier')
          .populate('userId', 'firstName lastName profilePic')
          .sort({ points: -1 })
          .limit(limit)
          .lean();
      } else if (metric === 'rides') {
        const topRiders = await Ride.aggregate([
          {
            $match: {
              createdAt: { $gte: this.getPeriodDate(period) },
              status: 'completed'
            }
          },
          {
            $group: { _id: '$riderId', rideCount: { $sum: 1 } }
          },
          { $sort: { rideCount: -1 } },
          { $limit: limit }
        ]);

        leaderboard = await Promise.all(
          topRiders.map(async (item) => {
            const user = await User.findById(item._id).select('firstName lastName profilePic').lean();
            return { ...item, userId: user };
          })
        );
      } else if (metric === 'rating') {
        leaderboard = await User.find({ userType: 'driver' })
          .select('firstName lastName rating totalRides profilePic')
          .sort({ rating: -1 })
          .limit(limit)
          .lean();
      }

      return {
        success: true,
        message: 'Leaderboard retrieved',
        data: {
          metric,
          period,
          leaderboard: leaderboard.map((item, index) => ({
            rank: index + 1,
            ...item
          }))
        }
      };
    } catch (error) {
      return { success: false, message: error.message, data: null };
    }
  }

  /**
   * Get seasonal challenges
   */
  static async getSeasonalChallenges() {
    try {
      const now = new Date();
      const challenges = [
        {
          id: 'summer_surge',
          title: 'Summer Surge Champion',
          description: 'Complete 20 rides in July-August',
          target: 20,
          period: 'Summer',
          reward: '1000 points',
          active: [6, 7].includes(now.getMonth())
        },
        {
          id: 'weekend_warrior',
          title: 'Weekend Warrior',
          description: 'Complete 5 rides every Saturday-Sunday for 4 weeks',
          target: 20,
          period: 'Monthly',
          reward: '500 points + ₹500 credit',
          active: true
        },
        {
          id: 'five_star_spree',
          title: '5-Star Spree',
          description: 'Get 10 five-star ratings within 30 days',
          target: 10,
          period: 'Monthly',
          reward: '750 points',
          active: true
        },
        {
          id: 'night_owl',
          title: 'Night Owl',
          description: 'Complete 15 rides between 10 PM and 6 AM',
          target: 15,
          period: 'Monthly',
          reward: '500 points',
          active: true
        }
      ];

      return {
        success: true,
        message: 'Seasonal challenges retrieved',
        data: { challenges: challenges.filter(c => c.active) }
      };
    } catch (error) {
      return { success: false, message: error.message, data: null };
    }
  }

  /**
   * Get user referral rewards
   */
  static async getReferralRewards(userId) {
    try {
      const user = await User.findById(userId)
        .select('referralCode referrals totalReferralEarnings')
        .lean();

      if (!user) return { success: false, message: 'User not found', data: null };

      return {
        success: true,
        message: 'Referral rewards retrieved',
        data: {
          userId,
          referralCode: user.referralCode || `REF${userId.slice(-8).toUpperCase()}`,
          totalReferrals: user.referrals?.length || 0,
          totalReferralEarnings: user.totalReferralEarnings || 0,
          referralBenefits: {
            referrer: {
              pointsPerReferral: 500,
              creditPerReferral: '₹100'
            },
            referee: {
              bonus: '₹50 credit on first ride'
            }
          },
          recentReferrals: user.referrals?.slice(0, 5) || []
        }
      };
    } catch (error) {
      return { success: false, message: error.message, data: null };
    }
  }

  /**
   * Get loyalty program dashboard
   */
  static async getLoyaltyDashboard(userId) {
    try {
      const account = await this.getLoyaltyAccount(userId);
      if (!account.success) return account;

      const achievements = await this.getUserAchievements(userId);
      const benefits = this.getTierBenefits(account.data.tier);

      return {
        success: true,
        message: 'Loyalty dashboard retrieved',
        data: {
          userId,
          account: account.data,
          tier: account.data.tier,
          tierBenefits: benefits,
          achievements: achievements.data?.achievements || [],
          progression: {
            currentPoints: account.data.points,
            nextTierPoints: this.getPointsForTier(account.data.tier),
            percentToNextTier: Math.floor(
              (account.data.totalPointsEarned / this.getPointsForTier(account.data.tier)) * 100
            )
          }
        }
      };
    } catch (error) {
      return { success: false, message: error.message, data: null };
    }
  }

  /**
   * Get points required for tier
   */
  static getPointsForTier(currentTier) {
    const tiers = {
      bronze: 500,
      silver: 2000,
      gold: 5000,
      platinum: 10000
    };
    return tiers[currentTier] || tiers.platinum;
  }

  /**
   * Helper: Get period date for query
   */
  static getPeriodDate(period) {
    const now = new Date();
    switch (period) {
      case '7days':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30days':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90days':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
}

module.exports = LoyaltyRewardsService;
