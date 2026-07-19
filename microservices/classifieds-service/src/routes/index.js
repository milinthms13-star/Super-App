const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/classifieds', require('./classifieds.routes'));
// router.use('/listings', require('./listings.routes'));
// router.use('/ads', require('./ads.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'classifieds-service',
    domain: 'Classifieds',
    version: '1.0.0',
    routes: ['/classifieds', '/listings', '/ads'],
  });
});

module.exports = router;
