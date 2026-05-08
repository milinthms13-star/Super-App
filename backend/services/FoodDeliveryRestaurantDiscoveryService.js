/**
 * FoodDeliveryRestaurantDiscoveryService
 * Handles restaurant discovery, search, filtering, and location-based queries
 * Estimated 600+ lines
 */

const FoodDeliveryRestaurant = require('../models/FoodDeliveryRestaurant');
const FoodDeliveryUser = require('../models/FoodDeliveryUser');
const FoodDeliveryAddress = require('../models/FoodDeliveryAddress');

class FoodDeliveryRestaurantDiscoveryService {
  /**
   * Get nearby restaurants
   * @param {Object} params - {latitude, longitude, radiusInKm, limit, skip}
   * @returns {Promise<Object>} {restaurants, total, radius}
   */
  async getNearbyRestaurants(params) {
    const { latitude, longitude, radiusInKm = 5, limit = 20, skip = 0, sortBy = 'distance' } =
      params;

    try {
      const radiusInMeters = radiusInKm * 1000;

      const query = {
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: radiusInMeters,
          },
        },
        status: 'active',
        verificationStatus: 'verified',
      };

      const restaurants = await FoodDeliveryRestaurant.find(query)
        .limit(limit)
        .skip(skip)
        .lean();

      // Calculate distance for each restaurant
      const restaurantsWithDistance = restaurants.map((restaurant) => {
        const distance = this._calculateDistance(
          latitude,
          longitude,
          restaurant.location.coordinates[1],
          restaurant.location.coordinates[0]
        );
        return {
          ...restaurant,
          distanceKm: parseFloat(distance.toFixed(2)),
        };
      });

