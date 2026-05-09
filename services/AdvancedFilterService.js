const Product = require('../models/Product');
const Order = require('../models/Order');

/**
 * Advanced Filter Service
 * Provides complex filtering for product discovery
 * Supports price ranges, ratings, delivery times, seller ratings, distance-based, etc.
 */
class AdvancedFilterService {
  /**
   * Build MongoDB filter query from filter criteria
   * @param {Object} filters - Filter criteria
   * @returns {Object} MongoDB query object
   */
  static buildFilterQuery(filters) {
    const query = { status: 'active' };

    // Price range filter
    if (filters.minPrice || filters.maxPrice) {
      query.price = {};
      if (filters.minPrice) query.price.$gte = parseFloat(filters.minPrice);
      if (filters.maxPrice) query.price.$lte = parseFloat(filters.maxPrice);
    }

    // Category filter
    if (filters.category) {
      query.category = Array.isArray(filters.category)
        ? { $in: filters.category }
        : filters.category;
    }

    // Brand filter
    if (filters.brand) {
      query.brand = Array.isArray(filters.brand)
        ? { $in: filters.brand }
        : filters.brand;
    }

    // Rating filter
    if (filters.minRating) {
      query.rating = { $gte: parseFloat(filters.minRating) };
    }

    // Stock filter
    if (filters.inStock === true) {
      query.stock = { $gt: 0 };
    }

    // Discount filter
    if (filters.minDiscount) {
      query.discountPercentage = { $gte: parseFloat(filters.minDiscount) };
    }

    // Free shipping filter
    if (filters.freeShipping === true) {
      query.freeShipping = true;
    }

    // Warranty filter
    if (filters.warranty) {
      query.warranty = filters.warranty;
    }

    // Return policy filter
    if (filters.returnDays) {
      query.returnPeriodDays = { $gte: parseInt(filters.returnDays) };
    }

    // Color filter
    if (filters.color) {
      query.colors = Array.isArray(filters.color)
        ? { $in: filters.color }
        : filters.color;
    }

    // Size filter
    if (filters.size) {
      query.sizes = Array.isArray(filters.size)
        ? { $in: filters.size }
        : filters.size;
    }

    // Seller rating filter
    if (filters.sellerRating) {
      query.sellerRating = { $gte: parseFloat(filters.sellerRating) };
    }

    // Verified seller filter
    if (filters.verifiedSeller === true) {
      query.sellerVerified = true;
    }

    // EMI available filter
    if (filters.emiAvailable === true) {
      query.emiAvailable = true;
    }

    // New product filter (created in last 30 days)
    if (filters.newProduct === true) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      query.createdAt = { $gte: thirtyDaysAgo };
    }

    // Bestseller filter (top sellers)
    if (filters.bestseller === true) {
      query.isBestseller = true;
    }

