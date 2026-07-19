const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/analytics', require('./analytics.routes'));
// router.use('/reports', require('./reports.routes'));
// router.use('/dashboards', require('./dashboards.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'analytics-service',
    domain: 'Analytics',
    version: '1.0.0',
    routes: ['/analytics', '/reports', '/dashboards'],
  });
});

module.exports = router;
