const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/auth', require('./auth.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'auth-service',
    domain: 'Authentication',
    version: '1.0.0',
    routes: ['/auth'],
  });
});

module.exports = router;
