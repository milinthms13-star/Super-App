/**
 * Admin Analytics Routes for Matrimonial Module
 * GET /api/matrimonial/admin/analytics/*
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const analyticsService = require('../utils/adminAnalyticsService');

/**
 * GET /api/matrimonial/admin/analytics/dashboard
 * Get comprehensive dashboard analytics
 */
router.get('/dashboard', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const analytics = await analyticsService.getDashboardAnalytics();
    res.json({
      success: true,
      data: analytics,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/matrimonial/admin/analytics/users/growth
 * Get user growth metrics
 */
router.get('/users/growth', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const analytics = await analyticsService.getUserGrowthAnalytics(days);
    res.json({
      success: true,
      data: analytics,
      period: `${days} days`
    });
  } catch (error) {
    console.error('Error fetching user growth analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/matrimonial/admin/analytics/matches
 * Get match analytics
 */
router.get('/matches', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const analytics = await analyticsService.getMatchAnalytics();
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching match analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/matrimonial/admin/analytics/gender
 * Get gender ratio analytics
 */
router.get('/gender', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const analytics = await analyticsService.getGenderRatioAnalytics();
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching gender analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/matrimonial/admin/analytics/subscription
 * Get subscription revenue analytics
 */
router.get('/subscription', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const analytics = await analyticsService.getSubscriptionAnalytics();
    res.json({
      success: true,
      data: analytics,
      currency: 'INR'
    });
  } catch (error) {
    console.error('Error fetching subscription analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/matrimonial/admin/analytics/verification
 * Get verification and KYC analytics
 */
router.get('/verification', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const analytics = await analyticsService.getVerificationAnalytics();
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching verification analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/matrimonial/admin/analytics/export
 * Export analytics to CSV/PDF
 */
router.get('/export', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const format = req.query.format || 'json'; // json, csv, pdf
    const analytics = await analyticsService.getDashboardAnalytics();

    if (format === 'json') {
      res.setHeader('Content-Disposition', 'attachment; filename=analytics.json');
      res.setHeader('Content-Type', 'application/json');
      res.json(analytics);
    } else if (format === 'csv') {
      // Generate CSV
      res.setHeader('Content-Disposition', 'attachment; filename=analytics.csv');
      res.setHeader('Content-Type', 'text/csv');
      res.send('CSV export not yet implemented');
    } else {
      res.status(400).json({ error: 'Unsupported format. Use json, csv, or pdf' });
    }
  } catch (error) {
    console.error('Error exporting analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
