/**
 * RecommendationEngine Service
 * AI-powered food recommendation system
 * Uses user preferences, order history, and collaborative filtering
 */

const UserPreference = require('../models/UserPreference');
const FoodOrder = require('../models/FoodOrder');

class RecommendationEngine {
  /**
   * Get personalized recommendations for user
   */
  static async getPersonalizedRecommendations(userId, limit = 10) {
    try {
      const preferences = await UserPreference.findOne({ userId });

      if (!preferences) {
        // Return popular items if no preference data
        return await this.getPopularRecommendations(limit);
      }

      const recommendations = [];

      // 1. Get favorite restaurants recommendations
      const favoriteRestaurantRecommendations = await this._getFromFavoriteRestaurants(
        preferences,
        limit / 3
      );

      // 2. Get cuisine-based recommendations
      const cuisineRecommendations = await this._getByPreferredCuisines(preferences, limit / 3);

      // 3. Get trending items similar to favorites
      const trendingRecommendations = await this._getTrendingInFavoriteCategories(
        preferences,
        limit / 3
      );

      recommendations.push(...favoriteRestaurantRecommendations, ...cuisineRecommendations, ...trendingRecommendations);

      // Deduplicate and shuffle
      const uniqueRecommendations = [...new Set(recommendations.map((r) => r._id))].slice(0, limit);

      return {
        success: true,
        data: uniqueRecommendations,
        message: 'Recommendations generated',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Get collaborative filtering recommendations
   * Based on users with similar ordering patterns
   */
  static async getCollaborativeRecommendations(userId, limit = 10) {
    try {
      const userPrefs = await UserPreference.findOne({ userId });

      if (!userPrefs) {
        return {
          success: false,
          message: 'User preferences not found',
        };
      }

      // Get users with similar tastes
      const similarUsers = await UserPreference.find({
        'cuisinePreferences.favorites': { $in: userPrefs.cuisinePreferences.favorites.map((c) => c.cuisine) },
        userId: { $ne: userId },
      }).limit(5);

      const recommendedItems = [];

      for (const similarUser of similarUsers) {
        const items = similarUser.favoriteItems.filter(
          (item) => !userPrefs.favoriteItems.some((ui) => ui.itemId.equals(item.itemId))
        );

        recommendedItems.push(...items);
      }

      // Sort by preference score and limit
      const sortedItems = recommendedItems
        .sort((a, b) => b.preferenceScore - a.preferenceScore)
        .slice(0, limit);

      return {
        success: true,
        data: sortedItems,
        message: 'Collaborative recommendations generated',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Get content-based recommendations
   * Items similar to user's favorite items
   */
  static async getContentBasedRecommendations(userId, limit = 10) {
    try {
      const preferences = await UserPreference.findOne({ userId });

      if (!preferences) {
        return {
          success: false,
          message: 'User preferences not found',
        };
      }

      const topFavorites = preferences.favoriteItems.sort((a, b) => b.orderCount - a.orderCount).slice(0, 3);

      if (topFavorites.length === 0) {
        return {
          success: false,
          message: 'No favorite items found',
        };
      }

      // Get similar items from same restaurants
      const similarItems = [];

      for (const favorite of topFavorites) {
        // Get all items from the same restaurant
        const items = await this._getSimilarItems(favorite.itemId, favorite.restaurantId, limit);
        similarItems.push(...items);
      }

      // Deduplicate and limit
      const uniqueItems = [...new Map(similarItems.map((item) => [item._id, item])).values()].slice(0, limit);

      return {
        success: true,
        data: uniqueItems,
        message: 'Content-based recommendations generated',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Get popular/trending recommendations
   */
  static async getPopularRecommendations(limit = 10) {
    try {
      // This would typically query trending/popular items
      // For now, return mock structure
      return {
        success: true,
        data: [],
        message: 'Popular recommendations',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Get health-conscious recommendations
   */
  static async getHealthyRecommendations(userId, limit = 10) {
    try {
      const preferences = await UserPreference.findOne({ userId });

      if (!preferences || !preferences.healthGoals.some((g) => g.active)) {
        return {
          success: false,
          message: 'No active health goals found',
        };
      }

      const activeGoal = preferences.healthGoals.find((g) => g.active);

      // Filter based on goals
      let recommendations = [];

      if (activeGoal.goal === 'weight_loss') {
        recommendations = await this._getLowCalorieRecommendations(preferences, limit);
      } else if (activeGoal.goal === 'muscle_gain') {
        recommendations = await this._getHighProteinRecommendations(preferences, limit);
      } else if (activeGoal.goal === 'balance') {
        recommendations = await this._getBalancedRecommendations(preferences, limit);
      }

      return {
        success: true,
        data: recommendations,
        message: 'Health-conscious recommendations',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Get restaurant recommendations
   */
  static async getRestaurantRecommendations(userId, limit = 10) {
    try {
      const preferences = await UserPreference.findOne({ userId });

      if (!preferences) {
        return {
          success: false,
          message: 'User preferences not found',
        };
      }

      const topRestaurants = preferences.favoriteRestaurants
        .sort((a, b) => b.rating - a.rating)
        .slice(0, limit);

      return {
        success: true,
        data: topRestaurants,
        message: 'Restaurant recommendations',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  /**
   * Get time-based recommendations
   */
  static async getTimeBasedRecommendations(userId, limit = 10) {
    try {
      const preferences = await UserPreference.findOne({ userId });

      if (!preferences) {
        return {
          success: false,
          message: 'User preferences not found',
        };
      }

      const currentHour = new Date().getHours();
      const currentDay = new Date().getDay();
      const season = this._getSeason();

      let recommendations = [];

      // Get preferences for current time
      if (currentHour >= 6 && currentHour < 12 && preferences.mealTypes.breakfast) {
        recommendations = preferences.favoriteItems
          .filter((item) => item.itemName.toLowerCase().includes('breakfast'))
          .slice(0, limit);
      } else if (currentHour >= 12 && currentHour < 15 && preferences.mealTypes.lunch) {
        recommendations = preferences.favoriteItems
          .filter((item) => item.itemName.toLowerCase().includes('lunch'))
          .slice(0, limit);
      } else if (currentHour >= 19 && currentHour < 23 && preferences.mealTypes.dinner) {
        recommendations = preferences.favoriteItems.slice(0, limit);
      }

      return {
        success: true,
        data: recommendations,
        message: 'Time-based recommendations',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }

  // Helper methods

  static async _getFromFavoriteRestaurants(preferences, limit) {
    // Mock implementation
    return preferences.favoriteRestaurants.slice(0, limit);
  }

  static async _getByPreferredCuisines(preferences, limit) {
    // Mock implementation
    return preferences.getTopCuisines(limit);
  }

  static async _getTrendingInFavoriteCategories(preferences, limit) {
    // Mock implementation - would query for trending items
    return [];
  }

  static async _getSimilarItems(itemId, restaurantId, limit) {
    // Mock implementation - would find similar items
    return [];
  }

  static async _getLowCalorieRecommendations(preferences, limit) {
    // Mock implementation
    return [];
  }

  static async _getHighProteinRecommendations(preferences, limit) {
    // Mock implementation
    return [];
  }

  static async _getBalancedRecommendations(preferences, limit) {
    // Mock implementation
    return [];
  }

  static _getSeason() {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'monsoon';
    return 'winter';
  }

  /**
   * Track recommendation engagement
   */
  static async trackEngagement(userId, recommendedItemId, action = 'viewed') {
    try {
      const preferences = await UserPreference.findOne({ userId });

      if (!preferences) {
        return {
          success: false,
          message: 'User preferences not found',
        };
      }

      // Update engagement score for ML model
      if (action === 'clicked') {
        preferences.mlFeatures.engagementScore = Math.min(
          1,
          preferences.mlFeatures.engagementScore + 0.01
        );
      } else if (action === 'ordered') {
        preferences.mlFeatures.engagementScore = Math.min(
          1,
          preferences.mlFeatures.engagementScore + 0.05
        );
      }

      await preferences.save();

      return {
        success: true,
        message: 'Engagement tracked',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error],
      };
    }
  }
}

module.exports = RecommendationEngine;
