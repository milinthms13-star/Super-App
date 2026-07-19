const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/tourism', require('./tourism.routes'));
// router.use('/packages', require('./packages.routes'));
// router.use('/tours', require('./tours.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'tourism-service',
    domain: 'Tourism',
    version: '1.0.0',
    routes: ['/tourism', '/packages', '/tours'],
  });
});

module.exports = router;
