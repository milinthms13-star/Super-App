/**
 * FavoriteLocationService.js
 * Phase 6: Favorite Locations Feature
 * Save and manage frequently visited locations for quick booking
 */

const FavoriteLocation = require('../../models/FavoriteLocation');
const RiderProfile = require('../../models/RiderProfile');

class FavoriteLocationService {
  /**
   * Add favorite location
   */
  static async addFavoriteLocation(riderId, locationData) {
    try {
      const {
        address,
        lat,
        lng,
        label, // 'home', 'work', 'gym', 'custom'
        contactPerson,
        contactPhone,
      } = locationData;

      // Validate inputs
      if (!address || lat === undefined || lng === undefined || !label) {
        return {
          success: false,
          message: 'Address, coordinates, and label are required',
        };
      }

      // Check if favorite with same label already exists
      const existingFavorite = await FavoriteLocation.findOne({
        riderId,
        label: label.toLowerCase(),
      });

      if (existingFavorite) {
        return {
          success: false,
          message: `You already have a favorite location labeled "${label}"`,
        };
      }

      // Check max favorites (max 10)
      const favoriteCount = await FavoriteLocation.countDocuments({
        riderId,
      });

      if (favoriteCount >= 10) {
        return {
          success: false,
          message: 'Maximum 10 favorite locations allowed',
        };
      }

      // Create favorite location
      const favorite = new FavoriteLocation({
        riderId,
        address,
        location: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        lat,
        lng,
        label: label.toLowerCase(),
        contactPerson,
        contactPhone,
        isActive: true,
        addedAt: new Date(),
        usageCount: 0,
      });

      await favorite.save();

      return {
        success: true,
        message: 'Favorite location added successfully',
        data: {
          favoriteId: favorite._id,
          label: favorite.label,
          address: favorite.address,
          savedAt: favorite.addedAt,
        },
      };
    } catch (error) {
      throw new Error(`Error adding favorite location: ${error.message}`);
    }
  }

  /**
   * Get all favorite locations for a rider
   */
  static async getFavoriteLocations(riderId) {
    try {
      const favorites = await FavoriteLocation.find({
        riderId,
        isActive: true,
      }).sort({ usageCount: -1, label: 1 });

      return {
        success: true,
        data: favorites,
        count: favorites.length,
      };
    } catch (error) {
      throw new Error(`Error retrieving favorite locations: ${error.message}`);
    }
  }

  /**
   * Get favorite location by ID
   */
  static async getFavoriteLocation(riderId, favoriteId) {
    try {
      const favorite = await FavoriteLocation.findById(favoriteId);

      if (!favorite) {
        throw new Error('Favorite location not found');
      }

      if (favorite.riderId.toString() !== riderId) {
        throw new Error('Unauthorized');
      }

      return {
        success: true,
        data: favorite,
      };
    } catch (error) {
      throw new Error(`Error retrieving favorite location: ${error.message}`);
    }
  }

  /**
   * Get favorite location by label
   */
  static async getFavoriteByLabel(riderId, label) {
    try {
      const favorite = await FavoriteLocation.findOne({
        riderId,
        label: label.toLowerCase(),
        isActive: true,
      });

      if (!favorite) {
        return {
          success: false,
          message: `No favorite location labeled "${label}" found`,
        };
      }

      return {
        success: true,
        data: favorite,
      };
    } catch (error) {
      throw new Error(`Error retrieving favorite location: ${error.message}`);
    }
  }

