/**
 * Blue Tick Verification Service
 * Automatic & manual issuance of verified badges
 */

const BlueTick = require('../models/BlueTick');
const KYC = require('../models/KYC');
const MatrimonialProfile = require('../models/MatrimonialProfile');
const logger = require('../utils/logger');

/**
 * Calculate eligibility score for blue tick
 * Based on profile completeness and verification status
 */
const calculateEligibilityScore = async (profileId) => {
  try {
    let score = 0;
    const details = {};

    // Fetch related data
    const profile = await MatrimonialProfile.findById(profileId).lean();
    const kyc = await KYC.findOne({ profileId }).lean();
    const createdDaysAgo = profile ? Math.floor((Date.now() - new Date(profile.createdAt)) / (1000 * 60 * 60 * 24)) : 0;

    // 1. KYC Verified (40 points)
    if (kyc?.status === 'approved') {
      score += 40;
      details.kycVerified = true;
      const kycDaysAgo = Math.floor((Date.now() - new Date(kyc.approvedAt)) / (1000 * 60 * 60 * 24));
      details.kyc6MonthsOld = kycDaysAgo >= 180;
      if (details.kyc6MonthsOld) score += 5; // Bonus for 6-month stability
    }

    // 2. No Fraud Reports (20 points)
    if (!kyc?.flags?.duplicateProfile && !kyc?.flags?.suspiciousActivity) {
      score += 20;
      details.noFraudReports = true;
    }

    // 3. Active Profile (15 points)
    const lastActive = profile?.lastActive || profile?.createdAt;
    const daysInactive = Math.floor((Date.now() - new Date(lastActive)) / (1000 * 60 * 60 * 24));
    if (daysInactive < 30) {
      score += 15;
      details.activeProfile = true;
    }

    // 4. Complete Profile (10 points)
    if (profile?.isComplete || (profile?.photos?.length >= 2 && profile?.bio?.length > 50)) {
      score += 10;
      details.completeProfile = true;
    }

    // 5. Profile Age (10 points)
    if (createdDaysAgo >= 90) {
      score += 10;
      details.profileAge3Months = true;
    }

    // 6. No User Complaints (5 points)
    if (!profile?.reportedCount || profile.reportedCount === 0) {
      score += 5;
      details.noUserComplaints = true;
    }

    // 7. Email & Phone Verified (5 points)
    if (kyc?.emailVerified && kyc?.phoneVerified) {
      score += 5;
      details.passwordSecurityPassed = true;
    }

    return {
      score: Math.min(score, 100),
      details,
      eligible: score >= 50,
    };
  } catch (error) {
    logger.error(`Error calculating eligibility: ${error.message}`);
    return { score: 0, details: {}, eligible: false };
  }
};

/**
 * Issue blue tick automatically if eligible
 */
const autoIssueBlueTick = async (profileId) => {
  try {
    const eligibility = await calculateEligibilityScore(profileId);

    if (!eligibility.eligible) {
      logger.info(`Profile ${profileId} not eligible for auto blue tick (score: ${eligibility.score})`);
      return null;
    }

    // Check if already exists
    let blueTick = await BlueTick.findOne({ profileId });

    if (blueTick) {
      // Update existing
      blueTick.status = 'approved';
      blueTick.issuedAt = new Date();
      blueTick.issuedBy = 'automatic';
      blueTick.issueReason = 'auto_eligible';
      blueTick.requirementsMet = eligibility.details;
      blueTick.eligibilityScore = eligibility.score;
      blueTick.expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
    } else {
      // Create new
      blueTick = new BlueTick({
        profileId,
        status: 'approved',
        issuedAt: new Date(),
        issuedBy: 'automatic',
        issueReason: 'auto_eligible',
        requirementsMet: eligibility.details,
        eligibilityScore: eligibility.score,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        autoRenew: true,
      });
    }

    await blueTick.save();
    logger.info(`Blue tick auto-issued for profile ${profileId}`);

    return blueTick;
  } catch (error) {
    logger.error(`Error auto-issuing blue tick: ${error.message}`);
    return null;
  }
};

