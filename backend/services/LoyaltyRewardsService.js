/**
 * LoyaltyRewardsService.js
 * Points system, tier system, referral bonuses
 */

const logger = require('../config/logger');
const User = require('../models/User');
const Order = require('../models/Order');
const LoyaltyAccount = require('../models/LoyaltyAccount');
const Reward = require('../models/Reward');

class LoyaltyRewardsService {
  /**
   * Initialize loyalty account for user
   */
  static async initializeLoyaltyAccount(userId) {
    try {
      const existing = await LoyaltyAccount.findOne({ userId });
      if (existing) return { success: true, account: existing };

      const account = await LoyaltyAccount.create({
        userId,
        points: 0,
        tier: 'bronze',
        joinedAt: new Date()
      });

      logger.info(`Loyalty account created for ${userId}`);
      return { success: true, account };
    } catch (error) {
      logger.error(`Initialize loyalty account error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Award points for purchase
   */
  static async awardPointsForPurchase(userId, amount) {
    try {
      // 1 point per currency unit
      const points = Math.floor(amount);

      const account = await LoyaltyAccount.findOneAndUpdate(
        { userId },
        {
          $inc: { points },
          $push: { transactions: { type: 'purchase', points, amount, date: new Date() } }
        },
        { new: true }
      );

      // Update tier
      await this._updateUserTier(userId, account.points + points);

      logger.info(`${points} points awarded to ${userId}`);
      return { success: true, pointsAwarded: points, newBalance: account.points + points };
    } catch (error) {
      logger.error(`Award points error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Redeem points for reward
   */
  static async redeemPoints(userId, rewardId) {
    try {
      const reward = await Reward.findById(rewardId);
      if (!reward) throw new Error('Reward not found');

      const account = await LoyaltyAccount.findOne({ userId });
      if (!account || account.points < reward.pointsRequired) {
        throw new Error('Insufficient points');
      }

      await LoyaltyAccount.findByIdAndUpdate(
        account._id,
        {
          $inc: { points: -reward.pointsRequired },
          $push: { redeemedRewards: { rewardId, redeemedAt: new Date() } }
        }
      );

      logger.info(`${reward.pointsRequired} points redeemed by ${userId}`);
      return {
        success: true,
        reward: reward.name,
        discount: reward.discount,
        newBalance: account.points - reward.pointsRequired
      };
    } catch (error) {
      logger.error(`Redeem points error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get loyalty account status
   */
  static async getLoyaltyStatus(userId) {
    try {
      const account = await LoyaltyAccount.findOne({ userId }).populate('userId', 'username email');

      if (!account) throw new Error('Loyalty account not found');

      const tierBenefits = {
        bronze: { multiplier: 1, benefits: ['Basic points earning'] },
        silver: { multiplier: 1.25, benefits: ['25% bonus points', 'Early sale access'] },
        gold: { multiplier: 1.5, benefits: ['50% bonus points', 'Priority support', 'Free shipping'] },
        platinum: { multiplier: 2, benefits: ['Double points', 'VIP support', 'Exclusive deals', 'Birthday bonus'] }
      };

      const tier = tierBenefits[account.tier];

      return {
        success: true,
        userId,
        points: account.points,
        tier: account.tier,
        benefits: tier.benefits,
        pointsMultiplier: tier.multiplier,
        joinedAt: account.joinedAt,
        nextTierThreshold: this._getTierThreshold(account.tier)
      };
    } catch (error) {
      logger.error(`Get loyalty status error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Internal: Update user tier based on points
   */
  static async _updateUserTier(userId, points) {
    try {
      let newTier = 'bronze';
      if (points >= 5000) newTier = 'platinum';
      else if (points >= 2500) newTier = 'gold';
      else if (points >= 1000) newTier = 'silver';

      await LoyaltyAccount.findOneAndUpdate({ userId }, { tier: newTier });
      return newTier;
    } catch (error) {
      logger.error(`Update tier error: ${error.message}`);
    }
  }

  /**
   * Get tier threshold
   */
  static _getTierThreshold(currentTier) {
    const thresholds = {
      bronze: 1000,
      silver: 2500,
      gold: 5000,
      platinum: Infinity
    };
    return thresholds[currentTier] || 0;
  }

  /**
   * Referral program
   */
  static async generateReferralCode(userId) {
    try {
      const referralCode = `REF-${userId}-${Math.random().toString(36).substring(7).toUpperCase()}`;

      const account = await LoyaltyAccount.findOneAndUpdate(
        { userId },
        {
          referralCode,
          referralUrl: `https://malabarbazaar.com/?ref=${referralCode}`
        },
        { new: true }
      );

      logger.info(`Referral code generated: ${referralCode}`);
      return {
        success: true,
        referralCode,
        referralUrl: account.referralUrl
      };
    } catch (error) {
      logger.error(`Generate referral code error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process referral signup
   */
  static async processReferralSignup(referrerCode, newUserId) {
    try {
      const referrerAccount = await LoyaltyAccount.findOne({ referralCode: referrerCode });
      if (!referrerAccount) throw new Error('Invalid referral code');

      // Award points to referrer (500 bonus)
      await LoyaltyAccount.findByIdAndUpdate(
        referrerAccount._id,
        {
          $inc: { points: 500 },
          $push: { referrals: { userId: newUserId, referredAt: new Date() } }
        }
      );

      // Award points to new user (250 signup bonus)
      const newAccount = await LoyaltyAccount.findOne({ userId: newUserId });
      if (newAccount) {
        await LoyaltyAccount.findByIdAndUpdate(
          newAccount._id,
          { $inc: { points: 250 } }
        );
      }

      logger.info(`Referral processed: ${referrerAccount.userId} → ${newUserId}`);
      return {
        success: true,
        referrerBonus: 500,
        newUserBonus: 250
      };
    } catch (error) {
      logger.error(`Process referral error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get referral stats
   */
  static async getReferralStats(userId) {
    try {
      const account = await LoyaltyAccount.findOne({ userId });
      if (!account) throw new Error('Account not found');

      const referralCount = (account.referrals || []).length;
      const totalReferralBonus = referralCount * 500;

      return {
        success: true,
        referralCode: account.referralCode,
        totalReferrals: referralCount,
        totalBonus: totalReferralBonus,
        referrals: account.referrals
      };
    } catch (error) {
      logger.error(`Get referral stats error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get available rewards catalog
   */
  static async getRewardsCatalog(tier = null) {
    try {
      let query = {};
      if (tier) query.tiers = { $in: [tier] };

      const rewards = await Reward.find(query).sort({ pointsRequired: 1 });

      return {
        success: true,
        rewards,
        count: rewards.length
      };
    } catch (error) {
      logger.error(`Get rewards catalog error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Special anniversary bonus
   */
  static async giveAnniversaryBonus(userId) {
    try {
      const account = await LoyaltyAccount.findOne({ userId });
      if (!account) throw new Error('Account not found');

      const yearsActive = Math.floor((Date.now() - account.joinedAt) / (1000 * 60 * 60 * 24 * 365));
      const bonus = 100 * yearsActive; // 100 points per year

      await LoyaltyAccount.findByIdAndUpdate(
        account._id,
        {
          $inc: { points: bonus },
          $push: { transactions: { type: 'anniversary_bonus', points: bonus, date: new Date() } }
        }
      );

      logger.info(`Anniversary bonus ${bonus} points awarded to ${userId}`);
      return {
        success: true,
        bonusPoints: bonus,
        yearsActive,
        newBalance: account.points + bonus
      };
    } catch (error) {
      logger.error(`Anniversary bonus error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create reward (admin)
   */
  static async createReward(name, pointsRequired, discount, tiers = ['bronze', 'silver', 'gold', 'platinum']) {
    try {
      const reward = await Reward.create({
        name,
        pointsRequired,
        discount,
        tiers,
        createdAt: new Date()
      });

      logger.info(`Reward created: ${reward._id}`);
      return { success: true, reward };
    } catch (error) {
      logger.error(`Create reward error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = LoyaltyRewardsService;
