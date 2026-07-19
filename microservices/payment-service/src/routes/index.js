const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/payments', require('./payments.routes'));
// router.use('/invoices', require('./invoices.routes'));
// router.use('/transactions', require('./transactions.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'payment-service',
    domain: 'Payments',
    version: '1.0.0',
    routes: ['/payments', '/invoices', '/transactions'],
  });
});

module.exports = router;
