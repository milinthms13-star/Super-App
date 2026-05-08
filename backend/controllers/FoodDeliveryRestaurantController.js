/**
 * FoodDeliveryRestaurantController
 * Handles HTTP requests for restaurant discovery, search, filtering
 * Estimated 300+ lines
 */

const FoodDeliveryRestaurantDiscoveryService = require('../services/FoodDeliveryRestaurantDiscoveryService');

class FoodDeliveryRestaurantController {
  /**
   * GET /restaurants/nearby
   * Get nearby restaurants based on coordinates
   */
  async getNearbyRestaurants(req, res) {
    try {
      const { latitude, longitude, radius = 5, limit = 20, skip = 0, sortBy = 'distance' } =
        req.query;

      // Validation
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required',
        });
      }

      const result = await FoodDeliveryRestaurantDiscoveryService.getNearbyRestaurants({
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radiusInKm: parseFloat(radius),
        limit: parseInt(limit),
        skip: parseInt(skip),
        sortBy,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /restaurants/search
   * Search restaurants by name, cuisine
   */
  async searchRestaurants(req, res) {
    try {
      const { q, limit = 20, skip = 0 } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required',
        });
      }

      const result = await FoodDeliveryRestaurantDiscoveryService.searchRestaurants({
        query: q,
        limit: parseInt(limit),
        skip: parseInt(skip),
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /restaurants/filtered
   * Get filtered restaurants
   */
  async getFilteredRestaurants(req, res) {
    try {
      const {
        latitude,
        longitude,
        cuisines,
        priceRange,
        vegetarianOnly,
        minRating = 0,
        isOpen,
        limit = 20,
        skip = 0,
        sortBy = 'distance',
      } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required',
        });
      }

      const result = await FoodDeliveryRestaurantDiscoveryService.getFilteredRestaurants({
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        cuisines: cuisines ? cuisines.split(',') : [],
        priceRange: priceRange ? priceRange.split(',') : [],
        vegetarianOnly: vegetarianOnly === 'true',
        minRating: parseFloat(minRating),
        isOpen: isOpen === 'true' ? true : isOpen === 'false' ? false : null,
        limit: parseInt(limit),
        skip: parseInt(skip),
        sortBy,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /restaurants/featured
   * Get featured restaurants
   */
  async getFeaturedRestaurants(req, res) {
    try {
      const { latitude, longitude, limit = 10 } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required',
        });
      }

      const result = await FoodDeliveryRestaurantDiscoveryService.getFeaturedRestaurants({
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        limit: parseInt(limit),
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /restaurants/promoted
   * Get promoted restaurants
   */
  async getPromotedRestaurants(req, res) {
    try {
      const { limit = 10 } = req.query;

      const result = await FoodDeliveryRestaurantDiscoveryService.getPromotedRestaurants({
        limit: parseInt(limit),
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /restaurants/trending
   * Get trending restaurants
   */
  async getTrendingRestaurants(req, res) {
    try {
      const { latitude, longitude, limit = 10 } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required',
        });
      }

      const result = await FoodDeliveryRestaurantDiscoveryService.getTrendingRestaurants({
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        limit: parseInt(limit),
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /restaurants/cuisine/:cuisine
   * Get restaurants by cuisine
   */
  async getRestaurantsByCuisine(req, res) {
    try {
      const { cuisine } = req.params;
      const { latitude, longitude, limit = 20, skip = 0 } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required',
        });
      }

      const result = await FoodDeliveryRestaurantDiscoveryService.getRestaurantsByCuisine({
        cuisine,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        limit: parseInt(limit),
        skip: parseInt(skip),
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /restaurants/offers
   * Get active offers from nearby restaurants
   */
  async getActiveOffers(req, res) {
    try {
      const { latitude, longitude, limit = 20 } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required',
        });
      }

      const result = await FoodDeliveryRestaurantDiscoveryService.getActiveOffers({
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        limit: parseInt(limit),
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /restaurants/:id
   * Get restaurant details
   */
  async getRestaurantDetails(req, res) {
    try {
      const { id } = req.params;

      const result = await FoodDeliveryRestaurantDiscoveryService.getRestaurantDetails(id);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /restaurants/:id/reviews
   * Get restaurant reviews
   */
  async getRestaurantReviews(req, res) {
    try {
      const { id } = req.params;
      const { limit = 10, skip = 0 } = req.query;

      const result = await FoodDeliveryRestaurantDiscoveryService.getRestaurantReviews(id, {
        limit: parseInt(limit),
        skip: parseInt(skip),
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * POST /restaurants/:id/reviews
   * Add review to restaurant (protected)
   */
  async addRestaurantReview(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { rating, comment, foodQuality, delivery, packaging, isVerifiedOrder } = req.body;

      // Validation
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5',
        });
      }

      const result = await FoodDeliveryRestaurantDiscoveryService.addRestaurantReview(
        id,
        userId,
        {
          rating,
          comment,
          foodQuality,
          delivery,
          packaging,
          isVerifiedOrder,
        }
      );

      res.status(201).json({
        success: true,
        data: result,
        message: 'Review added successfully',
      });
    } catch (error) {
      res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /restaurants/user/nearby
   * Get restaurants for user's default address (protected)
   */
  async getRestaurantsForUser(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 20, skip = 0, sortBy = 'distance' } = req.query;

      const result = await FoodDeliveryRestaurantDiscoveryService.getRestaurantsForUserAddress(
        userId,
        {
          limit: parseInt(limit),
          skip: parseInt(skip),
          sortBy,
        }
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new FoodDeliveryRestaurantController();
