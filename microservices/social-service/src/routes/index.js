const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/social', require('./social.routes'));
// router.use('/feed', require('./feed.routes'));
// router.use('/posts', require('./posts.routes'));
// router.use('/comments', require('./comments.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'social-service',
    domain: 'Social',
    version: '1.0.0',
    routes: ['/social', '/feed', '/posts', '/comments'],
  });
});

module.exports = router;
