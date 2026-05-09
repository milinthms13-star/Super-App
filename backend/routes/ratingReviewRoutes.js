/**
 * ratingReviewRoutes.js
 * Routes for product and vendor reviews
 */

const express = require('express');
const router = express.Router();
const RatingReviewService = require('../services/RatingReviewService');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// Submit product review
router.post('/products/:productId/review', verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await RatingReviewService.submitProductReview(
      req.user.userId,
      productId,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Submit vendor review
router.post('/vendors/:vendorId/review', verifyToken, async (req, res) => {
  try {
    const { vendorId } = req.params;
    const result = await RatingReviewService.submitVendorReview(
      req.user.userId,
      vendorId,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get product reviews
router.get('/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const filters = {
      rating: req.query.rating || null,
      sort: req.query.sort || 'helpful',
      page: req.query.page || 1,
      limit: req.query.limit || 20,
    };
    const result = await RatingReviewService.getProductReviews(productId, filters);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Mark review as helpful
router.post('/:reviewId/helpful', verifyToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { helpful = true } = req.body;
    const result = await RatingReviewService.markReviewHelpful(reviewId, helpful);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Moderate review (admin)
router.post('/:reviewId/moderate', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { action, reason } = req.body;
    const result = await RatingReviewService.moderateReview(reviewId, action, reason);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get pending reviews (admin)
router.get('/pending/moderation', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const result = await RatingReviewService.getPendingReviews(limit);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete review
router.delete('/:reviewId', verifyToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const isAdmin = req.user.role === 'admin';
    const result = await RatingReviewService.deleteReview(
      reviewId,
      req.user.userId,
      isAdmin
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get user reviews
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;
    const result = await RatingReviewService.getUserReviews(userId, limit);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
