/**
 * PersonalizationService.js
 * Phase 14: Advanced Personalization & Recommendations
 * 
 * Provides intelligent user matching, ride recommendations, and personalized experience.
 * All methods are static for stateless, scalable operations.
 */

const User = require('../models/User');
const Ride = require('../models/Ride');
const Message = require('../models/Message');

class PersonalizationService {
  /**
   * Get personalized ride recommendations for user
   * Based on: ride history, preferences, ratings, time patterns, location
   */
  static async getPersonalizedRideRecommendations(userId, limit = 10) {
    try {
      // Get user profile and history
      const user = await User.findById(userId).lean();
      if (!user) return { success: false, message: 'User not found', data: null };

      // Get user's recent rides to understand patterns
      const recentRides = await Ride.find({ riderId: userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      // Extract patterns from ride history
      const patterns = {
        favoriteRoutes: {},
        preferredTimes: {},
        preferredDrivers: {},
        averageDistance: 0,
        averageCost: 0
      };

      let totalDistance = 0;
      let totalCost = 0;

      for (const ride of recentRides) {
        // Track routes
        const route = `${ride.pickupLocation}-${ride.dropoffLocation}`;
        patterns.favoriteRoutes[route] = (patterns.favoriteRoutes[route] || 0) + 1;

        // Track time patterns
        const hour = new Date(ride.createdAt).getHours();
        patterns.preferredTimes[hour] = (patterns.preferredTimes[hour] || 0) + 1;

        // Track driver preferences
        patterns.preferredDrivers[ride.driverId] = (patterns.preferredDrivers[ride.driverId] || 0) + 1;

        totalDistance += ride.distance || 0;
        totalCost += ride.fare || 0;
      }

      patterns.averageDistance = recentRides.length > 0 ? totalDistance / recentRides.length : 5;
      patterns.averageCost = recentRides.length > 0 ? totalCost / recentRides.length : 200;

      // Get top favorite routes
      const topRoutes = Object.entries(patterns.favoriteRoutes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([route]) => route);

      // Get available rides matching user preferences
      const availableRides = await Ride.find({
        status: 'available',
        pickupLocation: { $in: topRoutes.map(r => r.split('-')[0]) },
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
        .populate('driverId', 'firstName lastName rating totalRides')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      // Score and rank rides by personalization
      const scoredRides = availableRides.map(ride => {
        let score = 50; // Base score

        // Route match: +20 points
        const matchingRoute = topRoutes.some(r => r.includes(ride.pickupLocation));
        if (matchingRoute) score += 20;

        // Driver preference: +15 points
        if (patterns.preferredDrivers[ride.driverId]) score += 15;

        // Price match: +15 points
        if (Math.abs(ride.fare - patterns.averageCost) < 50) score += 15;

        // High-rated driver: +10 points
        if (ride.driverId?.rating >= 4.5) score += 10;

        return { ...ride, personalizationScore: score };
      });

      const recommendations = scoredRides.sort((a, b) => b.personalizationScore - a.personalizationScore);

      return {
        success: true,
        message: 'Personalized recommendations generated',
        data: {
          recommendations: recommendations.slice(0, limit),
          userPatterns: {
            topRoutes: topRoutes.slice(0, 3),
            preferredTimes: Object.entries(patterns.preferredTimes)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([hour]) => hour),
            averageDistance: patterns.averageDistance.toFixed(2),
            averageCost: patterns.averageCost.toFixed(2)
          }
        }
      };
    } catch (error) {
      return { success: false, message: error.message, data: null };
    }
  }

  /**
   * Get driver matching recommendations for rides
   * Matches ride requests with best-fit drivers based on metrics
   */
  static async getDriverMatchingRecommendations(rideId, limit = 10) {
    try {
      const ride = await Ride.findById(rideId).lean();
      if (!ride) return { success: false, message: 'Ride not found', data: null };

      // Find available drivers in pickup location
      const drivers = await User.find({
        userType: 'driver',
        isActive: true,
        currentLocation: { $near: { $geometry: ride.pickupLocation.coordinates } }
      })
        .select('firstName lastName rating totalRides totalEarnings cancellationRate currentLocation acceptanceRate')
        .limit(limit * 3)
        .lean();

      // Score drivers based on multiple factors
      const scoredDrivers = drivers.map(driver => {
        let score = 50; // Base score

        // Rating: +25 points (max)
        const ratingScore = (driver.rating / 5) * 25;
        score += ratingScore;

        // Acceptance rate: +15 points (if >80%)
        if (driver.acceptanceRate >= 0.8) score += 15;

        // Low cancellation rate: +15 points (if <5%)
        if (driver.cancellationRate < 0.05) score += 15;

        // Experience: +10 points (if 100+ rides)
        if (driver.totalRides >= 100) score += 10;

        // Consistency: -5 points (if cancellation >10%)
        if (driver.cancellationRate > 0.1) score -= 5;

        return {
          driverId: driver._id,
          firstName: driver.firstName,
          lastName: driver.lastName,
          rating: driver.rating,
          totalRides: driver.totalRides,
          acceptanceRate: driver.acceptanceRate,
          cancellationRate: driver.cancellationRate,
          matchScore: score
        };
      });

      const recommendations = scoredDrivers.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);

      return {
        success: true,
        message: 'Driver matching recommendations generated',
        data: { recommendations }
      };
    } catch (error) {
      return { success: false, message: error.message, data: null };
    }
  }

  /**
   * Get user communication preferences
   * Returns preferred contact channels, notification settings, language
   */
  static async getUserPreferences(userId) {
    try {
      const user = await User.findById(userId)
        .select('communicationPreferences notificationSettings language timezone')
        .lean();

      if (!user) return { success: false, message: 'User not found', data: null };

      return {
        success: true,
        message: 'User preferences retrieved',
        data: {
          userId,
          communicationPreferences: user.communicationPreferences || {
            sms: true,
            email: true,
            push: true,
            inApp: true
          },
          notificationSettings: user.notificationSettings || {
            rideUpdates: true,
            promotions: false,
            safetyAlerts: true,
            rewards: true
          },
          language: user.language || 'en',
          timezone: user.timezone || 'UTC'
        }
      };
    } catch (error) {
      return { success: false, message: error.message, data: null };
    }
  }

  /**
   * Update user communication preferences
   */
  static async updateUserPreferences(userId, preferences) {
    try {
      const updated = await User.findByIdAndUpdate(
        userId,
        {
          communicationPreferences: preferences.communicationPreferences,
          notificationSettings: preferences.notificationSettings,
          language: preferences.language,
          timezone: preferences.timezone
        },
        { new: true }
      ).select('communicationPreferences notificationSettings language timezone');

      if (!updated) return { success: false, message: 'User not found', data: null };

      return {
        success: true,
        message: 'Preferences updated successfully',
        data: updated
      };
    } catch (error) {
      return { success: false, message: error.message, data: null };
    }
  }

  /**
   * Get personalized messages/offers for user
   * Based on user behavior, preferences, engagement history
   */
  static async getPersonalizedOffers(userId, limit = 20) {
    try {
      const user = await User.findById(userId)
        .select('userType engagement lastActiveAt totalSpent')
        .lean();

      if (!user) return { success: false, message: 'User not found', data: null };

      // Determine offer type based on user profile
      let offerTypes = ['general'];

      if (user.engagement === 'high') offerTypes.push('premium', 'loyalty');
      if (user.engagement === 'medium') offerTypes.push('retention');
      if (user.engagement === 'low') offerTypes.push('winback');

      if (user.totalSpent > 5000) offerTypes.push('vip');

      // Get relevant offers
      const offers = await Message.find({
        messageType: 'offer',
        targetAudience: { $in: offerTypes },
        expiresAt: { $gt: new Date() },
        isActive: true
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return {
        success: true,
        message: 'Personalized offers retrieved',
        data: {
          userId,
          userSegment: user.engagement,
          offers: offers.map(o => ({
            offerId: o._id,
            title: o.title,
            description: o.content,
            discount: o.metadata?.discount,
            expiresAt: o.expiresAt,
            category: o.metadata?.category
          }))
        }
      };
    } catch (error) {
      return { success: false, message: error.message, data: null };
    }
  }

  /**
   * Get user engagement score
   * Calculates engagement based on activity, ratings, interactions
   */
  static async getUserEngagementScore(userId, userType = 'rider') {
    try {
      const user = await User.findById(userId)
        .select('totalRides totalReviews rating cancellationRate lastActiveAt createdAt')
        .lean();

      if (!user) return { success: false, message: 'User not found', data: null };

      let score = 0;

      // Activity score: 0-30 points
      const daysSinceActive = (Date.now() - new Date(user.lastActiveAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceActive < 7) score += 30;
      else if (daysSinceActive < 30) score += 20;
      else if (daysSinceActive < 90) score += 10;

      // Ride count score: 0-25 points
      if (user.totalRides >= 100) score += 25;
      else if (user.totalRides >= 50) score += 20;
      else if (user.totalRides >= 25) score += 15;
      else if (user.totalRides >= 10) score += 10;
      else if (user.totalRides > 0) score += 5;

      // Rating score: 0-20 points
      score += (user.rating / 5) * 20;

      // Review participation: 0-15 points
      if (user.totalReviews >= 50) score += 15;
      else if (user.totalReviews >= 25) score += 10;
      else if (user.totalReviews >= 10) score += 5;

      // Reliability score: 0-10 points (inverse of cancellation)
      score += Math.max(0, 10 - user.cancellationRate * 50);

      // Determine engagement level
      let engagementLevel = 'low';
      if (score >= 80) engagementLevel = 'high';
      else if (score >= 60) engagementLevel = 'medium';

      return {
        success: true,
        message: 'Engagement score calculated',
        data: {
          userId,
          engagementScore: Math.min(100, score),
          engagementLevel,
          metrics: {
            activityRecency: daysSinceActive < 7 ? 'active' : daysSinceActive < 30 ? 'moderate' : 'inactive',
            totalRides: user.totalRides,
            averageRating: user.rating,
            reviewParticipation: user.totalReviews,
            cancellationRate: user.cancellationRate
          }
        }
      };
    } catch (error) {
      return { success: false, message: error.message, data: null };
    }
  }

  /**
   * Get recommended connections/contacts for user
   * Suggests users to follow or connect with based on matching interests
   */
  static async getRecommendedConnections(userId, limit = 20) {
    try {
      const user = await User.findById(userId)
        .select('firstName lastName interests location preferences connections')
        .lean();

      if (!user) return { success: false, message: 'User not found', data: null };

      // Find similar users (exclude self and existing connections)
      const recommendations = await User.find({
        _id: { $nin: [userId, ...user.connections] },
        location: user.location,
        userType: user.userType
      })
        .select('firstName lastName profilePic rating totalRides interests')
        .limit(limit)
        .lean();

      const scoredUsers = recommendations.map(rec => {
        let score = 50; // Base score

        // Shared interests: +20 points
        const sharedInterests = user.interests?.filter(i => rec.interests?.includes(i)).length || 0;
        score += Math.min(20, sharedInterests * 5);

        // Rating similarity: +15 points
        if (Math.abs(user.rating - rec.rating) < 1) score += 15;

        // Experience match: +15 points
        if (Math.abs(user.totalRides - rec.totalRides) < 100) score += 15;

        return { ...rec, connectionScore: score };
      });

      const recommended = scoredUsers.sort((a, b) => b.connectionScore - a.connectionScore);

      return {
        success: true,
        message: 'Recommended connections retrieved',
        data: { recommendations: recommended }
      };
    } catch (error) {
      return { success: false, message: error.message, data: null };
    }
  }

  /**
   * Get personalized UI experience based on user segment
   */
  static async getPersonalizedUIConfig(userId) {
    try {
      const engagementData = await this.getUserEngagementScore(userId);
      if (!engagementData.success) return engagementData;

      const engagement = engagementData.data.engagementLevel;

      // UI configuration varies by engagement level
      const uiConfigs = {
        high: {
          theme: 'premium',
          features: ['rewards', 'referral', 'subscriptions', 'priority_support'],
          upsellOffers: true,
          animationLevel: 'high',
          showAnalytics: true
        },
        medium: {
          theme: 'standard',
          features: ['rewards', 'referral'],
          upsellOffers: true,
          animationLevel: 'medium',
          showAnalytics: false
        },
        low: {
          theme: 'simple',
          features: ['basic'],
          upsellOffers: true,
          animationLevel: 'low',
          showAnalytics: false
        }
      };

      return {
        success: true,
        message: 'UI configuration retrieved',
        data: {
          userId,
          engagementLevel: engagement,
          uiConfig: uiConfigs[engagement]
        }
      };
    } catch (error) {
      return { success: false, message: error.message, data: null };
    }
  }
}

module.exports = PersonalizationService;
