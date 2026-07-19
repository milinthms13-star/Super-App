const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/files', require('./files.routes'));
// router.use('/uploads', require('./uploads.routes'));
// router.use('/media', require('./media.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'file-service',
    domain: 'File Management',
    version: '1.0.0',
    routes: ['/files', '/uploads', '/media'],
  });
});

module.exports = router;
