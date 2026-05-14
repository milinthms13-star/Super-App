/**
 * cartRoutes.js
 * Persistent cart API for user and guest sessions
 */

const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const { verifyToken, optionalToken } = require('../middleware/auth');

// Get cart for user or guest session
router.get('/', optionalToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'];
    let cart;
    if (userId) {
      cart = await Cart.findOne({ userId });
    } else if (sessionId) {
      cart = await Cart.findOne({ sessionId });
    }
    res.json({ success: true, data: cart || { items: [] } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add/update item in cart
router.post('/add', optionalToken, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId || !quantity) return res.status(400).json({ error: 'Missing productId or quantity' });
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'];
    let cart;
    if (userId) {
      cart = await Cart.findOneAndUpdate(
        { userId },
        { $pull: { items: { productId } } },
        { new: true, upsert: true }
      );
      cart.items.push({ productId, quantity });
      cart.updatedAt = new Date();
      await cart.save();
    } else if (sessionId) {
      cart = await Cart.findOneAndUpdate(
        { sessionId },
        { $pull: { items: { productId } } },
        { new: true, upsert: true }
      );
      cart.items.push({ productId, quantity });
      cart.updatedAt = new Date();
      await cart.save();
    } else {
      return res.status(400).json({ error: 'No user or session' });
    }
    res.json({ success: true, data: cart });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Remove item from cart
router.post('/remove', optionalToken, async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ error: 'Missing productId' });
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'];
    let cart;
    if (userId) {
      cart = await Cart.findOneAndUpdate(
        { userId },
        { $pull: { items: { productId } }, $set: { updatedAt: new Date() } },
        { new: true }
      );
    } else if (sessionId) {
      cart = await Cart.findOneAndUpdate(
        { sessionId },
        { $pull: { items: { productId } }, $set: { updatedAt: new Date() } },
        { new: true }
      );
    } else {
      return res.status(400).json({ error: 'No user or session' });
    }
    res.json({ success: true, data: cart });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Clear cart
router.post('/clear', optionalToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'];
    let cart;
    if (userId) {
      cart = await Cart.findOneAndUpdate(
        { userId },
        { $set: { items: [], updatedAt: new Date() } },
        { new: true }
      );
    } else if (sessionId) {
      cart = await Cart.findOneAndUpdate(
        { sessionId },
        { $set: { items: [], updatedAt: new Date() } },
        { new: true }
      );
    } else {
      return res.status(400).json({ error: 'No user or session' });
    }
    res.json({ success: true, data: cart });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