  /**
   * Update favorite location
   */
  static async updateFavoriteLocation(riderId, favoriteId, updateData) {
    try {
      const favorite = await FavoriteLocation.findById(favoriteId);

      if (!favorite) {
        throw new Error('Favorite location not found');
      }

      if (favorite.riderId.toString() !== riderId) {
        throw new Error('Unauthorized');
      }

      // Update allowed fields
      if (updateData.address) {
        favorite.address = updateData.address;
      }

      if (updateData.lat !== undefined && updateData.lng !== undefined) {
        favorite.lat = updateData.lat;
        favorite.lng = updateData.lng;
        favorite.location = {
          type: 'Point',
          coordinates: [updateData.lng, updateData.lat],
        };
      }

      if (updateData.contactPerson) {
        favorite.contactPerson = updateData.contactPerson;
      }

      if (updateData.contactPhone) {
        favorite.contactPhone = updateData.contactPhone;
      }

      favorite.updatedAt = new Date();

      await favorite.save();

      return {
        success: true,
        message: 'Favorite location updated successfully',
        data: favorite,
      };
    } catch (error) {
      throw new Error(`Error updating favorite location: ${error.message}`);
    }
  }

  /**
   * Delete favorite location
   */
  static async deleteFavoriteLocation(riderId, favoriteId) {
    try {
      const favorite = await FavoriteLocation.findById(favoriteId);

      if (!favorite) {
        throw new Error('Favorite location not found');
      }

      if (favorite.riderId.toString() !== riderId) {
        throw new Error('Unauthorized');
      }

      // Soft delete
      favorite.isActive = false;
      favorite.deletedAt = new Date();

      await favorite.save();

      return {
        success: true,
        message: 'Favorite location deleted successfully',
      };
    } catch (error) {
      throw new Error(`Error deleting favorite location: ${error.message}`);
    }
  }

  /**
   * Rename favorite location label
   */
  static async renameFavoriteLocation(riderId, favoriteId, newLabel) {
    try {
      const favorite = await FavoriteLocation.findById(favoriteId);

      if (!favorite) {
        throw new Error('Favorite location not found');
      }

      if (favorite.riderId.toString() !== riderId) {
        throw new Error('Unauthorized');
      }

      const normalizedLabel = newLabel.toLowerCase();

      // Check if label already exists
      const existingFavorite = await FavoriteLocation.findOne({
        riderId,
        label: normalizedLabel,
        _id: { $ne: favoriteId },
        isActive: true,
      });

      if (existingFavorite) {
        return {
          success: false,
          message: `A location with label "${newLabel}" already exists`,
        };
      }

      favorite.label = normalizedLabel;
      favorite.updatedAt = new Date();

      await favorite.save();

      return {
        success: true,
        message: 'Location label updated successfully',
        data: {
          favoriteId: favorite._id,
          newLabel: favorite.label,
        },
      };
    } catch (error) {
      throw new Error(`Error renaming favorite location: ${error.message}`);
    }
  }

  /**
   * Get quick-pick suggestions based on frequency
   * Returns most used locations for quick booking UI
   */
  static async getQuickPickLocations(riderId, limit = 5) {
    try {
      const favorites = await FavoriteLocation.find({
        riderId,
        isActive: true,
      })
        .sort({ usageCount: -1, createdAt: -1 })
        .limit(limit);

      return {
        success: true,
        data: favorites,
        count: favorites.length,
      };
    } catch (error) {
      throw new Error(`Error retrieving quick-pick locations: ${error.message}`);
    }
  }

  /**
   * Track location usage (called after ride completion)
   * Increases usage count for analytics
   */
  static async trackLocationUsage(riderId, favoriteId) {
    try {
      const favorite = await FavoriteLocation.findById(favoriteId);

      if (!favorite) {
        throw new Error('Favorite location not found');
      }

      if (favorite.riderId.toString() !== riderId) {
        throw new Error('Unauthorized');
      }

      favorite.usageCount = (favorite.usageCount || 0) + 1;
      favorite.lastUsedAt = new Date();

      await favorite.save();

      return {
        success: true,
        usageCount: favorite.usageCount,
      };
    } catch (error) {
      console.error('Error tracking location usage:', error);
      // Don't throw - this is non-critical
      return {
        success: false,
      };
    }
  }

