/**
 * personalizationRoutes.js
 * API endpoints for AI-powered personalization
 */

const express = require('express');
const router = express.Router();
const PersonalizationService = require('../services/PersonalizationService');
const { verifyToken } = require('../middlewares/authMiddleware');
const logger = require('../config/logger');

/**
 * GET /api/personalization/homepage
 * Get personalized homepage
 */
router.get('/homepage', verifyToken, async (req, res) => {
  try {
    const homepage = await PersonalizationService.getPersonalizedHomepage(
      req.userId
    );

    res.json({
      success: true,
      data: homepage,
    });
  } catch (error) {
    logger.error('Get personalized homepage error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get personalized homepage',
      error: error.message,
    });
  }
});

/**
 * GET /api/personalization/feed
 * Get personalized feed
 */
router.get('/feed', verifyToken, async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;

    const feed = await PersonalizationService.getPersonalizedFeed(req.userId, {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });

    res.json({
      success: true,
      data: feed,
    });
  } catch (error) {
    logger.error('Get personalized feed error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get personalized feed',
      error: error.message,
    });
  }
});

/**
 * GET /api/personalization/profile
 * Get user behavior profile
 */
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const profile = await PersonalizationService.getUserBehaviorProfile(
      req.userId
    );

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    logger.error('Get user behavior profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user behavior profile',
      error: error.message,
    });
  }
});

/**
 * GET /api/personalization/bundles
 * Get personalized bundle recommendations
 */
router.get('/bundles', verifyToken, async (req, res) => {
  try {
    const bundles = await PersonalizationService.getBundleRecommendations(
      req.userId
    );

    res.json({
      success: true,
      data: bundles,
    });
  } catch (error) {
    logger.error('Get bundle recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get bundle recommendations',
      error: error.message,
    });
  }
});

module.exports = router;
