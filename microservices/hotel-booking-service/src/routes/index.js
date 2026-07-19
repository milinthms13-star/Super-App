const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/hotels', require('./hotels.routes'));
// router.use('/rooms', require('./rooms.routes'));
// router.use('/bookings', require('./bookings.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'hotel-booking-service',
    domain: 'Hotel Booking',
    version: '1.0.0',
    routes: ['/hotels', '/rooms', '/bookings'],
  });
});

module.exports = router;
