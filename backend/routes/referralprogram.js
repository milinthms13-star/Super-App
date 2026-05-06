const express = require('express');
const router = express.Router();
const ReferralProgram = require('../models/ReferralProgram');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const { authenticate } = require('../middleware/auth');

// Generate unique referral code
const generateReferralCode = () => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();

const calculateRewardAmount = (referral) =>
  Number(referral.rewardAmount || 0) * (1 + Number(referral.tierBenefits?.rewardPercentage || 0) / 100);

const buildReferralStats = (referral) => {
  const totalReferrals = Number(referral.totalReferrals || 0);
  const successfulReferrals = Number(referral.successfulReferrals || 0);

  return {
    totalReferrals,
    successfulReferrals,
    conversionRate: totalReferrals > 0
      ? ((successfulReferrals / totalReferrals) * 100).toFixed(2)
      : '0.00',
    totalRewardsEarned: Number(referral.totalRewardsEarned || 0),
    tier: referral.tier,
    pendingReferrals: referral.referredUsers.filter((u) => u.conversionStatus === 'Pending').length,
    referredUsers: referral.referredUsers,
  };
};

// Get or create referral program for user
router.get('/my-referral', authenticate, async (req, res) => {
  try {
    const referrerEmail = normalizeEmail(req.user.email);
    let referral = await ReferralProgram.findOne({ referrerEmail });

    if (!referral) {
      const referralCode = generateReferralCode();
      referral = new ReferralProgram({
        referrerEmail,
        referrerName: req.user.name,
        referralCode,
      });
      await referral.save();
    }

    res.json({
      success: true,
      data: referral,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching referral program',
      error: error.message,
    });
  }
});

// Track referral (when new user signs up with referral code)
router.post('/track-referral', async (req, res) => {
  try {
    const { referralCode, newUserEmail, newUserName } = req.body;
    const normalizedNewUserEmail = normalizeEmail(newUserEmail);

    if (!referralCode || !normalizedNewUserEmail || !newUserName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const referral = await ReferralProgram.findOne({
      referralCode: referralCode.toUpperCase(),
    });

    if (!referral) {
      return res.status(404).json({
        success: false,
        message: 'Invalid referral code',
      });
    }

    // Add referred user
    const referredUserIndex = referral.referredUsers.findIndex(
      (u) => u.email === normalizedNewUserEmail
    );

    if (referredUserIndex > -1) {
      referral.referredUsers[referredUserIndex].name = newUserName;
      referral.referredUsers[referredUserIndex].signedUpAt =
        referral.referredUsers[referredUserIndex].signedUpAt || new Date();
      referral.referredUsers[referredUserIndex].conversionStatus = 'Converted';
    } else {
      referral.referredUsers.push({
        email: normalizedNewUserEmail,
        name: newUserName,
        signedUpAt: new Date(),
        conversionStatus: 'Converted',
      });
    }

    const resolvedReferralIndex =
      referredUserIndex > -1 ? referredUserIndex : referral.referredUsers.length - 1;
    const referredUser = referral.referredUsers[resolvedReferralIndex];

    referral.totalReferrals = referral.referredUsers.length;
    referral.successfulReferrals = referral.referredUsers.filter(
      (u) => u.conversionStatus === 'Converted'
    ).length;

    const alreadyCredited = referredUser.rewardStatus === 'Credited';

    if (!alreadyCredited) {
      // Credit wallet for referrer exactly once per referred user
      let wallet = await Wallet.findOne({ userEmail: referral.referrerEmail });
      if (!wallet) {
        wallet = new Wallet({
          userEmail: referral.referrerEmail,
          userName: referral.referrerName,
        });
      }

      const rewardAmount = calculateRewardAmount(referral);
      wallet.balance = Number(wallet.balance || 0) + rewardAmount;
      wallet.transactions.push({
        transactionId: `ref-${Date.now()}`,
        type: 'Credit',
        amount: rewardAmount,
        description: `Referral reward for ${newUserName}`,
        status: 'Completed',
      });
      referral.totalRewardsEarned = Number(referral.totalRewardsEarned || 0) + rewardAmount;
      referredUser.rewardStatus = 'Credited';

      await wallet.save();
    }

    await referral.save();

    res.json({
      success: true,
      message: alreadyCredited ? 'Referral already tracked' : 'Referral tracked successfully',
      data: referral,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error tracking referral',
      error: error.message,
    });
  }
});

// Get referral statistics
router.get('/statistics', authenticate, async (req, res) => {
  try {
    const referral = await ReferralProgram.findOne({ referrerEmail: normalizeEmail(req.user.email) });

    if (!referral) {
      return res.status(404).json({
        success: false,
        message: 'Referral program not found',
      });
    }

    res.json({
      success: true,
      data: buildReferralStats(referral),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching referral statistics',
      error: error.message,
    });
  }
});

// Update referral tier based on performance
router.put('/update-tier', authenticate, async (req, res) => {
  try {
    const referral = await ReferralProgram.findOne({ referrerEmail: normalizeEmail(req.user.email) });

    if (!referral) {
      return res.status(404).json({
        success: false,
        message: 'Referral program not found',
      });
    }

    // Determine tier based on successful referrals
    const successful = referral.successfulReferrals;
    let newTier = 'Bronze';
    let rewardPercentage = 5;

    if (successful >= 50) {
      newTier = 'Platinum';
      rewardPercentage = 20;
    } else if (successful >= 30) {
      newTier = 'Gold';
      rewardPercentage = 15;
    } else if (successful >= 15) {
      newTier = 'Silver';
      rewardPercentage = 10;
    }

    referral.tier = newTier;
    referral.tierBenefits.rewardPercentage = rewardPercentage;
    await referral.save();

    res.json({
      success: true,
      message: `Tier updated to ${newTier}`,
      data: referral,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating tier',
      error: error.message,
    });
  }
});

// Pause/Resume referral program
router.put('/toggle-status', authenticate, async (req, res) => {
  try {
    const referral = await ReferralProgram.findOne({ referrerEmail: normalizeEmail(req.user.email) });

    if (!referral) {
      return res.status(404).json({
        success: false,
        message: 'Referral program not found',
      });
    }

    referral.status = referral.status === 'Active' ? 'Paused' : 'Active';
    await referral.save();

    res.json({
      success: true,
      message: `Referral program ${referral.status}`,
      data: referral,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating referral status',
      error: error.message,
    });
  }
});

module.exports = router;
module.exports.__testables = {
  buildReferralStats,
  calculateRewardAmount,
  normalizeEmail,
};
