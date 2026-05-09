const express = require('express');
const router = express.Router();
const RecentlyViewed = require('../models/RecentlyViewed');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// Get user's recently viewed items
router.get('/me', auth, async (req, res) => {
  try {
    const { limit = 12 } = req.query;

    let viewed = await RecentlyViewed.findOne({ userEmail: req.user.email });

    if (!viewed) {
      viewed = new RecentlyViewed({
        userId: req.user.id,
        userEmail: req.user.email,
        items: [],
      });
      await viewed.save();
    }

    const recentItems = viewed.getRecentlyViewed(parseInt(limit));

    res.json({
      success: true,
      data: {
        totalViews: viewed.totalViews,
        items: recentItems,
        recommendations: viewed.getRecommendations(),
      },
    });
  } catch (error) {
    console.error('Error fetching recently viewed:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recently viewed items' });
  }
});

// Record a product view
router.post('/track', auth, async (req, res) => {
  try {
    const { productId, deviceType = 'mobile', timeSpent = 0 } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, error: 'Product ID required' });
    }

    // Get product details
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Get or create recently viewed
    let viewed = await RecentlyViewed.getOrCreate(req.user.id, req.user.email);

    // Add view
    viewed.addView(product, deviceType, timeSpent);
    await viewed.save();

    res.status(201).json({
      success: true,
      message: 'View recorded',
      data: {
        totalViews: viewed.totalViews,
        itemsCount: viewed.items.length,
      },
    });
  } catch (error) {
    console.error('Error tracking view:', error);
    res.status(500).json({ success: false, error: 'Failed to track view' });
  }
});

// Get recently viewed by category
router.get('/category/:category', auth, async (req, res) => {
  try {
    const viewed = await RecentlyViewed.findOne({ userEmail: req.user.email });

    if (!viewed) {
      return res.json({
        success: true,
        data: {
          category: req.params.category,
          items: [],
        },
      });
    }

    const categoryItems = viewed.items
      .filter((item) => item.category === req.params.category)
      .sort((a, b) => new Date(b.viewedAt) - new Date(a.viewedAt));

    res.json({
      success: true,
      data: {
        category: req.params.category,
        count: categoryItems.length,
        items: categoryItems,
      },
    });
  } catch (error) {
    console.error('Error fetching category items:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch category items' });
  }
});

// Get analytics on browsing behavior
router.get('/analytics', auth, async (req, res) => {
  try {
    const viewed = await RecentlyViewed.findOne({ userEmail: req.user.email });

    if (!viewed || viewed.items.length === 0) {
      return res.json({
        success: true,
        data: {
          totalViews: 0,
          uniqueProducts: 0,
          categories: [],
          avgTimeSpent: 0,
          mostViewedCategory: null,
          mostViewedProduct: null,
        },
      });
    }

    // Calculate analytics
    const categories = [...new Set(viewed.items.map((item) => item.category))];
    const totalTimeSpent = viewed.items.reduce((sum, item) => sum + item.timeSpent, 0);
    const avgTimeSpent = Math.round(totalTimeSpent / viewed.items.length);

    // Find most viewed category
    const categoryViews = {};
    viewed.items.forEach((item) => {
      categoryViews[item.category] = (categoryViews[item.category] || 0) + item.viewCount;
    });
    const mostViewedCategory = Object.entries(categoryViews).sort(([, a], [, b]) => b - a)[0];

    // Find most viewed product
    const mostViewedProduct = viewed.items.reduce((prev, current) =>
      prev.viewCount > current.viewCount ? prev : current
    );

    res.json({
      success: true,
      data: {
        totalViews: viewed.totalViews,
        uniqueProducts: viewed.items.length,
        categories: categories,
        avgTimeSpent, // in seconds
        mostViewedCategory: mostViewedCategory ? mostViewedCategory[0] : null,
        mostViewedProduct: {
          productId: mostViewedProduct.productId,
          name: mostViewedProduct.productName,
          viewCount: mostViewedProduct.viewCount,
          category: mostViewedProduct.category,
        },
        deviceTypes: [...new Set(viewed.items.map((item) => item.deviceType))],
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

// Clear recently viewed
router.delete('/clear', auth, async (req, res) => {
  try {
    const viewed = await RecentlyViewed.findOne({ userEmail: req.user.email });

    if (!viewed) {
      return res.status(404).json({ success: false, error: 'No recently viewed history' });
    }

    viewed.items = [];
    await viewed.save();

    res.json({
      success: true,
      message: 'Recently viewed cleared',
    });
  } catch (error) {
    console.error('Error clearing recently viewed:', error);
    res.status(500).json({ success: false, error: 'Failed to clear history' });
  }
});

// Get browsing patterns for recommendations
router.get('/patterns', auth, async (req, res) => {
  try {
    const viewed = await RecentlyViewed.findOne({ userEmail: req.user.email });

    if (!viewed || viewed.items.length === 0) {
      return res.json({
        success: true,
        data: {
          browsePat terns: [],
          recommendedCategories: [],
        },
      });
    }

    // Get top categories
    const categoryViews = {};
    const priceRanges = {};

    viewed.items.forEach((item) => {
      // Count category views
      categoryViews[item.category] = (categoryViews[item.category] || 0) + 1;

      // Analyze price ranges
      const priceRange = item.price < 500 ? '0-500' : item.price < 1000 ? '500-1000' : item.price < 5000 ? '1000-5000' : '5000+';
      priceRanges[priceRange] = (priceRanges[priceRange] || 0) + 1;
    });

    const topCategories = Object.entries(categoryViews)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    res.json({
      success: true,
      data: {
        browsingPatterns: {
          favoriteCategories: topCategories,
          pricePreference: priceRanges,
          totalBrowsingSession: viewed.items.length,
        },
        recommendedCategories: topCategories.map((item) => item.category),
      },
    });
  } catch (error) {
    console.error('Error fetching patterns:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch browsing patterns' });
  }
});

// Remove specific item from history
router.delete('/:productId', auth, async (req, res) => {
  try {
    const viewed = await RecentlyViewed.findOne({ userEmail: req.user.email });

    if (!viewed) {
      return res.status(404).json({ success: false, error: 'No recently viewed history' });
    }

    viewed.items = viewed.items.filter((item) => item.productId.toString() !== req.params.productId);
    await viewed.save();

    res.json({
      success: true,
      message: 'Item removed from history',
      data: {
        totalViews: viewed.totalViews,
        itemsCount: viewed.items.length,
      },
    });
  } catch (error) {
    console.error('Error removing item:', error);
    res.status(500).json({ success: false, error: 'Failed to remove item' });
  }
});

module.exports = router;
