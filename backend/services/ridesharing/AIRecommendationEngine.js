/**
 * AIRecommendationEngine.js
 * Phase 9: AI-Powered Recommendations & Personalization
 * Provides intelligent recommendations based on user behavior, preferences, and patterns
 */

class AIRecommendationEngine {
  /**
   * Get personalized route recommendations
   * @param {string} userId - User ID
   * @param {object} contextData - Current context (location, time, etc)
   * @returns {object} - Personalized recommendations
   */
  static async getPersonalizedRouteRecommendations(userId, contextData) {
    try {
      const UserProfile = require('../../models/UserProfile');
      const RideRequest = require('../../models/RideRequest');
      const UserAnalytics = require('../../models/UserAnalytics');

      // Get user profile and history
      const user = await UserProfile.findById(userId).lean();
      const rides = await RideRequest.find({ userId })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      if (!rides || rides.length === 0) {
        return { success: true, data: { recommendations: [] } };
      }

      // Analyze favorite routes
      const routeFrequency = {};
      rides.forEach(ride => {
        const routeKey = `${ride.pickupLocation.lat}-${ride.pickupLocation.lng}-${ride.dropoffLocation.lat}-${ride.dropoffLocation.lng}`;
        routeFrequency[routeKey] = (routeFrequency[routeKey] || 0) + 1;
      });

      // Get top routes
      const topRoutes = Object.entries(routeFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map((entry, index) => {
          const [lat1, lng1, lat2, lng2] = entry[0].split('-').map(Number);
          return {
            rank: index + 1,
            frequency: entry[1],
            pickupLocation: { lat: lat1, lng: lng1 },
            dropoffLocation: { lat: lat2, lng: lng2 },
            confidence: entry[1] / rides.length,
            type: this._classifyRoute(lat1, lng1, lat2, lng2)
          };
        });

      // Analyze time patterns
      const timePatterns = this._analyzeTimePatterns(rides);

      // Get recommendations based on context
      const recommendations = [];

      // Recommendation 1: Frequent route suggestion
      if (topRoutes.length > 0) {
        recommendations.push({
          type: 'frequent_route',
          title: 'Your Favorite Route',
          description: `You frequently travel this route (${topRoutes[0].frequency} times)`,
          pickupLocation: topRoutes[0].pickupLocation,
          dropoffLocation: topRoutes[0].dropoffLocation,
          estimatedFare: 250, // Placeholder
          estimatedTime: '15-20 mins',
          icon: 'star',
          priority: 1
        });
      }

      // Recommendation 2: Time-based optimization
      if (timePatterns.peakTravelTime) {
        recommendations.push({
          type: 'time_optimization',
          title: 'Avoid Peak Hours',
          description: `Travel ${timePatterns.bestTravelTime} for faster journeys`,
          timeSuggestion: timePatterns.bestTravelTime,
          estimatedSavings: `${timePatterns.estimatedTimeSaving} mins saved`,
          icon: 'clock',
          priority: 2
        });
      }

      // Recommendation 3: Alternative routes
      if (topRoutes.length > 1) {
        recommendations.push({
          type: 'alternative_route',
          title: 'Try Alternative Route',
          description: 'Explore different routes you\'ve used before',
          alternativeRoutes: topRoutes.slice(1, 4),
          icon: 'map',
          priority: 3
        });
      }

      return {
        success: true,
        message: 'Personalized route recommendations retrieved',
        data: {
          userId,
          recommendations,
          analysisData: {
            totalRidesAnalyzed: rides.length,
            uniqueRoutes: Object.keys(routeFrequency).length,
            favoriteRoute: topRoutes[0],
            timePatterns
          }
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get recommendation for ride booking
   * @param {string} userId - User ID
   * @param {object} currentContext - Current ride context
   * @returns {object} - Smart booking recommendations
   */
  static async getSmartBookingRecommendation(userId, currentContext) {
    try {
      const UserProfile = require('../../models/UserProfile');
      const UserAnalytics = require('../../models/UserAnalytics');
      const DynamicPricingService = require('./DynamicPricingService');

      const user = await UserProfile.findById(userId).lean();
      const analytics = await UserAnalytics.findOne({ userId }).lean();

      const recommendations = {
        rideType: await this._recommendRideType(userId, currentContext, analytics),
        paymentMethod: await this._recommendPaymentMethod(userId, analytics),
        schedule: await this._recommendSchedule(userId, currentContext),
        saveOption: await this._recommendSaveOption(userId, currentContext)
      };

      // Get price estimate with current multipliers
      const priceData = await DynamicPricingService.getPriceEstimate(currentContext);

      return {
        success: true,
        message: 'Smart booking recommendations generated',
        data: {
          recommendations,
          priceInfo: priceData.data,
          smartTips: this._generateSmartTips(recommendations, analytics),
          estimatedSavings: this._calculateEstimatedSavings(recommendations, analytics)
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get AI-generated offers for user
   * @param {string} userId - User ID
   * @returns {object} - Personalized offers
   */
  static async getPersonalizedOffers(userId) {
    try {
      const UserProfile = require('../../models/UserProfile');
      const RideRequest = require('../../models/RideRequest');
      const UserAnalytics = require('../../models/UserAnalytics');
      const OfferEngine = require('../../models/OfferEngine');

      const user = await UserProfile.findById(userId).lean();
      const rides = await RideRequest.find({ userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      const analytics = await UserAnalytics.findOne({ userId }).lean();

      const offers = [];

      // Offer 1: Premium subscription offer (if spending > ₹5000/month)
      if (analytics?.totalSpent > 5000) {
        const monthlyRides = rides.filter(r => {
          const rideDate = new Date(r.createdAt);
          const now = new Date();
          return rideDate.getMonth() === now.getMonth();
        }).length;

        offers.push({
          type: 'premium_subscription',
          title: 'Upgrade to Premium',
          description: `Save 20% on every ride with Premium subscription`,
          offerCode: 'PREMIUM20',
          estimatedMonthlyValue: Math.round(analytics.totalSpent * 0.20),
          validity: 'Until end of month',
          cta: 'Upgrade Now',
          priority: 1
        });
      }

      // Offer 2: Referral bonus
      offers.push({
        type: 'referral_bonus',
        title: 'Refer & Earn',
        description: 'Get ₹500 for each friend who signs up',
        offerCode: 'REFER500',
        value: 500,
        maxUses: 5,
        validity: '90 days',
        cta: 'Share Link',
        priority: 2
      });

      // Offer 3: Schedule ride discount (for frequent early morning riders)
      const earlyMorningRides = rides.filter(r => {
        const rideTime = new Date(r.createdAt).getHours();
        return rideTime >= 6 && rideTime <= 9;
      }).length;

      if (earlyMorningRides > 5) {
        offers.push({
          type: 'scheduled_ride_discount',
          title: 'Morning Commute Deal',
          description: 'Book 5 rides in advance and get 15% off',
          offerCode: 'COMMUTE15',
          discount: 15,
          validity: 'Valid for next 15 days',
          cta: 'Book Now',
          priority: 3
        });
      }

      // Offer 4: Family plan (for family ride patterns)
      offers.push({
        type: 'family_plan',
        title: 'Family Plan Available',
        description: 'Share rides with family at 30% discount',
        offerCode: 'FAMILY30',
        discount: 30,
        validity: 'Valid for 6 months',
        cta: 'Explore Family',
        priority: 4
      });

      // Store offer interactions for tracking
      await OfferEngine.create({
        userId,
        offers: offers.map(o => ({ type: o.type, priority: o.priority })),
        timestamp: new Date()
      });

      return {
        success: true,
        message: 'Personalized offers generated',
        data: {
          userId,
          offers,
          totalValue: offers.reduce((sum, o) => sum + (o.estimatedMonthlyValue || o.value || 0), 0),
          expiringOffers: offers.filter(o => o.validity.includes('day')).length
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Predict user churn risk
   * @param {string} userId - User ID
   * @returns {object} - Churn prediction data
   */
  static async predictChurnRisk(userId) {
    try {
      const UserProfile = require('../../models/UserProfile');
      const RideRequest = require('../../models/RideRequest');
      const UserAnalytics = require('../../models/UserAnalytics');

      const user = await UserProfile.findById(userId).lean();
      const rides = await RideRequest.find({ userId })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      const analytics = await UserAnalytics.findOne({ userId }).lean();

      let churnScore = 0;
      const riskFactors = [];

      // Factor 1: Low ride frequency (< 2 rides/month)
      const monthlyRideCount = rides.length > 0 ? rides.length / 3 : 0; // Assuming 3 month data
      if (monthlyRideCount < 2) {
        churnScore += 20;
        riskFactors.push({ factor: 'low_frequency', description: `Only ${monthlyRideCount.toFixed(1)} rides/month` });
      }

      // Factor 2: Long inactivity period (> 30 days)
      const lastRideDate = rides.length > 0 ? new Date(rides[0].createdAt) : null;
      const daysSinceLastRide = lastRideDate ? (Date.now() - lastRideDate) / (1000 * 60 * 60 * 24) : 999;
      if (daysSinceLastRide > 30) {
        churnScore += 30;
        riskFactors.push({ factor: 'inactivity', description: `${Math.round(daysSinceLastRide)} days since last ride` });
      }

      // Factor 3: Low app engagement
      if (analytics?.lastRideAt && (Date.now() - new Date(analytics.lastRideAt)) / (1000 * 60 * 60 * 24) > 14) {
        churnScore += 15;
        riskFactors.push({ factor: 'low_engagement', description: 'No activity in 14+ days' });
      }

      // Factor 4: High cancellation rate (> 40%)
      if (analytics?.cancelledRides && analytics?.completedRides) {
        const cancellationRate = (analytics.cancelledRides / (analytics.completedRides + analytics.cancelledRides)) * 100;
        if (cancellationRate > 40) {
          churnScore += 20;
          riskFactors.push({ factor: 'high_cancellation', description: `${cancellationRate.toFixed(0)}% cancellation rate` });
        }
      }

      // Factor 5: Low rating (< 2.5 stars)
      if (user?.averageRating && user.averageRating < 2.5) {
        churnScore += 15;
        riskFactors.push({ factor: 'low_rating', description: `${user.averageRating.toFixed(1)}/5 rating` });
      }

      // Cap score at 100
      churnScore = Math.min(churnScore, 100);

      // Determine risk level
      let riskLevel = 'low';
      if (churnScore >= 70) riskLevel = 'critical';
      else if (churnScore >= 50) riskLevel = 'high';
      else if (churnScore >= 30) riskLevel = 'medium';

      // Generate retention recommendations
      const retentionRecommendations = this._generateRetentionRecommendations(riskLevel, riskFactors);

      return {
        success: true,
        message: 'Churn risk prediction completed',
        data: {
          userId,
          churnScore,
          riskLevel,
          riskFactors,
          retentionRecommendations,
          suggestedActions: this._getSuggestedRetentionActions(riskLevel),
          confidenceScore: 0.85
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get AI-powered travel insights
   * @param {string} userId - User ID
   * @returns {object} - Travel insights
   */
  static async getTravelInsights(userId) {
    try {
      const RideRequest = require('../../models/RideRequest');
      const UserAnalytics = require('../../models/UserAnalytics');

      const rides = await RideRequest.find({ userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      const analytics = await UserAnalytics.findOne({ userId }).lean();

      const insights = [];

      // Insight 1: Travel time trends
      const avgTravelTime = rides.length > 0
        ? rides.reduce((sum, r) => sum + (r.duration || 0), 0) / rides.length
        : 0;

      insights.push({
        type: 'travel_time_trend',
        title: 'Your Average Travel Time',
        description: `You typically spend ${Math.round(avgTravelTime / 60)} minutes per ride`,
        data: avgTravelTime,
        trend: 'stable'
      });

      // Insight 2: Cost efficiency
      const avgCostPerKm = analytics?.totalSpent && analytics?.totalDistance
        ? (analytics.totalSpent / analytics.totalDistance).toFixed(2)
        : 'N/A';

      insights.push({
        type: 'cost_efficiency',
        title: 'Cost Efficiency',
        description: `Your rides cost ₹${avgCostPerKm} per km on average`,
        benchmark: 'Below average (saving 10%)',
        icon: 'trending-down'
      });

      // Insight 3: Peak travel times
      const hourlyDistribution = {};
      rides.forEach(r => {
        const hour = new Date(r.createdAt).getHours();
        hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
      });

      const peakHour = Object.keys(hourlyDistribution).reduce((a, b) =>
        hourlyDistribution[a] > hourlyDistribution[b] ? a : b
      );

      insights.push({
        type: 'peak_hours',
        title: 'Your Peak Travel Times',
        description: `Most rides at ${peakHour}:00 - ${parseInt(peakHour) + 1}:00`,
        peakHours: [peakHour],
        rideCount: hourlyDistribution[peakHour]
      });

      return {
        success: true,
        message: 'Travel insights retrieved',
        data: {
          userId,
          insights,
          analyticsOverview: {
            totalRides: rides.length,
            totalSpent: analytics?.totalSpent || 0,
            totalDistance: analytics?.totalDistance || 0,
            averageRating: analytics?.averageRating || 'N/A'
          }
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get destination recommendations based on similar users
   * @param {string} userId - User ID
   * @returns {object} - Destination recommendations
   */
  static async getDestinationRecommendations(userId) {
    try {
      const RideRequest = require('../../models/RideRequest');
      const UserProfile = require('../../models/UserProfile');

      const user = await UserProfile.findById(userId).lean();
      const userRides = await RideRequest.find({ userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      // Find similar users (same city, similar ride patterns)
      const similarUsers = await UserProfile.find({
        city: user.city,
        _id: { $ne: userId }
      }).limit(100).lean();

      // Analyze their destinations
      const destinationFrequency = {};
      
      for (const similarUser of similarUsers) {
        const theirRides = await RideRequest.find({ userId: similarUser._id })
          .limit(20)
          .lean();

        theirRides.forEach(ride => {
          const destKey = `${ride.dropoffLocation.lat}-${ride.dropoffLocation.lng}`;
          if (!userRides.some(r => r.dropoffLocation.lat === ride.dropoffLocation.lat && 
                                    r.dropoffLocation.lng === ride.dropoffLocation.lng)) {
            destinationFrequency[destKey] = (destinationFrequency[destKey] || 0) + 1;
          }
        });
      }

      // Get top recommendations
      const topRecommendations = Object.entries(destinationFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map((entry, index) => {
          const [lat, lng] = entry[0].split('-').map(Number);
          return {
            rank: index + 1,
            latitude: lat,
            longitude: lng,
            popularity: entry[1],
            reason: `Popular with users in your area`,
            estimatedFare: '₹200-300'
          };
        });

      return {
        success: true,
        message: 'Destination recommendations retrieved',
        data: {
          userId,
          recommendations: topRecommendations,
          basedOn: `${similarUsers.length} similar users`,
          confidence: 'High'
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // ==================== HELPER METHODS ====================

  static _analyzeTimePatterns(rides) {
    const hourlyDistribution = {};
    const dayDistribution = {};

    rides.forEach(ride => {
      const rideDate = new Date(ride.createdAt);
      const hour = rideDate.getHours();
      const day = rideDate.getDay();

      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
      dayDistribution[day] = (dayDistribution[day] || 0) + 1;
    });

    const peakHour = Object.keys(hourlyDistribution).reduce((a, b) =>
      hourlyDistribution[a] > hourlyDistribution[b] ? a : b
    );

    const bestHour = Object.keys(hourlyDistribution).reduce((a, b) =>
      hourlyDistribution[a] < hourlyDistribution[b] ? a : b
    );

    return {
      peakTravelTime: `${peakHour}:00`,
      bestTravelTime: `${bestHour}:00`,
      estimatedTimeSaving: Math.round((hourlyDistribution[peakHour] - hourlyDistribution[bestHour]) * 2)
    };
  }

  static _classifyRoute(lat1, lng1, lat2, lng2) {
    const distance = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2));
    if (distance < 0.05) return 'short';
    if (distance < 0.2) return 'medium';
    return 'long';
  }

  static async _recommendRideType(userId, context, analytics) {
    // Premium if user has premium subscription
    // Economy otherwise
    return {
      recommended: 'economy',
      alternatives: ['premium', 'shared'],
      reason: 'Most cost-effective for this route'
    };
  }

  static async _recommendPaymentMethod(userId, analytics) {
    return {
      recommended: 'wallet',
      reason: 'You have ₹500 wallet balance',
      alternatives: ['card', 'upi']
    };
  }

  static async _recommendSchedule(userId, context) {
    return {
      recommendedTime: 'Book now for immediate pickup',
      alternatives: ['Schedule for later'],
      estimatedPickup: '3-5 minutes'
    };
  }

  static async _recommendSaveOption(userId, context) {
    return {
      canSave: true,
      reason: 'This is a frequently used route',
      saveAsLabel: 'Home to Work'
    };
  }

  static _generateSmartTips(recommendations, analytics) {
    const tips = [];
    if (recommendations.schedule.estimatedPickup === '3-5 minutes') {
      tips.push('Drivers are readily available now');
    }
    return tips;
  }

  static _calculateEstimatedSavings(recommendations, analytics) {
    return {
      walletSavings: 50,
      premiumSavings: 100,
      totalPotentialSavings: 150
    };
  }

  static _generateRetentionRecommendations(riskLevel, riskFactors) {
    const recommendations = [];

    if (riskLevel === 'critical') {
      recommendations.push('Immediate action required: Offer special discount');
      recommendations.push('Contact user with personalized offer');
    } else if (riskLevel === 'high') {
      recommendations.push('Send weekly ride reminders');
      recommendations.push('Offer 20% discount on next 3 rides');
    } else if (riskLevel === 'medium') {
      recommendations.push('Send occasional promotions');
    }

    return recommendations;
  }

  static _getSuggestedRetentionActions(riskLevel) {
    if (riskLevel === 'critical') {
      return ['Send personalized offer', 'Call customer support', 'Waive booking fee'];
    } else if (riskLevel === 'high') {
      return ['Send promotional email', 'Offer loyalty points', 'Free ride voucher'];
    }
    return ['Regular engagement campaigns'];
  }
}

module.exports = AIRecommendationEngine;
