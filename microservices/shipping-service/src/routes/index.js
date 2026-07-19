const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/shipping', require('./shipping.routes'));
// router.use('/tracking', require('./tracking.routes'));
// router.use('/delivery', require('./delivery.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'shipping-service',
    domain: 'Shipping',
    version: '1.0.0',
    routes: ['/shipping', '/tracking', '/delivery'],
  });
});

module.exports = router;
