/**
 * CouponService.js
 * Manages promotional coupons, validation, and usage tracking
 * 
 * Methods:
 * - createCoupon(couponData)
 * - validateCoupon(code, rideType, rideAmount)
 * - applyCoupon(userId, code, rideId)
 * - getCouponDetails(code)
 * - getAvailableCoupons(userId, rideType)
 * - trackCouponUsage(couponId, userId)
 * - getActiveCoupons(limit)
 * - deactivateCoupon(code)
 */

class CouponService {
  constructor() {
    this.Coupon = require('../models/Coupon');
    this.CouponUsage = require('../models/CouponUsage');
    this.User = require('../models/User');
  }

  /**
   * Create a new coupon (Admin only)
   */
  async createCoupon(couponData) {
    try {
      const {
        code,
        discountType,
        discountValue,
        maxUsage,
        validFrom,
        validTo,
        minRideAmount,
        applicableRideTypes,
        maxDiscountAmount,
        description
      } = couponData;

      // Validate input
      if (!code || !discountType || !discountValue) {
        throw new Error('Missing required fields');
      }

      if (discountType === 'percentage' && discountValue > 100) {
        throw new Error('Percentage discount cannot exceed 100%');
      }

      // Check if code already exists
      const existingCoupon = await this.Coupon.findOne({ code: code.toUpperCase() });
      if (existingCoupon) {
        throw new Error('Coupon code already exists');
      }

      const coupon = new this.Coupon({
        code: code.toUpperCase(),
        discountType,
        discountValue,
        maxUsage: maxUsage || 1000,
        usedCount: 0,
        validFrom: new Date(validFrom),
        validTo: new Date(validTo),
        minRideAmount: minRideAmount || 100,
        maxDiscountAmount: maxDiscountAmount || null,
        applicableRideTypes: applicableRideTypes || ['bike', 'auto', 'minicab', 'sedan', 'suv', 'premium', 'ev'],
        active: true,
        description: description || '',
        createdAt: new Date()
      });

      await coupon.save();

      return {
        success: true,
        message: 'Coupon created successfully',
        coupon: {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue
        }
      };
    } catch (error) {
      console.error('Error creating coupon:', error.message);
      throw error;
    }
  }

