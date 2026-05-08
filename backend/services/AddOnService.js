/**
 * AddOnService
 * Business logic for add-ons (toppings, extras, customizations)
 * Handles creation, availability, pricing, and popularity tracking
 */

const AddOn = require('../models/AddOn');

class AddOnService {
  /**
   * Create a new add-on
   */
  static async createAddOn(addOnData) {
    try {
      const addOnId = `addon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const addOn = new AddOn({
        addOnId,
        ...addOnData,
      });

      await addOn.save();

      return {
        success: true,
        data: addOn,
        message: 'Add-on created successfully',
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
   * Get all add-ons for a restaurant
   */
  static async getAddOnsByRestaurant(restaurantId, category = null) {
    try {
      const query = {
        restaurantId,
        status: 'active',
      };

      if (category) {
        query.category = category;
      }

      const addOns = await AddOn.find(query).sort({ sequenceOrder: 1 });

      return {
        success: true,
        data: addOns,
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
   * Get add-ons by category
   */
  static async getAddOnsByCategory(restaurantId, category) {
    try {
      const addOns = await AddOn.find({
        restaurantId,
        category,
        status: 'active',
      }).sort({ sequenceOrder: 1 });

      return {
        success: true,
        data: addOns,
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
   * Get add-on details by ID
   */
  static async getAddOnById(addOnId) {
    try {
      const addOn = await AddOn.findOne({ addOnId });

      if (!addOn) {
        return {
          success: false,
          message: 'Add-on not found',
        };
      }

      return {
        success: true,
        data: addOn,
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
   * Get compatible add-ons for a menu item
   */
  static async getCompatibleAddOns(menuItemId, restaurantId) {
    try {
      const addOns = await AddOn.find({
        restaurantId,
        itemsCompatible: menuItemId,
        status: 'active',
      }).sort({ sequenceOrder: 1 });

      return {
        success: true,
        data: addOns,
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
   * Update add-on details
   */
  static async updateAddOn(addOnId, updateData) {
    try {
      const addOn = await AddOn.findOneAndUpdate({ addOnId }, updateData, {
        new: true,
        runValidators: true,
      });

      if (!addOn) {
        return {
          success: false,
          message: 'Add-on not found',
        };
      }

      return {
        success: true,
        data: addOn,
        message: 'Add-on updated successfully',
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
   * Update add-on availability
   */
  static async updateAvailability(addOnId, availabilityData) {
    try {
      const addOn = await AddOn.findOneAndUpdate(
        { addOnId },
        { availability: availabilityData },
        { new: true }
      );

      if (!addOn) {
        return {
          success: false,
          message: 'Add-on not found',
        };
      }

      return {
        success: true,
        data: addOn,
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
   * Check if add-on is available now
   */
  static async isAvailableNow(addOnId) {
    try {
      const addOn = await AddOn.findOne({ addOnId });

      if (!addOn) {
        return {
          success: false,
          message: 'Add-on not found',
        };
      }

      if (!addOn.availability.isAvailable) {
        return {
          success: true,
          isAvailable: false,
          reason: 'Add-on is currently unavailable',
        };
      }

      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDay();

      if (
        addOn.availability.startTime &&
        addOn.availability.endTime &&
        addOn.availability.availableOn
      ) {
        const [startHour] = addOn.availability.startTime.split(':').map(Number);
        const [endHour] = addOn.availability.endTime.split(':').map(Number);

        const isWithinHours = currentHour >= startHour && currentHour < endHour;
        const isWithinDays = addOn.availability.availableOn.includes(currentDay);

        return {
          success: true,
          isAvailable: isWithinHours && isWithinDays,
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
   * Record an order for an add-on
   */
  static async recordOrder(addOnId, rating = null) {
    try {
      const addOn = await AddOn.findOne({ addOnId });

      if (!addOn) {
        return {
          success: false,
          message: 'Add-on not found',
        };
      }

      await addOn.incrementOrderCount();

      if (rating) {
        await addOn.updateRating(rating);
      }

      return {
        success: true,
        data: addOn,
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
   * Get popular add-ons
   */
  static async getPopularAddOns(restaurantId, limit = 10) {
    try {
      const addOns = await AddOn.find({
        restaurantId,
        status: 'active',
      })
        .sort({ 'popularity.orderCount': -1 })
        .limit(limit);

      return {
        success: true,
        data: addOns,
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
   * Get top-rated add-ons
   */
  static async getTopRatedAddOns(restaurantId, limit = 10) {
    try {
      const addOns = await AddOn.find({
        restaurantId,
        status: 'active',
      })
        .sort({ 'popularity.averageRating': -1, 'popularity.orderCount': -1 })
        .limit(limit);

      return {
        success: true,
        data: addOns,
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
   * Check allergen compatibility
   */
  static async checkAllergens(addOnId, userAllergens = []) {
    try {
      const addOn = await AddOn.findOne({ addOnId });

      if (!addOn) {
        return {
          success: false,
          message: 'Add-on not found',
        };
      }

      const conflicts = addOn.restrictions.allergens.filter((allergen) =>
        userAllergens.includes(allergen)
      );

      return {
        success: true,
        data: {
          hasConflicts: conflicts.length > 0,
          conflictingAllergens: conflicts,
        },
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
   * Delete add-on (archive)
   */
  static async deleteAddOn(addOnId) {
    try {
      const addOn = await AddOn.findOneAndUpdate(
        { addOnId },
        { status: 'archived' },
        { new: true }
      );

      if (!addOn) {
        return {
          success: false,
          message: 'Add-on not found',
        };
      }

      return {
        success: true,
        data: addOn,
        message: 'Add-on archived successfully',
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
   * Get add-ons by dietary preference
   */
  static async getAddOnsByDietaryPreference(restaurantId, dietaryPreference) {
    try {
      const query = {
        restaurantId,
        status: 'active',
      };

      if (dietaryPreference === 'vegetarian') {
        query.isVegetarian = true;
      } else if (dietaryPreference === 'vegan') {
        query.isVegetarian = true;
        query['restrictions.containsDairy'] = false;
      }

      const addOns = await AddOn.find(query);

      return {
        success: true,
        data: addOns,
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

module.exports = AddOnService;
