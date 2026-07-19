const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/notifications', require('./notifications.routes'));
// router.use('/email', require('./email.routes'));
// router.use('/sms', require('./sms.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'notification-service',
    domain: 'Notifications',
    version: '1.0.0',
    routes: ['/notifications', '/email', '/sms'],
  });
});

module.exports = router;
