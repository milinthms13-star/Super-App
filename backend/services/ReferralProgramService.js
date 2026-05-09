/**
 * ReferralProgramService.js
 * Manages referral program, referral codes, bonuses, and tracking
 * 
 * Methods:
 * - createReferralCode(userId)
 * - getReferralCode(userId)
 * - validateReferralCode(referralCode)
 * - processReferral(referrerId, newUserId)
 * - getReferralStats(userId)
 * - getReferralList(userId, limit, skip)
 * - claimReferralBonus(userId)
 * - getReferralDashboard(userId)
 * - getActiveReferrals(userId)
 */

class ReferralProgramService {
  constructor() {
    this.ReferralProgram = require('../models/ReferralProgram');
    this.Wallet = require('../models/Wallet');
    this.RideRequest = require('../models/RideRequest');
    this.User = require('../models/User');
    this.WalletService = require('./WalletService');
  }

  /**
   * Create referral code for user
   */
  async createReferralCode(userId) {
    try {
      // Check if already exists
      let referral = await this.ReferralProgram.findOne({ userId });
      if (referral && referral.referralCode) {
        return {
          success: true,
          referralCode: referral.referralCode,
          alreadyExists: true
        };
      }

      // Generate unique code
      const referralCode = this.generateUniqueCode(userId);

      if (!referral) {
        referral = new this.ReferralProgram({
          userId,
          referralCode,
          referredUsers: [],
          totalReferrals: 0,
          totalBonus: 0,
          bonusBalance: 0,
          createdAt: new Date()
        });
      } else {
        referral.referralCode = referralCode;
      }

      await referral.save();

      return {
        success: true,
        referralCode,
        message: 'Referral code created successfully'
      };
    } catch (error) {
      console.error('Error creating referral code:', error.message);
      throw error;
    }
  }

  /**
   * Get referral code for user
   */
  async getReferralCode(userId) {
    try {
      const referral = await this.ReferralProgram.findOne({ userId });
      if (!referral || !referral.referralCode) {
        // Create if doesn't exist
        return await this.createReferralCode(userId);
      }

      return {
        success: true,
        referralCode: referral.referralCode,
        totalReferrals: referral.totalReferrals,
        totalBonus: referral.totalBonus,
        bonusBalance: referral.bonusBalance
      };
    } catch (error) {
      console.error('Error getting referral code:', error.message);
      throw error;
    }
  }

  /**
   * Validate referral code and get referrer info
   */
  async validateReferralCode(referralCode) {
    try {
      if (!referralCode || referralCode.trim() === '') {
        return { success: false, valid: false, message: 'Invalid code' };
      }

      const referral = await this.ReferralProgram.findOne({ referralCode });
      if (!referral) {
        return { success: false, valid: false, message: 'Code not found' };
      }

      const referrer = await this.User.findById(referral.userId)
        .select('name phone profilePhoto');

      return {
        success: true,
        valid: true,
        referrerId: referral.userId,
        referrerName: referrer?.name,
        referrerPhoto: referrer?.profilePhoto,
        bonusAmount: 100 // Default bonus
      };
    } catch (error) {
      console.error('Error validating referral code:', error.message);
      throw error;
    }
  }

  /**
   * Process referral when new user joins
   */
  async processReferral(referrerId, newUserId) {
    try {
      // Find referrer's referral record
      const referral = await this.ReferralProgram.findOne({ userId: referrerId });
      if (!referral) {
        throw new Error('Referrer not found');
      }

      const REFERRER_BONUS = 100; // ₹100 for referrer
      const REFEREE_BONUS = 75; // ₹75 for new user

      // Add new user to referred users list
      referral.referredUsers.push({
        userId: newUserId,
        joinDate: new Date(),
        rides: 0,
        bonusEarned: REFERRER_BONUS,
        bonusClaimed: false
      });

      referral.totalReferrals += 1;
      referral.totalBonus += REFERRER_BONUS;
      referral.bonusBalance += REFERRER_BONUS;

      await referral.save();

      // Add bonus to referrer's wallet
      await this.WalletService.addCashback(
        referrerId,
        REFERRER_BONUS,
        null,
        `Referral bonus for user: ${newUserId}`
      );

      // Add bonus to new user's wallet
      await this.WalletService.addCashback(
        newUserId,
        REFEREE_BONUS,
        null,
        'Welcome bonus from referral'
      );

      return {
        success: true,
        message: 'Referral processed successfully',
        referrerBonus: REFERRER_BONUS,
        refereeBonus: REFEREE_BONUS
      };
    } catch (error) {
      console.error('Error processing referral:', error.message);
      throw error;
    }
  }

  /**
   * Get referral statistics for user
   */
  async getReferralStats(userId) {
    try {
      const referral = await this.ReferralProgram.findOne({ userId });
      if (!referral) {
        throw new Error('Referral not found');
      }

      // Count active referrals (users with at least 1 ride)
      const activeReferrals = referral.referredUsers.filter(r => r.rides > 0).length;

      // Calculate average rides per referral
      const totalRides = referral.referredUsers.reduce((sum, r) => sum + r.rides, 0);
      const avgRidesPerReferral = referral.totalReferrals > 0
        ? (totalRides / referral.totalReferrals).toFixed(1)
        : 0;

      return {
        success: true,
        stats: {
          totalReferrals: referral.totalReferrals,
          activeReferrals,
          inactiveReferrals: referral.totalReferrals - activeReferrals,
          totalBonus: referral.totalBonus,
          bonusBalance: referral.bonusBalance,
          totalRidesByReferrals: totalRides,
          avgRidesPerReferral,
          conversionRate: referral.totalReferrals > 0
            ? ((activeReferrals / referral.totalReferrals) * 100).toFixed(1) + '%'
            : '0%'
        }
      };
    } catch (error) {
      console.error('Error getting referral stats:', error.message);
      throw error;
    }
  }

