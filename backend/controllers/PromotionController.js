/**
 * Promotion Controller - Phase 9 Feature D
 * REST endpoints for promotion and coupon management
 */

const PromotionService = require('../services/PromotionService');

class PromotionController {
  /**
   * POST /api/phase9/promotions
   * Create promotion
   */
  static async createPromotion(req, res) {
    try {
      const { restaurantId, promotionData } = req.body;

      if (!restaurantId || !promotionData) {
        return res.status(400).json({
          success: false,
          message: 'restaurantId and promotionData are required',
        });
      }

      const result = await PromotionService.createPromotion(restaurantId, promotionData);
      res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/phase9/promotions/validate-coupon
   * Validate coupon code
   */
  static async validateCoupon(req, res) {
    try {
      const { couponCode, orderData } = req.body;

      if (!couponCode || !orderData) {
        return res.status(400).json({
          success: false,
          message: 'couponCode and orderData are required',
        });
      }

      const result = await PromotionService.validateCoupon(couponCode, orderData);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/phase9/promotions/apply
   * Apply promotion
   */
  static async applyPromotion(req, res) {
    try {
      const userId = req.user?._id;
      const { promotionId, orderId, orderValue } = req.body;

      if (!userId || !promotionId || !orderId || !orderValue) {
        return res.status(400).json({
          success: false,
          message: 'userId, promotionId, orderId, and orderValue are required',
        });
      }

      const result = await PromotionService.applyPromotion(promotionId, userId, orderId, orderValue);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/promotions/restaurant/:restaurantId
   * Get active promotions
   */
  static async getActivePromotions(req, res) {
    try {
      const { restaurantId } = req.params;
      const { limit } = req.query;

      if (!restaurantId) {
        return res.status(400).json({
          success: false,
          message: 'restaurantId is required',
        });
      }

      const result = await PromotionService.getActivePromotions(restaurantId, parseInt(limit) || 20);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/promotions/category/:category
   * Get promotions by category
   */
  static async getPromotionsByCategory(req, res) {
    try {
      const { category } = req.params;
      const { limit } = req.query;

      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Category is required',
        });
      }

      const result = await PromotionService.getPromotionsByCategory(category, parseInt(limit) || 20);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/promotions/featured
   * Get featured promotions
   */
  static async getFeaturedPromotions(req, res) {
    try {
      const { limit } = req.query;

      const result = await PromotionService.getFeaturedPromotions(parseInt(limit) || 10);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/promotions/personalized
   * Get personalized promotions
   */
  static async getPersonalizedPromotions(req, res) {
    try {
      const userId = req.user?._id;
      const { userSegment, limit } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const result = await PromotionService.getPersonalizedPromotions(userId, userSegment, parseInt(limit) || 10);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/promotions/:promotionId/performance
   * Track promotion performance
   */
  static async trackPromotionPerformance(req, res) {
    try {
      const { promotionId } = req.params;

      if (!promotionId) {
        return res.status(400).json({
          success: false,
          message: 'promotionId is required',
        });
      }

      const result = await PromotionService.trackPromotionPerformance(promotionId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * DELETE /api/phase9/promotions/:promotionId
   * Deactivate promotion
   */
  static async deactivatePromotion(req, res) {
    try {
      const { promotionId } = req.params;

      if (!promotionId) {
        return res.status(400).json({
          success: false,
          message: 'promotionId is required',
        });
      }

      const result = await PromotionService.deactivatePromotion(promotionId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = PromotionController;
