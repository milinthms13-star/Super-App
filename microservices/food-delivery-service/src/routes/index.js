const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/food-delivery', require('./food-delivery.routes'));
// router.use('/restaurants', require('./restaurants.routes'));
// router.use('/menus', require('./menus.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'food-delivery-service',
    domain: 'Food Delivery',
    version: '1.0.0',
    routes: ['/food-delivery', '/restaurants', '/menus'],
  });
});

module.exports = router;
