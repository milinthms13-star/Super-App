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

// Get or create referral program for user
router.get('/my-referral', authenticate, async (req, res) => {
  try {
    let referral = await ReferralProgram.findOne({ referrerEmail: req.user.email });

    if (!referral) {
      const referralCode = generateReferralCode();
      referral = new ReferralProgram({
        referrerEmail: req.user.email,
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

    if (!referralCode || !newUserEmail || !newUserName) {
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
      (u) => u.email === newUserEmail.toLowerCase()
    );

    if (referredUserIndex > -1) {
      referral.referredUsers[referredUserIndex].signedUpAt = new Date();
      referral.referredUsers[referredUserIndex].conversionStatus = 'Converted';
    } else {
      referral.referredUsers.push({
        email: newUserEmail.toLowerCase(),
        name: newUserName,
        signedUpAt: new Date(),
        conversionStatus: 'Converted',
      });
    }

    referral.totalReferrals = referral.referredUsers.length;
    referral.successfulReferrals = referral.referredUsers.filter(
      (u) => u.conversionStatus === 'Converted'
    ).length;

    // Credit wallet for referrer
    let wallet = await Wallet.findOne({ userEmail: referral.referrerEmail });
    if (!wallet) {
      wallet = new Wallet({
        userEmail: referral.referrerEmail,
        userName: referral.referrerName,
      });
    }

    const rewardAmount = referral.rewardAmount * (1 + referral.tierBenefits.rewardPercentage / 100);
    wallet.balance += rewardAmount;
    wallet.transactions.push({
      transactionId: `ref-${Date.now()}`,
      type: 'Credit',
      amount: rewardAmount,
      description: `Referral reward for ${newUserName}`,
      status: 'Completed',
    });
    referral.totalRewardsEarned += rewardAmount;
    referral.referredUsers[referral.referredUsers.length - 1].rewardStatus = 'Credited';

    await wallet.save();
    await referral.save();

    res.json({
      success: true,
      message: 'Referral tracked successfully',
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
    const referral = await ReferralProgram.findOne({ referrerEmail: req.user.email });

    if (!referral) {
      return res.status(404).json({
        success: false,
        message: 'Referral program not found',
      });
    }

    const stats = {
      totalReferrals: referral.totalReferrals,
      successfulReferrals: referral.successfulReferrals,
      conversionRate: (referral.successfulReferrals / referral.totalReferrals * 100).toFixed(2),
      totalRewardsEarned: referral.totalRewardsEarned,
      tier: referral.tier,
      pendingReferrals: referral.referredUsers.filter((u) => u.conversionStatus === 'Pending').length,
      referredUsers: referral.referredUsers,
    };

    res.json({
      success: true,
      data: stats,
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
    const referral = await ReferralProgram.findOne({ referrerEmail: req.user.email });

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
    const referral = await ReferralProgram.findOne({ referrerEmail: req.user.email });

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
