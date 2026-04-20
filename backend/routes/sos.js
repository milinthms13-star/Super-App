const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

// POST /api/sos/send-alert
router.post('/send-alert', authenticate, async (req, res) => {
  try {
    const { userId, userName, userPhone, timestamp, location } = req.body;

    if (!userId || !userName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required SOS alert information',
      });
    }

    logger.info('SOS alert received', {
      userId,
      userName,
      userPhone,
      timestamp,
      location,
    });

    // TODO: Integrate with real emergency notification system (SMS, email, webhook, etc.)
    return res.status(200).json({
      success: true,
      message: 'SOS alert sent successfully',
      data: { userId, userName, userPhone, timestamp, location },
    });
  } catch (error) {
    logger.error('SOS alert failed', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send SOS alert',
    });
  }
});

module.exports = router;
