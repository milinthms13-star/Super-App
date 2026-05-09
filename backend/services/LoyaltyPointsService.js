/**
 * LoyaltyPointsService.js
 * Rewards, points, tiers, and referral program
 */

const logger = require('../config/logger');

class LoyaltyPointsService {
  /**
   * Calculate points for transaction
   */
  static async calculatePoints(userId, amount, transactionType = 'purchase') {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Base points: 1 point per ₹10 spent
      let points = Math.floor(amount / 10);

      // Multiplier based on tier
      const tier = this._getUserTier(user);
      const multiplier = {
        bronze: 1.0,
        silver: 1.25,
        gold: 1.5,
        platinum: 2.0,
      }[tier] || 1.0;

      points = Math.floor(points * multiplier);

      // Bonus for specific transaction types
      if (transactionType === 'purchase') {
        // Base points already counted
      } else if (transactionType === 'review') {
        points = 10; // Bonus for review
      } else if (transactionType === 'referral') {
        points = Math.floor(amount * 0.1); // 10% of referred amount
      } else if (transactionType === 'birthday') {
        points = 100; // Birthday bonus
      }

      return {
        points,
        tier,
        multiplier,
        breakdown: {
          basePoints: Math.floor(amount / 10),
          tierBonus: Math.floor(amount / 10 * (multiplier - 1)),
          typeBonus: transactionType !== 'purchase' ? points - Math.floor(amount / 10) : 0,
        },
      };
    } catch (error) {
      logger.error('Error calculating points:', error);
      throw error;
    }
  }

  /**
   * Add points to user account
   */
  static async addPoints(userId, points, reason = 'purchase', orderId = null) {
    try {
      const User = require('../models/User');

      const user = await User.findByIdAndUpdate(
        userId,
        {
          $inc: { loyaltyPoints: points },
          $push: {
            loyaltyHistory: {
              points,
              reason,
              orderId,
              createdAt: new Date(),
              balance: (user?.loyaltyPoints || 0) + points,
            },
          },
        },
        { new: true }
      );

      logger.info(`Points added to user: ${userId} - ${points} points`);

      return {
        userId,
        pointsAdded: points,
        totalPoints: user.loyaltyPoints,
      };
    } catch (error) {
      logger.error('Error adding points:', error);
      throw error;
    }
  }

  /**
   * Redeem points for discount
   */
  static async redeemPoints(userId, pointsToRedeem) {
    try {
      const User = require('../models/User');

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.loyaltyPoints < pointsToRedeem) {
        throw new Error('Insufficient loyalty points');
      }

      // 1 point = ₹0.50 value
      const discountValue = Math.floor(pointsToRedeem * 0.5);

      const updated = await User.findByIdAndUpdate(
        userId,
        {
          $inc: { loyaltyPoints: -pointsToRedeem },
          $push: {
            loyaltyHistory: {
              points: -pointsToRedeem,
              reason: 'redemption',
              discountValue,
              createdAt: new Date(),
              balance: user.loyaltyPoints - pointsToRedeem,
            },
          },
        },
        { new: true }
      );

      logger.info(`Points redeemed by user: ${userId} - ${pointsToRedeem} points`);

      return {
        userId,
        pointsRedeemed: pointsToRedeem,
        discountValue,
        remainingPoints: updated.loyaltyPoints,
        couponCode: this._generateCouponCode(userId),
      };
    } catch (error) {
      logger.error('Error redeeming points:', error);
      throw error;
    }
  }

  /**
   * Get loyalty tier for user
   */
  static _getUserTier(user) {
    const points = user.loyaltyPoints || 0;

    if (points >= 5000) return 'platinum';
    if (points >= 2500) return 'gold';
    if (points >= 1000) return 'silver';
    return 'bronze';
  }

  /**
   * Get tier benefits
   */
  static getTierBenefits(tier = 'bronze') {
    const benefits = {
      bronze: {
        name: 'Bronze',
        pointsMultiplier: 1.0,
        benefits: [
          '1x points on purchases',
          'Birthday bonus (100 points)',
          'Free standard shipping',
        ],
        requirementsPoints: 0,
      },
      silver: {
        name: 'Silver',
        pointsMultiplier: 1.25,
        benefits: [
          '1.25x points on purchases',
          'Birthday bonus (150 points)',
          'Free express shipping',
          '5% discount on select items',
        ],
        requirementsPoints: 1000,
      },
      gold: {
        name: 'Gold',
        pointsMultiplier: 1.5,
        benefits: [
          '1.5x points on purchases',
          'Birthday bonus (200 points)',
          'Free overnight shipping',
          '10% discount on select items',
          'Priority customer support',
          'Exclusive sale access 24h early',
        ],
        requirementsPoints: 2500,
      },
      platinum: {
        name: 'Platinum',
        pointsMultiplier: 2.0,
        benefits: [
          '2x points on purchases',
          'Birthday bonus (500 points)',
          'Free overnight shipping',
          '15% discount on all items',
          'VIP customer support',
          'Exclusive products access',
          'Personal shopping assistant',
        ],
        requirementsPoints: 5000,
      },
    };

    return benefits[tier] || benefits.bronze;
  }

  /**
   * Generate coupon code
   */
  static _generateCouponCode(userId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const userIdShort = userId.toString().substring(0, 4).toUpperCase();
    return `LY${userIdShort}${timestamp}`;
  }

  /**
   * Track referral
   */
  static async trackReferral(referrerId, refereeId, amount = 0) {
    try {
      const User = require('../models/User');

      // Add points to referrer
      const referrerPoints = Math.floor((amount || 100) * 0.5); // 50% of first purchase
      await this.addPoints(referrerId, referrerPoints, 'referral', refereeId);

      // Add points to referee
      const refereePoints = Math.floor((amount || 100) * 0.25); // 25% of first purchase
      await this.addPoints(refereeId, refereePoints, 'referral_received', referrerId);

      // Track referral
      await User.findByIdAndUpdate(referrerId, {
        $push: {
          referrals: {
            refereeId,
            referredAt: new Date(),
            status: 'active',
            pointsEarned: referrerPoints,
          },
        },
      });

      logger.info(`Referral tracked: ${referrerId} → ${refereeId}`);

      return {
        referrerId,
        refereeId,
        referrerPointsAdded: referrerPoints,
        refereePointsAdded: refereePoints,
      };
    } catch (error) {
      logger.error('Error tracking referral:', error);
      throw error;
    }
  }

  /**
   * Get referral link
   */
  static async getReferralLink(userId) {
    try {
      const referralCode = `REF${userId.substring(0, 8).toUpperCase()}`;
      const referralLink = `${process.env.FRONTEND_URL || 'https://localhost:3000'}/register?ref=${referralCode}`;

      return {
        referralCode,
        referralLink,
        message: 'Share this link to earn rewards',
      };
    } catch (error) {
      logger.error('Error getting referral link:', error);
      throw error;
    }
  }

  /**
   * Get loyalty dashboard
   */
  static async getLoyaltyDashboard(userId) {
    try {
      const User = require('../models/User');

      const user = await User.findById(userId).select(
        'loyaltyPoints loyaltyHistory referrals'
      );

      if (!user) {
        throw new Error('User not found');
      }

      const tier = this._getUserTier(user);
      const tierBenefits = this.getTierBenefits(tier);

      // Points needed for next tier
      const tierThresholds = { bronze: 0, silver: 1000, gold: 2500, platinum: 5000 };
      const tiers = ['bronze', 'silver', 'gold', 'platinum'];
      const currentTierIndex = tiers.indexOf(tier);
      const nextTier = tiers[currentTierIndex + 1] || tier;
      const pointsForNextTier =
        tierThresholds[nextTier] - user.loyaltyPoints;

      // Referral stats
      const activeReferrals = (user.referrals || []).filter(r => r.status === 'active').length;
      const totalReferralPoints = (user.referrals || []).reduce(
        (sum, r) => sum + (r.pointsEarned || 0),
        0
      );

      return {
        currentTier: tier,
        currentPoints: user.loyaltyPoints,
        nextTier,
        pointsForNextTier: Math.max(0, pointsForNextTier),
        tierBenefits,
        recentHistory: (user.loyaltyHistory || []).slice(-10),
        referrals: {
          active: activeReferrals,
          totalPointsEarned: totalReferralPoints,
        },
      };
    } catch (error) {
      logger.error('Error getting loyalty dashboard:', error);
      throw error;
    }
  }

  /**
   * Award birthday points
   */
  static async awardBirthdayPoints(userId) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);

      if (!user || !user.dateOfBirth) {
        throw new Error('User not found or birthday not set');
      }

      const today = new Date();
      const birthday = new Date(user.dateOfBirth);

      // Check if today is birthday
      if (
        today.getMonth() === birthday.getMonth() &&
        today.getDate() === birthday.getDate()
      ) {
        const pointsToAdd = 100;
        await this.addPoints(userId, pointsToAdd, 'birthday');

        return {
          message: 'Happy Birthday! 100 points added',
          pointsAdded: pointsToAdd,
        };
      }

      return {
        message: 'Not a birthday',
      };
    } catch (error) {
      logger.error('Error awarding birthday points:', error);
      throw error;
    }
  }

  /**
   * Get reward catalog
   */
  static async getRewardCatalog() {
    try {
      const rewards = [
        {
          id: 1,
          name: '₹100 Off',
          pointsRequired: 200,
          category: 'discount',
          validity: '30 days',
        },
        {
          id: 2,
          name: '₹500 Off',
          pointsRequired: 1000,
          category: 'discount',
          validity: '30 days',
        },
        {
          id: 3,
          name: 'Free Shipping (1 month)',
          pointsRequired: 150,
          category: 'shipping',
          validity: '30 days',
        },
        {
          id: 4,
          name: 'Exclusive Access (Early Sale)',
          pointsRequired: 500,
          category: 'access',
          validity: '1 event',
        },
        {
          id: 5,
          name: 'Birthday Voucher',
          pointsRequired: 300,
          category: 'special',
          validity: 'Birthday month',
        },
      ];

      return rewards;
    } catch (error) {
      logger.error('Error getting reward catalog:', error);
      throw error;
    }
  }
}

module.exports = LoyaltyPointsService;
