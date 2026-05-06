/**
 * Admin Analytics Service
 * Provides matrimonial metrics: user growth, match analytics, gender ratio, etc.
 */

const MatrimonialProfile = require('../models/MatrimonialProfile');
const { subscriptionService } = require('./subscriptionService');
const KYC = require('../models/KYC');
const BlueTick = require('../models/BlueTick');

/**
 * Get user growth analytics
 */
const getUserGrowthAnalytics = async (periodDays = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const profiles = await MatrimonialProfile.find({
      createdAt: { $gte: startDate }
    }).select('createdAt gender maritalStatus religion location');

    // Group by date
    const dailyGrowth = {};
    profiles.forEach(profile => {
      const date = profile.createdAt.toISOString().split('T')[0];
      dailyGrowth[date] = (dailyGrowth[date] || 0) + 1;
    });

    // Calculate cumulative
    const dates = Object.keys(dailyGrowth).sort();
    let cumulative = 0;
    const cumulativeGrowth = {};
    dates.forEach(date => {
      cumulative += dailyGrowth[date];
      cumulativeGrowth[date] = cumulative;
    });

    return {
      periodDays,
      totalNewProfiles: profiles.length,
      dailyAverage: Math.round(profiles.length / periodDays),
      dailyGrowth,
      cumulativeGrowth,
      genderBreakdown: {
        male: profiles.filter(p => p.gender === 'male').length,
        female: profiles.filter(p => p.gender === 'female').length,
        other: profiles.filter(p => p.gender === 'other').length
      }
    };
  } catch (error) {
    console.error('Error fetching user growth analytics:', error);
    throw error;
  }
};

/**
 * Get match analytics
 */
const getMatchAnalytics = async () => {
  try {
    const profiles = await MatrimonialProfile.find().select('interests sentInterests viewHistory');

    const totalInterests = profiles.reduce((sum, p) => sum + (p.interests?.length || 0), 0);
    const totalSentInterests = profiles.reduce((sum, p) => sum + (p.sentInterests?.length || 0), 0);
    const acceptanceRate = totalInterests > 0 
      ? ((profiles.reduce((sum, p) => 
          sum + (p.interests?.filter(i => i.status === 'accepted').length || 0), 0) 
          / totalInterests) * 100).toFixed(2)
      : 0;

    const totalViews = profiles.reduce((sum, p) => sum + (p.viewHistory?.length || 0), 0);

    return {
      totalInterests,
      totalSentInterests,
      acceptanceRate: `${acceptanceRate}%`,
      interestToAcceptRatio: totalInterests > 0 ? (acceptanceRate / 100).toFixed(2) : 0,
      totalProfileViews: totalViews,
      averageViewsPerProfile: profiles.length > 0 ? (totalViews / profiles.length).toFixed(2) : 0
    };
  } catch (error) {
    console.error('Error fetching match analytics:', error);
    throw error;
  }
};

/**
 * Get gender ratio analytics
 */
const getGenderRatioAnalytics = async () => {
  try {
    const profiles = await MatrimonialProfile.find().select('gender maritalStatus religion');

    const genderCounts = {
      male: profiles.filter(p => p.gender === 'male').length,
      female: profiles.filter(p => p.gender === 'female').length,
      other: profiles.filter(p => p.gender === 'other').length
    };

    const total = genderCounts.male + genderCounts.female + genderCounts.other;
    const percentages = {
      male: ((genderCounts.male / total) * 100).toFixed(2),
      female: ((genderCounts.female / total) * 100).toFixed(2),
      other: ((genderCounts.other / total) * 100).toFixed(2)
    };

    return {
      totalProfiles: total,
      genderCounts,
      genderPercentages: percentages,
      ratio: `${genderCounts.male}:${genderCounts.female}`,
      maleToFemaleRatio: (genderCounts.male / genderCounts.female).toFixed(2)
    };
  } catch (error) {
    console.error('Error fetching gender ratio analytics:', error);
    throw error;
  }
};

/**
 * Get subscription revenue analytics
 */
