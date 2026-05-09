/**
 * Dynamic Pricing Service - Phase 9 Feature D
 * Surge pricing, demand-based pricing, personalized pricing
 */

const DynamicPricingRule = require('../models/DynamicPricingRule');

class DynamicPriceService {
  /**
   * Create pricing rule
   */
  static async createPricingRule(restaurantId, ruleData) {
    try {
      const pricingRuleId = `DPRICE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const rule = new DynamicPricingRule({
        pricingRuleId,
        restaurantId,
        ruleName: ruleData.ruleName,
        strategyType: ruleData.strategyType,
        priority: ruleData.priority || 0,
        effectiveFrom: ruleData.effectiveFrom,
        effectiveTo: ruleData.effectiveTo,
      });

      // Set strategy-specific data
      if (ruleData.strategyType === 'surge_pricing' && ruleData.surgePricing) {
        rule.surgePricing = ruleData.surgePricing;
      } else if (ruleData.strategyType === 'time_based' && ruleData.timeBasedPricing) {
        rule.timeBasedPricing = ruleData.timeBasedPricing;
      } else if (ruleData.strategyType === 'personalized' && ruleData.personalizedPricing) {
        rule.personalizedPricing = ruleData.personalizedPricing;
      }

      await rule.save();

      return {
        success: true,
        data: rule,
        message: 'Pricing rule created',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Calculate price modifier for order
   */
  static async calculatePriceModifier(restaurantId, orderData) {
    try {
      const rules = await DynamicPricingRule.find({
        restaurantId,
        isActive: true,
        status: 'active',
      }).sort({ priority: -1 });

      if (rules.length === 0) {
        return { success: true, data: { modifier: 1, basePrice: orderData.basePrice } };
      }

      let finalModifier = 1;
      let appliedRules = [];

      for (const rule of rules) {
        const modifier = rule.calculatePriceModifier(orderData);
        if (modifier !== 1) {
          finalModifier *= modifier;
          appliedRules.push({
            ruleId: rule.pricingRuleId,
            ruleName: rule.ruleName,
            modifier,
          });
        }
      }

      const finalPrice = orderData.basePrice * finalModifier;

      return {
        success: true,
        data: {
          basePrice: orderData.basePrice,
          modifier: finalModifier,
          finalPrice,
          appliedRules,
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Activate surge pricing
   */
  static async activateSurgePricing(restaurantId, surgeLevel) {
    try {
      const rule = await DynamicPricingRule.findOne({
        restaurantId,
        strategyType: 'surge_pricing',
        status: 'active',
      });

      if (!rule) {
        return { success: false, message: 'Surge pricing rule not found' };
      }

      rule.surgePricing.enabled = true;
      rule.analytics.orders += 1;

      await rule.save();

      return {
        success: true,
        data: rule,
        message: `Surge pricing activated at level ${surgeLevel}`,
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get pricing for user segment
   */
  static async getPricingForSegment(restaurantId, userSegment) {
    try {
      const rule = await DynamicPricingRule.findOne({
        restaurantId,
        strategyType: 'personalized',
        status: 'active',
      });

      if (!rule) {
        return { success: false, message: 'Personalized pricing not configured' };
      }

      const segment = rule.personalizedPricing.userSegments.find((s) => s.segmentName === userSegment);

      if (!segment) {
        return { success: false, message: `Segment ${userSegment} not found` };
      }

      return {
        success: true,
        data: {
          segment: userSegment,
          priceModifier: segment.priceModifier,
          capDiscount: segment.capDiscount,
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get competitor prices
   */
  static async getCompetitorPrices(restaurantId, itemId) {
    try {
      const rule = await DynamicPricingRule.findOne({
        restaurantId,
        strategyType: 'competitor_based',
        status: 'active',
      });

      if (!rule) {
        return { success: false, message: 'Competitor pricing not configured' };
      }

      const competitorData = rule.competitorPricing.monitoredCompetitors.find((c) => c.itemId === itemId);

      if (!competitorData) {
        return { success: false, message: 'Competitor data not found for this item' };
      }

      return {
        success: true,
        data: competitorData,
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Update pricing analytics
   */
  static async updatePricingAnalytics(pricingRuleId) {
    try {
      const rule = await DynamicPricingRule.findOne({ pricingRuleId });
      if (!rule) {
        return { success: false, message: 'Pricing rule not found' };
      }

      if (rule.analytics.orders > 0) {
        rule.analytics.conversionRate = (rule.analytics.orders / rule.analytics.impressions) * 100;
      }

      await rule.save();

      return {
        success: true,
        data: rule.analytics,
        message: 'Analytics updated',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Test pricing rule
   */
  static async testPricingRule(restaurantId, testData) {
    try {
      const rules = await DynamicPricingRule.find({
        restaurantId,
        isTest: true,
      });

      if (rules.length === 0) {
        return { success: false, message: 'No test rules found' };
      }

      const results = [];
      for (const rule of rules) {
        const modifier = rule.calculatePriceModifier(testData);
        const testPrice = testData.basePrice * modifier;

        results.push({
          ruleId: rule.pricingRuleId,
          modifier,
          testPrice,
          rolloutPercentage: rule.rolloutPercentage,
        });
      }

      return {
        success: true,
        data: results,
        message: 'Pricing test completed',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get active pricing rules
   */
  static async getActivePricingRules(restaurantId) {
    try {
      const rules = await DynamicPricingRule.find({
        restaurantId,
        isActive: true,
        status: 'active',
      }).sort({ priority: -1 });

      return {
        success: true,
        data: rules,
        message: `${rules.length} active pricing rules`,
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }
}

module.exports = DynamicPriceService;
