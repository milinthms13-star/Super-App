const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/kidsvideomaker', require('./kidsvideomaker.routes'));
// router.use('/cartoons', require('./cartoons.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'kids-video-service',
    domain: 'Kids Video Maker',
    version: '1.0.0',
    routes: ['/kidsvideomaker', '/cartoons'],
  });
});

module.exports = router;
