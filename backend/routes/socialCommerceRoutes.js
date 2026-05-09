/**
 * socialCommerceRoutes.js
 * Routes for wishlists, social sharing, influencer partnerships
 */

const express = require('express');
const router = express.Router();
const SocialCommerceService = require('../services/SocialCommerceService');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// Wishlist endpoints
router.post('/wishlist', verifyToken, async (req, res) => {
  try {
    const { productId } = req.body;
    const result = await SocialCommerceService.addToWishlist(
      req.user.userId,
      productId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/wishlist/:productId', verifyToken, async (req, res) => {
  try {
    const result = await SocialCommerceService.removeFromWishlist(
      req.user.userId,
      req.params.productId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/wishlist', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await SocialCommerceService.getWishlist(
      req.user.userId,
      page,
      limit
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Social sharing
router.post('/share/:productId', verifyToken, async (req, res) => {
  try {
    const { platform = 'generic' } = req.body;
    const result = await SocialCommerceService.shareProduct(
      req.user.userId,
      req.params.productId,
      platform
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/trending', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const result = await SocialCommerceService.getTrendingProducts(limit);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Influencer endpoints
router.post('/influencers', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await SocialCommerceService.createInfluencerPartnership(
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/influencers/:influencerId/track-referral', verifyToken, async (req, res) => {
  try {
    const { userId, productId, orderId } = req.body;
    const result = await SocialCommerceService.trackInfluencerReferral(
      req.params.influencerId,
      userId,
      productId,
      orderId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/influencers/:influencerId/stats', verifyToken, async (req, res) => {
  try {
    const result = await SocialCommerceService.getInfluencerStats(
      req.params.influencerId
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Product tags
router.post('/products/:productId/tags', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { tags } = req.body;
    const result = await SocialCommerceService.tagProduct(
      req.params.productId,
      tags
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/tags/:tags', async (req, res) => {
  try {
    const tags = req.params.tags.split(',');
    const result = await SocialCommerceService.getProductsByTags(tags);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