const getSubscriptionAnalytics = async () => {
  try {
    const tierPrices = {
      free: 0,
      gold: 499,
      premium: 999,
      vip: 2999
    };

    const profiles = await MatrimonialProfile.find().select('email premiumUntil');
    
    let revenue = 0;
    let mrr = 0; // Monthly recurring revenue
    const tierBreakdown = {
      free: 0,
      gold: 0,
      premium: 0,
      vip: 0
    };

    for (const profile of profiles) {
      const subscription = await subscriptionService.getUserSubscription(profile.email);
      const tier = subscription.tier || 'free';
      tierBreakdown[tier]++;

      if (subscription.isActive && tierPrices[tier] > 0) {
        mrr += tierPrices[tier] / 30; // Approximate daily MRR
      }
    }

    mrr = Math.round(mrr * 30); // Convert to monthly

    return {
      totalActiveSubscriptions: profiles.length - tierBreakdown.free,
      tierBreakdown,
      estimatedMRR: mrr,
      estimatedARR: Math.round(mrr * 12),
      conversationRate: ((( profiles.length - tierBreakdown.free) / profiles.length) * 100).toFixed(2),
      topTier: Object.entries(tierBreakdown)
        .filter(([tier]) => tier !== 'free')
        .sort(([, countA], [, countB]) => countB - countA)[0]?.[0] || 'N/A'
    };
  } catch (error) {
    console.error('Error fetching subscription analytics:', error);
    throw error;
  }
};

/**
 * Get verification & KYC analytics
 */
const getVerificationAnalytics = async () => {
  try {
    const allProfiles = await MatrimonialProfile.find().select('verificationStatus email');
    const kycRecords = await KYC.find().select('status createdAt');
    const blueTickRecords = await BlueTick.find().select('status eligibilityScore');

    const profileVerification = {
      pending: allProfiles.filter(p => p.verificationStatus === 'pending').length,
      verified: allProfiles.filter(p => p.verificationStatus === 'verified').length,
      rejected: allProfiles.filter(p => p.verificationStatus === 'rejected').length
    };

    const kycStatus = {
      pending: kycRecords.filter(k => k.status === 'pending').length,
      approved: kycRecords.filter(k => k.status === 'approved').length,
      rejected: kycRecords.filter(k => k.status === 'rejected').length,
      under_review: kycRecords.filter(k => k.status === 'under_review').length
    };

    const blueTickStatus = {
      not_eligible: blueTickRecords.filter(b => b.status === 'not_eligible').length,
      pending_review: blueTickRecords.filter(b => b.status === 'pending_review').length,
      approved: blueTickRecords.filter(b => b.status === 'approved').length,
      rejected: blueTickRecords.filter(b => b.status === 'rejected').length
    };

    const avgEligibilityScore = blueTickRecords.length > 0
      ? (blueTickRecords.reduce((sum, b) => sum + (b.eligibilityScore || 0), 0) / blueTickRecords.length).toFixed(2)
      : 0;

    return {
      profileVerification,
      verificationRate: ((profileVerification.verified / allProfiles.length) * 100).toFixed(2),
      kycStatus,
      kycCompletionRate: ((kycStatus.approved / kycRecords.length) * 100).toFixed(2),
      blueTickStatus,
      blueTickIssued: blueTickStatus.approved,
      averageEligibilityScore: avgEligibilityScore
    };
  } catch (error) {
    console.error('Error fetching verification analytics:', error);
    throw error;
  }
};

/**
 * Get comprehensive dashboard analytics
 */
const getDashboardAnalytics = async () => {
  try {
    const [userGrowth, matches, genderRatio, subscriptions, verification] = await Promise.all([
      getUserGrowthAnalytics(30),
      getMatchAnalytics(),
      getGenderRatioAnalytics(),
      getSubscriptionAnalytics(),
      getVerificationAnalytics()
    ]);

    return {
      timestamp: new Date(),
      userGrowth,
      matches,
      genderRatio,
      subscriptions,
      verification,
      summary: {
        totalProfiles: genderRatio.totalProfiles,
        maleToFemaleRatio: genderRatio.maleToFemaleRatio,
        verificationRate: verification.verificationRate,
        estimatedMRR: subscriptions.estimatedMRR,
        acceptanceRate: matches.acceptanceRate
      }
    };
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    throw error;
  }
};

module.exports = {
  getUserGrowthAnalytics,
  getMatchAnalytics,
  getGenderRatioAnalytics,
  getSubscriptionAnalytics,
  getVerificationAnalytics,
  getDashboardAnalytics
};
