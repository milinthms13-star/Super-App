const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/products', require('./products.routes'));
// router.use('/cart', require('./cart.routes'));
// router.use('/orders', require('./orders.routes'));
// router.use('/reviews', require('./reviews.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'ecommerce-service',
    domain: 'E-commerce',
    version: '1.0.0',
    routes: ['/products', '/cart', '/orders', '/reviews'],
  });
});

module.exports = router;
