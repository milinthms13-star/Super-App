const express = require('express');

const profileRoutes = require('./profile.routes');
const consultationRoutes = require('./consultations.routes');
const paymentRoutes = require('./payments.routes');
const analyticsRoutes = require('./analytics.routes');
const legacyRoutes = require('./legacy.routes');

const router = express.Router();

// Preserve current production behavior while we progressively migrate handlers.
router.use('/', legacyRoutes);

// Domain-focused sub-routers
router.use('/profile', profileRoutes);
router.use('/consultations', consultationRoutes);
router.use('/payments', paymentRoutes);
router.use('/analytics', analyticsRoutes);
router.__testables = legacyRoutes.__testables || {};

module.exports = router;
