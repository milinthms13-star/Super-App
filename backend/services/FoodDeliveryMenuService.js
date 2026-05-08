/**
 * FoodDeliveryMenuService
 * Handles menu operations, items, categories, variants, addons
 * Estimated 500+ lines
 */

const FoodDeliveryMenuItem = require('../models/FoodDeliveryMenuItem');
const FoodDeliveryRestaurant = require('../models/FoodDeliveryRestaurant');

class FoodDeliveryMenuService {
  /**
   * Get menu for a restaurant
   * @param {String} restaurantId
   * @returns {Promise<Object>} {categories, items}
   */
  async getRestaurantMenu(restaurantId) {
    try {
      if (!restaurantId) {
        throw new Error('Restaurant ID is required');
      }

      const restaurant = await FoodDeliveryRestaurant.findById(restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      const menuItems = await FoodDeliveryMenuItem.find({
        restaurantId,
        status: 'active',
      }).lean();

      // Group items by category
      const categorizedMenu = {};
      menuItems.forEach((item) => {
        if (!categorizedMenu[item.category]) {
          categorizedMenu[item.category] = [];
        }
        categorizedMenu[item.category].push(item);
      });

      return {
        restaurantId,
        restaurantName: restaurant.name,
        categories: restaurant.categories || [],
        items: categorizedMenu,
        totalItems: menuItems.length,
      };
    } catch (error) {
      throw new Error(`Error fetching restaurant menu: ${error.message}`);
    }
  }

  /**
   * Get menu items by category
   * @param {String} restaurantId
   * @param {String} category
   * @returns {Promise<Object>} {items, total}
   */
  async getMenuItemsByCategory(restaurantId, category) {
    try {
      const items = await FoodDeliveryMenuItem.find({
        restaurantId,
        category,
        status: 'active',
        available: true,
      })
        .lean();

      return {
        restaurantId,
        category,
        items,
        total: items.length,
      };
    } catch (error) {
      throw new Error(`Error fetching menu items: ${error.message}`);
    }
  }

  /**
   * Get menu item details
   * @param {String} itemId
   * @returns {Promise<Object>} item
   */
  async getMenuItemDetails(itemId) {
    try {
      if (!itemId) {
        throw new Error('Item ID is required');
      }

      const item = await FoodDeliveryMenuItem.findById(itemId).lean();
      if (!item) {
        throw new Error('Menu item not found');
      }

      return item;
    } catch (error) {
      throw new Error(`Error fetching menu item details: ${error.message}`);
    }
  }

  /**
   * Search menu items
   * @param {String} restaurantId
   * @param {String} query
   * @param {Object} params - {limit, skip}
   * @returns {Promise<Object>} {items, total}
   */
  async searchMenuItems(restaurantId, query, params) {
    const { limit = 20, skip = 0 } = params;

    try {
      if (!query || query.trim().length < 2) {
        throw new Error('Search query must be at least 2 characters');
      }

      const searchQuery = {
        restaurantId,
        status: 'active',
        $text: { $search: query },
      };

      const items = await FoodDeliveryMenuItem.find(searchQuery)
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await FoodDeliveryMenuItem.countDocuments(searchQuery);

      return {
        items,
        total,
        query,
        hasMore: skip + limit < total,
      };
    } catch (error) {
      throw new Error(`Error searching menu items: ${error.message}`);
    }
  }

  /**
   * Get featured menu items from restaurant
   * @param {String} restaurantId
   * @param {Object} params - {limit}
   * @returns {Promise<Object>} {items}
   */
  async getFeaturedMenuItems(restaurantId, params) {
    const { limit = 10 } = params;

    try {
      const items = await FoodDeliveryMenuItem.find({
        restaurantId,
        isFeatured: true,
        status: 'active',
        available: true,
      })
        .limit(limit)
        .lean();

      return {
        restaurantId,
        items,
        total: items.length,
      };
    } catch (error) {
      throw new Error(`Error fetching featured items: ${error.message}`);
    }
  }

  /**
   * Get popular menu items (most ordered)
   * @param {String} restaurantId
   * @param {Object} params - {limit, days}
   * @returns {Promise<Object>} {items}
   */
  async getPopularMenuItems(restaurantId, params) {
    const { limit = 10, days = 30 } = params;

    try {
      let sortField = 'popularity.orderCount30Days';
      if (days === 7) {
        sortField = 'popularity.orderCount7Days';
      } else if (days === 1) {
        sortField = 'popularity.orderCount';
      }

      const items = await FoodDeliveryMenuItem.find({
        restaurantId,
        status: 'active',
        available: true,
      })
        .sort({ [sortField]: -1 })
        .limit(limit)
        .lean();

      return {
        restaurantId,
        items,
        period: `${days} days`,
        total: items.length,
      };
    } catch (error) {
      throw new Error(`Error fetching popular items: ${error.message}`);
    }
  }

  /**
   * Get items with active discounts
   * @param {String} restaurantId
   * @param {Object} params - {limit}
   * @returns {Promise<Object>} {items}
   */
  async getDiscountedItems(restaurantId, params) {
    const { limit = 20 } = params;

    try {
      const now = new Date();

      const items = await FoodDeliveryMenuItem.find({
        restaurantId,
        status: 'active',
        available: true,
        'discount.validUntil': { $gt: now },
        $or: [{ 'discount.percentage': { $gt: 0 } }, { 'discount.amount': { $gt: 0 } }],
      })
        .limit(limit)
        .lean();

      return {
        restaurantId,
        items,
        total: items.length,
      };
    } catch (error) {
      throw new Error(`Error fetching discounted items: ${error.message}`);
    }
  }

  /**
   * Get vegetarian menu items
   * @param {String} restaurantId
   * @param {Object} params - {limit, skip}
   * @returns {Promise<Object>} {items, total}
   */
  async getVegetarianItems(restaurantId, params) {
    const { limit = 20, skip = 0 } = params;

    try {
      const items = await FoodDeliveryMenuItem.find({
        restaurantId,
        vegetarian: true,
        status: 'active',
        available: true,
      })
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await FoodDeliveryMenuItem.countDocuments({
        restaurantId,
        vegetarian: true,
        status: 'active',
        available: true,
      });

      return {
        restaurantId,
        items,
        total,
        hasMore: skip + limit < total,
      };
    } catch (error) {
      throw new Error(`Error fetching vegetarian items: ${error.message}`);
    }
  }

  /**
   * Get vegan menu items
   * @param {String} restaurantId
   * @param {Object} params - {limit, skip}
   * @returns {Promise<Object>} {items, total}
   */
  async getVeganItems(restaurantId, params) {
    const { limit = 20, skip = 0 } = params;

    try {
      const items = await FoodDeliveryMenuItem.find({
        restaurantId,
        vegan: true,
        status: 'active',
        available: true,
      })
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await FoodDeliveryMenuItem.countDocuments({
        restaurantId,
        vegan: true,
        status: 'active',
        available: true,
      });

      return {
        restaurantId,
        items,
        total,
        hasMore: skip + limit < total,
      };
    } catch (error) {
      throw new Error(`Error fetching vegan items: ${error.message}`);
    }
  }

  /**
   * Get items by dietary filters
   * @param {String} restaurantId
   * @param {Object} params - {glutenFree, dairy, nuts, limit, skip}
   * @returns {Promise<Object>} {items, total}
   */
  async getItemsByDietaryFilters(restaurantId, params) {
    const { glutenFree, dairy, nuts, limit = 20, skip = 0 } = params;

    try {
      let query = {
        restaurantId,
        status: 'active',
        available: true,
      };

      if (glutenFree) {
        query.glutenFree = true;
      }
      if (dairy) {
        query.containsDairy = false;
      }
      if (nuts) {
        query.containsNuts = false;
        query.containsPeanuts = false;
      }

      const items = await FoodDeliveryMenuItem.find(query)
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await FoodDeliveryMenuItem.countDocuments(query);

      return {
        restaurantId,
        items,
        total,
        filters: { glutenFree, dairy, nuts },
        hasMore: skip + limit < total,
      };
    } catch (error) {
      throw new Error(`Error fetching items by dietary filters: ${error.message}`);
    }
  }

  /**
   * Get item variants
   * @param {String} itemId
   * @returns {Promise<Object>} {variants}
   */
  async getItemVariants(itemId) {
    try {
      const item = await FoodDeliveryMenuItem.findById(itemId).lean();
      if (!item) {
        throw new Error('Menu item not found');
      }

      const availableVariants = item.variants.filter((v) => v.available);

      return {
        itemId,
        itemName: item.name,
        variants: availableVariants,
        total: availableVariants.length,
      };
    } catch (error) {
      throw new Error(`Error fetching item variants: ${error.message}`);
    }
  }

  /**
   * Get item addons
   * @param {String} itemId
   * @returns {Promise<Object>} {addons}
   */
  async getItemAddons(itemId) {
    try {
      const item = await FoodDeliveryMenuItem.findById(itemId).lean();
      if (!item) {
        throw new Error('Menu item not found');
      }

      return {
        itemId,
        itemName: item.name,
        addons: item.addons,
        isCustomizable: item.isCustomizable,
        maxAddons: item.maxAddons,
        total: item.addons.length,
      };
    } catch (error) {
      throw new Error(`Error fetching item addons: ${error.message}`);
    }
  }

  /**
   * Get items by spice level
   * @param {String} restaurantId
   * @param {String} spiceLevel
   * @param {Object} params - {limit, skip}
   * @returns {Promise<Object>} {items, total}
   */
  async getItemsBySpiceLevel(restaurantId, spiceLevel, params) {
    const { limit = 20, skip = 0 } = params;

    try {
      if (!['mild', 'medium', 'hot', 'extra-hot', 'not-spicy'].includes(spiceLevel)) {
        throw new Error('Invalid spice level');
      }

      const items = await FoodDeliveryMenuItem.find({
        restaurantId,
        spiceLevel,
        status: 'active',
        available: true,
      })
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await FoodDeliveryMenuItem.countDocuments({
        restaurantId,
        spiceLevel,
        status: 'active',
        available: true,
      });

      return {
        restaurantId,
        spiceLevel,
        items,
        total,
        hasMore: skip + limit < total,
      };
    } catch (error) {
      throw new Error(`Error fetching items by spice level: ${error.message}`);
    }
  }

  /**
   * Get menu categories for restaurant
   * @param {String} restaurantId
   * @returns {Promise<Object>} {categories}
   */
  async getMenuCategories(restaurantId) {
    try {
      const restaurant = await FoodDeliveryRestaurant.findById(restaurantId).lean();
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      const categories = restaurant.categories || [];

      // Get item count per category
      const categoryCounts = {};
      const items = await FoodDeliveryMenuItem.find({
        restaurantId,
        status: 'active',
      }).lean();

      items.forEach((item) => {
        if (!categoryCounts[item.category]) {
          categoryCounts[item.category] = 0;
        }
        categoryCounts[item.category]++;
      });

      const enrichedCategories = categories.map((cat) => ({
        ...cat,
        itemCount: categoryCounts[cat.name] || 0,
      }));

      return {
        restaurantId,
        categories: enrichedCategories,
        total: categories.length,
      };
    } catch (error) {
      throw new Error(`Error fetching menu categories: ${error.message}`);
    }
  }

  /**
   * Get addon groups for restaurant
   * @param {String} restaurantId
   * @returns {Promise<Object>} {addonGroups}
   */
  async getAddonGroups(restaurantId) {
    try {
      const restaurant = await FoodDeliveryRestaurant.findById(restaurantId).lean();
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      const addonGroups = restaurant.addonGroups || [];

      return {
        restaurantId,
        addonGroups,
        total: addonGroups.length,
      };
    } catch (error) {
      throw new Error(`Error fetching addon groups: ${error.message}`);
    }
  }

  /**
   * Record item order for popularity metrics
   * @param {String} itemId
   * @param {Number} quantity
   * @returns {Promise<void>}
   */
  async recordItemOrder(itemId, quantity = 1) {
    try {
      const item = await FoodDeliveryMenuItem.findById(itemId);
      if (!item) {
        throw new Error('Menu item not found');
      }

      await item.recordOrder(quantity);
    } catch (error) {
      throw new Error(`Error recording order: ${error.message}`);
    }
  }

  /**
   * Check item availability
   * @param {String} itemId
   * @returns {Promise<Boolean>}
   */
  async isItemAvailable(itemId) {
    try {
      const item = await FoodDeliveryMenuItem.findById(itemId).lean();
      if (!item) {
        return false;
      }

      return item.canOrder();
    } catch (error) {
      return false;
    }
  }

  /**
   * Calculate item price with variants and addons
   * @param {String} itemId
   * @param {Object} options - {variantId, addonIds}
   * @returns {Promise<Object>} {basePrice, variantPrice, addonPrice, totalPrice}
   */
  async calculateItemPrice(itemId, options) {
    try {
      const item = await FoodDeliveryMenuItem.findById(itemId).lean();
      if (!item) {
        throw new Error('Menu item not found');
      }

      let price = item.displayPrice || item.basePrice;

      // Add variant price
      let variantPrice = 0;
      if (options.variantId) {
        const variant = item.variants.find((v) => v._id.toString() === options.variantId);
        if (variant) {
          variantPrice = variant.price - item.basePrice;
          price = variant.price;
        }
      }

      // Add addon prices
      let addonPrice = 0;
      if (options.addonIds && options.addonIds.length > 0) {
        options.addonIds.forEach((addonId) => {
          const addon = item.addons.find((a) => a._id.toString() === addonId);
          if (addon) {
            addonPrice += addon.price;
          }
        });
      }

      const totalPrice = price + addonPrice;

      return {
        itemId,
        basePrice: item.basePrice,
        displayPrice: item.displayPrice,
        variantPrice,
        addonPrice,
        totalPrice: parseFloat(totalPrice.toFixed(2)),
      };
    } catch (error) {
      throw new Error(`Error calculating price: ${error.message}`);
    }
  }

  /**
   * Get recommended items for user based on history
   * @param {String} restaurantId
   * @param {Object} params - {limit}
   * @returns {Promise<Object>} {items}
   */
  async getRecommendedItems(restaurantId, params) {
    const { limit = 10 } = params;

    try {
      // Get top-rated and popular items
      const items = await FoodDeliveryMenuItem.find({
        restaurantId,
        status: 'active',
        available: true,
      })
        .sort({
          'ratings.average': -1,
          'popularity.orderCount30Days': -1,
        })
        .limit(limit)
        .lean();

      return {
        restaurantId,
        items,
        total: items.length,
      };
    } catch (error) {
      throw new Error(`Error fetching recommended items: ${error.message}`);
    }
  }
}

module.exports = new FoodDeliveryMenuService();
