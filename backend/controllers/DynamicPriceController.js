/**
 * Dynamic Pricing Controller - Phase 9 Feature D
 * REST endpoints for dynamic pricing rules and price calculation
 */

const DynamicPriceService = require('../services/DynamicPriceService');

class DynamicPriceController {
  /**
   * POST /api/phase9/pricing/rule
   * Create pricing rule
   */
  static async createPricingRule(req, res) {
    try {
      const { restaurantId, ruleData } = req.body;

      if (!restaurantId || !ruleData) {
        return res.status(400).json({
          success: false,
          message: 'restaurantId and ruleData are required',
        });
      }

      const result = await DynamicPriceService.createPricingRule(restaurantId, ruleData);
      res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/phase9/pricing/calculate
   * Calculate price modifier
   */
  static async calculatePriceModifier(req, res) {
    try {
      const { restaurantId, orderData } = req.body;

      if (!restaurantId || !orderData) {
        return res.status(400).json({
          success: false,
          message: 'restaurantId and orderData are required',
        });
      }

      const result = await DynamicPriceService.calculatePriceModifier(restaurantId, orderData);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /api/phase9/pricing/surge/:restaurantId
   * Activate surge pricing
   */
  static async activateSurgePricing(req, res) {
    try {
      const { restaurantId } = req.params;
      const { surgeLevel } = req.body;

      if (!restaurantId) {
        return res.status(400).json({
          success: false,
          message: 'restaurantId is required',
        });
      }

      const result = await DynamicPriceService.activateSurgePricing(restaurantId, surgeLevel);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/pricing/segment/:restaurantId/:userSegment
   * Get pricing for user segment
   */
  static async getPricingForSegment(req, res) {
    try {
      const { restaurantId, userSegment } = req.params;

      if (!restaurantId || !userSegment) {
        return res.status(400).json({
          success: false,
          message: 'restaurantId and userSegment are required',
        });
      }

      const result = await DynamicPriceService.getPricingForSegment(restaurantId, userSegment);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/pricing/competitor/:restaurantId/:itemId
   * Get competitor prices
   */
  static async getCompetitorPrices(req, res) {
    try {
      const { restaurantId, itemId } = req.params;

      if (!restaurantId || !itemId) {
        return res.status(400).json({
          success: false,
          message: 'restaurantId and itemId are required',
        });
      }

      const result = await DynamicPriceService.getCompetitorPrices(restaurantId, itemId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /api/phase9/pricing/analytics/:pricingRuleId
   * Update pricing analytics
   */
  static async updatePricingAnalytics(req, res) {
    try {
      const { pricingRuleId } = req.params;

      if (!pricingRuleId) {
        return res.status(400).json({
          success: false,
          message: 'pricingRuleId is required',
        });
      }

      const result = await DynamicPriceService.updatePricingAnalytics(pricingRuleId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/phase9/pricing/test
   * Test pricing rule
   */
  static async testPricingRule(req, res) {
    try {
      const { restaurantId, testData } = req.body;

      if (!restaurantId || !testData) {
        return res.status(400).json({
          success: false,
          message: 'restaurantId and testData are required',
        });
      }

      const result = await DynamicPriceService.testPricingRule(restaurantId, testData);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/pricing/active/:restaurantId
   * Get active pricing rules
   */
  static async getActivePricingRules(req, res) {
    try {
      const { restaurantId } = req.params;

      if (!restaurantId) {
        return res.status(400).json({
          success: false,
          message: 'restaurantId is required',
        });
      }

      const result = await DynamicPriceService.getActivePricingRules(restaurantId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = DynamicPriceController;
