const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/matrimonial', require('./matrimonial.routes'));
// router.use('/profiles', require('./profiles.routes'));
// router.use('/matches', require('./matches.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'matrimonial-service',
    domain: 'Matrimonial',
    version: '1.0.0',
    routes: ['/matrimonial', '/profiles', '/matches'],
  });
});

module.exports = router;
