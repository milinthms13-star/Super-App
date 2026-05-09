const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get user's wishlist
router.get('/me', auth, async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ userEmail: req.user.email });

    if (!wishlist) {
      wishlist = new Wishlist({
        userId: req.user.id,
        userEmail: req.user.email,
        items: [],
      });
      await wishlist.save();
    }

    res.json({
      success: true,
      data: {
        totalItems: wishlist.totalItems,
        estimatedValue: wishlist.estimatedValue,
        items: wishlist.items,
        isPublic: wishlist.isPublic,
        publicShareLink: wishlist.publicShareLink,
      },
    });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch wishlist' });
  }
});

// Add item to wishlist
router.post('/items', auth, async (req, res) => {
  try {
    const { productId, notes = '', quantity = 1 } = req.body;

    // Validate productId
    if (!productId) {
      return res.status(400).json({ success: false, error: 'Product ID required' });
    }

    // Get product details
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Get or create wishlist
    let wishlist = await Wishlist.findOne({ userEmail: req.user.email });
    if (!wishlist) {
      wishlist = new Wishlist({
        userId: req.user.id,
        userEmail: req.user.email,
        items: [],
      });
    }

    // Add item
    wishlist.addItem(product, notes, quantity);
    await wishlist.save();

    res.status(201).json({
      success: true,
      message: 'Item added to wishlist',
      data: {
        totalItems: wishlist.totalItems,
        estimatedValue: wishlist.estimatedValue,
        item: wishlist.items[wishlist.items.length - 1],
      },
    });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ success: false, error: 'Failed to add to wishlist' });
  }
});

// Remove item from wishlist
router.delete('/items/:productId', auth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ userEmail: req.user.email });

    if (!wishlist) {
      return res.status(404).json({ success: false, error: 'Wishlist not found' });
    }

    wishlist.removeItem(req.params.productId);
    await wishlist.save();

    res.json({
      success: true,
      message: 'Item removed from wishlist',
      data: {
        totalItems: wishlist.totalItems,
        estimatedValue: wishlist.estimatedValue,
      },
    });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ success: false, error: 'Failed to remove from wishlist' });
  }
});

// Update item notes
router.patch('/items/:productId/notes', auth, async (req, res) => {
  try {
    const { notes } = req.body;
    const wishlist = await Wishlist.findOne({ userEmail: req.user.email });

    if (!wishlist) {
      return res.status(404).json({ success: false, error: 'Wishlist not found' });
    }

    wishlist.updateItemNotes(req.params.productId, notes);
    await wishlist.save();

    res.json({
      success: true,
      message: 'Notes updated',
      data: wishlist.items.find((item) => item.productId.toString() === req.params.productId),
    });
  } catch (error) {
    console.error('Error updating notes:', error);
    res.status(500).json({ success: false, error: 'Failed to update notes' });
  }
});

// Toggle price change notification
router.patch('/items/:productId/notify/price', auth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ userEmail: req.user.email });

    if (!wishlist) {
      return res.status(404).json({ success: false, error: 'Wishlist not found' });
    }

    wishlist.toggleNotification(req.params.productId, 'price');
    await wishlist.save();

    const item = wishlist.items.find((item) => item.productId.toString() === req.params.productId);

    res.json({
      success: true,
      message: 'Price notification toggled',
      data: {
        productId: req.params.productId,
        notifyOnPriceChange: item.notifyOnPriceChange,
      },
    });
  } catch (error) {
    console.error('Error toggling notification:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle notification' });
  }
});

// Toggle back in stock notification
router.patch('/items/:productId/notify/stock', auth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ userEmail: req.user.email });

    if (!wishlist) {
      return res.status(404).json({ success: false, error: 'Wishlist not found' });
    }

    wishlist.toggleNotification(req.params.productId, 'stock');
    await wishlist.save();

    const item = wishlist.items.find((item) => item.productId.toString() === req.params.productId);

    res.json({
      success: true,
      message: 'Stock notification toggled',
      data: {
        productId: req.params.productId,
        notifyOnBackInStock: item.notifyOnBackInStock,
      },
    });
  } catch (error) {
    console.error('Error toggling stock notification:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle stock notification' });
  }
});

// Clear entire wishlist
router.delete('/clear', auth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ userEmail: req.user.email });

    if (!wishlist) {
      return res.status(404).json({ success: false, error: 'Wishlist not found' });
    }

    wishlist.items = [];
    await wishlist.save();

    res.json({
      success: true,
      message: 'Wishlist cleared',
    });
  } catch (error) {
    console.error('Error clearing wishlist:', error);
    res.status(500).json({ success: false, error: 'Failed to clear wishlist' });
  }
});

// Generate public share link
router.post('/share', auth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ userEmail: req.user.email });

    if (!wishlist) {
      return res.status(404).json({ success: false, error: 'Wishlist not found' });
    }

    wishlist.generatePublicLink();
    await wishlist.save();

    res.json({
      success: true,
      message: 'Public share link generated',
      data: {
        publicShareLink: wishlist.publicShareLink,
        shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/wishlist/share/${wishlist.publicShareLink}`,
      },
    });
  } catch (error) {
    console.error('Error generating share link:', error);
    res.status(500).json({ success: false, error: 'Failed to generate share link' });
  }
});

// Get shared wishlist (public)
router.get('/share/:shareLink', async (req, res) => {
  try {
    const wishlist = await Wishlist.findByPublicLink(req.params.shareLink);

    if (!wishlist) {
      return res.status(404).json({ success: false, error: 'Wishlist share not found' });
    }

    // Mark as viewed
    wishlist.sharedWith.push({
      email: req.query.viewerEmail || 'anonymous',
      name: req.query.viewerName || 'Anonymous',
      sharedAt: new Date(),
      viewedAt: new Date(),
    });
    await wishlist.save();

    res.json({
      success: true,
      data: {
        ownerName: wishlist.ownerName || wishlist.userEmail,
        totalItems: wishlist.totalItems,
        estimatedValue: wishlist.estimatedValue,
        items: wishlist.items,
        sharedAt: wishlist.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching shared wishlist:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch shared wishlist' });
  }
});

// Disable public sharing
router.delete('/share', auth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ userEmail: req.user.email });

    if (!wishlist) {
      return res.status(404).json({ success: false, error: 'Wishlist not found' });
    }

    wishlist.isPublic = false;
    wishlist.publicShareLink = null;
    await wishlist.save();

    res.json({
      success: true,
      message: 'Public sharing disabled',
    });
  } catch (error) {
    console.error('Error disabling share:', error);
    res.status(500).json({ success: false, error: 'Failed to disable sharing' });
  }
});

// Get wishlist statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ userEmail: req.user.email });

    if (!wishlist) {
      return res.json({
        success: true,
        data: {
          totalItems: 0,
          estimatedValue: 0,
          categories: [],
          avgPrice: 0,
          inStockCount: 0,
          outOfStockCount: 0,
        },
      });
    }

    const inStockCount = wishlist.items.filter((item) => item.inStock).length;
    const outOfStockCount = wishlist.items.filter((item) => !item.inStock).length;
    const categories = [...new Set(wishlist.items.map((item) => item.category))];
    const avgPrice = wishlist.totalItems > 0 ? wishlist.estimatedValue / wishlist.totalItems : 0;

    res.json({
      success: true,
      data: {
        totalItems: wishlist.totalItems,
        estimatedValue: wishlist.estimatedValue,
        categories: categories.length,
        avgPrice: Math.round(avgPrice),
        inStockCount,
        outOfStockCount,
        sharedWith: wishlist.sharedWith.length,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
