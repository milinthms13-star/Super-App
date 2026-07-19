const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/realestate', require('./realestate.routes'));
// router.use('/properties', require('./properties.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'realestate-service',
    domain: 'Real Estate',
    version: '1.0.0',
    routes: ['/realestate', '/properties'],
  });
});

module.exports = router;
