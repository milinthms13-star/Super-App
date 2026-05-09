/**
 * ReputationSystemService.js
 * Advanced reputation and trust scoring system for ridesharing platform
 * Includes badges, certifications, performance metrics, trust indicators
 */

const mongoose = require('mongoose');

class ReputationSystemService {
  /**
   * Calculate comprehensive reputation score for a user
   */
  static async calculateReputationScore(userId, userType) {
    try {
      // userType: 'driver' or 'rider'
      const ratingsCollection = mongoose.connection.collection('ratings');
      const completedRidesCollection = mongoose.connection.collection('payment_transactions');

      // Get user ratings
      const userQuery = userType === 'driver' ? { driverId: userId } : { riderId: userId };
      const ratings = await ratingsCollection
        .find({ ...userQuery, status: 'approved' })
        .toArray();

      if (ratings.length === 0) {
        return {
          success: true,
          data: {
            userId,
            reputationScore: 50, // New user starting score
            level: 'new',
            badges: [],
            trustMetrics: {
              avgRating: 0,
              totalRatings: 0,
              completionRate: 0,
              responseRate: 100,
              cancellationRate: 0
            }
          }
        };
      }

      // Calculate average rating
      const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

      // Get completed rides count
      const completedRides = await completedRidesCollection.countDocuments({
        userId,
        status: 'completed'
      });

      // Calculate base score from rating (0-40 points)
      const ratingScore = (avgRating / 5) * 40;

      // Calculate activity score (0-30 points)
      let activityScore = 0;
      if (completedRides >= 500) activityScore = 30;
      else if (completedRides >= 250) activityScore = 25;
      else if (completedRides >= 100) activityScore = 20;
      else if (completedRides >= 50) activityScore = 15;
      else if (completedRides >= 10) activityScore = 10;
      else if (completedRides > 0) activityScore = 5;

      // Calculate response rate score (0-15 points)
      const flagCount = ratings.filter(r => r.flagCount > 0).length;
      const flagRatio = flagCount / Math.max(ratings.length, 1);
      const responseScore = Math.max(0, 15 * (1 - flagRatio));

      // Calculate consistency score (0-15 points)
      const categoryAverages = {};
      ratings.forEach(r => {
        if (r.categories) {
          Object.entries(r.categories).forEach(([key, value]) => {
            if (!categoryAverages[key]) categoryAverages[key] = [];
            categoryAverages[key].push(value);
          });
        }
      });

      const categoryStdDev = Object.values(categoryAverages)
        .map(values => {
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
          return Math.sqrt(variance);
        })
        .reduce((a, b) => a + b, 0) / Object.keys(categoryAverages).length;

      const consistencyScore = Math.max(0, 15 * Math.exp(-categoryStdDev));

      // Total reputation score (0-100)
      const reputationScore = Math.min(100, ratingScore + activityScore + responseScore + consistencyScore);

      // Determine reputation level
      let level = 'new';
      if (reputationScore >= 90) level = 'excellent';
      else if (reputationScore >= 80) level = 'very_good';
      else if (reputationScore >= 70) level = 'good';
      else if (reputationScore >= 60) level = 'fair';
      else if (reputationScore >= 50) level = 'acceptable';
      else if (reputationScore < 50) level = 'at_risk';

      // Determine badges
      const badges = this.determineBadges(ratings, completedRides, avgRating, userType);

      return {
        success: true,
        data: {
          userId,
          userType,
          reputationScore: reputationScore.toFixed(2),
          level,
          badges,
          trustMetrics: {
            avgRating: avgRating.toFixed(2),
            totalRatings: ratings.length,
            totalCompletedRides: completedRides,
            responseScore: responseScore.toFixed(2),
            consistencyScore: consistencyScore.toFixed(2),
            scoreBreakdown: {
              rating: ratingScore.toFixed(2),
              activity: activityScore.toFixed(2),
              response: responseScore.toFixed(2),
              consistency: consistencyScore.toFixed(2)
            }
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error calculating reputation score: ${error.message}`
      };
    }
  }

  /**
   * Determine earned badges based on achievements
   */
  static determineBadges(ratings, completedRides, avgRating, userType) {
    const badges = [];

    // Rating-based badges
    if (avgRating >= 4.8) badges.push({ name: 'five_star_rated', description: '4.8+ average rating' });
    if (avgRating >= 4.5) badges.push({ name: 'highly_rated', description: 'Consistently high ratings' });

    // Activity-based badges
    if (completedRides >= 1000) badges.push({ name: 'super_active', description: '1000+ rides completed' });
    else if (completedRides >= 500) badges.push({ name: 'very_active', description: '500+ rides completed' });
    else if (completedRides >= 250) badges.push({ name: 'active', description: '250+ rides completed' });

    // Consistency badge
    if (ratings.length >= 50) {
      const flagCount = ratings.filter(r => r.flagCount > 0).length;
      if (flagCount === 0) badges.push({ name: 'no_issues', description: 'No reported issues' });
    }

    // Reliability badges
    if (ratings.length >= 20) {
      const positiveRatings = ratings.filter(r => r.rating >= 4).length;
      if (positiveRatings / ratings.length >= 0.95) {
        badges.push({ name: 'reliable', description: '95%+ positive ratings' });
      }
    }

    // Role-specific badges
    if (userType === 'driver') {
      if (avgRating >= 4.7) badges.push({ name: 'professional_driver', description: 'Professional driving standards' });
      if (completedRides >= 100 && avgRating >= 4.5) badges.push({ name: 'driver_veteran', description: 'Experienced driver' });
    } else if (userType === 'rider') {
      if (ratings.length >= 50 && avgRating >= 4.5) badges.push({ name: 'respectful_rider', description: 'Consistently respectful' });
    }

    return badges;
  }

  /**
   * Get user reputation profile
   */
  static async getUserReputationProfile(userId) {
    try {
      const reputationCollection = mongoose.connection.collection('user_reputations');

      const profile = await reputationCollection.findOne({ userId });

      if (!profile) {
        return {
          success: false,
          message: 'Reputation profile not found'
        };
      }

      return {
        success: true,
        data: profile
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching reputation profile: ${error.message}`
      };
    }
  }

  /**
   * Save reputation profile
   */
  static async saveReputationProfile(reputationData) {
    try {
      const collection = mongoose.connection.collection('user_reputations');

      const reputationRecord = {
        userId: reputationData.userId,
        userType: reputationData.userType,
        reputationScore: reputationData.reputationScore,
        level: reputationData.level,
        badges: reputationData.badges,
        trustMetrics: reputationData.trustMetrics,
        scoreHistory: [
          {
            score: reputationData.reputationScore,
            date: new Date(),
            level: reputationData.level
          }
        ],
        lastUpdated: new Date(),
        createdAt: new Date()
      };

      const result = await collection.updateOne(
        { userId: reputationData.userId },
        {
          $set: reputationRecord,
          $push: {
            scoreHistory: {
              score: reputationData.reputationScore,
              date: new Date(),
              level: reputationData.level
            }
          }
        },
        { upsert: true }
      );

      return {
        success: true,
        message: 'Reputation profile saved',
        data: { userId: reputationData.userId }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error saving reputation profile: ${error.message}`
      };
    }
  }

  /**
   * Get trust metrics for comparison (percentile ranking)
   */
  static async getTrustMetricsPercentile(userId, userType) {
    try {
      const ratingsCollection = mongoose.connection.collection('ratings');
      const userQuery = userType === 'driver' ? { driverId: userId } : { riderId: userId };
      const userRatings = await ratingsCollection
        .find({ ...userQuery, status: 'approved' })
        .toArray();

      if (userRatings.length === 0) {
        return {
          success: true,
          data: {
            userId,
            percentiles: {
              rating: 50,
              activity: 50,
              consistency: 50
            }
          }
        };
      }

      const userAvgRating = userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length;

      // Get all ratings for percentile calculation
      const allRatings = await ratingsCollection.find({ status: 'approved' }).toArray();
      const allRatingsGrouped = {};

      allRatings.forEach(rating => {
        const key = userType === 'driver' ? rating.driverId : rating.riderId;
        if (!allRatingsGrouped[key]) allRatingsGrouped[key] = [];
        allRatingsGrouped[key].push(rating);
      });

      // Calculate percentiles
      const allAvgRatings = Object.values(allRatingsGrouped)
        .map(ratings => ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length)
        .sort((a, b) => a - b);

      const ratingPercentile = Math.round(
        (allAvgRatings.filter(r => r <= userAvgRating).length / allAvgRatings.length) * 100
      );

      return {
        success: true,
        data: {
          userId,
          percentiles: {
            rating: ratingPercentile,
            totalUsersRanked: allAvgRatings.length
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error calculating percentile: ${error.message}`
      };
    }
  }

  /**
   * Get reputation history for a user
   */
  static async getReputationHistory(userId, days = 90) {
    try {
      const collection = mongoose.connection.collection('user_reputations');
      const dateFilter = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const profile = await collection.findOne({ userId });

      if (!profile || !profile.scoreHistory) {
        return {
          success: true,
          data: {
            userId,
            history: []
          }
        };
      }

      const history = profile.scoreHistory
        .filter(entry => entry.date >= dateFilter)
        .sort((a, b) => a.date - b.date);

      return {
        success: true,
        data: {
          userId,
          period: `${days} days`,
          history
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching reputation history: ${error.message}`
      };
    }
  }

  /**
   * Get low reputation users for intervention
   */
  static async getLowReputationUsers(threshold = 50, limit = 50) {
    try {
      const collection = mongoose.connection.collection('user_reputations');

      const lowRepUsers = await collection
        .find({ reputationScore: { $lt: threshold } })
        .sort({ reputationScore: 1 })
        .limit(limit)
        .toArray();

      return {
        success: true,
        data: {
          threshold,
          count: lowRepUsers.length,
          users: lowRepUsers.map(u => ({
            userId: u.userId,
            reputationScore: u.reputationScore,
            level: u.level,
            action: u.reputationScore < 30 ? 'suspend' : 'warn'
          }))
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching low reputation users: ${error.message}`
      };
    }
  }

  /**
   * Recalculate reputation scores for all users
   */
  static async recalculateAllReputations(userType) {
    try {
      const usersCollection = mongoose.connection.collection('users');
      const users = await usersCollection.find({ userType }).toArray();

      let updated = 0;
      const results = [];

      for (const user of users) {
        const reputationData = await this.calculateReputationScore(user._id, userType);
        if (reputationData.success) {
          await this.saveReputationProfile(reputationData.data);
          updated++;
        }
        results.push(reputationData);
      }

      return {
        success: true,
        message: `Recalculated reputation for ${updated} users`,
        data: { updated, total: users.length }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error recalculating reputations: ${error.message}`
      };
    }
  }
}

module.exports = ReputationSystemService;
