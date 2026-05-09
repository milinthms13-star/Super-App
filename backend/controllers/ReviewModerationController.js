/**
 * Review Moderation Controller - Phase 9 Feature B
 * REST endpoints for review management and moderation
 */

const ReviewModerationService = require('../services/ReviewModerationService');

class ReviewModerationController {
  /**
   * POST /api/phase9/reviews
   * Submit a review
   */
  static async submitReview(req, res) {
    try {
      const { orderId, restaurantId, reviewData } = req.body;
      const userId = req.user?._id;

      if (!orderId || !restaurantId || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
        });
      }

      const result = await ReviewModerationService.submitReview(orderId, userId, restaurantId, reviewData);
      res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/phase9/reviews/:reviewId/media
   * Add media to review
   */
  static async addMedia(req, res) {
    try {
      const { reviewId } = req.params;
      const { mediaUrl, mediaType, caption } = req.body;

      if (!mediaUrl || !mediaType) {
        return res.status(400).json({
          success: false,
          message: 'mediaUrl and mediaType are required',
        });
      }

      const result = await ReviewModerationService.addMedia(reviewId, mediaUrl, mediaType, caption);
      res.status(result.success ? 201 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /api/phase9/reviews/:reviewId/helpful
   * Mark review as helpful
   */
  static async markHelpful(req, res) {
    try {
      const { reviewId } = req.params;
      const { isHelpful } = req.body;

      if (isHelpful === undefined) {
        return res.status(400).json({
          success: false,
          message: 'isHelpful is required',
        });
      }

      const result = await ReviewModerationService.markHelpful(reviewId, isHelpful);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /api/phase9/reviews/:reviewId/flag
   * Flag review for moderation
   */
  static async flagReview(req, res) {
    try {
      const { reviewId } = req.params;
      const { flagReason } = req.body;

      if (!flagReason) {
        return res.status(400).json({
          success: false,
          message: 'flagReason is required',
        });
      }

      const result = await ReviewModerationService.flagReview(reviewId, flagReason);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /api/phase9/reviews/:reviewId/moderate
   * Moderate review (approve/reject)
   */
  static async moderateReview(req, res) {
    try {
      const { reviewId } = req.params;
      const { action } = req.body;
      const moderatorId = req.user?._id;

      if (!action) {
        return res.status(400).json({
          success: false,
          message: 'Action (approve/reject) is required',
        });
      }

      const result = await ReviewModerationService.moderateReview(reviewId, action, moderatorId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/phase9/reviews/:reviewId/vendor-response
   * Add vendor response to review
   */
  static async addVendorResponse(req, res) {
    try {
      const { reviewId } = req.params;
      const { vendorName, response, acknowledgesIssue, offersResolution } = req.body;

      if (!response) {
        return res.status(400).json({
          success: false,
          message: 'Response is required',
        });
      }

      const result = await ReviewModerationService.addVendorResponse(
        reviewId,
        vendorName,
        response,
        acknowledgesIssue,
        offersResolution
      );
      res.status(result.success ? 201 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/reviews/:reviewId/trust-score
   * Calculate trust score
   */
  static async calculateTrustScore(req, res) {
    try {
      const { reviewId } = req.params;

      const result = await ReviewModerationService.calculateTrustScore(reviewId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/reviews/restaurant/:restaurantId/pending
   * Get pending reviews for moderation
   */
  static async getPendingReviews(req, res) {
    try {
      const { restaurantId } = req.params;
      const { limit } = req.query;

      const result = await ReviewModerationService.getPendingReviews(restaurantId, parseInt(limit) || 20);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/reviews/restaurant/:restaurantId/verified
   * Get verified reviews
   */
  static async getVerifiedReviews(req, res) {
    try {
      const { restaurantId } = req.params;
      const { sortBy, limit } = req.query;

      const result = await ReviewModerationService.getVerifiedReviews(restaurantId, sortBy || 'recent', parseInt(limit) || 20);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/reviews/restaurant/:restaurantId/stats
   * Get review statistics
   */
  static async getReviewStats(req, res) {
    try {
      const { restaurantId } = req.params;

      const result = await ReviewModerationService.getReviewStats(restaurantId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = ReviewModerationController;
