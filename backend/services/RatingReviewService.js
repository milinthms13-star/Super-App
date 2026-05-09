/**
 * RatingReviewService.js
 * Rating & review system with anti-spam, moderation, and quality scoring
 */

const logger = require('../config/logger');

class RatingReviewService {
  /**
   * Submit product review
   */
  static async submitProductReview(userId, productId, reviewData) {
    try {
      const User = require('../models/User');
      const Product = require('../models/Product');
      const Review = require('../models/Review');
      const Order = require('../models/Order');

      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const product = await Product.findById(productId);
      if (!product) throw new Error('Product not found');

      // Verify user has purchased this product
      const hasPurchased = await Order.findOne({
        userId,
        'items.productId': productId,
        status: 'delivered',
      });

      if (!hasPurchased) {
        throw new Error('User must purchase product before reviewing');
      }

      // Check for spam/duplicate reviews
      const existingReview = await Review.findOne({
        userId,
        productId,
      });

      if (existingReview) {
        throw new Error('You have already reviewed this product');
      }

      // Anti-spam checks
      const spamScore = this._calculateSpamScore(reviewData.title, reviewData.text);
      if (spamScore > 75) {
        throw new Error('Review detected as spam. Please try again.');
      }

      // Quality scoring
      const qualityScore = this._calculateQualityScore(reviewData);

      const review = new Review({
        userId,
        productId,
        title: reviewData.title,
        text: reviewData.text,
        rating: reviewData.rating,
        images: reviewData.images || [],
        verified: true, // Verified purchase
        spamScore,
        qualityScore,
        helpful: 0,
        unhelpful: 0,
        status: qualityScore > 50 ? 'approved' : 'pending_review',
        createdAt: new Date(),
      });

      await review.save();

      // Update product rating
      await this._updateProductRating(productId);

      logger.info(`Review submitted for product ${productId} by user ${userId}`);

      return {
        success: true,
        data: review,
        message: 'Review submitted successfully',
      };
    } catch (error) {
      logger.error('Error submitting product review:', error);
      throw error;
    }
  }

  /**
   * Submit vendor review
   */
  static async submitVendorReview(userId, vendorId, reviewData) {
    try {
      const User = require('../models/User');
      const Vendor = require('../models/Vendor');
      const VendorReview = require('../models/VendorReview');
      const Order = require('../models/Order');

      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const vendor = await Vendor.findById(vendorId);
      if (!vendor) throw new Error('Vendor not found');

      // Verify user has purchased from vendor
      const hasPurchased = await Order.findOne({
        userId,
        vendorId,
        status: 'delivered',
      });

      if (!hasPurchased) {
        throw new Error('User must purchase from vendor before reviewing');
      }

      // Check for duplicate reviews
      const existingReview = await VendorReview.findOne({
        userId,
        vendorId,
      });

      if (existingReview) {
        throw new Error('You have already reviewed this vendor');
      }

      const spamScore = this._calculateSpamScore(reviewData.title, reviewData.text);
      if (spamScore > 75) {
        throw new Error('Review detected as spam');
      }

      const vendorReview = new VendorReview({
        userId,
        vendorId,
        title: reviewData.title,
        text: reviewData.text,
        rating: reviewData.rating,
        verified: true,
        spamScore,
        status: spamScore < 50 ? 'approved' : 'pending_review',
        createdAt: new Date(),
      });

      await vendorReview.save();

      // Update vendor rating
      await this._updateVendorRating(vendorId);

      logger.info(`Vendor review submitted for ${vendorId} by user ${userId}`);

      return {
        success: true,
        data: vendorReview,
        message: 'Vendor review submitted',
      };
    } catch (error) {
      logger.error('Error submitting vendor review:', error);
      throw error;
    }
  }

  /**
   * Get product reviews with filtering
   */
  static async getProductReviews(productId, filters = {}) {
    try {
      const Review = require('../models/Review');

      const { rating = null, sort = 'helpful', page = 1, limit = 20 } = filters;

      const skip = (page - 1) * limit;

      let query = {
        productId,
        status: 'approved',
      };

      if (rating) {
        query.rating = rating;
      }

      // Sorting options
      let sortObj = { helpful: -1 };
      if (sort === 'newest') {
        sortObj = { createdAt: -1 };
      } else if (sort === 'rating-high') {
        sortObj = { rating: -1 };
      } else if (sort === 'rating-low') {
        sortObj = { rating: 1 };
      }

      const total = await Review.countDocuments(query);

      const reviews = await Review.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email')
        .lean();

      // Summary statistics
      const stats = await Review.aggregate([
        {
          $match: { productId: require('mongoose').Types.ObjectId(productId) },
        },
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
      ]);

      return {
        reviews,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        summary: {
          ratingDistribution: stats.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
        },
      };
    } catch (error) {
      logger.error('Error getting product reviews:', error);
      throw error;
    }
  }

  /**
   * Mark review as helpful/unhelpful
   */
  static async markReviewHelpful(reviewId, helpful = true) {
    try {
      const Review = require('../models/Review');

      const review = await Review.findByIdAndUpdate(
        reviewId,
        helpful
          ? { $inc: { helpful: 1 } }
          : { $inc: { unhelpful: 1 } },
        { new: true }
      );

      if (!review) throw new Error('Review not found');

      return {
        success: true,
        data: review,
        message: helpful ? 'Marked as helpful' : 'Marked as unhelpful',
      };
    } catch (error) {
      logger.error('Error marking review helpful:', error);
      throw error;
    }
  }

