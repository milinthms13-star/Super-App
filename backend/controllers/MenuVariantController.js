/**
 * MenuVariantController
 * HTTP endpoints for menu variants management
 */

const MenuVariantService = require('../services/MenuVariantService');

class MenuVariantController {
  /**
   * Create new menu variant
   * POST /api/v1/food/menu-variants
   */
  static async createVariant(req, res) {
    try {
      const { menuItemId, restaurantId, variantName, displayName, description, basePrice, priceModifier, portion } =
        req.body;

      const result = await MenuVariantService.createVariant({
        menuItemId,
        restaurantId,
        variantName,
        displayName,
        description,
        basePrice,
        priceModifier,
        portion,
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
   * Get variants for menu item
   * GET /api/v1/food/menu-items/:menuItemId/variants
   */
  static async getVariantsByItem(req, res) {
    try {
      const { menuItemId } = req.params;

      const result = await MenuVariantService.getVariantsByItem(menuItemId);

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
   * Get all variants for restaurant
   * GET /api/v1/food/restaurants/:restaurantId/variants
   */
  static async getVariantsByRestaurant(req, res) {
    try {
      const { restaurantId } = req.params;

      const result = await MenuVariantService.getVariantsByRestaurant(restaurantId);

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
   * Get variant details
   * GET /api/v1/food/menu-variants/:variantId
   */
  static async getVariant(req, res) {
    try {
      const { variantId } = req.params;

      const result = await MenuVariantService.getVariantById(variantId);

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
   * Update variant
   * PUT /api/v1/food/menu-variants/:variantId
   */
  static async updateVariant(req, res) {
    try {
      const { variantId } = req.params;

      const result = await MenuVariantService.updateVariant(variantId, req.body);

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
   * Update variant availability
   * PATCH /api/v1/food/menu-variants/:variantId/availability
   */
  static async updateAvailability(req, res) {
    try {
      const { variantId } = req.params;

      const result = await MenuVariantService.updateAvailability(variantId, req.body);

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
   * Check if variant is available now
   * GET /api/v1/food/menu-variants/:variantId/available
   */
  static async checkAvailability(req, res) {
    try {
      const { variantId } = req.params;

      const result = await MenuVariantService.isAvailableNow(variantId);

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
   * Get popular variants
   * GET /api/v1/food/restaurants/:restaurantId/variants/popular
   */
  static async getPopularVariants(req, res) {
    try {
      const { restaurantId } = req.params;
      const { limit = 10 } = req.query;

      const result = await MenuVariantService.getPopularVariants(restaurantId, parseInt(limit));

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
   * Delete variant
   * DELETE /api/v1/food/menu-variants/:variantId
   */
  static async deleteVariant(req, res) {
    try {
      const { variantId } = req.params;

      const result = await MenuVariantService.deleteVariant(variantId);

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

module.exports = MenuVariantController;
