/**
 * VerificationBadgeService.js
 * Driver & Rider verification badge system with document expiry tracking
 */

const DriverProfile = require('../models/DriverProfile');
const RiderProfile = require('../models/RiderProfile');
const UserBadge = require('../models/UserBadge');
const notificationService = require('./notificationService');

class VerificationBadgeService {
  /**
   * 1. Check and award verification badges
   */
  async checkAndAwardBadges(userId, userType) {
    try {
      const profile = userType === 'driver'
        ? await DriverProfile.findOne({ userId })
        : await RiderProfile.findOne({ userId });

      if (!profile) throw new Error('User profile not found');

      const badges = [];

      if (userType === 'driver') {
        // Driver badges
        if (this.isFullyVerified(profile)) {
          badges.push(await this.awardBadge(userId, 'verified', 'Verified Driver', '✓'));
        }

        if (this.isSuperDriver(profile)) {
          badges.push(await this.awardBadge(userId, 'super_driver', 'Super Driver', '⭐'));
        }

        if (this.isGreenDriver(profile)) {
          badges.push(await this.awardBadge(userId, 'green_driver', 'Eco-Friendly', '🌱'));
        }

        if (this.isTopRated(profile)) {
          badges.push(await this.awardBadge(userId, 'top_rated', 'Top Rated', '👑'));
        }
      } else {
        // Rider badges
        if (this.isVerifiedRider(profile)) {
          badges.push(await this.awardBadge(userId, 'verified_rider', 'Verified Rider', '✓'));
        }

        if (this.isTrustedRider(profile)) {
          badges.push(await this.awardBadge(userId, 'trusted', 'Trusted Rider', '⭐'));
        }
      }

      return {
        success: true,
        badges,
        message: `${badges.length} badge(s) awarded`,
      };
    } catch (error) {
      console.error('Error checking and awarding badges:', error);
      throw new Error(`Failed to award badges: ${error.message}`);
    }
  }

  /**
   * 2. Track document expiry dates
   */
  async trackDocumentExpiry(userId) {
    try {
      const driver = await DriverProfile.findOne({ userId });
      if (!driver) throw new Error('Driver profile not found');

      const expiryAlerts = [];
      const today = new Date();
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Check license expiry
      if (driver.licenseExpiry && driver.licenseExpiry < thirtyDaysFromNow) {
        expiryAlerts.push({
          document: 'Driving License',
          expiryDate: driver.licenseExpiry,
          daysRemaining: Math.ceil((driver.licenseExpiry - today) / (24 * 60 * 60 * 1000)),
          expired: driver.licenseExpiry < today,
        });

        // Send notification
        await notificationService.sendNotification(userId, {
          type: 'document_expiry_alert',
          title: 'Document Expiring Soon',
          body: `Your Driving License expires on ${driver.licenseExpiry.toDateString()}`,
          actionUrl: '/driver/profile/update-license',
        });
      }

      // Check vehicle registration expiry
      if (driver.rcExpiry && driver.rcExpiry < thirtyDaysFromNow) {
        expiryAlerts.push({
          document: 'Vehicle Registration',
          expiryDate: driver.rcExpiry,
          daysRemaining: Math.ceil((driver.rcExpiry - today) / (24 * 60 * 60 * 1000)),
          expired: driver.rcExpiry < today,
        });

        await notificationService.sendNotification(userId, {
          type: 'document_expiry_alert',
          title: 'Document Expiring Soon',
          body: `Your Vehicle Registration expires on ${driver.rcExpiry.toDateString()}`,
          actionUrl: '/driver/profile/update-rc',
        });
      }

      // Check insurance expiry
      if (driver.insuranceExpiry && driver.insuranceExpiry < thirtyDaysFromNow) {
        expiryAlerts.push({
          document: 'Vehicle Insurance',
          expiryDate: driver.insuranceExpiry,
          daysRemaining: Math.ceil((driver.insuranceExpiry - today) / (24 * 60 * 60 * 1000)),
          expired: driver.insuranceExpiry < today,
        });

        await notificationService.sendNotification(userId, {
          type: 'document_expiry_alert',
          title: 'Document Expiring Soon',
          body: `Your Vehicle Insurance expires on ${driver.insuranceExpiry.toDateString()}`,
          actionUrl: '/driver/profile/update-insurance',
        });
      }

      // Check pollution certificate expiry
      if (driver.pollutionExpiry && driver.pollutionExpiry < thirtyDaysFromNow) {
        expiryAlerts.push({
          document: 'Pollution Certificate',
          expiryDate: driver.pollutionExpiry,
          daysRemaining: Math.ceil((driver.pollutionExpiry - today) / (24 * 60 * 60 * 1000)),
          expired: driver.pollutionExpiry < today,
        });

        await notificationService.sendNotification(userId, {
          type: 'document_expiry_alert',
          title: 'Document Expiring Soon',
          body: `Your Pollution Certificate expires on ${driver.pollutionExpiry.toDateString()}`,
          actionUrl: '/driver/profile/update-pollution',
        });
      }

      // If any document expired, disable driver
      const hasExpired = expiryAlerts.some((alert) => alert.expired);
      if (hasExpired) {
        driver.isActive = false;
        driver.deactivationReason = 'Document(s) expired';
        await driver.save();

        await notificationService.sendNotification(userId, {
          type: 'account_disabled',
          title: 'Account Disabled',
          body: 'Your account has been disabled due to expired documents. Please update them immediately.',
          priority: 'high',
        });
      }

      return {
        success: true,
        expiryAlerts,
        allDocsValid: expiryAlerts.length === 0 && !hasExpired,
      };
    } catch (error) {
      console.error('Error tracking document expiry:', error);
      throw new Error(`Failed to track expiry: ${error.message}`);
    }
  }