  /**
   * Validate coupon and calculate discount
   */
  async validateCoupon(code, rideType, rideAmount) {
    try {
      if (!code || code.trim() === '') {
        return { success: false, valid: false, message: 'Invalid coupon code' };
      }

      const coupon = await this.Coupon.findOne({
        code: code.toUpperCase(),
        active: true
      });

      if (!coupon) {
        return { success: false, valid: false, message: 'Coupon not found or inactive' };
      }

      // Check expiry
      const now = new Date();
      if (now < coupon.validFrom || now > coupon.validTo) {
        return { success: false, valid: false, message: 'Coupon has expired' };
      }

      // Check usage limit
      if (coupon.usedCount >= coupon.maxUsage) {
        return { success: false, valid: false, message: 'Coupon usage limit exceeded' };
      }

      // Check ride type applicability
      if (!coupon.applicableRideTypes.includes(rideType)) {
        return {
          success: false,
          valid: false,
          message: `Coupon not applicable for ${rideType} rides`
        };
      }

      // Check minimum ride amount
      if (rideAmount < coupon.minRideAmount) {
        return {
          success: false,
          valid: false,
          message: `Minimum ride amount of ₹${coupon.minRideAmount} required`
        };
      }

      // Calculate discount
      let discountAmount;
      if (coupon.discountType === 'percentage') {
        discountAmount = Math.round((rideAmount * coupon.discountValue) / 100);
        if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
          discountAmount = coupon.maxDiscountAmount;
        }
      } else {
        discountAmount = Math.min(coupon.discountValue, rideAmount);
      }

      return {
        success: true,
        valid: true,
        discount: discountAmount,
        originalAmount: rideAmount,
        finalAmount: Math.max(0, rideAmount - discountAmount),
        couponCode: coupon.code,
        description: coupon.description
      };
    } catch (error) {
      console.error('Error validating coupon:', error.message);
      throw error;
    }
  }

  /**
   * Apply coupon to a ride
   */
  async applyCoupon(userId, code, rideId, rideAmount, rideType) {
    try {
      // Validate coupon
      const validation = await this.validateCoupon(code, rideType, rideAmount);
      if (!validation.valid) {
        return validation;
      }

      const coupon = await this.Coupon.findOne({ code: code.toUpperCase() });

      // Create usage record
      const usage = new this.CouponUsage({
        couponId: coupon._id,
        userId,
        rideId,
        discountAmount: validation.discount,
        usedAt: new Date()
      });

      await usage.save();

      // Update coupon usage count
      coupon.usedCount += 1;
      await coupon.save();

      return {
        success: true,
        message: 'Coupon applied successfully',
        discount: validation.discount,
        originalAmount: rideAmount,
        finalAmount: validation.finalAmount,
        usageId: usage._id
      };
    } catch (error) {
      console.error('Error applying coupon:', error.message);
      throw error;
    }
  }

  /**
   * Get coupon details
   */
  async getCouponDetails(code) {
    try {
      const coupon = await this.Coupon.findOne({
        code: code.toUpperCase(),
        active: true
      });

      if (!coupon) {
        throw new Error('Coupon not found');
      }

      const now = new Date();
      const isValid = now >= coupon.validFrom && now <= coupon.validTo;

      return {
        success: true,
        coupon: {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          maxDiscountAmount: coupon.maxDiscountAmount,
          validFrom: coupon.validFrom,
          validTo: coupon.validTo,
          minRideAmount: coupon.minRideAmount,
          applicableRideTypes: coupon.applicableRideTypes,
          description: coupon.description,
          isValid,
          usageRemaining: coupon.maxUsage - coupon.usedCount
        }
      };
    } catch (error) {
      console.error('Error getting coupon details:', error.message);
      throw error;
    }
  }

  /**
   * Get available coupons for user
   */
  async getAvailableCoupons(userId, rideType) {
    try {
      const now = new Date();

      const coupons = await this.Coupon.find({
        active: true,
        validFrom: { $lte: now },
        validTo: { $gte: now },
        applicableRideTypes: rideType
      })
        .select('code discountType discountValue description minRideAmount -_id')
        .limit(10);

      const availableCoupons = coupons.map(coupon => ({
        code: coupon.code,
        discount: `${coupon.discountValue}${coupon.discountType === 'percentage' ? '%' : '₹'}`,
        description: coupon.description,
        minAmount: `₹${coupon.minRideAmount}`,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue
      }));

      return {
        success: true,
        coupons: availableCoupons
      };
    } catch (error) {
      console.error('Error getting available coupons:', error.message);
      throw error;
    }
  }

  /**
   * Get coupon usage statistics
   */
  async getCouponUsageStats(code) {
    try {
      const coupon = await this.Coupon.findOne({ code: code.toUpperCase() });
      if (!coupon) {
        throw new Error('Coupon not found');
      }

      const usageCount = await this.CouponUsage.countDocuments({ couponId: coupon._id });
      const totalDiscountGiven = await this.CouponUsage.aggregate([
        { $match: { couponId: coupon._id } },
        { $group: { _id: null, total: { $sum: '$discountAmount' } } }
      ]);

      return {
        success: true,
        stats: {
          code: coupon.code,
          totalUsage: usageCount,
          maxUsage: coupon.maxUsage,
          usagePercentage: ((usageCount / coupon.maxUsage) * 100).toFixed(1),
          totalDiscountGiven: totalDiscountGiven[0]?.total || 0,
          remainingUsage: coupon.maxUsage - usageCount
        }
      };
    } catch (error) {
      console.error('Error getting coupon usage stats:', error.message);
      throw error;
    }
  }

  /**
   * Get all active coupons
   */
  async getActiveCoupons(limit = 20) {
    try {
      const now = new Date();

      const coupons = await this.Coupon.find({
        active: true,
        validFrom: { $lte: now },
        validTo: { $gte: now }
      })
        .select('code discountType discountValue description validTo usedCount maxUsage -_id')
        .limit(limit)
        .sort({ validTo: 1 });

      return {
        success: true,
        coupons
      };
    } catch (error) {
      console.error('Error getting active coupons:', error.message);
      throw error;
    }
  }

  /**
   * Deactivate coupon
   */
  async deactivateCoupon(code) {
    try {
      const coupon = await this.Coupon.findOne({ code: code.toUpperCase() });
      if (!coupon) {
        throw new Error('Coupon not found');
      }

      coupon.active = false;
      await coupon.save();

      return {
        success: true,
        message: 'Coupon deactivated successfully'
      };
    } catch (error) {
      console.error('Error deactivating coupon:', error.message);
      throw error;
    }
  }

  /**
   * Get user's coupon history
   */
  async getUserCouponHistory(userId, limit = 10) {
    try {
      const usageHistory = await this.CouponUsage.find({ userId })
        .populate('couponId', 'code discountType discountValue')
        .sort({ usedAt: -1 })
        .limit(limit)
        .select('couponId discountAmount usedAt -userId');

      return {
        success: true,
        history: usageHistory
      };
    } catch (error) {
      console.error('Error getting user coupon history:', error.message);
      throw error;
    }
  }

  /**
   * Check if user has already used a coupon
   */
  async hasUserUsedCoupon(userId, code) {
    try {
      const coupon = await this.Coupon.findOne({ code: code.toUpperCase() });
      if (!coupon) {
        return { hasUsed: false };
      }

      const usage = await this.CouponUsage.findOne({
        userId,
        couponId: coupon._id
      });

      return {
        hasUsed: !!usage,
        timesUsed: await this.CouponUsage.countDocuments({ userId, couponId: coupon._id })
      };
    } catch (error) {
      console.error('Error checking coupon usage:', error.message);
      throw error;
    }
  }
}

module.exports = new CouponService();
