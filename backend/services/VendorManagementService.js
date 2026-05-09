/**
 * VendorManagementService.js
 * Vendor onboarding, profiles, performance tracking, and settlements
 */

const logger = require('../config/logger');

class VendorManagementService {
  /**
   * Onboard new vendor
   */
  static async onboardVendor(vendorData) {
    try {
      const Vendor = require('../models/Vendor');
      const User = require('../models/User');

      // Check if vendor already exists
      const existingVendor = await Vendor.findOne({ email: vendorData.email });
      if (existingVendor) {
        throw new Error('Vendor with this email already exists');
      }

      // Create vendor account
      const vendor = new Vendor({
        businessName: vendorData.businessName,
        email: vendorData.email,
        phone: vendorData.phone,
        gst: vendorData.gst,
        panNumber: vendorData.panNumber,
        bankDetails: vendorData.bankDetails,
        businessAddress: vendorData.businessAddress,
        documentUrls: vendorData.documentUrls || [],
        status: 'pending_approval',
        createdAt: new Date(),
        verificationStatus: {
          emailVerified: false,
          documentsApproved: false,
          bankDetailsVerified: false,
          approvedAt: null,
        },
      });

      await vendor.save();
      logger.info(`Vendor onboarded: ${vendor._id}`);

      return {
        vendorId: vendor._id,
        status: 'pending_approval',
        message: 'Application submitted. Approval in progress.',
      };
    } catch (error) {
      logger.error('Error onboarding vendor:', error);
      throw error;
    }
  }

  /**
   * Get vendor profile
   */
  static async getVendorProfile(vendorId) {
    try {
      const Vendor = require('../models/Vendor');

      const vendor = await Vendor.findById(vendorId).select(
        '-bankDetails.accountNumber -bankDetails.ifsc'
      );

      if (!vendor) {
        throw new Error('Vendor not found');
      }

      return vendor;
    } catch (error) {
      logger.error('Error fetching vendor profile:', error);
      throw error;
    }
  }

  /**
   * Update vendor profile
   */
  static async updateVendorProfile(vendorId, updateData) {
    try {
      const Vendor = require('../models/Vendor');

      const vendor = await Vendor.findByIdAndUpdate(
        vendorId,
        { $set: updateData },
        { new: true }
      );

      if (!vendor) {
        throw new Error('Vendor not found');
      }

      logger.info(`Vendor profile updated: ${vendorId}`);
      return vendor;
    } catch (error) {
      logger.error('Error updating vendor profile:', error);
      throw error;
    }
  }

