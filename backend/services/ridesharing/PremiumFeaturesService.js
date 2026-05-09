/**
 * PremiumFeaturesService.js
 * Phase 8: Premium Features & VIP Services
 * Handles premium ride tiers, VIP benefits, priority matching, concierge services
 */

const PremiumTier = require('../../models/PremiumTier');
const VIPRideRequest = require('../../models/VIPRideRequest');
const PremiumSubscription = require('../../models/PremiumSubscription');
const DriverProfile = require('../../models/DriverProfile');
const UserProfile = require('../../models/UserProfile');

class PremiumFeaturesService {
  /**
   * Get available premium tiers
   */
  static async getAvailablePremiumTiers() {
    try {
      const tiers = await PremiumTier.find({ status: 'active' })
        .sort({ monthlyPrice: 1 })
        .lean();

      return {
        success: true,
        data: tiers,
        count: tiers.length,
      };
    } catch (error) {
      throw new Error(`Error retrieving premium tiers: ${error.message}`);
    }
  }

  /**
   * Subscribe to premium tier
   */
  static async subscribeToPremiumTier(userId, tierData) {
    try {
      const {
        tierId,
        paymentMethodId,
        autoRenew,
      } = tierData;

      // Get tier details
      const tier = await PremiumTier.findById(tierId);
      if (!tier) {
        throw new Error('Premium tier not found');
      }

      // Check for existing active subscription
      const existingSubscription = await PremiumSubscription.findOne({
        userId,
        status: 'active',
      });

      if (existingSubscription) {
        return {
          success: false,
          message: 'You already have an active premium subscription',
        };
      }

      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      const subscription = new PremiumSubscription({
        userId,
        tierId,
        tierName: tier.name,
        monthlyPrice: tier.monthlyPrice,
        startDate,
        endDate,
        autoRenew,
        paymentMethodId,
        status: 'active',
        billingCycle: 'monthly',
        totalSpent: tier.monthlyPrice,
        ridesUsed: 0,
        benefitsUsed: 0,
        paymentHistory: [
          {
            date: startDate,
            amount: tier.monthlyPrice,
            status: 'pending',
          },
        ],
        createdAt: new Date(),
      });

      await subscription.save();

      // Update user profile
      const userProfile = await UserProfile.findById(userId);
      if (userProfile) {
        userProfile.premiumTier = tierId;
        userProfile.isPremium = true;
        await userProfile.save();
      }

      return {
        success: true,
        message: 'Premium subscription activated successfully',
        data: {
          subscriptionId: subscription._id,
          tierName: subscription.tierName,
          status: subscription.status,
          benefits: tier.benefits,
        },
      };
    } catch (error) {
      throw new Error(`Error subscribing to premium tier: ${error.message}`);
    }
  }

  /**
   * Get user premium subscription
   */
  static async getUserPremiumSubscription(userId) {
    try {
      const subscription = await PremiumSubscription.findOne({
        userId,
        status: 'active',
      }).populate('tierId', 'name benefits monthlyPrice');

      if (!subscription) {
        return {
          success: true,
          data: null,
          message: 'No active premium subscription',
        };
      }

      return {
        success: true,
        data: subscription,
      };
    } catch (error) {
      throw new Error(
        `Error retrieving user premium subscription: ${error.message}`
      );
    }
  }

