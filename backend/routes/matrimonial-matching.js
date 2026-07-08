/**
 * Advanced Matching Routes
 * AI-powered matching and recommendations
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const matchingService = require('../services/matchingService');
const MatrimonialProfile = require('../models/MatrimonialProfile');
const logger = require('../utils/logger');

/**
 * GET /api/matrimonial/matching/recommendations
 * Get AI-powered profile recommendations
 */
router.get('/recommendations', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const limit = parseInt(req.query.limit) || 20;

    const recommendations = await matchingService.getRecommendedProfiles(userId, limit);

    res.json({
      success: true,
      data: recommendations,
      count: recommendations.length
    });
  } catch (error) {
    logger.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations'
    });
  }
});

/**
 * POST /api/matrimonial/matching/calculate-score
 * Calculate match score between two profiles
 */
router.post('/calculate-score', authenticate, async (req, res) => {
  try {
    const { profileId1, profileId2 } = req.body;

    if (!profileId1 || !profileId2) {
      return res.status(400).json({
        success: false,
        error: 'Both profile IDs required'
      });
    }

    const [profile1, profile2] = await Promise.all([
      MatrimonialProfile.findById(profileId1).select('-messages -interests'),
      MatrimonialProfile.findById(profileId2).select('-messages -interests')
    ]);

    if (!profile1 || !profile2) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    const scoreData = await matchingService.calculateAdvancedMatchScore(profile1, profile2);
    const explanation = matchingService.getMatchExplanation(profile1, profile2, scoreData.totalScore);

    res.json({
      success: true,
      data: {
        ...scoreData,
        explanation
      }
    });
  } catch (error) {
    logger.error('Error calculating match score:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate match score'
    });
  }
});

/**
 * POST /api/matrimonial/matching/track-behavior
 * Track user behavior for collaborative filtering
 */
router.post('/track-behavior', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { action, targetProfileId } = req.body;

    if (!action || !targetProfileId) {
      return res.status(400).json({
        success: false,
        error: 'Action and target profile ID required'
      });
    }

    await matchingService.updateUserBehavior(userId, action, targetProfileId);

    res.json({
      success: true,
      message: 'Behavior tracked'
    });
  } catch (error) {
    logger.error('Error tracking behavior:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track behavior'
    });
  }
});

/**
 * GET /api/matrimonial/matching/similar-profiles/:profileId
 * Find profiles similar to a given profile
 */
router.get('/similar-profiles/:profileId', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const profile = await MatrimonialProfile.findById(profileId)
      .select('-messages -interests');

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    const similarProfiles = await matchingService.findSimilarUsers(profile, limit);

    res.json({
      success: true,
      data: similarProfiles,
      count: similarProfiles.length
    });
  } catch (error) {
    logger.error('Error finding similar profiles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find similar profiles'
    });
  }
});

module.exports = router;
