/**
 * FraudDetectionService.js
 * Phase 5: Advanced Fraud Detection System
 * Pattern-based detection for fake GPS, suspicious behavior, spam, and payment fraud
 */

const RideRequest = require('../../models/RideRequest');
const DriverProfile = require('../../models/DriverProfile');
const RiderProfile = require('../../models/RiderProfile');

class FraudDetectionService {
  /**
   * Fraud risk levels
   */
  static FRAUD_LEVELS = {
    LOW: { value: 0, range: [0, 20], action: 'allow' },
    MEDIUM: { value: 1, range: [21, 50], action: 'flag_for_review' },
    HIGH: { value: 2, range: [51, 80], action: 'suspend_account' },
    CRITICAL: { value: 3, range: [81, 100], action: 'block_immediately' },
  };

  /**
   * Detect fake GPS coordinates
   * Checks for impossible speeds and location jumps
   */
  static detectFakeGPS(previousLocation, currentLocation, timeDiff) {
    if (!previousLocation || !currentLocation || timeDiff <= 0) {
      return {
        isFakeGPS: false,
        confidence: 0,
        details: 'Insufficient data for verification',
      };
    }

    // Calculate distance between points
    const distance = this.calculateDistance(
      previousLocation.lat,
      previousLocation.lng,
      currentLocation.lat,
      currentLocation.lng
    );

    // Maximum realistic speed: 120 km/h (highways) or 150 km/h (unlikely)
    const maxRealSpeed = 150; // km/h
    const timeDiffHours = timeDiff / 3600;
    const calculatedSpeed = distance / timeDiffHours;

    const speedTreshold = maxRealSpeed + 50; // Realistic threshold

    const isFakeGPS = calculatedSpeed > speedTreshold;
    const confidence = Math.min(100, (calculatedSpeed / speedTreshold) * 100);

    return {
      isFakeGPS,
      confidence: Math.round(confidence),
      calculatedSpeed: Math.round(calculatedSpeed),
      distance: Math.round(distance * 100) / 100,
      timeDiff,
      maxAllowedSpeed: speedTreshold,
    };
  }

  /**
   * Detect suspicious behavior patterns
   * Multiple cancellations, rapid location changes, unusual booking patterns
   */
  static async detectSuspiciousBehavior(userId, userType = 'rider') {
    try {
      const fraudScore = { score: 0, details: [] };

      if (userType === 'rider') {
        const rider = await RiderProfile.findById(userId);
        if (!rider) {
          throw new Error('Rider not found');
        }

        // Check cancellation rate (>30% in last 10 rides = suspicious)
        if (rider.cancelledRides && rider.totalRides) {
          const cancellationRate = rider.cancelledRides / rider.totalRides;
          if (cancellationRate > 0.3) {
            fraudScore.score += 25;
            fraudScore.details.push(
              `High cancellation rate: ${Math.round(cancellationRate * 100)}%`
            );
          }
        }

        // Check for payment method abuse
        const failedPayments = rider.failedPaymentAttempts || 0;
        if (failedPayments > 3) {
          fraudScore.score += 30;
          fraudScore.details.push(`${failedPayments} failed payment attempts`);
        }

        // Check for rapid ride requests from different locations
        const recentRides = await RideRequest.find({
          riderId: userId,
          createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
        }).sort({ createdAt: -1 });

        if (recentRides.length > 10) {
          fraudScore.score += 20;
          fraudScore.details.push(`${recentRides.length} rides in the last hour`);
        }

        // Check for geographically impossible bookings
        if (recentRides.length >= 2) {
          const timeDiff = (recentRides[0].createdAt - recentRides[1].createdAt) / 1000;
          const geoCheck = this.detectFakeGPS(
            recentRides[1].pickup,
            recentRides[0].pickup,
            timeDiff
          );

          if (geoCheck.isFakeGPS) {
            fraudScore.score += 40;
            fraudScore.details.push(
              `Impossible location change: ${geoCheck.calculatedSpeed} km/h`
            );
          }
        }
      } else if (userType === 'driver') {
        const driver = await DriverProfile.findById(userId);
        if (!driver) {
          throw new Error('Driver not found');
        }

        // Check acceptance rate (very low = suspicious)
        if (driver.acceptanceRate < 0.2) {
          fraudScore.score += 15;
          fraudScore.details.push(
            `Low acceptance rate: ${Math.round(driver.acceptanceRate * 100)}%`
          );
        }

        // Check cancellation rate (>20% = suspicious)
        if (driver.cancellationRate > 0.2) {
          fraudScore.score += 20;
          fraudScore.details.push(
            `High cancellation rate: ${Math.round(driver.cancellationRate * 100)}%`
          );
        }

        // Check rating (very low with many rides = suspicious)
        if (driver.rating < 2.5 && driver.totalRides > 50) {
          fraudScore.score += 25;
          fraudScore.details.push(`Consistently low rating: ${driver.rating}`);
        }
      }

      return {
        fraudScore: Math.round(fraudScore.score),
        riskLevel: this.getRiskLevel(fraudScore.score),
        details: fraudScore.details,
      };
    } catch (error) {
      console.error('Error detecting suspicious behavior:', error);
      return {
        fraudScore: 0,
        riskLevel: 'LOW',
        details: ['Error in analysis'],
      };
    }
  }

