const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/finance', require('./finance.routes'));
// router.use('/loans', require('./loans.routes'));
// router.use('/credit', require('./credit.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'finance-service',
    domain: 'Finance',
    version: '1.0.0',
    routes: ['/finance', '/loans', '/credit'],
  });
});

module.exports = router;
