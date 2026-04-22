const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const FoodOrder = require('../models/FoodOrder');
const Restaurant = require('../models/Restaurant');

// In-memory cache or dev store (production: Redis)
let mockRestaurants = [];
let mockMenuItems = [];
let mockOrders = [];

const initializeDevData = async () => {
  // Sample data
  const sampleRestaurants = await Restaurant.find({ type: 'restaurant' }).limit(5);
  mockRestaurants = sampleRestaurants;

  mockMenuItems = [
    {
      _id: new mongoose.Types.ObjectId(),
      restaurantId: sampleRestaurants[0]?._id,
      name: 'Chicken Biryani',
      description: 'Spicy Kerala style biryani',
      category: 'main',
      price: 250,
      available: true,
      prepTime: 20,
      vegetarian: false,
      spiceLevel: 'hot',
    },
    // Add more...
  ];

  await MenuItem.insertMany(mockMenuItems);
};

const getRestaurants = () => Restaurant.find({ type: 'restaurant' });

const getMenuByRestaurant = (restaurantId) => MenuItem.find({ restaurantId });

const createOrder = (orderData) => {
  const order = new FoodOrder(orderData);
  return order.save();
};

const getOrdersByCustomer = (customerId) => FoodOrder.find({ customerId }).sort({ createdAt: -1 });

module.exports = {
  initializeDevData,
  getRestaurants,
  getMenuByRestaurant,
  createOrder,
  getOrdersByCustomer,
};

