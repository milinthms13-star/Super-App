const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/jobs', require('./jobs.routes'));
// router.use('/applications', require('./applications.routes'));
// router.use('/resumes', require('./resumes.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'jobs-service',
    domain: 'Jobs & Careers',
    version: '1.0.0',
    routes: ['/jobs', '/applications', '/resumes'],
  });
});

module.exports = router;
