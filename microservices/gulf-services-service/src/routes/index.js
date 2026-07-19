const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/gulfservices', require('./gulfservices.routes'));
// router.use('/recruitment', require('./recruitment.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'gulf-services-service',
    domain: 'Gulf Services',
    version: '1.0.0',
    routes: ['/gulfservices', '/recruitment'],
  });
});

module.exports = router;
