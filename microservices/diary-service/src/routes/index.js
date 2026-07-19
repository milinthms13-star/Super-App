const express = require('express');
const router = express.Router();

// Add your routes here
// router.use('/diary', require('./diary.routes'));
// router.use('/journals', require('./journals.routes'));

router.get('/', (req, res) => {
  res.json({
    service: 'diary-service',
    domain: 'Personal Diary',
    version: '1.0.0',
    routes: ['/diary', '/journals'],
  });
});

module.exports = router;
