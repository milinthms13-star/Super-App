const express = require('express');
const crypto = require('crypto');
const shared = require('./shared');

const discoveryRoutes = require('./discovery.routes');
const providerRoutes = require('./providers.routes');
const jobRoutes = require('./jobs.routes');
const bookingRoutes = require('./bookings.routes');
const disputeRoutes = require('./disputes.routes');
const planRoutes = require('./plans.routes');
const intelligenceRoutes = require('./intelligence.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

const {
  limits: { generalLimiter },
  helpers: { logger, bootstrapFreelancerModule },
} = shared;

router.use((req, res, next) => {
  const incomingRequestId = String(req.get('x-request-id') || '').trim();
  const requestId = incomingRequestId || `frl-${crypto.randomUUID()}`;
  req.freelancerRequestId = requestId;
  res.setHeader('x-request-id', requestId);

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const elapsedNs = process.hrtime.bigint() - start;
    const elapsedMs = Number(elapsedNs) / 1_000_000;
    logger.info(
      `[freelancer][${requestId}] ${req.method} ${req.originalUrl} ${res.statusCode} ${elapsedMs.toFixed(1)}ms`
    );
  });

  next();
});

router.use(generalLimiter);
router.use(discoveryRoutes);
router.use(providerRoutes);
router.use(jobRoutes);
router.use(bookingRoutes);
router.use(disputeRoutes);
router.use(planRoutes);
router.use(intelligenceRoutes);
router.use(adminRoutes);

router.bootstrap = bootstrapFreelancerModule;
void bootstrapFreelancerModule();

module.exports = router;
