const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/polls', require('./polls.routes'));
// router.use('/surveys', require('./surveys.routes'));
// router.use('/votes', require('./votes.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'poll-service',
    domain: 'Polls & Surveys',
    version: '1.0.0',
    routes: ['/polls', '/surveys', '/votes'],
  });
});

module.exports = router;