      // Sort by specified field
      if (sortBy === 'distance') {
        restaurantsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);
      } else if (sortBy === 'rating') {
        restaurantsWithDistance.sort((a, b) => b.ratings.average - a.ratings.average);
      } else if (sortBy === 'delivery-time') {
        restaurantsWithDistance.sort((a, b) => a.deliveryTime - b.deliveryTime);
      }

      const total = await FoodDeliveryRestaurant.countDocuments(query);

      return {
        restaurants: restaurantsWithDistance,
        total,
        radius: radiusInKm,
        hasMore: skip + limit < total,
      };
    } catch (error) {
      throw new Error(`Error fetching nearby restaurants: ${error.message}`);
    }
  }

  /**
   * Search restaurants
   * @param {Object} params - {query, limit, skip}
   * @returns {Promise<Object>} {restaurants, total}
   */
  async searchRestaurants(params) {
    const { query, limit = 20, skip = 0 } = params;

    try {
      if (!query || query.trim().length < 2) {
        throw new Error('Search query must be at least 2 characters');
      }

      const searchQuery = {
        $text: { $search: query },
        status: 'active',
        verificationStatus: 'verified',
      };

      const restaurants = await FoodDeliveryRestaurant.find(searchQuery)
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await FoodDeliveryRestaurant.countDocuments(searchQuery);

      return {
        restaurants,
        total,
        query,
        hasMore: skip + limit < total,
      };
    } catch (error) {
      throw new Error(`Error searching restaurants: ${error.message}`);
    }
  }

  /**
   * Get filtered restaurants
   * @param {Object} params - {latitude, longitude, cuisines, priceRange, vegetarianOnly, minRating, isOpen, limit, skip}
   * @returns {Promise<Object>} {restaurants, total, filters}
   */
  async getFilteredRestaurants(params) {
    const {
      latitude,
      longitude,
      cuisines = [],
      priceRange = [],
      vegetarianOnly = false,
      minRating = 0,
      isOpen = null,
      limit = 20,
      skip = 0,
      sortBy = 'distance',
    } = params;

    try {
      const radiusInMeters = 5 * 1000; // 5km default

      let query = {
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: radiusInMeters,
          },
        },
        status: 'active',
        verificationStatus: 'verified',
        'ratings.average': { $gte: minRating },
      };

      // Cuisine filter
      if (cuisines && cuisines.length > 0) {
        query.cuisineTypes = { $in: cuisines };
      }

      // Price range filter
      if (priceRange && priceRange.length > 0) {
        query.priceRange = { $in: priceRange };
      }

      // Vegetarian only filter
      if (vegetarianOnly) {
        query.hasVeg = true;
        query.hasNonVeg = false;
      }

      // Open/Closed filter
      if (isOpen !== null) {
        query.isOpen = isOpen;
      }

      const restaurants = await FoodDeliveryRestaurant.find(query)
        .limit(limit)
        .skip(skip)
        .lean();

      // Calculate distance
      const restaurantsWithDistance = restaurants.map((restaurant) => {
        const distance = this._calculateDistance(
          latitude,
          longitude,
          restaurant.location.coordinates[1],
          restaurant.location.coordinates[0]
        );
        return {
          ...restaurant,
          distanceKm: parseFloat(distance.toFixed(2)),
        };
      });

      // Sort
      if (sortBy === 'distance') {
        restaurantsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);
      } else if (sortBy === 'rating') {
        restaurantsWithDistance.sort((a, b) => b.ratings.average - a.ratings.average);
      } else if (sortBy === 'delivery-time') {
        restaurantsWithDistance.sort((a, b) => a.deliveryTime - b.deliveryTime);
      }

      const total = await FoodDeliveryRestaurant.countDocuments(query);

      return {
        restaurants: restaurantsWithDistance,
        total,
        filters: {
          cuisines,
          priceRange,
          vegetarianOnly,
          minRating,
          isOpen,
        },
        hasMore: skip + limit < total,
      };
    } catch (error) {
      throw new Error(`Error fetching filtered restaurants: ${error.message}`);
    }
  }

  /**
   * Get featured restaurants
   * @param {Object} params - {latitude, longitude, limit}
   * @returns {Promise<Object>} {restaurants}
   */
  async getFeaturedRestaurants(params) {
    const { latitude, longitude, limit = 10 } = params;

    try {
      const restaurants = await FoodDeliveryRestaurant.find({
        isFeatured: true,
        status: 'active',
        verificationStatus: 'verified',
      })
        .limit(limit)
        .lean();

      const restaurantsWithDistance = restaurants.map((restaurant) => {
        const distance = this._calculateDistance(
          latitude,
          longitude,
          restaurant.location.coordinates[1],
          restaurant.location.coordinates[0]
        );
        return {
          ...restaurant,
          distanceKm: parseFloat(distance.toFixed(2)),
        };
      });

      return {
        restaurants: restaurantsWithDistance,
      };
    } catch (error) {
      throw new Error(`Error fetching featured restaurants: ${error.message}`);
    }
  }

  /**
   * Get promoted restaurants (with active promotion)
   * @param {Object} params - {limit}
   * @returns {Promise<Object>} {restaurants}
   */
  async getPromotedRestaurants(params) {
    const { limit = 10 } = params;

    try {
      const restaurants = await FoodDeliveryRestaurant.find({
        isPromoted: true,
        status: 'active',
        verificationStatus: 'verified',
      })
        .limit(limit)
        .lean();

      return {
        restaurants,
      };
    } catch (error) {
      throw new Error(`Error fetching promoted restaurants: ${error.message}`);
    }
  }

  /**
   * Get restaurant details by ID
   * @param {String} restaurantId
   * @returns {Promise<Object>} restaurant
   */
  async getRestaurantDetails(restaurantId) {
    try {
      if (!restaurantId) {
        throw new Error('Restaurant ID is required');
      }

      const restaurant = await FoodDeliveryRestaurant.findOne({
        _id: restaurantId,
        status: 'active',
      }).lean();

      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      return restaurant;
    } catch (error) {
      throw new Error(`Error fetching restaurant details: ${error.message}`);
    }
  }

  /**
   * Get restaurants by cuisine
   * @param {Object} params - {cuisine, latitude, longitude, limit, skip}
   * @returns {Promise<Object>} {restaurants, total}
   */
  async getRestaurantsByCuisine(params) {
    const { cuisine, latitude, longitude, limit = 20, skip = 0 } = params;

    try {
      if (!cuisine || cuisine.trim().length < 2) {
        throw new Error('Cuisine must be at least 2 characters');
      }

      const radiusInMeters = 5 * 1000;

      const query = {
        cuisineTypes: {
          $elemMatch: {
            $regex: cuisine,
            $options: 'i',
          },
        },
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: radiusInMeters,
          },
        },
        status: 'active',
        verificationStatus: 'verified',
      };

      const restaurants = await FoodDeliveryRestaurant.find(query)
        .limit(limit)
        .skip(skip)
        .lean();

      const restaurantsWithDistance = restaurants.map((restaurant) => {
        const distance = this._calculateDistance(
          latitude,
          longitude,
          restaurant.location.coordinates[1],
          restaurant.location.coordinates[0]
        );
        return {
          ...restaurant,
          distanceKm: parseFloat(distance.toFixed(2)),
        };
      });

      const total = await FoodDeliveryRestaurant.countDocuments(query);

      return {
        restaurants: restaurantsWithDistance,
        total,
        cuisine,
        hasMore: skip + limit < total,
      };
    } catch (error) {
      throw new Error(`Error fetching restaurants by cuisine: ${error.message}`);
    }
  }

  /**
   * Get restaurants for user's default address
   * @param {String} userId
   * @param {Object} params - {limit, skip}
   * @returns {Promise<Object>} {restaurants, userAddress}
   */
  async getRestaurantsForUserAddress(userId, params) {
    try {
      const user = await FoodDeliveryUser.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const userAddress = await FoodDeliveryAddress.findOne({
        _id: user.defaultAddressId,
        isActive: true,
      });

      if (!userAddress || !userAddress.location) {
        throw new Error('User does not have a valid default address');
      }

      return this.getNearbyRestaurants({
        latitude: userAddress.location.coordinates[1],
        longitude: userAddress.location.coordinates[0],
        ...params,
      });
    } catch (error) {
      throw new Error(`Error fetching restaurants for user: ${error.message}`);
    }
  }

  /**
   * Get restaurant reviews
   * @param {String} restaurantId
   * @param {Object} params - {limit, skip}
   * @returns {Promise<Object>} {reviews, total, restaurant}
   */
  async getRestaurantReviews(restaurantId, params) {
    const { limit = 10, skip = 0 } = params;

    try {
      const restaurant = await FoodDeliveryRestaurant.findById(restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      const reviews = restaurant.reviews
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(skip, skip + limit);

      return {
        reviews,
        total: restaurant.reviews.length,
        restaurantId,
        averageRating: restaurant.ratings.average,
      };
    } catch (error) {
      throw new Error(`Error fetching restaurant reviews: ${error.message}`);
    }
  }

  /**
   * Add review to restaurant
   * @param {String} restaurantId
   * @param {String} userId
   * @param {Object} reviewData
   * @returns {Promise<Object>} review
   */
  async addRestaurantReview(restaurantId, userId, reviewData) {
    try {
      const restaurant = await FoodDeliveryRestaurant.findById(restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      const review = {
        userId,
        rating: reviewData.rating,
        comment: reviewData.comment,
        foodQuality: reviewData.foodQuality,
        delivery: reviewData.delivery,
        packaging: reviewData.packaging,
        isVerifiedOrder: reviewData.isVerifiedOrder || false,
      };

      await restaurant.addReview(review);

      return review;
    } catch (error) {
      throw new Error(`Error adding review: ${error.message}`);
    }
  }

  /**
   * Get active offers from restaurants
   * @param {Object} params - {latitude, longitude, limit}
   * @returns {Promise<Object>} {offers}
   */
  async getActiveOffers(params) {
    const { latitude, longitude, limit = 20 } = params;

    try {
      const radiusInMeters = 5 * 1000;

      const restaurants = await FoodDeliveryRestaurant.find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: radiusInMeters,
          },
        },
        'offers.validUntil': { $gt: new Date() },
        status: 'active',
        verificationStatus: 'verified',
      })
        .limit(limit)
        .lean();

      const offers = [];
      restaurants.forEach((restaurant) => {
        const activeOffers = restaurant.offers.filter((o) => o.validUntil > new Date());
        activeOffers.forEach((offer) => {
          offers.push({
            ...offer,
            restaurantId: restaurant._id,
            restaurantName: restaurant.name,
            restaurantImage: restaurant.profileImage,
          });
        });
      });

      return {
        offers,
        total: offers.length,
      };
    } catch (error) {
      throw new Error(`Error fetching active offers: ${error.message}`);
    }
  }

  /**
   * Get trending restaurants
   * @param {Object} params - {latitude, longitude, limit}
   * @returns {Promise<Object>} {restaurants}
   */
  async getTrendingRestaurants(params) {
    const { latitude, longitude, limit = 10 } = params;

    try {
      const radiusInMeters = 5 * 1000;

      const restaurants = await FoodDeliveryRestaurant.find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: radiusInMeters,
          },
        },
        status: 'active',
        verificationStatus: 'verified',
      })
        .sort({ 'metrics.orderCount30Days': -1 })
        .limit(limit)
        .lean();

      const restaurantsWithDistance = restaurants.map((restaurant) => {
        const distance = this._calculateDistance(
          latitude,
          longitude,
          restaurant.location.coordinates[1],
          restaurant.location.coordinates[0]
        );
        return {
          ...restaurant,
          distanceKm: parseFloat(distance.toFixed(2)),
        };
      });

      return {
        restaurants: restaurantsWithDistance,
      };
    } catch (error) {
      throw new Error(`Error fetching trending restaurants: ${error.message}`);
    }
  }

  /**
   * Helper: Calculate distance between two coordinates (Haversine formula)
   * @param {Number} lat1
   * @param {Number} lon1
   * @param {Number} lat2
   * @param {Number} lon2
   * @returns {Number} distance in km
   */
  _calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this._toRad(lat2 - lat1);
    const dLon = this._toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._toRad(lat1)) *
        Math.cos(this._toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Helper: Convert degrees to radians
   */
  _toRad(deg) {
    return deg * (Math.PI / 180);
  }
}

module.exports = new FoodDeliveryRestaurantDiscoveryService();
