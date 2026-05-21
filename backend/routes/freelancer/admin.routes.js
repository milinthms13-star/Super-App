const express = require('express');
const shared = require('./shared');

const router = express.Router();

const {
  models: {
    FreelancerProvider,
    FreelancerJob,
    FreelancerBooking,
    FreelancerDispute,
    FreelancerPlanPurchase,
    FreelancerCommissionConfig,
    FreelancerReport,
    FreelancerPaymentEvent,
    FreelancerIdempotencyKey,
  },
  auth: { authenticate, verifyAdmin },
  schemas: { commissionSchema },
  helpers: { logger, sanitizeBooking },
} = shared;

router.get('/admin/commission-settings', authenticate, verifyAdmin, async (_req, res) => {
  try {
    const config = await FreelancerCommissionConfig.findOne({ configKey: 'default' }).lean();
    return res.json({ success: true, data: { config } });
  } catch (error) {
    logger.error('freelancer commission config fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch commission settings.' });
  }
});

router.put('/admin/commission-settings', authenticate, verifyAdmin, async (req, res) => {
  try {
    const { error, value } = commissionSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const config = await FreelancerCommissionConfig.findOneAndUpdate(
      { configKey: 'default' },
      {
        ...value,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.json({ success: true, data: { config } });
  } catch (error) {
    logger.error('freelancer commission config update error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update commission settings.' });
  }
});

router.get('/admin/dashboard', authenticate, verifyAdmin, async (_req, res) => {
  try {
    const [providers, jobs, bookings, disputes, reports, planPurchases] = await Promise.all([
      FreelancerProvider.countDocuments({ isActive: true }),
      FreelancerJob.countDocuments(),
      FreelancerBooking.countDocuments(),
      FreelancerDispute.countDocuments({ status: { $in: ['open', 'under-review'] } }),
      FreelancerReport.countDocuments({ status: 'open' }),
      FreelancerPlanPurchase.countDocuments({ status: 'active' }),
    ]);

    const recentDisputes = await FreelancerDispute.find().sort({ createdAt: -1 }).limit(10).lean();
    const recentBookings = await FreelancerBooking.find().sort({ createdAt: -1 }).limit(10).lean();

    return res.json({
      success: true,
      data: {
        metrics: {
          providers,
          jobs,
          bookings,
          openDisputes: disputes,
          openReports: reports,
          activePlanPurchases: planPurchases,
        },
        recentDisputes,
        recentBookings: recentBookings.map((booking) => sanitizeBooking(booking, { includeSensitive: true })),
      },
    });
  } catch (error) {
    logger.error('freelancer admin dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch admin dashboard.' });
  }
});

router.get('/admin/payment-events', authenticate, verifyAdmin, async (req, res) => {
  try {
    const bookingCode = String(req.query.bookingCode || '').trim();
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 25)));
    const query = bookingCode ? { bookingCode } : {};
    const events = await FreelancerPaymentEvent.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    return res.json({ success: true, data: { events } });
  } catch (error) {
    logger.error('freelancer payment events fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch payment events.' });
  }
});

router.get('/admin/operational-metrics', authenticate, verifyAdmin, async (_req, res) => {
  try {
    const [idempotentWrites, paymentEvents, disputesOpen, disputesResolvedLast24h] = await Promise.all([
      FreelancerIdempotencyKey.countDocuments(),
      FreelancerPaymentEvent.countDocuments(),
      FreelancerDispute.countDocuments({ status: { $in: ['open', 'under-review'] } }),
      FreelancerDispute.countDocuments({
        status: 'resolved',
        updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        idempotentWrites,
        paymentEvents,
        disputesOpen,
        disputesResolvedLast24h,
      },
    });
  } catch (error) {
    logger.error('freelancer operational metrics error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch operational metrics.' });
  }
});

module.exports = router;
