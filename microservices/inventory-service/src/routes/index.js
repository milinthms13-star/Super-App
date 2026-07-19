const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/inventory', require('./inventory.routes'));
// router.use('/stock', require('./stock.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'inventory-service',
    domain: 'Inventory',
    version: '1.0.0',
    routes: ['/inventory', '/stock'],
  });
});

module.exports = router;
