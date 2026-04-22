const express = require('express');
const router = express.Router();
const WishlistShare = require('../models/WishlistShare');
const { authenticate } = require('../middleware/auth');

// Create wishlist share
router.post('/create', authenticate, async (req, res) => {
  try {
    const { wishlistItems, sharedWith, message, isPublic, expiresAt } = req.body;

    const share = new WishlistShare({
      ownerEmail: req.user.email,
      ownerName: req.user.name,
      wishlistItems,
      sharedWith: sharedWith || [],
      message,
      isPublic,
      expiresAt,
      publicUrl: isPublic ? `/wishlist/share/${Math.random().toString(36).substr(2, 9)}` : null,
    });

    await share.save();
    res.status(201).json({ success: true, data: share });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get shared wishlist by ID
router.get('/:shareId', async (req, res) => {
  try {
    const share = await WishlistShare.findOne({ shareId: req.params.shareId });

    if (!share) {
      return res.status(404).json({ success: false, error: 'Wishlist share not found' });
    }

    // Check expiration
    if (share.expiresAt && new Date() > share.expiresAt) {
      return res.status(403).json({ success: false, error: 'Wishlist share has expired' });
    }

    res.json({ success: true, data: share });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's wishlist shares
router.get('/user/list', authenticate, async (req, res) => {
  try {
    const shares = await WishlistShare.find({ ownerEmail: req.user.email }).sort({ createdAt: -1 });
    res.json({ success: true, data: shares });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark wishlist as viewed
router.put('/:shareId/view', authenticate, async (req, res) => {
  try {
    const share = await WishlistShare.findOneAndUpdate(
      { shareId: req.params.shareId, 'sharedWith.email': req.user.email },
      { $set: { 'sharedWith.$.viewedAt': new Date() } },
      { new: true }
    );

    if (!share) {
      return res.status(404).json({ success: false, error: 'Share not found' });
    }

    res.json({ success: true, data: share });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update wishlist share
router.put('/:shareId', authenticate, async (req, res) => {
  try {
    const share = await WishlistShare.findOne({ shareId: req.params.shareId });

    if (!share || share.ownerEmail !== req.user.email) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    Object.assign(share, req.body);
    await share.save();

    res.json({ success: true, data: share });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete wishlist share
router.delete('/:shareId', authenticate, async (req, res) => {
  try {
    const share = await WishlistShare.findOne({ shareId: req.params.shareId });

    if (!share || share.ownerEmail !== req.user.email) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    await WishlistShare.deleteOne({ shareId: req.params.shareId });
    res.json({ success: true, message: 'Wishlist share deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
