const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/healthcare', require('./healthcare.routes'));
// router.use('/appointments', require('./appointments.routes'));
// router.use('/doctors', require('./doctors.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'healthcare-service',
    domain: 'Healthcare',
    version: '1.0.0',
    routes: ['/healthcare', '/appointments', '/doctors'],
  });
});

module.exports = router;