  /**
   * 3. Calculate rider trust score
   */
  async calculateRiderTrustScore(userId) {
    try {
      const rider = await RiderProfile.findOne({ userId }).populate('userId');
      if (!rider) throw new Error('Rider profile not found');

      let trustScore = 50; // Base score

      // Factors that increase trust
      if (rider.emailVerified) trustScore += 5;
      if (rider.phoneVerified) trustScore += 5;
      if (rider.emergencyContactVerified) trustScore += 10;
      if (rider.rideCount >= 10) trustScore += 5;
      if (rider.rideCount >= 50) trustScore += 5;
      if (rider.rideCount >= 100) trustScore += 5;

      // Average rating (0-5 to 0-10)
      if (rider.averageRating) {
        trustScore += (rider.averageRating / 5) * 15;
      }

      // Cancellation rate (lower is better)
      const cancellationRate = rider.cancelledRides / (rider.rideCount || 1);
      if (cancellationRate < 0.05) trustScore += 10; // < 5% cancellation
      else if (cancellationRate < 0.1) trustScore += 5; // < 10% cancellation
      else if (cancellationRate > 0.2) trustScore -= 10; // > 20% cancellation

      // Negative factors
      if (rider.complaints && rider.complaints > 0) trustScore -= rider.complaints * 5;
      if (rider.reportedCount && rider.reportedCount > 0) trustScore -= rider.reportedCount * 10;

      // Cap between 0 and 100
      trustScore = Math.max(0, Math.min(100, trustScore));

      // Award blue tick if score > 80
      if (trustScore > 80) {
        await this.awardBadge(userId, 'blue_tick', 'Trusted Rider', '✓');
      }

      // Save trust score
      rider.trustScore = Math.round(trustScore);
      await rider.save();

      return {
        success: true,
        trustScore: Math.round(trustScore),
        trustLevel: this.getTrustLevel(trustScore),
      };
    } catch (error) {
      console.error('Error calculating trust score:', error);
      throw new Error(`Failed to calculate trust score: ${error.message}`);
    }
  }

  /**
   * 4. Get user badges
   */
  async getUserBadges(userId) {
    try {
      const badges = await UserBadge.find({ userId, active: true });
      return {
        success: true,
        badges,
        count: badges.length,
      };
    } catch (error) {
      console.error('Error fetching user badges:', error);
      throw new Error(`Failed to fetch badges: ${error.message}`);
    }
  }

  /**
   * 5. Verify background check
   */
  async verifyBackgroundCheck(userId, checkResult, certificate = null) {
    try {
      const driver = await DriverProfile.findOne({ userId });
      if (!driver) throw new Error('Driver profile not found');

      driver.backgroundCheckPassed = checkResult === 'passed';
      driver.backgroundCheckDate = new Date();
      if (certificate) driver.backgroundCheckCertificate = certificate;

      await driver.save();

      if (checkResult === 'passed') {
        await this.awardBadge(userId, 'verified', 'Verified Driver', '✓');
      }

      // Notify driver
      await notificationService.sendNotification(userId, {
        type: 'background_check_result',
        title: 'Background Check Result',
        body: `Your background check has been ${checkResult}`,
      });

      return {
        success: true,
        message: `Background check marked as ${checkResult}`,
      };
    } catch (error) {
      console.error('Error verifying background check:', error);
      throw new Error(`Failed to verify background check: ${error.message}`);
    }
  }

  // Helper methods

  /**
   * Helper: Award badge
   */
  async awardBadge(userId, badgeType, name, icon) {
    try {
      // Check if badge already exists
      const existing = await UserBadge.findOne({ userId, badgeType, active: true });
      if (existing) return existing;

      const badge = new UserBadge({
        userId,
        badgeType,
        name,
        icon,
        awardedAt: new Date(),
        active: true,
      });

      await badge.save();
      return badge;
    } catch (error) {
      console.error('Error awarding badge:', error);
      return null;
    }
  }

  /**
   * Helper: Check if fully verified driver
   */
  isFullyVerified(profile) {
    return (
      profile.licenseVerified &&
      profile.rcVerified &&
      profile.insuranceVerified &&
      profile.backgroundCheckPassed &&
      profile.isActive
    );
  }

  /**
   * Helper: Check if super driver
   */
  isSuperDriver(profile) {
    return (
      this.isFullyVerified(profile) &&
      profile.rideCount >= 500 &&
      profile.averageRating >= 4.8 &&
      profile.cancelledRides / profile.rideCount < 0.05
    );
  }

  /**
   * Helper: Check if green driver (EV or eco-friendly)
   */
  isGreenDriver(profile) {
    return profile.vehicleType === 'electric' || profile.vehicleType === 'hybrid';
  }

  /**
   * Helper: Check if top rated
   */
  isTopRated(profile) {
    return profile.averageRating >= 4.8 && profile.rideCount >= 100;
  }

  /**
   * Helper: Check if verified rider
   */
  isVerifiedRider(profile) {
    return profile.emailVerified && profile.phoneVerified;
  }

  /**
   * Helper: Check if trusted rider
   */
  isTrustedRider(profile) {
    return (
      profile.emailVerified &&
      profile.phoneVerified &&
      profile.emergencyContactVerified &&
      profile.rideCount >= 50
    );
  }

  /**
   * Helper: Get trust level description
   */
  getTrustLevel(score) {
    if (score >= 80) return 'Highly Trusted';
    if (score >= 60) return 'Trusted';
    if (score >= 40) return 'Moderate';
    if (score >= 20) return 'Low';
    return 'Very Low';
  }
}

module.exports = new VerificationBadgeService();