  /**
   * Detect spam booking
   * Multiple requests from same location in short time
   */
  static async detectSpamBooking(riderId, pickupLat, pickupLng) {
    try {
      const timeWindow = 5 * 60 * 1000; // 5 minutes
      const locationThreshold = 0.1; // 100 meters

      // Find recent requests from same user
      const recentRequests = await RideRequest.find({
        riderId,
        createdAt: { $gte: new Date(Date.now() - timeWindow) },
      });

      let spamScore = 0;
      const suspiciousRequests = [];

      for (const req of recentRequests) {
        if (!req.pickup) continue;

        const distance = this.calculateDistance(
          pickupLat,
          pickupLng,
          req.pickup.lat,
          req.pickup.lng
        );

        if (distance < locationThreshold) {
          spamScore += 20;
          suspiciousRequests.push({
            rideId: req._id,
            createdAt: req.createdAt,
            distance,
          });
        }
      }

      // Check if too many requests
      if (recentRequests.length > 5) {
        spamScore = Math.min(100, spamScore + 30);
      }

      return {
        isSpam: spamScore > 50,
        spamScore: Math.min(100, spamScore),
        recentRequestCount: recentRequests.length,
        suspiciousRequests,
      };
    } catch (error) {
      console.error('Error detecting spam:', error);
      return {
        isSpam: false,
        spamScore: 0,
        recentRequestCount: 0,
        suspiciousRequests: [],
      };
    }
  }

  /**
   * Detect payment fraud patterns
   * Failed transactions, refund requests, chargebacks
   */
  static async detectPaymentFraud(userId, amount, paymentMethod) {
    try {
      const fraudScore = { score: 0, details: [] };

      const rider = await RiderProfile.findById(userId);
      if (!rider) {
        throw new Error('Rider not found');
      }

      // Check failed payment attempts
      const failedAttempts = rider.failedPaymentAttempts || 0;
      if (failedAttempts > 3) {
        fraudScore.score += 25;
        fraudScore.details.push(`${failedAttempts} failed payment attempts`);
      }

      // Check for unusual amount
      const avgRideAmount = rider.averageRideAmount || 0;
      if (avgRideAmount > 0 && amount > avgRideAmount * 3) {
        fraudScore.score += 15;
        fraudScore.details.push(`Amount ${(amount / avgRideAmount).toFixed(1)}x higher than usual`);
      }

      // Check refund requests
      const recentRefunds = rider.refundRequests || 0;
      if (recentRefunds > 2) {
        fraudScore.score += 20;
        fraudScore.details.push(`${recentRefunds} refund requests`);
      }

      // Check for payment method changes
      if (paymentMethod && rider.lastPaymentMethod && rider.lastPaymentMethod !== paymentMethod) {
        fraudScore.score += 10;
        fraudScore.details.push('Payment method changed');
      }

      // Check for rapid transactions (potential card testing)
      const recentTransactions = await RideRequest.countDocuments({
        riderId: userId,
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
        status: { $in: ['completed', 'payment_pending'] },
      });

      if (recentTransactions > 20) {
        fraudScore.score += 20;
        fraudScore.details.push(`${recentTransactions} transactions in last hour`);
      }

      return {
        fraudScore: Math.min(100, fraudScore.score),
        riskLevel: this.getRiskLevel(fraudScore.score),
        details: fraudScore.details,
        recommendation:
          fraudScore.score > 50
            ? 'Verify payment with OTP/CVV'
            : 'Payment acceptable',
      };
    } catch (error) {
      console.error('Error detecting payment fraud:', error);
      return {
        fraudScore: 0,
        riskLevel: 'LOW',
        details: ['Error in analysis'],
        recommendation: 'Payment acceptable',
      };
    }
  }

