/**
 * Review Moderation Service - Phase 9 Feature B
 * Review submission, moderation workflow, vendor response management
 */

const OrderReview = require('../models/OrderReview');

class ReviewModerationService {
  /**
   * Submit a new review
   */
  static async submitReview(orderId, userId, restaurantId, reviewData) {
    try {
      const reviewId = `REV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const review = new OrderReview({
        reviewId,
        orderId,
        userId,
        restaurantId,
        overallRating: reviewData.overallRating,
        ratings: reviewData.ratings || {},
        title: reviewData.title,
        description: reviewData.description,
        tags: reviewData.tags || [],
        itemReviews: reviewData.itemReviews || [],
        wouldRecommend: reviewData.wouldRecommend,
        wouldOrderAgain: reviewData.wouldOrderAgain,
        isVerified: false,
        moderationStatus: 'pending',
      });

      await review.save();

      return {
        success: true,
        data: review,
        message: 'Review submitted for moderation',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Add media to review (photos/videos)
   */
  static async addMedia(reviewId, mediaUrl, mediaType, caption = '') {
    try {
      const review = await OrderReview.findOne({ reviewId });
      if (!review) {
        return { success: false, message: 'Review not found' };
      }

      const mediaId = `MEDIA-${Date.now()}`;
      review.media.push({
        mediaId,
        type: mediaType,
        url: mediaUrl,
        uploadedAt: new Date(),
        caption,
      });

      await review.save();

      return {
        success: true,
        data: review,
        message: 'Media added to review',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Mark review as helpful or unhelpful
   */
  static async markHelpful(reviewId, isHelpful) {
    try {
      const review = await OrderReview.findOne({ reviewId });
      if (!review) {
        return { success: false, message: 'Review not found' };
      }

      if (isHelpful) {
        review.helpfulCount += 1;
      } else {
        review.unhelpfulCount += 1;
      }

      await review.save();

      return {
        success: true,
        data: review,
        message: 'Feedback recorded',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Flag review for moderation
   */
  static async flagReview(reviewId, flagReason) {
    try {
      const review = await OrderReview.findOne({ reviewId });
      if (!review) {
        return { success: false, message: 'Review not found' };
      }

      review.isFlagged = true;
      review.flagReason = flagReason;
      review.moderationStatus = 'pending';

      await review.save();

      return {
        success: true,
        data: review,
        message: 'Review flagged for moderation',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Approve/reject review
   */
  static async moderateReview(reviewId, action, moderatorId) {
    try {
      const review = await OrderReview.findOne({ reviewId });
      if (!review) {
        return { success: false, message: 'Review not found' };
      }

      if (action === 'approve') {
        review.moderationStatus = 'approved';
        review.isVerified = true;
        review.isFlagged = false;
      } else if (action === 'reject') {
        review.moderationStatus = 'rejected';
        review.isHidden = true;
      }

      review.moderatedAt = new Date();
      review.moderatorId = moderatorId;

      await review.save();

      return {
        success: true,
        data: review,
        message: `Review ${action}ed`,
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Add vendor response to review
   */
  static async addVendorResponse(reviewId, vendorName, response, acknowledgesIssue = false, offersResolution = false) {
    try {
      const review = await OrderReview.findOne({ reviewId });
      if (!review) {
        return { success: false, message: 'Review not found' };
      }

      review.vendorResponse = {
        respondedAt: new Date(),
        response,
        respondedBy: vendorName,
        acknowledgesIssue,
        offersResolution,
      };

      review.responseCount += 1;

      await review.save();

      return {
        success: true,
        data: review,
        message: 'Vendor response added',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Calculate trust score for review
   */
  static async calculateTrustScore(reviewId) {
    try {
      const review = await OrderReview.findOne({ reviewId });
      if (!review) {
        return { success: false, message: 'Review not found' };
      }

      // Trust score based on multiple factors
      let score = 0.5; // base score

      // Verification adds credibility
      if (review.isVerified) score += 0.15;

      // Photos/videos increase trust
      if (review.media && review.media.length > 0) score += 0.1;

      // Detailed reviews are more trustworthy
      if (review.description && review.description.length > 50) score += 0.1;

      // Balanced opinions (not extreme)
      if (review.overallRating >= 2 && review.overallRating <= 4) score += 0.05;

      // Multiple item reviews show effort
      if (review.itemReviews && review.itemReviews.length > 0) score += 0.05;

      // Helpful votes indicate usefulness
      const totalVotes = review.helpfulCount + review.unhelpfulCount;
      if (totalVotes > 0) {
        const helpfulRatio = review.helpfulCount / totalVotes;
        score += helpfulRatio * 0.1;
      }

      review.trustScore = Math.min(1, Math.max(0, score));
      await review.save();

      return {
        success: true,
        data: {
          reviewId,
          trustScore: review.trustScore,
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get pending reviews for moderation
   */
  static async getPendingReviews(restaurantId, limit = 20) {
    try {
      const reviews = await OrderReview.find({
        restaurantId,
        moderationStatus: 'pending',
      })
        .sort({ createdAt: -1 })
        .limit(limit);

      return {
        success: true,
        data: {
          count: reviews.length,
          reviews,
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get verified reviews for restaurant
   */
  static async getVerifiedReviews(restaurantId, sortBy = 'recent', limit = 20) {
    try {
      let sortOrder = { createdAt: -1 };

      if (sortBy === 'helpful') {
        sortOrder = { helpfulCount: -1 };
      } else if (sortBy === 'rating') {
        sortOrder = { overallRating: -1 };
      }

      const reviews = await OrderReview.find({
        restaurantId,
        isVerified: true,
        isFlagged: false,
      })
        .sort(sortOrder)
        .limit(limit);

      return {
        success: true,
        data: {
          count: reviews.length,
          reviews,
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get review statistics for restaurant
   */
  static async getReviewStats(restaurantId) {
    try {
      const stats = await OrderReview.aggregate([
        { $match: { restaurantId: require('mongoose').Types.ObjectId(restaurantId) } },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            verifiedReviews: { $sum: { $cond: ['$isVerified', 1, 0] } },
            averageRating: { $avg: '$overallRating' },
            totalHelpful: { $sum: '$helpfulCount' },
            withPhotos: { $sum: { $cond: [{ $gt: [{ $size: '$media' }, 0] }, 1, 0] } },
          },
        },
      ]);

      return {
        success: true,
        data: stats[0] || {},
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }
}

module.exports = ReviewModerationService;
