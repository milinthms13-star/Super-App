const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/freelancer', require('./freelancer.routes'));
// router.use('/gigs', require('./gigs.routes'));
// router.use('/projects', require('./projects.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'freelancer-service',
    domain: 'Freelancer Marketplace',
    version: '1.0.0',
    routes: ['/freelancer', '/gigs', '/projects'],
  });
});

module.exports = router;