  /**
   * Get vendor performance metrics
   */
  static async getVendorMetrics(vendorId, period = '30') {
    try {
      const Order = require('../models/Order');
      const Review = require('../models/Review');
      const Product = require('../models/Product');

      const daysBack = parseInt(period);
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysBack);

      // Get vendor products
      const vendorProducts = await Product.find({ sellerId: vendorId }).select('_id');
      const productIds = vendorProducts.map(p => p._id);

      // Orders
      const orders = await Order.find({
        'items.productId': { $in: productIds },
        createdAt: { $gte: dateThreshold },
      });

      const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
      const totalOrders = orders.length;

      // Reviews
      const reviews = await Review.find({
        productId: { $in: productIds },
        createdAt: { $gte: dateThreshold },
      });

      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

      // Cancellations
      const cancellations = await Order.countDocuments({
        'items.productId': { $in: productIds },
        status: 'cancelled',
        createdAt: { $gte: dateThreshold },
      });

      return {
        vendorId,
        period: `${daysBack} days`,
        summary: {
          totalProducts: productIds.length,
          totalOrders,
          totalRevenue: Math.round(totalRevenue),
          avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
          cancellationRate:
            totalOrders > 0
              ? Math.round((cancellations / totalOrders) * 100 * 10) / 10
              : 0,
          avgRating: Math.round(avgRating * 10) / 10,
          totalReviews: reviews.length,
        },
        health: {
          status: this._calculateVendorHealth(totalOrders, cancellations, avgRating),
          score: this._calculateVendorScore(totalOrders, cancellations, avgRating),
        },
      };
    } catch (error) {
      logger.error('Error fetching vendor metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate settlement for vendor
   */
  static async calculateSettlement(vendorId, period = '30') {
    try {
      const Order = require('../models/Order');
      const Product = require('../models/Product');
      const Vendor = require('../models/Vendor');

      const daysBack = parseInt(period);
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysBack);

      // Get vendor products
      const vendorProducts = await Product.find({ sellerId: vendorId }).select('_id');
      const productIds = vendorProducts.map(p => p._id);

      // Get completed orders
      const orders = await Order.find({
        'items.productId': { $in: productIds },
        status: 'completed',
        createdAt: { $gte: dateThreshold },
      });

      let totalOrderAmount = 0;
      let totalCommission = 0;

      for (const order of orders) {
        for (const item of order.items) {
          if (productIds.includes(item.productId)) {
            const itemAmount = item.price * item.quantity;
            totalOrderAmount += itemAmount;
            totalCommission += itemAmount * 0.15; // 15% commission
          }
        }
      }

      const settlementAmount = totalOrderAmount - totalCommission;

      return {
        vendorId,
        period: `${daysBack} days`,
        summary: {
          totalOrders: orders.length,
          totalOrderAmount: Math.round(totalOrderAmount),
          commission: Math.round(totalCommission),
          settlementAmount: Math.round(settlementAmount),
          settlementStatus: settlementAmount >= 100 ? 'eligible' : 'pending',
        },
      };
    } catch (error) {
      logger.error('Error calculating settlement:', error);
      throw error;
    }
  }

  /**
   * Approve vendor
   */
  static async approveVendor(vendorId) {
    try {
      const Vendor = require('../models/Vendor');

      const vendor = await Vendor.findByIdAndUpdate(
        vendorId,
        {
          $set: {
            status: 'active',
            'verificationStatus.documentsApproved': true,
            'verificationStatus.approvedAt': new Date(),
          },
        },
        { new: true }
      );

      if (!vendor) {
        throw new Error('Vendor not found');
      }

      logger.info(`Vendor approved: ${vendorId}`);
      return { success: true, vendorId, status: 'active' };
    } catch (error) {
      logger.error('Error approving vendor:', error);
      throw error;
    }
  }

  /**
   * Suspend vendor
   */
  static async suspendVendor(vendorId, reason) {
    try {
      const Vendor = require('../models/Vendor');

      const vendor = await Vendor.findByIdAndUpdate(
        vendorId,
        {
          $set: {
            status: 'suspended',
            suspensionReason: reason,
            suspendedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!vendor) {
        throw new Error('Vendor not found');
      }

      logger.info(`Vendor suspended: ${vendorId} - Reason: ${reason}`);
      return { success: true, vendorId, status: 'suspended' };
    } catch (error) {
      logger.error('Error suspending vendor:', error);
      throw error;
    }
  }

  /**
   * Get vendor dashboard
   */
  static async getVendorDashboard(vendorId) {
    try {
      const profile = await this.getVendorProfile(vendorId);
      const metrics = await this.getVendorMetrics(vendorId, '30');
      const settlement = await this.calculateSettlement(vendorId, '30');

      return {
        vendorId,
        profile: {
          businessName: profile.businessName,
          email: profile.email,
          status: profile.status,
          joinedAt: profile.createdAt,
        },
        metrics,
        settlement,
      };
    } catch (error) {
      logger.error('Error fetching vendor dashboard:', error);
      throw error;
    }
  }

  // Helper methods

  static _calculateVendorHealth(orders, cancellations, rating) {
    if (orders === 0) return 'pending';

    const cancellationRate = cancellations / orders;

    if (rating < 3.5 || cancellationRate > 0.15) return 'at_risk';
    if (rating < 4.0 || cancellationRate > 0.1) return 'fair';
    if (rating >= 4.5) return 'excellent';
    return 'good';
  }

  static _calculateVendorScore(orders, cancellations, rating) {
    let score = 100;

    // Deduct for cancellations
    if (orders > 0) {
      const cancellationRate = cancellations / orders;
      score -= cancellationRate * 30; // Up to 30 points
    }

    // Deduct for low rating
    if (rating < 5) {
      score -= (5 - rating) * 5; // Up to 25 points
    }

    // Bonus for high volume
    if (orders > 100) score += 5;
    if (orders > 500) score += 5;

    return Math.max(0, Math.round(score));
  }
}

module.exports = VendorManagementService;
