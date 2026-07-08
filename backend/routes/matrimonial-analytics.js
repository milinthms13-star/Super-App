const express = require('express');
const router = express.Router();
const { analyticsService } = require('../services/analyticsService');
const { errorTrackingService } = require('../services/errorTrackingService');
const auth = require('../middleware/auth');

// Admin middleware
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get engagement metrics
router.get('/engagement', auth, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const metrics = await analyticsService.getEngagementMetrics(start, end);

    res.json(metrics);
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'engagement-metrics' });
    res.status(500).json({ error: 'Failed to fetch engagement metrics' });
  }
});

// Get conversion funnel
router.get('/funnel', auth, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const funnel = await analyticsService.getConversionFunnel(start, end);

    res.json(funnel);
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'conversion-funnel' });
    res.status(500).json({ error: 'Failed to fetch conversion funnel' });
  }
});

// Get revenue metrics
router.get('/revenue', auth, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const metrics = await analyticsService.getRevenueMetrics(start, end);

    res.json(metrics);
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'revenue-metrics' });
    res.status(500).json({ error: 'Failed to fetch revenue metrics' });
  }
});

// Get time-series data
router.get('/timeseries', auth, isAdmin, async (req, res) => {
  try {
    const { metric, startDate, endDate, interval = 'day' } = req.query;

    if (!metric) {
      return res.status(400).json({ error: 'Metric type is required' });
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const data = await analyticsService.getTimeSeriesData(metric, start, end, interval);

    res.json({ metric, interval, data });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'timeseries-data' });
    res.status(500).json({ error: 'Failed to fetch time-series data' });
  }
});

// Get demographics
router.get('/demographics', auth, isAdmin, async (req, res) => {
  try {
    const demographics = await analyticsService.getDemographics();

    res.json(demographics);
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'demographics' });
    res.status(500).json({ error: 'Failed to fetch demographics' });
  }
});

// Get retention metrics
router.get('/retention', auth, isAdmin, async (req, res) => {
  try {
    const { cohortDate } = req.query;

    const startDate = cohortDate ? new Date(cohortDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const retention = await analyticsService.getRetentionMetrics(startDate);

    res.json(retention);
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'retention-metrics' });
    res.status(500).json({ error: 'Failed to fetch retention metrics' });
  }
});

// Get top performers
router.get('/top/:type', auth, isAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 10 } = req.query;

    if (!['most_viewed', 'most_interests', 'most_active'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Use: most_viewed, most_interests, or most_active' });
    }

    const results = await analyticsService.getTopPerformers(type, parseInt(limit));

    res.json({ type, results });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'top-performers' });
    res.status(500).json({ error: 'Failed to fetch top performers' });
  }
});

// Get comprehensive dashboard data
router.get('/dashboard', auth, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const [
      engagement,
      funnel,
      revenue,
      demographics,
      topViewed,
      topActive
    ] = await Promise.all([
      analyticsService.getEngagementMetrics(start, end),
      analyticsService.getConversionFunnel(start, end),
      analyticsService.getRevenueMetrics(start, end),
      analyticsService.getDemographics(),
      analyticsService.getTopPerformers('most_viewed', 5),
      analyticsService.getTopPerformers('most_active', 5)
    ]);

    res.json({
      engagement,
      funnel,
      revenue,
      demographics,
      topPerformers: {
        mostViewed: topViewed,
        mostActive: topActive
      },
      dateRange: { startDate: start, endDate: end }
    });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'dashboard-data' });
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Clear analytics cache
router.post('/clear-cache', auth, isAdmin, async (req, res) => {
  try {
    const result = await analyticsService.clearCache();

    await errorTrackingService.logAudit('analytics_cache_cleared', {
      adminId: req.user.id,
      timestamp: new Date()
    });

    res.json(result);
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'clear-analytics-cache' });
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Export analytics data
router.get('/export', auth, isAdmin, async (req, res) => {
  try {
    const { type, startDate, endDate, format = 'json' } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    let data;

    switch (type) {
      case 'engagement':
        data = await analyticsService.getEngagementMetrics(start, end);
        break;
      case 'funnel':
        data = await analyticsService.getConversionFunnel(start, end);
        break;
      case 'revenue':
        data = await analyticsService.getRevenueMetrics(start, end);
        break;
      case 'demographics':
        data = await analyticsService.getDemographics();
        break;
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    if (format === 'csv') {
      // Convert to CSV
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${type}-${Date.now()}.csv"`);
      return res.send(csv);
    }

    res.json(data);
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'export-analytics' });
    res.status(500).json({ error: 'Failed to export analytics data' });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data) {
  // Simple CSV conversion - can be enhanced
  const json = JSON.stringify(data, null, 2);
  return json;
}

module.exports = router;
