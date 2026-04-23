const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Product = require('../models/Product');
const { indexProduct } = require('../utils/elasticsearch');
const { authenticate } = require('../middleware/auth');

const syncProductReviewStats = async (productId) => {
  if (!productId) {
    return null;
  }

  const [stats] = await Review.aggregate([
    { $match: { productId: String(productId), status: 'Approved' } },
    {
      $group: {
        _id: '$productId',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  const nextRating = Number(stats?.averageRating || 0);
  const nextReviewCount = Number(stats?.reviewCount || 0);

  const product = await Product.findByIdAndUpdate(
    productId,
    {
      rating: Number(nextRating.toFixed(2)),
      reviewCount: nextReviewCount,
    },
    { new: true }
  );

  if (product) {
    await indexProduct({
      ...product.toObject(),
      id: String(product._id),
      reviews: nextReviewCount,
      rating: Number(nextRating.toFixed(2)),
    });
  }

  return product;
};

// Create review
router.post('/create', authenticate, async (req, res) => {
  try {
    const { productId, productName, orderId, rating, title, comment, images } = req.body;

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }

    const review = new Review({
      productId,
      productName,
      orderId,
      reviewerEmail: req.user.email,
      reviewerName: req.user.name,
      rating,
      title,
      comment,
      images: images || [],
      verified: !!orderId, // Mark as verified if order ID provided
    });

    await review.save();
    if (review.status === 'Approved') {
      await syncProductReviewStats(productId);
    }
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get product reviews
router.get('/product/:productId', async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = '-createdAt' } = req.query;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({
      productId: req.params.productId,
      status: 'Approved',
    })
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Review.countDocuments({
      productId: req.params.productId,
      status: 'Approved',
    });

    // Calculate average rating
    const avgRating = await Review.aggregate([
      { $match: { productId: req.params.productId, status: 'Approved' } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
      },
      averageRating: avgRating[0]?.avgRating || 0,
      totalReviews: avgRating[0]?.count || 0,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user reviews
router.get('/user/reviews', authenticate, async (req, res) => {
  try {
    const reviews = await Review.find({
      reviewerEmail: req.user.email,
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update review
router.put('/:reviewId', authenticate, async (req, res) => {
  try {
    const review = await Review.findOneAndUpdate(
      { reviewId: req.params.reviewId, reviewerEmail: req.user.email },
      { ...req.body, status: 'Pending', updatedAt: new Date() },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found or unauthorized' });
    }

    res.json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete review
router.delete('/:reviewId', authenticate, async (req, res) => {
  try {
    const review = await Review.findOne({
      reviewId: req.params.reviewId,
      reviewerEmail: req.user.email,
    });

    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found or unauthorized' });
    }

    const productId = review.productId;
    await Review.deleteOne({ reviewId: req.params.reviewId });
    await syncProductReviewStats(productId);
    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark review as helpful
router.post('/:reviewId/helpful', async (req, res) => {
  try {
    const review = await Review.findOneAndUpdate(
      { reviewId: req.params.reviewId },
      { $inc: { helpful: 1 } },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    await syncProductReviewStats(review.productId);
    res.json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Seller response to review
router.post('/:reviewId/response', authenticate, async (req, res) => {
  try {
    const { text } = req.body;

    const review = await Review.findOneAndUpdate(
      { reviewId: req.params.reviewId },
      {
        sellerResponse: {
          text,
          respondedAt: new Date(),
        },
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    await syncProductReviewStats(review.productId);
    res.json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Approve review (admin/moderator)
router.post('/:reviewId/approve', authenticate, async (req, res) => {
  try {
    const review = await Review.findOneAndUpdate(
      { reviewId: req.params.reviewId },
      { status: 'Approved', updatedAt: new Date() },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    res.json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
