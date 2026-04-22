const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const FoodOrder = require('../models/FoodOrder');

const seedData = async () => {
  await connectDB();

  // Sample restaurants (type: 'restaurant')
  const restaurants = await Restaurant.find({ type: 'restaurant' });
  if (restaurants.length === 0) {
    console.log('No restaurants found. Run localmarket seed first.');
    process.exit(1);
  }

  // Sample menu items
  const menuItems = [
    {
      restaurantId: restaurants[0]._id,
      name: 'Chicken Biryani',
      description: 'Spicy Kerala style biryani',
      category: 'main',
      price: 250,
      available: true,
      prepTime: 20,
      vegetarian: false,
      spiceLevel: 'hot',
    },
    {
      restaurantId: restaurants[0]._id,
      name: 'Appam with Stew',
      description: 'Soft appams with vegetable stew',
      category: 'breakfast',
      price: 180,
      available: true,
      prepTime: 15,
      vegetarian: true,
    },
    {
      restaurantId: restaurants[1]?._id || restaurants[0]._id,
      name: 'Prawn Roast',
      description: 'Roasted prawns in coconut masala',
      category: 'seafood',
      price: 320,
      available: true,
      prepTime: 25,
      vegetarian: false,
    },
  ];

  await MenuItem.deleteMany({});
  console.log('Seeded menu items:', await MenuItem.insertMany(menuItems));

  // Sample orders (assume users exist)
  const sampleUsers = await mongoose.connection.db.collection('users').find().limit(2).toArray();
  const sampleOrder = {
    customerId: sampleUsers[0]?._id,
    restaurantId: restaurants[0]._id,
    items: [{
      menuItemId: menuItems[0]._id,
      quantity: 1,
      price: 250,
    }],
    totalAmount: 289, // +delivery
    deliveryAddress: { city: 'Kochi', pincode: '682030' },
    paymentStatus: 'paid',
    orderStatus: 'delivered',
  };

  await FoodOrder.deleteMany({});
  console.log('Seeded food orders:', await FoodOrder.create(sampleOrder));

  console.log('FoodDelivery seed complete!');
  process.exit(0);
};

seedData().catch(console.error);

