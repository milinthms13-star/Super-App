const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/astrology', require('./astrology.routes'));
// router.use('/horoscope', require('./horoscope.routes'));
// router.use('/predictions', require('./predictions.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'astrology-service',
    domain: 'Astrology',
    version: '1.0.0',
    routes: ['/astrology', '/horoscope', '/predictions'],
  });
});

module.exports = router;
