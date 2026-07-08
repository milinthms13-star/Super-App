const express = require('express');
const { query, validationResult } = require('express-validator');
const authMiddleware = require('../../middleware/auth');
const {
  sanitizeText,
  listAllConsultationBookings,
  getAstrologyOperationalAlerts,
  formatPeriodStart,
  buildAnalyticsMetrics,
  buildAnalyticsCsv,
  buildAnalyticsPdfStream,
} = require('../../services/astrologyBackendService');
const logger = require('../../utils/logger');

const router = express.Router();
const { authenticate, hasAdminPrivileges } = authMiddleware;

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  return res.status(400).json({
    success: false,
    message: 'Invalid request payload.',
    errors: errors.array().map((entry) => ({
      field: entry.path,
      message: entry.msg,
    })),
  });
};

const analyticsDashboardValidators = [
  query('period').optional().isString().isLength({ min: 3, max: 16 }),
  validateRequest,
];

const analyticsAlertsValidators = [
  query('lookbackHours').optional().isInt({ min: 1, max: 240 }),
  validateRequest,
];

const analyticsReportValidators = [
  query('period').optional().isString().isLength({ min: 3, max: 16 }),
  query('format').optional().isString().isIn(['pdf', 'csv']),
  validateRequest,
];

/**
 * GET /api/astrology/analytics/dashboard
 * Get analytics dashboard metrics (admin only)
 */
router.get('/dashboard', authenticate, analyticsDashboardValidators, async (req, res) => {
  try {
    if (!hasAdminPrivileges(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required.',
      });
    }

    const startDate = formatPeriodStart(req.query?.period || 'month');
    const allBookings = await listAllConsultationBookings();
    const filteredBookings = allBookings.filter(
      (booking) => new Date(booking.createdAt || booking.preferredDate || Date.now()) >= startDate
    );
    const metrics = buildAnalyticsMetrics(filteredBookings);

    return res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to load analytics dashboard.',
    });
  }
});

/**
 * GET /api/astrology/analytics/alerts
 * Get operational alerts (admin only)
 */
router.get('/alerts', authenticate, analyticsAlertsValidators, async (req, res) => {
  try {
    if (!hasAdminPrivileges(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required.',
      });
    }

    const lookbackHours = Math.max(1, Math.min(240, Number(req.query?.lookbackHours || 24)));
    const alerts = await getAstrologyOperationalAlerts({ lookbackHours });
    return res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to load alerts dashboard.',
    });
  }
});

/**
 * GET /api/astrology/analytics/report
 * Download analytics report (admin only)
 */
router.get('/report', authenticate, analyticsReportValidators, async (req, res) => {
  try {
    if (!hasAdminPrivileges(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required.',
      });
    }

    const period = sanitizeText(req.query?.period || 'month', 16);
    const format = sanitizeText(req.query?.format || 'pdf', 8).toLowerCase();
    const startDate = formatPeriodStart(period);
    const allBookings = await listAllConsultationBookings();
    const filteredBookings = allBookings.filter(
      (booking) => new Date(booking.createdAt || booking.preferredDate || Date.now()) >= startDate
    );
    const metrics = buildAnalyticsMetrics(filteredBookings);

    if (format === 'csv') {
      const csvBuffer = Buffer.from(buildAnalyticsCsv(metrics), 'utf8');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="astrology-report-${period}.csv"`);
      return res.send(csvBuffer);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="astrology-report-${period}.pdf"`);
    const pdfStream = buildAnalyticsPdfStream(metrics, period);
    pdfStream.on('error', (streamError) => {
      logger.error(`Analytics PDF stream error: ${streamError.message}`);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Unable to generate analytics report.',
        });
      }
    });
    return pdfStream.pipe(res);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to generate analytics report.',
    });
  }
});

/**
 * GET /api/astrology/analytics/bookings-by-consultant
 * Get booking statistics grouped by consultant (admin only)
 */
