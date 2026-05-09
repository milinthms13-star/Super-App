/**
 * Promotion Service - Phase 9 Feature D
 * Coupon management, discount application, redemption tracking
 */

const Promotion = require('../models/Promotion');

class PromotionService {
  /**
   * Create new promotion
   */
  static async createPromotion(restaurantId, promotionData) {
    try {
      const promotionId = `PROMO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const promotion = new Promotion({
        promotionId,
        restaurantId,
        promotionName: promotionData.promotionName,
        promotionType: promotionData.promotionType,
        startDate: promotionData.startDate,
        endDate: promotionData.endDate,
        discount: promotionData.discount,
        description: promotionData.description,
      });

      // Add coupon code if provided
      if (promotionData.couponCode) {
        promotion.couponCode = {
          code: promotionData.couponCode,
          isUnique: true,
          usageLimit: promotionData.usageLimit,
        };
      }

      await promotion.save();

      return {
        success: true,
        data: promotion,
        message: 'Promotion created',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Validate coupon code
   */
  static async validateCoupon(couponCode, orderData) {
    try {
      const promotion = await Promotion.findOne({
        'couponCode.code': couponCode,
        status: 'active',
      });

      if (!promotion) {
        return { success: false, message: 'Invalid coupon code' };
      }

      if (!promotion.isValidForOrder(orderData)) {
        return { success: false, message: 'Promotion expired or not valid for this order' };
      }

      const discount = promotion.calculateDiscount(orderData.orderValue);

      return {
        success: true,
        data: {
          promotionId: promotion.promotionId,
          couponCode,
          discountAmount: discount,
          discountPercentage: promotion.discount.discountValue,
          finalAmount: orderData.orderValue - discount,
        },
        message: 'Coupon is valid',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Apply promotion to order
   */
  static async applyPromotion(promotionId, userId, orderId, orderValue) {
    try {
      const promotion = await Promotion.findOne({ promotionId });
      if (!promotion) {
        return { success: false, message: 'Promotion not found' };
      }

      if (!promotion.isValidForOrder({ orderValue })) {
        return { success: false, message: 'Promotion is not valid for this order' };
      }

      const discount = promotion.calculateDiscount(orderValue);

      // Check per-user limit
      const userRedemptions = promotion.redemptionHistory.filter(
        (r) => r.userId.toString() === userId.toString()
      ).length;

      if (userRedemptions >= promotion.couponCode.perUserLimit) {
        return { success: false, message: 'User has already used this promotion' };
      }

      await promotion.redeemPromotion(userId, orderId, orderValue);

      return {
        success: true,
        data: {
          discountAmount: discount,
          finalAmount: orderValue - discount,
          promotionName: promotion.promotionName,
        },
        message: 'Promotion applied',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get active promotions for restaurant
   */
  static async getActivePromotions(restaurantId, limit = 20) {
    try {
      const now = new Date();
      const promotions = await Promotion.find({
        restaurantId,
        status: 'active',
        startDate: { $lte: now },
        endDate: { $gte: now },
      })
        .limit(limit)
        .sort({ isFeatured: -1, priority: -1 });

      return {
        success: true,
        data: promotions,
        message: `${promotions.length} active promotions`,
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get promotions by category
   */
  static async getPromotionsByCategory(category, limit = 20) {
    try {
      const now = new Date();
      const promotions = await Promotion.find({
        category,
        status: 'active',
        startDate: { $lte: now },
        endDate: { $gte: now },
      })
        .limit(limit)
        .sort({ isFeatured: -1 });

      return {
        success: true,
        data: promotions,
        message: `${promotions.length} ${category} promotions`,
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get featured promotions
   */
  static async getFeaturedPromotions(limit = 10) {
    try {
      const now = new Date();
      const promotions = await Promotion.find({
        isFeatured: true,
        status: 'active',
        startDate: { $lte: now },
        endDate: { $gte: now },
        featuredUntil: { $gte: now },
      })
        .limit(limit)
        .sort({ featuredUntil: 1 });

      return {
        success: true,
        data: promotions,
        message: `${promotions.length} featured promotions`,
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get personalized promotions for user
   */
  static async getPersonalizedPromotions(userId, userSegment, limit = 10) {
    try {
      const now = new Date();
      const promotions = await Promotion.find({
        'targetAudience.userSegments': userSegment,
        status: 'active',
        startDate: { $lte: now },
        endDate: { $gte: now },
      })
        .limit(limit)
        .sort({ priority: -1 });

      return {
        success: true,
        data: promotions,
        message: `${promotions.length} promotions for ${userSegment}`,
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Track promotion performance
   */
  static async trackPromotionPerformance(promotionId) {
    try {
      const promotion = await Promotion.findOne({ promotionId });
      if (!promotion) {
        return { success: false, message: 'Promotion not found' };
      }

      return {
        success: true,
        data: {
          promotionId,
          totalRedemptions: promotion.metrics.totalRedemptions,
          uniqueUsers: promotion.metrics.uniqueUsers,
          conversionRate: promotion.metrics.conversionRate,
          totalDiscountGiven: promotion.metrics.totalDiscountGiven,
          totalRevenueGenerated: promotion.metrics.totalRevenueGenerated,
          roi: promotion.metrics.roi,
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Deactivate promotion
   */
  static async deactivatePromotion(promotionId) {
    try {
      const promotion = await Promotion.findOne({ promotionId });
      if (!promotion) {
        return { success: false, message: 'Promotion not found' };
      }

      promotion.status = 'ended';
      await promotion.save();

      return {
        success: true,
        data: promotion,
        message: 'Promotion deactivated',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }
}

module.exports = PromotionService;
