const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/beautyai', require('./beautyai.routes'));
// router.use('/skincare', require('./skincare.routes'));
// router.use('/tips', require('./tips.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'beauty-ai-service',
    domain: 'Beauty AI',
    version: '1.0.0',
    routes: ['/beautyai', '/skincare', '/tips'],
  });
});

module.exports = router;