  /**
   * Book VIP ride
   */
  static async bookVIPRide(userId, rideData) {
    try {
      const {
        source,
        sourceCoordinates,
        destination,
        destinationCoordinates,
        preferredVehicleType, // 'premium_sedan', 'premium_suv', 'luxury'
        pickupTime,
        specialRequirements,
        conciergeRequest,
      } = rideData;

      // Check premium subscription
      const subscription = await PremiumSubscription.findOne({
        userId,
        status: 'active',
      });

      if (!subscription) {
        return {
          success: false,
          message: 'Active premium subscription required for VIP rides',
        };
      }

      // Get tier details
      const tier = await PremiumTier.findById(subscription.tierId);
      if (!tier) {
        throw new Error('Premium tier not found');
      }

      // Calculate VIP price (20% premium over standard)
      const baseFare = this.calculateBaseFare(sourceCoordinates, destinationCoordinates);
      const vipSurcharge = baseFare * 0.2;
      const totalFare = baseFare + vipSurcharge;

      // Create VIP ride request
      const vipRide = new VIPRideRequest({
        userId,
        subscriptionId: subscription._id,
        source,
        sourceCoordinates,
        destination,
        destinationCoordinates,
        preferredVehicleType,
        pickupTime: new Date(pickupTime),
        specialRequirements,
        conciergeRequest,
        baseFare,
        vipSurcharge,
        totalFare,
        status: 'searching',
        benefits: tier.benefits,
        priority: 'high',
        createdAt: new Date(),
      });

      await vipRide.save();

      // Find premium drivers
      const premiumDrivers = await this.findPremiumDrivers(
        preferredVehicleType,
        sourceCoordinates
      );

      if (premiumDrivers.length === 0) {
        vipRide.status = 'no_drivers_available';
        await vipRide.save();

        return {
          success: true,
          message: 'VIP ride request created but no drivers available',
          data: {
            rideId: vipRide._id,
            status: 'waiting',
            estimatedWaitTime: '5-10 minutes',
          },
        };
      }

      // Assign best matched driver
      const assignedDriver = premiumDrivers[0];
      vipRide.assignedDriver = assignedDriver._id;
      vipRide.status = 'confirmed';
      vipRide.confirmedAt = new Date();

      await vipRide.save();

      // Update subscription usage
      subscription.ridesUsed += 1;
      await subscription.save();

      return {
        success: true,
        message: 'VIP ride booked successfully',
        data: {
          rideId: vipRide._id,
          driver: {
            name: assignedDriver.firstName,
            rating: assignedDriver.rating,
            vehicle: assignedDriver.vehicleModel,
          },
          totalFare: vipRide.totalFare,
          pickupTime: vipRide.pickupTime,
        },
      };
    } catch (error) {
      throw new Error(`Error booking VIP ride: ${error.message}`);
    }
  }

  /**
   * Calculate base fare (simplified)
   */
  static calculateBaseFare(sourceCoords, destCoords) {
    // Distance in km (rough approximation)
    const R = 6371; // Earth radius
    const lat1 = sourceCoords[1];
    const lon1 = sourceCoords[0];
    const lat2 = destCoords[1];
    const lon2 = destCoords[0];

    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Base rate: ₹15/km + ₹50 base
    return distance * 15 + 50;
  }

  /**
   * Find premium drivers
   */
  static async findPremiumDrivers(vehicleType, sourceCoordinates) {
    try {
      const drivers = await DriverProfile.find({
        vehicleType,
        isPremium: true,
        isVerified: true,
        availabilityStatus: 'available',
        rating: { $gte: 4.5 },
      })
        .sort({ rating: -1 })
        .limit(5)
        .lean();

      return drivers;
    } catch (error) {
      console.error('Error finding premium drivers:', error.message);
      return [];
    }
  }

  /**
   * Get VIP ride details
   */
  static async getVIPRideDetails(rideId, userId = null) {
    try {
      let query = { _id: rideId };
      if (userId) {
        query.userId = userId;
      }

      const ride = await VIPRideRequest.findOne(query)
        .populate('assignedDriver', 'firstName lastName rating vehicle')
        .lean();

      if (!ride) {
        throw new Error('VIP ride not found');
      }

      return {
        success: true,
        data: ride,
      };
    } catch (error) {
      throw new Error(`Error retrieving VIP ride details: ${error.message}`);
    }
  }

