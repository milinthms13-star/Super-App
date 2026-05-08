/**
 * AddOnController
 * HTTP endpoints for add-ons management
 */

const AddOnService = require('../services/AddOnService');

class AddOnController {
  /**
   * Create new add-on
   * POST /api/v1/food/add-ons
   */
  static async createAddOn(req, res) {
    try {
      const {
        restaurantId,
        addOnName,
        description,
        category,
        price,
        isVegetarian,
        calories,
        restrictions,
        availability,
        itemsCompatible,
        maxQuantity,
      } = req.body;

      const result = await AddOnService.createAddOn({
        restaurantId,
        addOnName,
        description,
        category,
        price,
        isVegetarian,
        calories,
        restrictions,
        availability,
        itemsCompatible,
        maxQuantity,
      });

      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Get all add-ons for restaurant
   * GET /api/v1/food/restaurants/:restaurantId/add-ons
   */
  static async getAddOnsByRestaurant(req, res) {
    try {
      const { restaurantId } = req.params;
      const { category } = req.query;

      const result = await AddOnService.getAddOnsByRestaurant(restaurantId, category);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Get add-ons by category
   * GET /api/v1/food/restaurants/:restaurantId/add-ons/category/:category
   */
  static async getAddOnsByCategory(req, res) {
    try {
      const { restaurantId, category } = req.params;

      const result = await AddOnService.getAddOnsByCategory(restaurantId, category);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Get add-on details
   * GET /api/v1/food/add-ons/:addOnId
   */
  static async getAddOn(req, res) {
    try {
      const { addOnId } = req.params;

      const result = await AddOnService.getAddOnById(addOnId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Get compatible add-ons for menu item
   * GET /api/v1/food/menu-items/:menuItemId/compatible-add-ons
   */
  static async getCompatibleAddOns(req, res) {
    try {
      const { menuItemId } = req.params;
      const { restaurantId } = req.query;

      const result = await AddOnService.getCompatibleAddOns(menuItemId, restaurantId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Update add-on
   * PUT /api/v1/food/add-ons/:addOnId
   */
  static async updateAddOn(req, res) {
    try {
      const { addOnId } = req.params;

      const result = await AddOnService.updateAddOn(addOnId, req.body);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Update add-on availability
   * PATCH /api/v1/food/add-ons/:addOnId/availability
   */
  static async updateAvailability(req, res) {
    try {
      const { addOnId } = req.params;

      const result = await AddOnService.updateAvailability(addOnId, req.body);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Get popular add-ons
   * GET /api/v1/food/restaurants/:restaurantId/add-ons/popular
   */
  static async getPopularAddOns(req, res) {
    try {
      const { restaurantId } = req.params;
      const { limit = 10 } = req.query;

      const result = await AddOnService.getPopularAddOns(restaurantId, parseInt(limit));

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Check allergen compatibility
   * POST /api/v1/food/add-ons/:addOnId/check-allergens
   */
  static async checkAllergens(req, res) {
    try {
      const { addOnId } = req.params;
      const { userAllergens = [] } = req.body;

      const result = await AddOnService.checkAllergens(addOnId, userAllergens);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Delete add-on
   * DELETE /api/v1/food/add-ons/:addOnId
   */
  static async deleteAddOn(req, res) {
    try {
      const { addOnId } = req.params;

      const result = await AddOnService.deleteAddOn(addOnId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }
}

module.exports = AddOnController;