router.get('/bookings-by-consultant', authenticate, async (req, res) => {
  try {
    if (!hasAdminPrivileges(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required.',
      });
    }

    const allBookings = await listAllConsultationBookings();
    
    const consultantStats = {};
    allBookings.forEach((booking) => {
      const consultantId = booking.consultantId || 'unknown';
      if (!consultantStats[consultantId]) {
        consultantStats[consultantId] = {
          consultantId,
          consultantName: booking.consultantName || 'Unknown',
          totalBookings: 0,
          completedBookings: 0,
          cancelledBookings: 0,
          totalRevenue: 0,
          completedRevenue: 0,
        };
      }

      consultantStats[consultantId].totalBookings++;
      
      if (booking.status === 'completed') {
        consultantStats[consultantId].completedBookings++;
      }
      
      if (booking.status === 'cancelled') {
        consultantStats[consultantId].cancelledBookings++;
      }

      consultantStats[consultantId].totalRevenue += Number(booking.amountInr || 0);

      if (booking.paymentStatus === 'completed') {
        consultantStats[consultantId].completedRevenue += Number(booking.amountInr || 0);
      }
    });

    return res.json({
      success: true,
      data: Object.values(consultantStats),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to load consultant statistics.',
    });
  }
});

/**
 * GET /api/astrology/analytics/revenue-trends
 * Get revenue trends over time (admin only)
 */
router.get('/revenue-trends', authenticate, async (req, res) => {
  try {
    if (!hasAdminPrivileges(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required.',
      });
    }

    const period = sanitizeText(req.query?.period || 'month', 16);
    const startDate = formatPeriodStart(period);
    const allBookings = await listAllConsultationBookings();
    
    const trends = {};
    allBookings
      .filter((booking) => new Date(booking.createdAt || Date.now()) >= startDate)
      .forEach((booking) => {
        const date = new Date(booking.createdAt || Date.now());
        const key = date.toISOString().slice(0, 10); // YYYY-MM-DD
        
        if (!trends[key]) {
          trends[key] = {
            date: key,
            bookings: 0,
            revenue: 0,
            completedRevenue: 0,
          };
        }

        trends[key].bookings++;
        trends[key].revenue += Number(booking.amountInr || 0);
        
        if (booking.paymentStatus === 'completed') {
          trends[key].completedRevenue += Number(booking.amountInr || 0);
        }
      });

    return res.json({
      success: true,
      data: Object.values(trends).sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to load revenue trends.',
    });
  }
});

/**
 * GET /api/astrology/analytics/user-stats
 * Get user engagement statistics (admin only)
 */
router.get('/user-stats', authenticate, async (req, res) => {
  try {
    if (!hasAdminPrivileges(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required.',
      });
    }

    const AstrologyUserProfile = require('../../models/AstrologyUserProfile');
    
    const totalProfiles = await AstrologyUserProfile.countDocuments();
    const profilesWithBirthDetails = await AstrologyUserProfile.countDocuments({
      birthDate: { $exists: true, $ne: null },
      birthTime: { $exists: true, $ne: '' },
    });
    const profilesWithFamilyMembers = await AstrologyUserProfile.countDocuments({
      'familyProfiles.0': { $exists: true },
    });
    const profilesWithSavedReadings = await AstrologyUserProfile.countDocuments({
      'savedReadings.0': { $exists: true },
    });

    const allBookings = await listAllConsultationBookings();
    const uniqueUsers = new Set(allBookings.map(b => b.userId));

    return res.json({
      success: true,
      data: {
        totalProfiles,
        profilesWithBirthDetails,
        profilesWithFamilyMembers,
        profilesWithSavedReadings,
        usersWithBookings: uniqueUsers.size,
        completionRate: totalProfiles > 0 
          ? Math.round((profilesWithBirthDetails / totalProfiles) * 100) 
          : 0,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to load user statistics.',
    });
  }
});

module.exports = router;
