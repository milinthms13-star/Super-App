const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const { getRestaurants, getMenuByRestaurant, createOrder, getOrdersByCustomer } = require('../utils/foodStore');
const FoodOrder = require('../models/FoodOrder');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');

// GET /api/fooddelivery/restaurants
router.get('/restaurants', rateLimiter, async (req, res) => {
  try {
    const restaurants = await getRestaurants();
    res.json({ success: true, data: restaurants });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/fooddelivery/:restaurantId/menu
router.get('/:restaurantId/menu', rateLimiter, async (req, res) => {
  try {
    const menu = await getMenuByRestaurant(req.params.restaurantId);
    res.json({ success: true, data: menu });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/fooddelivery/order
router.post('/order', auth, rateLimiter, async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      customerId: req.user.id,
    };
    const order = await createOrder(orderData);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/fooddelivery/my-orders
router.get('/my-orders', auth, async (req, res) => {
  try {
    const orders = await getOrdersByCustomer(req.user.id);
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

