const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/aichat', require('./aichat.routes'));
// router.use('/ai', require('./ai.routes'));
// router.use('/aiml', require('./aiml.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'ai-chat-service',
    domain: 'AI Chat',
    version: '1.0.0',
    routes: ['/aichat', '/ai', '/aiml'],
  });
});

module.exports = router;