  /**
   * Get location suggestions based on search query
   * Search by address or label
   */
  static async searchFavoriteLocations(riderId, query) {
    try {
      if (!query || query.length < 2) {
        return {
          success: true,
          data: [],
          message: 'Query too short',
        };
      }

      const searchRegex = new RegExp(query, 'i');

      const favorites = await FavoriteLocation.find({
        riderId,
        isActive: true,
        $or: [
          { address: searchRegex },
          { label: searchRegex },
          { contactPerson: searchRegex },
        ],
      })
        .sort({ usageCount: -1 })
        .limit(10);

      return {
        success: true,
        data: favorites,
        count: favorites.length,
      };
    } catch (error) {
      throw new Error(`Error searching favorite locations: ${error.message}`);
    }
  }

  /**
   * Get nearby favorite locations
   * Returns favorite locations within 500m
   */
  static async getNearbyFavorites(riderId, lat, lng) {
    try {
      const favorites = await FavoriteLocation.aggregate([
        {
          $match: {
            riderId: require('mongoose').Types.ObjectId(riderId),
            isActive: true,
          },
        },
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [lng, lat],
            },
            distanceField: 'distance',
            maxDistance: 500, // 500 meters
            spherical: true,
          },
        },
        { $limit: 5 },
      ]);

      return {
        success: true,
        data: favorites,
        count: favorites.length,
      };
    } catch (error) {
      throw new Error(`Error retrieving nearby favorites: ${error.message}`);
    }
  }

  /**
   * Get location statistics for rider
   */
  static async getLocationStatistics(riderId) {
    try {
      const favorites = await FavoriteLocation.find({
        riderId,
        isActive: true,
      });

      // Calculate statistics
      const stats = {
        totalFavorites: favorites.length,
        totalUsage: favorites.reduce((sum, fav) => sum + (fav.usageCount || 0), 0),
        favoritesByLabel: {},
        mostUsedLocation: null,
        usageByLocation: [],
      };

      // Group by label
      favorites.forEach((fav) => {
        stats.favoritesByLabel[fav.label] = (stats.favoritesByLabel[fav.label] || 0) + 1;
        stats.usageByLocation.push({
          label: fav.label,
          address: fav.address,
          usageCount: fav.usageCount || 0,
          lastUsed: fav.lastUsedAt,
        });
      });

      // Find most used
      if (stats.usageByLocation.length > 0) {
        stats.mostUsedLocation = stats.usageByLocation.reduce((prev, current) =>
          prev.usageCount > current.usageCount ? prev : current
        );
      }

      // Sort by usage
      stats.usageByLocation.sort((a, b) => b.usageCount - a.usageCount);

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      throw new Error(`Error retrieving location statistics: ${error.message}`);
    }
  }

  /**
   * Validate location coordinates
   */
  static validateCoordinates(lat, lng) {
    if (lat === undefined || lng === undefined) {
      return {
        valid: false,
        message: 'Latitude and longitude required',
      };
    }

    if (lat < -90 || lat > 90) {
      return {
        valid: false,
        message: 'Invalid latitude (must be between -90 and 90)',
      };
    }

    if (lng < -180 || lng > 180) {
      return {
        valid: false,
        message: 'Invalid longitude (must be between -180 and 180)',
      };
    }

    return {
      valid: true,
    };
  }

  /**
   * Get predefined labels
   */
  static getPredefinedLabels() {
    return [
      {
        label: 'home',
        icon: 'home',
        description: 'Your home address',
      },
      {
        label: 'work',
        icon: 'briefcase',
        description: 'Your workplace',
      },
      {
        label: 'gym',
        icon: 'fitness',
        description: 'Gym or fitness center',
      },
      {
        label: 'school',
        icon: 'school',
        description: 'School or college',
      },
      {
        label: 'hospital',
        icon: 'hospital',
        description: 'Hospital or clinic',
      },
      {
        label: 'airport',
        icon: 'flight',
        description: 'Airport',
      },
      {
        label: 'custom',
        icon: 'marker',
        description: 'Custom location',
      },
    ];
  }
}

module.exports = FavoriteLocationService;
