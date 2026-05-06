/**
 * Referral & Affiliate System
 * Manages referral programs, tracking, and rewards
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const ReferralSchema = new mongoose.Schema({
  referrerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  referralCode: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  referralEmail: String,
  referralPhone: String,
  status: {
    type: String,
    enum: ['active', 'used', 'expired'],
    default: 'active'
  },
  referredUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MatrimonialProfile'
  },
  referredUserEmail: String,
  conversionDate: Date,
  rewardTier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },
  rewardAmount: {
    type: Number,
    default: 0
  },
  rewardClaimed: {
    type: Boolean,
    default: false
  },
  claimedDate: Date,
  notes: String,
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } // 30 days
}, { timestamps: true });

const Referral = mongoose.model('Referral', ReferralSchema);

/**
 * Generate unique referral code
 */
const generateReferralCode = (userId) => {
  const hash = crypto.createHash('sha256');
  hash.update(userId + Date.now() + Math.random().toString());
  return 'MAT' + hash.digest('hex').substring(0, 8).toUpperCase();
};

/**
 * Create referral code for user
 */
const createReferralCode = async (referrerId, options = {}) => {
  try {
    const code = generateReferralCode(referrerId);
    
    const referral = new Referral({
      referrerId,
      referralCode: code,
      rewardTier: options.tier || 'bronze',
      expiresAt: options.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    await referral.save();
    return referral;
  } catch (error) {
    console.error('Error creating referral code:', error);
    throw error;
  }
};

/**
 * Validate referral code
 */
const validateReferralCode = async (code) => {
  try {
    const referral = await Referral.findOne({ 
      referralCode: code,
      status: 'active'
    });

    if (!referral) {
      return { valid: false, reason: 'Invalid or expired code' };
    }

    if (new Date() > referral.expiresAt) {
      await Referral.updateOne({ _id: referral._id }, { status: 'expired' });
      return { valid: false, reason: 'Code has expired' };
    }

    return { 
      valid: true, 
      referral,
      rewardTier: referral.rewardTier 
    };
  } catch (error) {
    console.error('Error validating referral code:', error);
    throw error;
  }
};

/**
 * Process referral conversion (when referred user signs up)
 */
const processReferralConversion = async (referralCode, newUserId, newUserEmail) => {
  try {
    const referral = await Referral.findOne({ referralCode });
    
    if (!referral) {
      return { success: false, reason: 'Referral code not found' };
    }

    if (referral.status !== 'active') {
      return { success: false, reason: 'Referral code is not active' };
    }

    // Calculate reward
    const rewardTiers = {
      bronze: 100,
      silver: 250,
      gold: 500,
      platinum: 1000
    };

    const rewardAmount = rewardTiers[referral.rewardTier] || 100;

    // Update referral
    await Referral.updateOne(
      { _id: referral._id },
      {
        status: 'used',
        referredUserId: newUserId,
        referredUserEmail: newUserEmail,
        conversionDate: new Date(),
        rewardAmount
      }
    );

    return {
      success: true,
      rewardAmount,
      message: `Congratulations! You earned ₹${rewardAmount} for this referral`
    };
  } catch (error) {
    console.error('Error processing referral conversion:', error);
    throw error;
  }
};

/**
 * Get referrer statistics
 */
const getReferrerStats = async (referrerId) => {
  try {
    const referrals = await Referral.find({ referrerId });

    const stats = {
      totalCodesGenerated: referrals.length,
      activeReferrals: referrals.filter(r => r.status === 'active').length,
      usedReferrals: referrals.filter(r => r.status === 'used').length,
      expiredReferrals: referrals.filter(r => r.status === 'expired').length,
      totalRewardsEarned: referrals.reduce((sum, r) => sum + (r.rewardAmount || 0), 0),
      totalRewardsClaimed: referrals
        .filter(r => r.rewardClaimed)
        .reduce((sum, r) => sum + (r.rewardAmount || 0), 0),
      conversionRate: referrals.length > 0 
        ? ((referrals.filter(r => r.status === 'used').length / referrals.length) * 100).toFixed(2)
        : 0,
      referralsByTier: {
        bronze: referrals.filter(r => r.rewardTier === 'bronze').length,
        silver: referrals.filter(r => r.rewardTier === 'silver').length,
        gold: referrals.filter(r => r.rewardTier === 'gold').length,
        platinum: referrals.filter(r => r.rewardTier === 'platinum').length
      }
    };

    return stats;
  } catch (error) {
    console.error('Error getting referrer stats:', error);
    throw error;
  }
};

/**
 * Claim referral reward
 */
const claimReferralReward = async (referralId) => {
  try {
    const referral = await Referral.findById(referralId);

    if (!referral) {
      return { success: false, reason: 'Referral not found' };
    }

    if (referral.status !== 'used') {
      return { success: false, reason: 'Only used referrals can claim rewards' };
    }

    if (referral.rewardClaimed) {
      return { success: false, reason: 'Reward already claimed' };
    }

    await Referral.updateOne(
      { _id: referralId },
      {
        rewardClaimed: true,
        claimedDate: new Date()
      }
    );

    return {
      success: true,
      rewardAmount: referral.rewardAmount,
      message: `Reward of ₹${referral.rewardAmount} has been credited to your wallet`
    };
  } catch (error) {
    console.error('Error claiming referral reward:', error);
    throw error;
  }
};

/**
 * Get top referrers (leaderboard)
 */
const getTopReferrers = async (limit = 10) => {
  try {
    const topReferrers = await Referral.aggregate([
      {
        $match: { status: 'used' }
      },
      {
        $group: {
          _id: '$referrerId',
          totalRewards: { $sum: '$rewardAmount' },
          conversions: { $sum: 1 }
        }
      },
      {
        $sort: { totalRewards: -1 }
      },
      {
        $limit: limit
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'referrer'
        }
      }
    ]);

    return topReferrers.map((item, index) => ({
      rank: index + 1,
      referrerId: item._id,
      referrerName: item.referrer?.[0]?.name || 'Unknown',
      totalConversions: item.conversions,
      totalRewardsEarned: item.totalRewards
    }));
  } catch (error) {
    console.error('Error fetching top referrers:', error);
    throw error;
  }
};

/**
 * Get referral campaign performance
 */
const getCampaignPerformance = async (days = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const referrals = await Referral.find({
      createdAt: { $gte: startDate }
    });

    const daily = {};
    referrals.forEach(ref => {
      const date = ref.createdAt.toISOString().split('T')[0];
      if (!daily[date]) {
        daily[date] = { created: 0, used: 0, rewards: 0 };
      }
      daily[date].created++;
      if (ref.status === 'used') {
        daily[date].used++;
        daily[date].rewards += ref.rewardAmount || 0;
      }
    });

    return {
      periodDays: days,
      totalCodesCreated: referrals.length,
      totalConversions: referrals.filter(r => r.status === 'used').length,
      totalRewardsPaid: referrals.reduce((sum, r) => sum + (r.rewardClaimed ? r.rewardAmount || 0 : 0), 0),
      conversionRate: (( referrals.filter(r => r.status === 'used').length / referrals.length) * 100).toFixed(2),
      averageRewardPerConversion: referrals.filter(r => r.status === 'used').length > 0
        ? (referrals.reduce((sum, r) => sum + (r.rewardAmount || 0), 0) / referrals.filter(r => r.status === 'used').length).toFixed(2)
        : 0,
      dailyPerformance: daily
    };
  } catch (error) {
    console.error('Error fetching campaign performance:', error);
    throw error;
  }
};

module.exports = {
  Referral,
  generateReferralCode,
  createReferralCode,
  validateReferralCode,
  processReferralConversion,
  getReferrerStats,
  claimReferralReward,
  getTopReferrers,
  getCampaignPerformance
};