  /**
   * Moderate reviews (admin)
   */
  static async moderateReview(reviewId, action = 'approve', reason = '') {
    try {
      const Review = require('../models/Review');

      const review = await Review.findByIdAndUpdate(
        reviewId,
        {
          status: action === 'approve' ? 'approved' : 'rejected',
          moderationReason: reason,
          moderatedAt: new Date(),
        },
        { new: true }
      );

      if (!review) throw new Error('Review not found');

      // Update product rating if approved
      if (action === 'approve') {
        await this._updateProductRating(review.productId);
      }

      logger.info(`Review ${reviewId} ${action}ed by moderator`);

      return {
        success: true,
        data: review,
        message: `Review ${action}ed`,
      };
    } catch (error) {
      logger.error('Error moderating review:', error);
      throw error;
    }
  }

  /**
   * Get reviews pending moderation
   */
  static async getPendingReviews(limit = 50) {
    try {
      const Review = require('../models/Review');

      const reviews = await Review.find({ status: 'pending_review' })
        .sort({ spamScore: -1, createdAt: -1 })
        .limit(limit)
        .populate('userId', 'name email')
        .populate('productId', 'name');

      return {
        pending: reviews.length,
        reviews,
      };
    } catch (error) {
      logger.error('Error getting pending reviews:', error);
      throw error;
    }
  }

  /**
   * Delete review (user or admin)
   */
  static async deleteReview(reviewId, userId = null, isAdmin = false) {
    try {
      const Review = require('../models/Review');

      const review = await Review.findById(reviewId);
      if (!review) throw new Error('Review not found');

      // Check authorization
      if (!isAdmin && review.userId.toString() !== userId.toString()) {
        throw new Error('Unauthorized to delete this review');
      }

      await Review.findByIdAndDelete(reviewId);

      // Update product rating
      await this._updateProductRating(review.productId);

      logger.info(`Review ${reviewId} deleted`);

      return {
        success: true,
        message: 'Review deleted',
      };
    } catch (error) {
      logger.error('Error deleting review:', error);
      throw error;
    }
  }

  /**
   * Get user's reviews
   */
  static async getUserReviews(userId, limit = 20) {
    try {
      const Review = require('../models/Review');

      const reviews = await Review.find({
        userId,
        status: 'approved',
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('productId', 'name')
        .lean();

      return {
        reviews,
        totalReviews: reviews.length,
      };
    } catch (error) {
      logger.error('Error getting user reviews:', error);
      throw error;
    }
  }

  /**
   * Calculate spam score using heuristics
   */
  static _calculateSpamScore(title, text) {
    let score = 0;

    if (!title || !text) return 100; // Empty reviews

    // Check for excessive links
    const linkCount = (text.match(/http|www/gi) || []).length;
    if (linkCount > 2) score += 30;

    // Check for all caps
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.5) score += 25;

    // Check for excessive punctuation
    const punctRatio = (text.match(/[!?*]/g) || []).length / text.length;
    if (punctRatio > 0.2) score += 20;

    // Check for minimum length (too short = likely spam)
    if (text.length < 20) score += 15;

    // Check for repetitive characters
    if (/(.)\1{4,}/.test(text)) score += 20;

    // Check for suspicious keywords (mock)
    const suspiciousKeywords = ['contact', 'whatsapp', 'telegram', 'casino', 'loan'];
    const keywordMatches = suspiciousKeywords.filter(k =>
      text.toLowerCase().includes(k)
    ).length;
    score += keywordMatches * 15;

    return Math.min(score, 100);
  }

  /**
   * Calculate review quality score
   */
  static _calculateQualityScore(reviewData) {
    let score = 50; // Base score

    // Has title and text
    if (reviewData.title && reviewData.title.length > 5) score += 10;
    if (reviewData.text && reviewData.text.length > 50) score += 15;

    // Has images
    if (reviewData.images && reviewData.images.length > 0) score += 10;

    // Rating matches sentiment (if we could detect sentiment, +10)
    // Specific rating (not extreme)
    if (reviewData.rating >= 2 && reviewData.rating <= 4) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Update product rating
   */
  static async _updateProductRating(productId) {
    try {
      const Product = require('../models/Product');
      const Review = require('../models/Review');

      const reviews = await Review.aggregate([
        {
          $match: {
            productId: require('mongoose').Types.ObjectId(productId),
            status: 'approved',
          },
        },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
            count: { $sum: 1 },
          },
        },
      ]);

      if (reviews.length > 0) {
        await Product.findByIdAndUpdate(productId, {
          rating: reviews[0].avgRating.toFixed(1),
          reviewCount: reviews[0].count,
        });
      }
    } catch (error) {
      logger.error('Error updating product rating:', error);
    }
  }

  /**
   * Update vendor rating
   */
  static async _updateVendorRating(vendorId) {
    try {
      const Vendor = require('../models/Vendor');
      const VendorReview = require('../models/VendorReview');

      const reviews = await VendorReview.aggregate([
        {
          $match: {
            vendorId: require('mongoose').Types.ObjectId(vendorId),
            status: 'approved',
          },
        },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
            count: { $sum: 1 },
          },
        },
      ]);

      if (reviews.length > 0) {
        await Vendor.findByIdAndUpdate(vendorId, {
          rating: reviews[0].avgRating.toFixed(1),
          reviewCount: reviews[0].count,
        });
      }
    } catch (error) {
      logger.error('Error updating vendor rating:', error);
    }
  }
}

module.exports = RatingReviewService;