/**
 * Issue blue tick manually (admin action)
 */
const issueBlueTickManually = async (profileId, adminEmail, notes) => {
  try {
    let blueTick = await BlueTick.findOne({ profileId });

    if (!blueTick) {
      blueTick = new BlueTick({ profileId });
    }

    blueTick.status = 'approved';
    blueTick.issuedAt = new Date();
    blueTick.issuedBy = adminEmail;
    blueTick.issueReason = 'manual_approval';
    blueTick.expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    blueTick.adminReview = {
      reviewedAt: new Date(),
      reviewedBy: adminEmail,
      reviewNotes: notes,
      manualVerification: true,
      decision: 'approved',
    };

    await blueTick.save();
    logger.info(`Blue tick manually issued by ${adminEmail} for profile ${profileId}`);

    return blueTick;
  } catch (error) {
    logger.error(`Error issuing blue tick manually: ${error.message}`);
    throw error;
  }
};

/**
 * Reject blue tick
 */
const rejectBlueTick = async (profileId, adminEmail, reason, notes) => {
  try {
    let blueTick = await BlueTick.findOne({ profileId });

    if (!blueTick) {
      blueTick = new BlueTick({ profileId });
    }

    blueTick.status = 'rejected';
    blueTick.adminReview = {
      reviewedAt: new Date(),
      reviewedBy: adminEmail,
      reviewNotes: notes,
      decision: 'rejected',
    };

    await blueTick.save();
    logger.info(`Blue tick rejected for profile ${profileId}: ${reason}`);

    return blueTick;
  } catch (error) {
    logger.error(`Error rejecting blue tick: ${error.message}`);
    throw error;
  }
};

/**
 * Revoke blue tick (due to violations)
 */
const revokeBlueTick = async (profileId, adminEmail, reason) => {
  try {
    const blueTick = await BlueTick.findOne({ profileId });

    if (!blueTick) {
      throw new Error('Blue tick not found');
    }

    blueTick.status = 'revoked';
    blueTick.revokedAt = new Date();
    blueTick.revokedBy = adminEmail;
    blueTick.revocationReason = reason;

    // Increment risk monitoring
    blueTick.riskMonitoring.riskLevel = 'high';

    await blueTick.save();
    logger.warn(`Blue tick revoked for profile ${profileId}: ${reason}`);

    return blueTick;
  } catch (error) {
    logger.error(`Error revoking blue tick: ${error.message}`);
    throw error;
  }
};

/**
 * Check if profile has valid blue tick
 */
const hasBlueTick = async (profileId) => {
  try {
    const blueTick = await BlueTick.findOne({
      profileId,
      status: 'approved',
      expiryDate: { $gt: new Date() },
    }).lean();

    return !!blueTick;
  } catch (error) {
    logger.error(`Error checking blue tick: ${error.message}`);
    return false;
  }
};

/**
 * Perform periodic blue tick maintenance
 * - Renew eligible blue ticks
 * - Revoke high-risk profiles
 * - Update eligibility scores
 */
const performBluTickMaintenance = async () => {
  try {
    // Find all approved blue ticks
    const blueTicks = await BlueTick.find({ status: 'approved' });

    for (const tick of blueTicks) {
      // Check for expiry
      if (tick.expiryDate && tick.expiryDate < new Date()) {
        if (tick.autoRenew) {
          tick.expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
          tick.renewalHistory.push({
            renewedAt: new Date(),
            renewalScore: tick.eligibilityScore,
            renewalStatus: 'auto_renewed',
          });
          await tick.save();
        }
      }

      // Monitor risk
      if (tick.riskMonitoring.riskLevel === 'high') {
        await revokeBlueTick(tick.profileId, 'system', 'High-risk detected');
      }
    }

    logger.info('Blue tick maintenance completed');
  } catch (error) {
    logger.error(`Error performing blue tick maintenance: ${error.message}`);
  }
};

module.exports = {
  calculateEligibilityScore,
  autoIssueBlueTick,
  issueBlueTickManually,
  rejectBlueTick,
  revokeBlueTick,
  hasBlueTick,
  performBluTickMaintenance,
};
