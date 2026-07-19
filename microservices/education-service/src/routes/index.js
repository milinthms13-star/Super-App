const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/education', require('./education.routes'));
// router.use('/courses', require('./courses.routes'));
// router.use('/learning', require('./learning.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'education-service',
    domain: 'Education',
    version: '1.0.0',
    routes: ['/education', '/courses', '/learning'],
  });
});

module.exports = router;
