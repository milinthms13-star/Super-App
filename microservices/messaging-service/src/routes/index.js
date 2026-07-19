const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/messaging', require('./messaging.routes'));
// router.use('/chat', require('./chat.routes'));
// router.use('/conversations', require('./conversations.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'messaging-service',
    domain: 'Messaging',
    version: '1.0.0',
    routes: ['/messaging', '/chat', '/conversations'],
  });
});

module.exports = router;
