/**
 * FoodDeliveryMenuController
 * Handles HTTP requests for menu items, categories, variants, addons
 * Estimated 300+ lines
 */

const FoodDeliveryMenuService = require('../services/FoodDeliveryMenuService');

class FoodDeliveryMenuController {
  /**
   * GET /restaurants/:restaurantId/menu
   * Get complete menu for restaurant
   */
  async getRestaurantMenu(req, res) {
    try {
      const { restaurantId } = req.params;

      const result = await FoodDeliveryMenuService.getRestaurantMenu(restaurantId);

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
   * GET /restaurants/:restaurantId/menu/categories
   * Get menu categories
   */
  async getMenuCategories(req, res) {
    try {
      const { restaurantId } = req.params;

      const result = await FoodDeliveryMenuService.getMenuCategories(restaurantId);

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
   * GET /restaurants/:restaurantId/menu/categories/:category
   * Get items in specific category
   */
  async getMenuItemsByCategory(req, res) {
    try {
      const { restaurantId, category } = req.params;

      const result = await FoodDeliveryMenuService.getMenuItemsByCategory(restaurantId, category);

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
   * GET /restaurants/:restaurantId/menu/items/:itemId
   * Get menu item details
   */
  async getMenuItemDetails(req, res) {
    try {
      const { itemId } = req.params;

      const result = await FoodDeliveryMenuService.getMenuItemDetails(itemId);

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
   * GET /restaurants/:restaurantId/menu/search
   * Search menu items
   */
  async searchMenuItems(req, res) {
    try {
      const { restaurantId } = req.params;
      const { q, limit = 20, skip = 0 } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required',
        });
      }

      const result = await FoodDeliveryMenuService.searchMenuItems(restaurantId, q, {
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
   * GET /restaurants/:restaurantId/menu/featured
   * Get featured menu items
   */
  async getFeaturedMenuItems(req, res) {
    try {
      const { restaurantId } = req.params;
      const { limit = 10 } = req.query;

      const result = await FoodDeliveryMenuService.getFeaturedMenuItems(restaurantId, {
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
   * GET /restaurants/:restaurantId/menu/popular
   * Get popular menu items
   */
  async getPopularMenuItems(req, res) {
    try {
      const { restaurantId } = req.params;
      const { limit = 10, days = 30 } = req.query;

      const result = await FoodDeliveryMenuService.getPopularMenuItems(restaurantId, {
        limit: parseInt(limit),
        days: parseInt(days),
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
   * GET /restaurants/:restaurantId/menu/discounted
   * Get discounted items
   */
  async getDiscountedItems(req, res) {
    try {
      const { restaurantId } = req.params;
      const { limit = 20 } = req.query;

      const result = await FoodDeliveryMenuService.getDiscountedItems(restaurantId, {
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
   * GET /restaurants/:restaurantId/menu/vegetarian
   * Get vegetarian items
   */
  async getVegetarianItems(req, res) {
    try {
      const { restaurantId } = req.params;
      const { limit = 20, skip = 0 } = req.query;

      const result = await FoodDeliveryMenuService.getVegetarianItems(restaurantId, {
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
   * GET /restaurants/:restaurantId/menu/vegan
   * Get vegan items
   */
  async getVeganItems(req, res) {
    try {
      const { restaurantId } = req.params;
      const { limit = 20, skip = 0 } = req.query;

      const result = await FoodDeliveryMenuService.getVeganItems(restaurantId, {
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
   * GET /restaurants/:restaurantId/menu/dietary
   * Get items by dietary filters
   */
  async getItemsByDietaryFilters(req, res) {
    try {
      const { restaurantId } = req.params;
      const { glutenFree, dairy, nuts, limit = 20, skip = 0 } = req.query;

      const result = await FoodDeliveryMenuService.getItemsByDietaryFilters(restaurantId, {
        glutenFree: glutenFree === 'true',
        dairy: dairy === 'true',
        nuts: nuts === 'true',
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
   * GET /menu/items/:itemId/variants
   * Get item variants
   */
  async getItemVariants(req, res) {
    try {
      const { itemId } = req.params;

      const result = await FoodDeliveryMenuService.getItemVariants(itemId);

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
   * GET /menu/items/:itemId/addons
   * Get item addons
   */
  async getItemAddons(req, res) {
    try {
      const { itemId } = req.params;

      const result = await FoodDeliveryMenuService.getItemAddons(itemId);

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
   * GET /restaurants/:restaurantId/menu/spice/:spiceLevel
   * Get items by spice level
   */
  async getItemsBySpiceLevel(req, res) {
    try {
      const { restaurantId, spiceLevel } = req.params;
      const { limit = 20, skip = 0 } = req.query;

      const result = await FoodDeliveryMenuService.getItemsBySpiceLevel(
        restaurantId,
        spiceLevel,
        {
          limit: parseInt(limit),
          skip: parseInt(skip),
        }
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(error.message.includes('Invalid') ? 400 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /restaurants/:restaurantId/menu/recommended
   * Get recommended items
   */
  async getRecommendedItems(req, res) {
    try {
      const { restaurantId } = req.params;
      const { limit = 10 } = req.query;

      const result = await FoodDeliveryMenuService.getRecommendedItems(restaurantId, {
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
   * GET /restaurants/:restaurantId/menu/addons
   * Get addon groups
   */
  async getAddonGroups(req, res) {
    try {
      const { restaurantId } = req.params;

      const result = await FoodDeliveryMenuService.getAddonGroups(restaurantId);

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
   * POST /menu/items/:itemId/calculate-price
   * Calculate item price with variants and addons
   */
  async calculateItemPrice(req, res) {
    try {
      const { itemId } = req.params;
      const { variantId, addonIds } = req.body;

      const result = await FoodDeliveryMenuService.calculateItemPrice(itemId, {
        variantId,
        addonIds,
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
   * GET /menu/items/:itemId/available
   * Check if item is available for ordering
   */
  async checkItemAvailability(req, res) {
    try {
      const { itemId } = req.params;

      const available = await FoodDeliveryMenuService.isItemAvailable(itemId);

      res.status(200).json({
        success: true,
        data: {
          itemId,
          available,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new FoodDeliveryMenuController();
