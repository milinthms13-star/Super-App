const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/vehicles', require('./vehicles.routes'));
// router.use('/automotive', require('./automotive.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'vehicles-service',
    domain: 'Vehicles',
    version: '1.0.0',
    routes: ['/vehicles', '/automotive'],
  });
});

module.exports = router;
