const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/insurance', require('./insurance.routes'));
// router.use('/policies', require('./policies.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'insurance-service',
    domain: 'Insurance',
    version: '1.0.0',
    routes: ['/insurance', '/policies'],
  });
});

module.exports = router;
