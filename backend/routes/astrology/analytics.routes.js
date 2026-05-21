const express = require('express');

const authMiddleware = require('../../middleware/auth');
const {
  listAllConsultationBookings,
  buildAnalyticsMetrics,
  getAstrologyOperationalAlerts,
} = require('../../services/astrologyBackendService');

const router = express.Router();
const { authenticate, hasAdminPrivileges } = authMiddleware;

const adminGuard = (req, res, next) => {
  if (req.user && hasAdminPrivileges(req.user)) return next();
  return res.status(403).json({ success: false, message: 'Admin access required.' });
};

// GET /api/astrology/analytics/dashboard
router.get('/dashboard', authenticate, adminGuard, async (req, res) => {
  try {
    const bookings = await listAllConsultationBookings();
    const metrics = buildAnalyticsMetrics(bookings);
    return res.json({ success: true, data: metrics });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/astrology/analytics/alerts
router.get('/alerts', authenticate, adminGuard, async (req, res) => {
  try {
    const alerts = await getAstrologyOperationalAlerts({ lookbackHours: 24 });
    return res.json({ success: true, data: alerts });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