    return query;
  }

  /**
   * Build aggregation pipeline for advanced filters with sorting
   * @param {Object} filters - Filter criteria
   * @param {String} sortBy - Sort field
   * @param {Number} skip - Skip count for pagination
   * @param {Number} limit - Limit count for pagination
   * @param {Object} userLocation - User's location for distance-based filtering
   * @returns {Array} MongoDB aggregation pipeline
   */
  static buildAdvancedPipeline(filters, sortBy = 'relevance', skip = 0, limit = 20, userLocation = null) {
    const pipeline = [];

    // Match stage - basic filters
    const matchQuery = this.buildFilterQuery(filters);
    pipeline.push({ $match: matchQuery });

    // Geospatial filtering if user location provided
    if (userLocation && userLocation.lat && userLocation.lng && filters.maxDistance) {
      pipeline.push({
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [userLocation.lng, userLocation.lat]
          },
          distanceField: 'distance',
          maxDistance: filters.maxDistance * 1000, // Convert km to meters
          spherical: true
        }
      });
    }

    // Lookup seller info for seller-based filters
    if (filters.sellerRating || filters.verifiedSeller) {
      pipeline.push({
        $lookup: {
          from: 'users',
          localField: 'seller',
          foreignField: '_id',
          as: 'sellerInfo'
        }
      });
      pipeline.push({ $unwind: '$sellerInfo' });
    }

    // Add sort stage
    const sortOptions = this.getSortOptions(sortBy);
    if (Object.keys(sortOptions).length > 0) {
      pipeline.push({ $sort: sortOptions });
    }

    // Facet stage for filters summary
    if (filters.includeFacets) {
      pipeline.push({
        $facet: {
          products: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                name: 1,
                price: 1,
                image: 1,
                category: 1,
                rating: 1,
                reviews: { $size: '$reviews' },
                discount: '$discountPercentage',
                distance: 1
              }
            }
          ],
          metadata: [
            {
              $group: {
                _id: null,
                totalCount: { $sum: 1 },
                avgPrice: { $avg: '$price' },
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price' },
                avgRating: { $avg: '$rating' },
                categories: { $addToSet: '$category' },
                brands: { $addToSet: '$brand' }
              }
            }
          ]
        }
      });
    } else {
      // Simple pagination
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limit });
      pipeline.push({
        $project: {
          _id: 1,
          name: 1,
          price: 1,
          image: 1,
          category: 1,
          rating: 1,
          reviews: { $size: '$reviews' },
          discount: '$discountPercentage',
          distance: 1
        }
      });
    }

    return pipeline;
  }

  /**
   * Get sort options based on sort parameter
   * @param {String} sortBy - Sort type
   * @returns {Object} MongoDB sort object
   */
  static getSortOptions(sortBy) {
    const sortOptions = {
      relevance: { _score: -1, rating: -1 },
      'price-low': { price: 1 },
      'price-high': { price: -1 },
      'newest': { createdAt: -1 },
      'rating': { rating: -1, reviews: -1 },
      'discount': { discountPercentage: -1, price: 1 },
      'distance': { distance: 1 },
      'bestseller': { isBestseller: -1, rating: -1 }
    };

    return sortOptions[sortBy] || sortOptions.relevance;
  }

  /**
   * Apply filters and return results
   * @param {Object} filters - Filter criteria
   * @param {Number} page - Page number
   * @param {Number} pageSize - Items per page
   * @param {String} sortBy - Sort option
   * @param {Object} userLocation - User location
   * @returns {Object} {success, message, data}
   */
  static async applyFilters(filters, page = 1, pageSize = 20, sortBy = 'relevance', userLocation = null) {
    try {
      const skip = (page - 1) * pageSize;

      const pipeline = this.buildAdvancedPipeline(
        filters,
        sortBy,
        skip,
        pageSize,
        userLocation
      );

      // Add facets flag for full results
      filters.includeFacets = true;

      const results = await Product.aggregate(pipeline);

      if (!results || results.length === 0) {
        return {
          success: true,
          message: 'No products found',
          data: {
            products: [],
            metadata: {
              totalCount: 0,
              page: page,
              pageSize: pageSize,
              totalPages: 0
            },
            filters: filters
          }
        };
      }

      const facet = results[0];
      const totalCount = facet.metadata[0]?.totalCount || 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        success: true,
        message: 'Filters applied successfully',
        data: {
          products: facet.products,
          metadata: {
            totalCount: totalCount,
            page: page,
            pageSize: pageSize,
            totalPages: totalPages,
            avgPrice: facet.metadata[0]?.avgPrice,
            priceRange: {
              min: facet.metadata[0]?.minPrice,
              max: facet.metadata[0]?.maxPrice
            },
            avgRating: facet.metadata[0]?.avgRating,
            categories: facet.metadata[0]?.categories,
            brands: facet.metadata[0]?.brands
          },
          appliedFilters: filters
        }
      };
    } catch (error) {
      console.error('Apply Filters Error:', error);
      return {
        success: false,
        message: 'Failed to apply filters',
        data: null
      };
    }
  }

  /**
   * Get filter options for dropdown/UI
   * Based on selected category
   * @param {String} category - Product category
   * @returns {Object} {success, message, data}
   */
  static async getFilterOptions(category = null) {
    try {
      const query = { status: 'active' };
      if (category) query.category = category;

      const [brands, colors, sizes, priceRange] = await Promise.all([
        Product.distinct('brand', query),
        Product.distinct('colors', query),
        Product.distinct('sizes', query),
        Product.aggregate([
          { $match: query },
          {
            $group: {
              _id: null,
              minPrice: { $min: '$price' },
              maxPrice: { $max: '$price' }
            }
          }
        ])
      ]);

      return {
        success: true,
        message: 'Filter options retrieved',
        data: {
          brands: brands.filter(Boolean),
          colors: colors.filter(Boolean),
          sizes: sizes.filter(Boolean),
          priceRange: priceRange[0] || { minPrice: 0, maxPrice: 0 },
          deliveryOptions: ['Same-day', 'Next-day', 'Standard'],
          sellers: ['All', 'Verified Only', 'Official Store'],
          warranties: ['No Warranty', '1 Year', '2 Years', 'Lifetime']
        }
      };
    } catch (error) {
      console.error('Get Filter Options Error:', error);
      return {
        success: false,
        message: 'Failed to retrieve filter options',
        data: null
      };
    }
  }

  /**
   * Get delivery time slot options based on location
   * @param {Object} location - User location {lat, lng}
   * @param {String} sellerId - Seller ID
   * @returns {Object} {success, message, data}
   */
  static async getDeliveryOptions(location, sellerId) {
    try {
      // Calculate distance
      const distance = await this.calculateDistance(location);

      let deliveryOptions = [];

      if (distance <= 5) {
        // Same city - same day delivery
        deliveryOptions.push({
          type: 'same-day',
          label: 'Same Day Delivery',
          availableSlots: ['09:00-12:00', '12:00-15:00', '15:00-18:00', '18:00-21:00'],
          charge: 0,
          free: true
        });
      }

      // Next day delivery
      deliveryOptions.push({
        type: 'next-day',
        label: 'Next Day Delivery',
        availableSlots: ['09:00-18:00'],
        charge: distance > 10 ? 50 : 0,
        free: distance <= 10
      });

      // Standard delivery (3-5 days)
      deliveryOptions.push({
        type: 'standard',
        label: 'Standard Delivery (3-5 days)',
        availableSlots: null,
        charge: 0,
        free: true
      });

      // Pickup option if available
      deliveryOptions.push({
        type: 'pickup',
        label: 'Pickup from Store',
        availableSlots: ['09:00-18:00'],
        charge: 0,
        free: true
      });

      return {
        success: true,
        message: 'Delivery options retrieved',
        data: {
          location: location,
          distance: distance,
          options: deliveryOptions
        }
      };
    } catch (error) {
      console.error('Get Delivery Options Error:', error);
      return {
        success: false,
        message: 'Failed to retrieve delivery options',
        data: null
      };
    }
  }

  /**
   * Calculate distance between two coordinates
   * @param {Object} location - {lat, lng}
   * @returns {Number} Distance in km
   */
  static calculateDistance(location) {
    // Mock implementation - integrate with actual geolocation service
    // Using warehouse/store location
    const warehouseLat = 12.9716;
    const warehouseLng = 77.5946; // Bangalore coordinates

    const R = 6371; // Earth's radius in km
    const dLat = (location.lat - warehouseLat) * Math.PI / 180;
    const dLng = (location.lng - warehouseLng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(warehouseLat * Math.PI / 180) * Math.cos(location.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance);
  }

  /**
   * Save filter preset for user
   * @param {String} userId - User ID
   * @param {String} presetName - Preset name
   * @param {Object} filters - Filter object
   * @returns {Object} {success, message, data}
   */
  static async saveFilterPreset(userId, presetName, filters) {
    try {
      // This would store in user preferences/database
      // For now, return success
      return {
        success: true,
        message: 'Filter preset saved',
        data: {
          presetId: Date.now().toString(),
          name: presetName,
          filters: filters
        }
      };
    } catch (error) {
      console.error('Save Filter Preset Error:', error);
      return {
        success: false,
        message: 'Failed to save filter preset',
        data: null
      };
    }
  }

  /**
   * Get saved filter presets for user
   * @param {String} userId - User ID
   * @returns {Object} {success, message, data}
   */
  static async getSavedFilterPresets(userId) {
    try {
      // Mock implementation
      return {
        success: true,
        message: 'Saved presets retrieved',
        data: []
      };
    } catch (error) {
      console.error('Get Saved Presets Error:', error);
      return {
        success: false,
        message: 'Failed to retrieve presets',
        data: null
      };
    }
  }
}

module.exports = AdvancedFilterService;