  /**
   * Get paginated list of referrals
   */
  async getReferralList(userId, limit = 10, skip = 0) {
    try {
      const referral = await this.ReferralProgram.findOne({ userId });
      if (!referral) {
        throw new Error('Referral not found');
      }

      const referredUsers = referral.referredUsers.slice(skip, skip + limit);

      // Get user details for each referral
      const referralsWithDetails = await Promise.all(
        referredUsers.map(async (ref) => {
          const user = await this.User.findById(ref.userId)
            .select('name phone profilePhoto createdAt');
          return {
            ...ref,
            userName: user?.name,
            userPhone: user?.phone,
            userPhoto: user?.profilePhoto,
            joinedDate: user?.createdAt
          };
        })
      );

      return {
        success: true,
        referrals: referralsWithDetails,
        pagination: {
          total: referral.referredUsers.length,
          limit,
          skip,
          page: Math.floor(skip / limit) + 1,
          pages: Math.ceil(referral.referredUsers.length / limit)
        }
      };
    } catch (error) {
      console.error('Error getting referral list:', error.message);
      throw error;
    }
  }

  /**
   * Claim referral bonus
   */
  async claimReferralBonus(userId) {
    try {
      const referral = await this.ReferralProgram.findOne({ userId });
      if (!referral) {
        throw new Error('Referral not found');
      }

      if (referral.bonusBalance <= 0) {
        return {
          success: false,
          message: 'No bonus available to claim'
        };
      }

      // Add bonus to wallet
      await this.WalletService.addCashback(
        userId,
        referral.bonusBalance,
        null,
        'Claimed referral bonus'
      );

      // Reset bonus balance
      const claimedAmount = referral.bonusBalance;
      referral.bonusBalance = 0;
      await referral.save();

      return {
        success: true,
        message: `₹${claimedAmount} bonus claimed`,
        claimedAmount,
        newBalance: 0
      };
    } catch (error) {
      console.error('Error claiming referral bonus:', error.message);
      throw error;
    }
  }

  /**
   * Get referral dashboard
   */
  async getReferralDashboard(userId) {
    try {
      const referral = await this.ReferralProgram.findOne({ userId });
      if (!referral) {
        throw new Error('Referral not found');
      }

      const stats = await this.getReferralStats(userId);
      const recentReferrals = referral.referredUsers.slice(-5).reverse();

      return {
        success: true,
        referralCode: referral.referralCode,
        stats: stats.stats,
        recentReferrals,
        shareMessage: `Join me on NilaHub! Use code ${referral.referralCode} for ₹100 bonus`,
        referralLink: `https://nilahub.app/referral/${referral.referralCode}`
      };
    } catch (error) {
      console.error('Error getting referral dashboard:', error.message);
      throw error;
    }
  }

  /**
   * Get active referrals with recent activity
   */
  async getActiveReferrals(userId, limit = 10) {
    try {
      const referral = await this.ReferralProgram.findOne({ userId });
      if (!referral) {
        throw new Error('Referral not found');
      }

      // Get referrals with recent rides
      const activeReferrals = referral.referredUsers
        .filter(r => r.rides > 0)
        .sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate))
        .slice(0, limit);

      // Add ride details
      const referralsWithRides = await Promise.all(
        activeReferrals.map(async (ref) => {
          const lastRide = await this.RideRequest.findOne({ customerId: ref.userId })
            .sort({ createdAt: -1 })
            .select('customerId createdAt estimatedFare');

          const user = await this.User.findById(ref.userId)
            .select('name profilePhoto');

          return {
            userId: ref.userId,
            userName: user?.name,
            userPhoto: user?.profilePhoto,
            rides: ref.rides,
            bonusEarned: ref.bonusEarned,
            lastRideDate: lastRide?.createdAt,
            joinDate: ref.joinDate
          };
        })
      );

      return {
        success: true,
        activeReferrals: referralsWithRides
      };
    } catch (error) {
      console.error('Error getting active referrals:', error.message);
      throw error;
    }
  }

  /**
   * Update referral ride count
   */
  async updateReferralRideCount(userId, referrerId) {
    try {
      const referral = await this.ReferralProgram.findOne({ userId: referrerId });
      if (!referral) {
        return;
      }

      const referredUser = referral.referredUsers.find(r => r.userId === userId);
      if (referredUser) {
        referredUser.rides += 1;
        await referral.save();
      }
    } catch (error) {
      console.error('Error updating referral ride count:', error.message);
    }
  }

  /**
   * Generate unique referral code
   */
  generateUniqueCode(userId) {
    const prefix = 'NH'; // NilaHub
    const userIdPart = userId.toString().substring(18, 24).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${prefix}${userIdPart}${randomPart}`;
  }
}

module.exports = new ReferralProgramService();