  /**
   * Detect account compromise
   * Unusual login locations, password changes, suspicious activity
   */
  static async detectAccountCompromise(userId, currentLogin) {
    try {
      const user = await RiderProfile.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      let fraudScore = 0;
      const details = [];

      // Check for unusual login location
      if (user.lastLoginLocation) {
        const distance = this.calculateDistance(
          user.lastLoginLocation.lat,
          user.lastLoginLocation.lng,
          currentLogin.lat,
          currentLogin.lng
        );

        // If logged in from >500km away, unlikely
        if (distance > 500) {
          const timeDiff =
            (new Date() - user.lastLoginTime) / 1000 / 3600; // hours

          // If less than 2 hours apart, impossible travel
          if (timeDiff < 2) {
            fraudScore += 50;
            details.push(`Impossible travel: ${distance}km in ${timeDiff}h`);
          } else {
            fraudScore += 20;
            details.push(`Unusual login location: ${distance}km away`);
          }
        }
      }

      // Check for multiple devices
      const deviceCount = user.devices ? user.devices.length : 0;
      if (deviceCount > 5) {
        fraudScore += 15;
        details.push(`${deviceCount} devices registered`);
      }

      // Check for recent password change
      const timeSincePasswordChange = user.lastPasswordChange
        ? (new Date() - user.lastPasswordChange) / 1000 / 3600
        : 999;
      if (timeSincePasswordChange < 24 && timeSincePasswordChange > 0) {
        fraudScore += 10;
        details.push('Password changed recently');
      }

      return {
        fraudScore,
        riskLevel: this.getRiskLevel(fraudScore),
        details,
        recommendation:
          fraudScore > 50
            ? 'Request additional verification'
            : 'Login acceptable',
      };
    } catch (error) {
      console.error('Error detecting account compromise:', error);
      return {
        fraudScore: 0,
        riskLevel: 'LOW',
        details: [],
        recommendation: 'Login acceptable',
      };
    }
  }

  /**
   * Comprehensive fraud check
   * Combines multiple detection methods
   */
  static async comprehensiveFraudCheck(userId, userType, rideData) {
    try {
      const checks = {
        behavior: await this.detectSuspiciousBehavior(userId, userType),
        spam: await this.detectSpamBooking(userId, rideData.pickupLat, rideData.pickupLng),
        paymentFraud: await this.detectPaymentFraud(
          userId,
          rideData.amount,
          rideData.paymentMethod
        ),
      };

      // Calculate weighted score
      let totalScore = 0;
      totalScore += checks.behavior.fraudScore * 0.4;
      totalScore += (checks.spam.spamScore || 0) * 0.3;
      totalScore += (checks.paymentFraud.fraudScore || 0) * 0.3;

      totalScore = Math.round(totalScore);

      return {
        overallFraudScore: totalScore,
        riskLevel: this.getRiskLevel(totalScore),
        checks,
        recommendation: this.getFraudRecommendation(totalScore),
        action: this.FRAUD_LEVELS[this.getRiskLevel(totalScore)].action,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Error in comprehensive fraud check: ${error.message}`);
    }
  }

  /**
   * Get risk level based on fraud score
   */
  static getRiskLevel(score) {
    if (score <= 20) return 'LOW';
    if (score <= 50) return 'MEDIUM';
    if (score <= 80) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * Get fraud recommendation
   */
  static getFraudRecommendation(score) {
    if (score <= 20) {
      return 'Proceed with transaction';
    }
    if (score <= 50) {
      return 'Monitor transaction, flag for manual review if needed';
    }
    if (score <= 80) {
      return 'Require additional verification (OTP/CVV)';
    }
    return 'Block transaction, investigate account';
  }

  /**
   * Calculate distance between two coordinates
   */
  static calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Log fraud alert for analysis
   */
  static async logFraudAlert(fraudData) {
    try {
      console.log('Fraud Alert:', {
        userId: fraudData.userId,
        userType: fraudData.userType,
        fraudScore: fraudData.overallFraudScore,
        riskLevel: fraudData.riskLevel,
        timestamp: fraudData.timestamp,
      });

      // In production, store in database or send to fraud analysis system
      // db.fraudAlerts.insertOne(fraudData)

      return true;
    } catch (error) {
      console.error('Error logging fraud alert:', error);
      return false;
    }
  }
}

module.exports = FraudDetectionService;
