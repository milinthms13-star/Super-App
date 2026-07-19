const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/business', require('./business.routes'));
// router.use('/miniapps', require('./miniapps.routes'));
// router.use('/templates', require('./templates.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'business-builder-service',
    domain: 'Business Builder',
    version: '1.0.0',
    routes: ['/business', '/miniapps', '/templates'],
  });
});

module.exports = router;
