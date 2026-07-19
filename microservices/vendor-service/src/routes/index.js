const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/vendors', require('./vendors.routes'));
// router.use('/seller', require('./seller.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'vendor-service',
    domain: 'Vendor Management',
    version: '1.0.0',
    routes: ['/vendors', '/seller'],
  });
});

module.exports = router;