  /**
   * Get user VIP rides
   */
  static async getUserVIPRides(userId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const rides = await VIPRideRequest.find({ userId })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();

      const total = await VIPRideRequest.countDocuments({ userId });

      return {
        success: true,
        data: rides,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Error retrieving user VIP rides: ${error.message}`);
    }
  }

  /**
   * Use concierge service
   */
  static async useConciergeService(userId, serviceRequest) {
    try {
      const {
        rideId,
        serviceType, // 'meal_pickup', 'errand', 'special_request', 'other'
        description,
        estimatedCost,
      } = serviceRequest;

      // Verify VIP ride
      const ride = await VIPRideRequest.findOne({
        _id: rideId,
        userId,
      });

      if (!ride) {
        return {
          success: false,
          message: 'VIP ride not found',
        };
      }

      // Check if concierge service is included in tier
      const subscription = await PremiumSubscription.findById(
        ride.subscriptionId
      );
      const tier = await PremiumTier.findById(subscription.tierId);

      if (!tier.benefits.includes('concierge_service')) {
        return {
          success: false,
          message: 'Concierge service not included in your tier',
        };
      }

      ride.conciergeRequest = {
        serviceType,
        description,
        estimatedCost,
        status: 'pending',
        requestedAt: new Date(),
      };

      await ride.save();

      // Update subscription benefits used
      subscription.benefitsUsed += 1;
      await subscription.save();

      return {
        success: true,
        message: 'Concierge service request submitted',
        data: {
          rideId: ride._id,
          serviceType,
          estimatedCost,
          status: 'pending_confirmation',
        },
      };
    } catch (error) {
      throw new Error(
        `Error using concierge service: ${error.message}`
      );
    }
  }

  /**
   * Cancel premium subscription
   */
  static async cancelPremiumSubscription(userId, reason = '') {
    try {
      const subscription = await PremiumSubscription.findOne({
        userId,
        status: 'active',
      });

      if (!subscription) {
        return {
          success: false,
          message: 'No active premium subscription found',
        };
      }

      subscription.status = 'cancelled';
      subscription.cancelledAt = new Date();
      subscription.cancellationReason = reason;

      await subscription.save();

      // Update user profile
      const userProfile = await UserProfile.findById(userId);
      if (userProfile) {
        userProfile.isPremium = false;
        userProfile.premiumTier = null;
        await userProfile.save();
      }

      return {
        success: true,
        message: 'Premium subscription cancelled',
      };
    } catch (error) {
      throw new Error(
        `Error cancelling premium subscription: ${error.message}`
      );
    }
  }

  /**
   * Get premium features overview
   */
  static async getPremiumFeaturesOverview(userId) {
    try {
      const subscription = await PremiumSubscription.findOne({
        userId,
        status: 'active',
      });

      if (!subscription) {
        return {
          success: true,
          data: {
            isPremium: false,
            message: 'No active premium subscription',
          },
        };
      }

      const tier = await PremiumTier.findById(subscription.tierId);

      const vipRidesCount = await VIPRideRequest.countDocuments({
        userId,
        status: 'completed',
      });

      const savings = vipRidesCount * 50; // Estimated savings from priority matching

      return {
        success: true,
        data: {
          isPremium: true,
          tier: tier.name,
          benefits: tier.benefits,
          ridesUsed: subscription.ridesUsed,
          benefitsUsed: subscription.benefitsUsed,
          daysRemaining: Math.ceil(
            (subscription.endDate - new Date()) / (1000 * 60 * 60 * 24)
          ),
          totalSpent: subscription.totalSpent,
          estimatedSavings: savings,
          vipRidesCompleted: vipRidesCount,
        },
      };
    } catch (error) {
      throw new Error(
        `Error retrieving premium features overview: ${error.message}`
      );
    }
  }

  /**
   * Get predefined premium tiers
   */
  static getPredefinedTiers() {
    return [
      {
        name: 'Silver',
        description: 'Enhanced ride experience',
        monthlyPrice: 299,
        benefits: [
          'Priority driver matching',
          '10% discount on fares',
          'Free cancellation within 5 minutes',
          'Premium support',
        ],
        rideLimit: 'unlimited',
        maxDiscount: 10,
      },
      {
        name: 'Gold',
        description: 'Premium travel benefits',
        monthlyPrice: 599,
        benefits: [
          'VIP driver matching',
          '20% discount on fares',
          'Scheduled ride feature',
          'Concierge service',
          'Free cancellation anytime',
          'Premium support 24/7',
          'Airport fast-track',
        ],
        rideLimit: 'unlimited',
        maxDiscount: 20,
      },
      {
        name: 'Platinum',
        description: 'Ultimate premium experience',
        monthlyPrice: 999,
        benefits: [
          'Exclusive platinum drivers',
          '30% discount on fares',
          'Luxury vehicle options',
          'Priority concierge service',
          'Free upgrades on available rides',
          'Dedicated customer manager',
          'Free monthly premium insurance',
          'Airport fast-track + lounge access',
          'Priority airport queue',
        ],
        rideLimit: 'unlimited',
        maxDiscount: 30,
      },
    ];
  }
}

module.exports = PremiumFeaturesService;
