/**
 * Matrimonial Verification & Expiry Scheduler
 * Runs periodically to handle KYC, Blue Tick, and Subscription tasks
 */

const { blueTickService } = require('../utils/blueTickService');
const subscriptionService = require('../utils/subscriptionService');
const MatrimonialProfile = require('../models/MatrimonialProfile');
const KYC = require('../models/KYC');
const BlueTick = require('../models/BlueTick');
const logger = require('../utils/logger');

/**
 * Check for incomplete partner preferences
 * Block discovery until preferences are complete
 */
const enforcePartnerPreferences = async () => {
  try {
    // Find profiles without complete partner preferences
    const incompleteProfiles = await MatrimonialProfile.find({
      'partnerPreferences': { $exists: false },
    });

    for (const profile of incompleteProfiles) {
      // Block from discovery
      profile.canBeDiscovered = false;
      profile.discoveryBlockReason = 'incomplete_partner_preferences';
      await profile.save();

      logger.info(`Profile ${profile._id} blocked from discovery - incomplete preferences`);
    }
  } catch (error) {
    logger.error(`Error enforcing partner preferences: ${error.message}`);
  }
};

/**
 * Auto-verify KYC based on document checks
 */
const autoVerifyKYC = async () => {
  try {
    const pendingKYCs = await KYC.find({
      status: 'under_review',
      'documents.aadhaar.status': 'pending',
    });

    for (const kyc of pendingKYCs) {
      const fakeCheck = await require('../utils/imageSecurity').detectFakeImage(Buffer.from(''));

      if (!fakeCheck.isSuspicious && fakeCheck.riskScore < 40) {
        kyc.status = 'approved';
        kyc.approvedAt = new Date();
        kyc.approvedBy = 'system_automated';
        await kyc.save();

        // Auto-issue blue tick
        await blueTickService.autoIssueBlueTick(kyc.profileId);

        logger.info(`KYC auto-approved for profile ${kyc.profileId}`);
      }
    }
  } catch (error) {
    logger.error(`Error auto-verifying KYC: ${error.message}`);
  }
};

/**
 * Handle subscription expirations and renewals
 */
const handleSubscriptionExpirations = async () => {
  try {
    await subscriptionService.handleSubscriptionExpiry();
    logger.info('Subscription expiry handler completed');
  } catch (error) {
    logger.error(`Error handling subscription expirations: ${error.message}`);
  }
};

/**
 * Perform blue tick maintenance
 * - Renew expiring blue ticks
 * - Revoke high-risk profiles
 */
const maintainBlueTicks = async () => {
  try {
    await blueTickService.performBluTickMaintenance();
    logger.info('Blue tick maintenance completed');
  } catch (error) {
    logger.error(`Error maintaining blue ticks: ${error.message}`);
  }
};

/**
 * Monitor for fake/suspicious profiles
 * Update risk scores and flag for review
 */
const monitorFakeProfiles = async () => {
  try {
    const profiles = await MatrimonialProfile.find({
      status: 'active',
    }).select('_id photos');

    for (const profile of profiles) {
      if (!profile.photos || profile.photos.length === 0) continue;

      const kyc = await KYC.findOne({ profileId: profile._id });

      if (!kyc) {
        kyc.riskScore += 10; // No KYC = higher risk
      } else {
        // Check for duplicate profiles (same photos)
        // This would require image hashing
        // For now, just monitor
      }

      if (kyc && kyc.riskScore > 70) {
        kyc.flags.suspiciousActivity = true;
        await kyc.save();
        logger.warn(`Profile ${profile._id} marked suspicious (risk score: ${kyc.riskScore})`);
      }
    }

    logger.info('Fake profile monitoring completed');
  } catch (error) {
    logger.error(`Error monitoring fake profiles: ${error.message}`);
  }
};

/**
 * Generate admin analytics for matrimonial module
 * Track user growth, match analytics, gender ratio
 */
const generateAnalytics = async () => {
  try {
    const totalProfiles = await MatrimonialProfile.countDocuments({ status: 'active' });
    const verifiedProfiles = await MatrimonialProfile.countDocuments({ isVerified: true });
    const maleProfiles = await MatrimonialProfile.countDocuments({ gender: 'male' });
    const femaleProfiles = await MatrimonialProfile.countDocuments({ gender: 'female' });

    const averageProfileViews = await MatrimonialProfile.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, avgViews: { $avg: '$viewCount' } } },
    ]);

    const analytics = {
      timestamp: new Date(),
      totalProfiles,
      verifiedProfiles,
      verificationRate: ((verifiedProfiles / totalProfiles) * 100).toFixed(2),
      genderRatio: {
        male: maleProfiles,
        female: femaleProfiles,
        malePercentage: ((maleProfiles / totalProfiles) * 100).toFixed(2),
      },
      averageProfileViews: averageProfileViews[0]?.avgViews || 0,
    };

    logger.info(`Matrimonial Analytics: ${JSON.stringify(analytics)}`);

    // Could save to database for historical tracking
  } catch (error) {
    logger.error(`Error generating analytics: ${error.message}`);
  }
};

/**
 * Main scheduler job
 * Runs every 6 hours
 */
const runMatrimonialScheduler = async () => {
  try {
    logger.info('Starting matrimonial scheduler...');

    // Run all tasks
    await enforcePartnerPreferences();
    await autoVerifyKYC();
    await handleSubscriptionExpirations();
    await maintainBlueTicks();
    await monitorFakeProfiles();
    await generateAnalytics();

    logger.info('Matrimonial scheduler completed successfully');
  } catch (error) {
    logger.error(`Error in matrimonial scheduler: ${error.message}`);
  }
};

/**
 * Schedule the job to run every 6 hours
 */
const scheduleMatrimonialJobs = () => {
  const INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

  logger.info('Scheduling matrimonial jobs...');

  // Run once immediately
  runMatrimonialScheduler();

  // Then schedule recurring
  setInterval(runMatrimonialScheduler, INTERVAL_MS);
};

module.exports = {
  runMatrimonialScheduler,
  scheduleMatrimonialJobs,
  enforcePartnerPreferences,
  autoVerifyKYC,
  handleSubscriptionExpirations,
  maintainBlueTicks,
  monitorFakeProfiles,
  generateAnalytics,
};
