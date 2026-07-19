const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/recommendations', require('./recommendations.routes'));
// router.use('/suggestions', require('./suggestions.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'recommendation-service',
    domain: 'Recommendations',
    version: '1.0.0',
    routes: ['/recommendations', '/suggestions'],
  });
});

module.exports = router;
