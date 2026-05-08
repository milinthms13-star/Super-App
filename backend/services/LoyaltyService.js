/**
 * LoyaltyService
 * Business logic for loyalty program management
 * Handles points, tiers, rewards, and member benefits
 */

const LoyaltyAccount = require('../models/LoyaltyAccount');

class LoyaltyService {
  /**
   * Create loyalty account for user
   */
  static async createLoyaltyAccount(userId, userData = {}) {
    try {
      const loyaltyAccountId = `loyalty_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const referralCode = this._generateReferralCode();

      const loyaltyAccount = new LoyaltyAccount({
        loyaltyAccountId,
        userId,
        referralCode,
        ...userData,
      });

      await loyaltyAccount.save();

      return {
        success: true,
        data: loyaltyAccount,
        message: 'Loyalty account created',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Get loyalty account for user
   */
  static async getLoyaltyAccount(userId) {
    try {
      const account = await LoyaltyAccount.findOne({ userId });

      if (!account) {
        return {
          success: false,
          message: 'Loyalty account not found',
        };
      }

      return {
        success: true,
        data: account,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Add points to account
   */
  static async addPoints(userId, amount, source, orderId = null) {
    try {
      const account = await LoyaltyAccount.findOne({ userId });

      if (!account) {
        return {
          success: false,
          message: 'Loyalty account not found',
        };
      }

      await account.addPoints(amount, source, orderId);

      // Check for tier upgrade
      await this._checkTierUpgrade(account);

      return {
        success: true,
        data: account,
        message: `${amount} points added`,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Redeem points for reward
   */
  static async redeemPoints(userId, pointsToRedeem, rewardId, rewardName) {
    try {
      const account = await LoyaltyAccount.findOne({ userId });

      if (!account) {
        return {
          success: false,
          message: 'Loyalty account not found',
        };
      }

      if (account.points.currentBalance < pointsToRedeem) {
        return {
          success: false,
          message: 'Insufficient points',
        };
      }

      await account.redeemPoints(pointsToRedeem, rewardId, rewardName);

      return {
        success: true,
        data: account,
        message: 'Points redeemed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Get available rewards
   */
  static async getAvailableRewards(userId) {
    try {
      const account = await LoyaltyAccount.findOne({ userId });

      if (!account) {
        return {
          success: false,
          message: 'Loyalty account not found',
        };
      }

      const rewards = account.getAvailableRewards();

      return {
        success: true,
        data: rewards,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Calculate points for order
   */
  static async calculatePointsForOrder(userId, orderValue) {
    try {
      const account = await LoyaltyAccount.findOne({ userId });

      if (!account) {
        return {
          success: false,
          message: 'Loyalty account not found',
        };
      }

      const basePoints = Math.floor(orderValue * account.earningRules.pointsPerRupee);
      const tierMultiplier = account.tier.benefits.pointsMultiplier;
      const totalPoints = basePoints * tierMultiplier;

      return {
        success: true,
        data: {
          basePoints,
          tierMultiplier,
          totalPoints,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Check for tier upgrade
   */
  static async _checkTierUpgrade(account) {
    try {
      const tierThresholds = {
        bronze: 0,
        silver: 500,
        gold: 1500,
        platinum: 3000,
        diamond: 5000,
      };

      const currentTierThreshold = tierThresholds[account.tier.currentTier];
      const nextTier = Object.keys(tierThresholds).find(
        (tier) => tierThresholds[tier] > currentTierThreshold
      );

      if (nextTier && account.points.totalEarned >= tierThresholds[nextTier]) {
        await account.upgradeTier(nextTier);

        // Update benefits
        const tierBenefits = {
          bronze: { pointsMultiplier: 1, cashbackPercentage: 0, freeDeliveryPerMonth: 0 },
          silver: { pointsMultiplier: 1.25, cashbackPercentage: 2, freeDeliveryPerMonth: 2 },
          gold: { pointsMultiplier: 1.5, cashbackPercentage: 3, freeDeliveryPerMonth: 4 },
          platinum: { pointsMultiplier: 2, cashbackPercentage: 4, freeDeliveryPerMonth: 6 },
          diamond: { pointsMultiplier: 2.5, cashbackPercentage: 5, freeDeliveryPerMonth: 8 },
        };

        account.tier.benefits = tierBenefits[nextTier];
        await account.save();

        return { upgraded: true, newTier: nextTier };
      }

      return { upgraded: false };
    } catch (error) {
      console.error('Tier upgrade check failed:', error);
      return { upgraded: false };
    }
  }

  /**
   * Apply cashback to order
   */
  static async applyCashback(userId, orderValue) {
    try {
      const account = await LoyaltyAccount.findOne({ userId });

      if (!account) {
        return {
          success: false,
          message: 'Loyalty account not found',
        };
      }

      const cashbackPercentage = account.tier.benefits.cashbackPercentage;
      const cashbackAmount = (orderValue * cashbackPercentage) / 100;

      await account.addPoints(Math.floor(cashbackAmount), 'cashback_reward');

      return {
        success: true,
        data: {
          cashbackAmount: Math.floor(cashbackAmount),
          tier: account.tier.currentTier,
        },
        message: `${Math.floor(cashbackAmount)} points earned as cashback`,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Get membership status
   */
  static async getMembershipStatus(userId) {
    try {
      const account = await LoyaltyAccount.findOne({ userId });

      if (!account) {
        return {
          success: false,
          message: 'Loyalty account not found',
        };
      }

      return {
        success: true,
        data: {
          membership: account.membership,
          tier: account.tier.currentTier,
          points: account.points.currentBalance,
          benefits: account.tier.benefits,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Get transaction history
   */
  static async getTransactionHistory(userId, limit = 20) {
    try {
      const account = await LoyaltyAccount.findOne({ userId });

      if (!account) {
        return {
          success: false,
          message: 'Loyalty account not found',
        };
      }

      const transactions = account.transactions.slice(-limit).reverse();

      return {
        success: true,
        data: transactions,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Add referral
   */
  static async addReferral(userId, referredUserId, referredEmail) {
    try {
      const account = await LoyaltyAccount.findOne({ userId });

      if (!account) {
        return {
          success: false,
          message: 'Loyalty account not found',
        };
      }

      account.referredUsers.push({
        userId: referredUserId,
        joinedAt: new Date(),
        pointsEarned: 0,
      });

      await account.save();

      return {
        success: true,
        data: account,
        message: 'Referral added',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Generate referral code
   */
  static _generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Get loyalty stats
   */
  static async getLoyaltyStats(userId) {
    try {
      const account = await LoyaltyAccount.findOne({ userId });

      if (!account) {
        return {
          success: false,
          message: 'Loyalty account not found',
        };
      }

      return {
        success: true,
        data: {
          currentPoints: account.points.currentBalance,
          totalEarned: account.points.totalEarned,
          totalRedeemed: account.points.totalRedeemed,
          currentTier: account.tier.currentTier,
          orders: account.stats.totalOrdersPlaced,
          totalSpent: account.stats.totalSpent,
          averageOrderValue: account.stats.averageOrderValue,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }
}

module.exports = LoyaltyService;
