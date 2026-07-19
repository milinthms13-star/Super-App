const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/users', require('./users.routes'));
// router.use('/profile', require('./profile.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'user-service',
    domain: 'User Management',
    version: '1.0.0',
    routes: ['/users', '/profile'],
  });
});

module.exports = router;
