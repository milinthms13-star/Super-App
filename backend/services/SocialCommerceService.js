/**
 * SocialCommerceService.js
 * Wishlists, social sharing, and product recommendations with social proof
 */

const logger = require('../config/logger');

class SocialCommerceService {
  /**
   * Add product to wishlist
   */
  static async addToWishlist(userId, productId) {
    try {
      const User = require('../models/User');
      const Product = require('../models/Product');

      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const product = await Product.findById(productId);
      if (!product) throw new Error('Product not found');

      if (!user.wishlist) {
        user.wishlist = [];
      }

      if (user.wishlist.includes(productId)) {
        throw new Error('Product already in wishlist');
      }

      user.wishlist.push(productId);
      await user.save();

      logger.info(`Product ${productId} added to wishlist for user ${userId}`);

      return {
        success: true,
        data: { wishlistCount: user.wishlist.length },
        message: 'Added to wishlist',
      };
    } catch (error) {
      logger.error('Error adding to wishlist:', error);
      throw error;
    }
  }

  /**
   * Remove from wishlist
   */
  static async removeFromWishlist(userId, productId) {
    try {
      const User = require('../models/User');

      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
      await user.save();

      logger.info(`Product ${productId} removed from wishlist for user ${userId}`);

      return {
        success: true,
        message: 'Removed from wishlist',
      };
    } catch (error) {
      logger.error('Error removing from wishlist:', error);
      throw error;
    }
  }

  /**
   * Get user wishlist
   */
  static async getWishlist(userId, page = 1, limit = 20) {
    try {
      const User = require('../models/User');

      const skip = (page - 1) * limit;

      const user = await User.findById(userId).populate({
        path: 'wishlist',
        options: { skip, limit },
      });

      if (!user) throw new Error('User not found');

      const total = user.wishlist ? user.wishlist.length : 0;

      return {
        items: user.wishlist || [],
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting wishlist:', error);
      throw error;
    }
  }

  /**
   * Share product on social media
   */
  static async shareProduct(userId, productId, platform = 'generic') {
    try {
      const User = require('../models/User');
      const Product = require('../models/Product');
      const SocialShare = require('../models/SocialShare');

      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const product = await Product.findById(productId);
      if (!product) throw new Error('Product not found');

      const share = new SocialShare({
        userId,
        productId,
        platform,
        shareUrl: `${process.env.APP_URL}/products/${productId}?ref=${userId}`,
        sharedAt: new Date(),
      });

      await share.save();

      // Update product share count
      product.shareCount = (product.shareCount || 0) + 1;
      await product.save();

      logger.info(`Product ${productId} shared by user ${userId} on ${platform}`);

      return {
        success: true,
        data: {
          shareUrl: share.shareUrl,
          platform,
        },
        message: 'Product shared successfully',
      };
    } catch (error) {
      logger.error('Error sharing product:', error);
      throw error;
    }
  }

  /**
   * Get trending products based on social signals
   */
  static async getTrendingProducts(limit = 20) {
    try {
      const Product = require('../models/Product');

      const trending = await Product.find()
        .sort({ shareCount: -1, salesCount: -1, rating: -1 })
        .limit(limit)
        .select('name price rating shareCount salesCount')
        .lean();

      return {
        products: trending,
      };
    } catch (error) {
      logger.error('Error getting trending products:', error);
      throw error;
    }
  }

  /**
   * Create influencer partnership
   */
  static async createInfluencerPartnership(partnerData) {
    try {
      const Influencer = require('../models/Influencer');

      const influencer = new Influencer({
        name: partnerData.name,
        email: partnerData.email,
        platform: partnerData.platform,
        followers: partnerData.followers,
        engagement: partnerData.engagement || 0,
        commission: partnerData.commission || 5,
        status: 'active',
        createdAt: new Date(),
      });

      await influencer.save();

      logger.info(`Influencer ${partnerData.name} onboarded`);

      return {
        success: true,
        data: influencer,
        message: 'Influencer partnership created',
      };
    } catch (error) {
      logger.error('Error creating influencer partnership:', error);
      throw error;
    }
  }

  /**
   * Track influencer referrals
   */
  static async trackInfluencerReferral(influencerId, userId, productId, orderId) {
    try {
      const Influencer = require('../models/Influencer');
      const InfluencerReferral = require('../models/InfluencerReferral');

      const influencer = await Influencer.findById(influencerId);
      if (!influencer) throw new Error('Influencer not found');

      const referral = new InfluencerReferral({
        influencerId,
        userId,
        productId,
        orderId,
        commission: 0, // Calculated at order completion
        status: 'pending',
        createdAt: new Date(),
      });

      await referral.save();

      logger.info(
        `Referral tracked: Influencer ${influencerId} -> User ${userId}`
      );

      return {
        success: true,
        data: referral,
        message: 'Referral tracked',
      };
    } catch (error) {
      logger.error('Error tracking referral:', error);
      throw error;
    }
  }

  /**
   * Get influencer statistics
   */
  static async getInfluencerStats(influencerId) {
    try {
      const Influencer = require('../models/Influencer');
      const InfluencerReferral = require('../models/InfluencerReferral');

      const influencer = await Influencer.findById(influencerId);
      if (!influencer) throw new Error('Influencer not found');

      const referrals = await InfluencerReferral.find({
        influencerId,
      });

      const completedReferrals = referrals.filter(r => r.status === 'completed');

      const totalCommission = completedReferrals.reduce(
        (sum, r) => sum + r.commission,
        0
      );

      return {
        influencer: {
          name: influencer.name,
          followers: influencer.followers,
          engagement: influencer.engagement,
        },
        stats: {
          totalReferrals: referrals.length,
          completedReferrals: completedReferrals.length,
          conversionRate: (
            (completedReferrals.length / referrals.length) *
            100
          ).toFixed(2),
          totalCommission,
          avgCommission: (
            totalCommission / completedReferrals.length
          ).toFixed(2),
        },
      };
    } catch (error) {
      logger.error('Error getting influencer stats:', error);
      throw error;
    }
  }

  /**
   * Add product tags
   */
  static async tagProduct(productId, tags = []) {
    try {
      const Product = require('../models/Product');

      const product = await Product.findByIdAndUpdate(
        productId,
        { tags },
        { new: true }
      );

      if (!product) throw new Error('Product not found');

      logger.info(`Tags added to product ${productId}: ${tags.join(', ')}`);

      return {
        success: true,
        data: product,
        message: 'Product tagged',
      };
    } catch (error) {
      logger.error('Error tagging product:', error);
      throw error;
    }
  }

  /**
   * Get products by tags
   */
  static async getProductsByTags(tags = [], limit = 20) {
    try {
      const Product = require('../models/Product');

      const products = await Product.find({ tags: { $in: tags } })
        .limit(limit)
        .lean();

      return {
        products,
        count: products.length,
      };
    } catch (error) {
      logger.error('Error getting products by tags:', error);
      throw error;
    }
  }
}

module.exports = SocialCommerceService;
