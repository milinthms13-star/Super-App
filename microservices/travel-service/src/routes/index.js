const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/travel', require('./travel.routes'));
// router.use('/flights', require('./flights.routes'));
// router.use('/bus', require('./bus.routes'));
// router.use('/train', require('./train.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'travel-service',
    domain: 'Travel',
    version: '1.0.0',
    routes: ['/travel', '/flights', '/bus', '/train'],
  });
});

module.exports = router;
