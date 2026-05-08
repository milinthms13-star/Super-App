/**
 * MenuVariantService
 * Business logic for menu variants and customization
 * Handles variant creation, availability, pricing, and ratings
 */

const MenuVariant = require('../models/MenuVariant');

class MenuVariantService {
  /**
   * Create a new menu variant
   */
  static async createVariant(variantData) {
    try {
      const variantId = `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const variant = new MenuVariant({
        variantId,
        ...variantData,
      });

      await variant.save();
      return {
        success: true,
        data: variant,
        message: 'Menu variant created successfully',
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
   * Get all variants for a menu item
   */
  static async getVariantsByItem(menuItemId) {
    try {
      const variants = await MenuVariant.find({
        menuItemId,
        status: 'active',
      }).sort({ sequenceOrder: 1 });

      return {
        success: true,
        data: variants,
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
   * Get all variants for a restaurant
   */
  static async getVariantsByRestaurant(restaurantId) {
    try {
      const variants = await MenuVariant.find({
        restaurantId,
        status: 'active',
      }).sort({ sequenceOrder: 1 });

      return {
        success: true,
        data: variants,
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
   * Get variant details by ID
   */
  static async getVariantById(variantId) {
    try {
      const variant = await MenuVariant.findOne({ variantId });

      if (!variant) {
        return {
          success: false,
          message: 'Variant not found',
        };
      }

      return {
        success: true,
        data: variant,
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
   * Update variant details
   */
  static async updateVariant(variantId, updateData) {
    try {
      const variant = await MenuVariant.findOneAndUpdate({ variantId }, updateData, {
        new: true,
        runValidators: true,
      });

      if (!variant) {
        return {
          success: false,
          message: 'Variant not found',
        };
      }

      return {
        success: true,
        data: variant,
        message: 'Variant updated successfully',
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
   * Update variant availability
   */
  static async updateAvailability(variantId, availabilityData) {
    try {
      const variant = await MenuVariant.findOneAndUpdate(
        { variantId },
        { availability: availabilityData },
        { new: true }
      );

      if (!variant) {
        return {
          success: false,
          message: 'Variant not found',
        };
      }

      return {
        success: true,
        data: variant,
        message: 'Availability updated successfully',
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
   * Check if variant is available now
   */
  static async isAvailableNow(variantId) {
    try {
      const variant = await MenuVariant.findOne({ variantId });

      if (!variant) {
        return {
          success: false,
          message: 'Variant not found',
        };
      }

      if (!variant.availability.isAvailable) {
        return {
          success: true,
          isAvailable: false,
          reason: 'Variant is currently unavailable',
        };
      }

      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDay();

      if (
        variant.availability.startTime &&
        variant.availability.endTime &&
        variant.availability.availableOn
      ) {
        const [startHour] = variant.availability.startTime.split(':').map(Number);
        const [endHour] = variant.availability.endTime.split(':').map(Number);

        const isWithinHours = currentHour >= startHour && currentHour < endHour;
        const isWithinDays = variant.availability.availableOn.includes(currentDay);

        return {
          success: true,
          isAvailable: isWithinHours && isWithinDays,
          reason: !isWithinHours ? 'Outside availability hours' : 'Day not available',
        };
      }

      return {
        success: true,
        isAvailable: true,
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
   * Record an order for a variant (increment counter)
   */
  static async recordOrder(variantId, rating = null) {
    try {
      const variant = await MenuVariant.findOne({ variantId });

      if (!variant) {
        return {
          success: false,
          message: 'Variant not found',
        };
      }

      await variant.incrementOrderCount();

      if (rating) {
        await variant.updateRating(rating);
      }

      return {
        success: true,
        data: variant,
        message: 'Order recorded successfully',
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
   * Get popular variants
   */
  static async getPopularVariants(restaurantId, limit = 10) {
    try {
      const variants = await MenuVariant.find({
        restaurantId,
        status: 'active',
      })
        .sort({ isPopular: -1, orderCount: -1 })
        .limit(limit);

      return {
        success: true,
        data: variants,
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
   * Get top-rated variants
   */
  static async getTopRatedVariants(restaurantId, limit = 10) {
    try {
      const variants = await MenuVariant.find({
        restaurantId,
        status: 'active',
      })
        .sort({ averageRating: -1, orderCount: -1 })
        .limit(limit);

      return {
        success: true,
        data: variants,
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
   * Delete variant (archive)
   */
  static async deleteVariant(variantId) {
    try {
      const variant = await MenuVariant.findOneAndUpdate(
        { variantId },
        { status: 'archived' },
        { new: true }
      );

      if (!variant) {
        return {
          success: false,
          message: 'Variant not found',
        };
      }

      return {
        success: true,
        data: variant,
        message: 'Variant archived successfully',
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
   * Bulk update variant availability
   */
  static async bulkUpdateAvailability(restaurantId, availabilityData) {
    try {
      const result = await MenuVariant.updateMany(
        { restaurantId },
        { availability: availabilityData }
      );

      return {
        success: true,
        data: {
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
        },
        message: `${result.modifiedCount} variants updated`,
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

module.exports = MenuVariantService;
