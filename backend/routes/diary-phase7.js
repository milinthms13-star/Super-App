/**
 * Diary Phase 7 Routes
 * AI Recommendations, Export, Sharing, and Personalization endpoints
 * Phase 7 - All Enhanced Features
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { createModerateRateLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

const DiaryEntry = require('../models/DiaryEntry');

// Import Phase 7 utilities
const {
  generateRecommendations,
  generateWritingPrompts
} = require('../utils/diaryRecommendations');

const {
  generateCSV,
  generateAnalyticsCSV,
  generatePDFMetadata,
  generateJSONExport
} = require('../utils/diaryExport');

const {
  createShare,
  addComment,
  getCollaborationSummary,
  updateSharePermissions,
  getSharingStats,
  revokeShare,
  checkAccess,
  getCollaborationInsights
} = require('../utils/diaryCollaboration');

const {
  createPreferences,
  updatePreferences,
  getPersonalizedPrompts,
  getWritingMode,
  getThemeConfig,
  syncPreferences,
  exportPreferences,
  importPreferences
} = require('../utils/diaryPersonalization');

// Import analytics for recommendations
const { getDashboardAnalytics } = require('../utils/diaryAnalytics');

// Rate limiter
const rateLimiter = createModerateRateLimiter();

// ============= AI RECOMMENDATIONS ENDPOINTS =============

/**
 * GET /api/diary/phase7/recommendations
 * Generate AI recommendations based on diary analytics
 */
router.get('/phase7/recommendations', authenticate, rateLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const daysBack = parseInt(req.query.daysBack) || 90;

    // Get user's entries
    const entries = await DiaryEntry.find({
      userId: userId,
      isDeleted: false,
      createdAt: { $gte: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000) }
    }).lean();

    if (entries.length === 0) {
      return res.json({
        success: true,
        data: {
          focusAreas: [],
          wellnessActions: [],
          writingEnhancements: [],
          moodInsights: [],
          consistencyTips: [],
          motivationBoosts: [],
          message: 'No entries found for recommendations'
        }
      });
    }

    // Calculate analytics
    const analytics = getDashboardAnalytics(entries);

    // Get user preferences (from database if available)
    const preferences = req.query.preferences ? JSON.parse(req.query.preferences) : {};

    // Generate recommendations
    const recommendations = generateRecommendations(analytics, entries, preferences);

    res.json({
      success: true,
      data: recommendations,
      analytics: {
        entriesAnalyzed: entries.length,
        daysBack: daysBack,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Error generating recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations'
    });
  }
});

/**
 * GET /api/diary/phase7/writing-prompts
 * Get personalized writing prompts
 */
router.get('/phase7/writing-prompts', authenticate, rateLimiter, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get recent entries for context
    const entries = await DiaryEntry.find({
      userId: userId,
      isDeleted: false
    }).sort({ createdAt: -1 }).limit(10).lean();

    // Get analytics for context
    const analytics = getDashboardAnalytics(entries);

    // Get personalization preferences (from database if available)
    const preferences = req.query.preferences ? JSON.parse(req.query.preferences) : null;

    // Generate prompts
    const prompts = generateWritingPrompts(entries, analytics);

    res.json({
      success: true,
      data: {
        prompts: prompts,
        category: req.query.category || 'general',
        count: prompts.length
      }
    });
  } catch (error) {
    logger.error('Error generating writing prompts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate writing prompts'
    });
  }
});

// ============= EXPORT ENDPOINTS =============

/**
 * GET /api/diary/phase7/export/csv
 * Export diary entries as CSV
 */
router.get('/phase7/export/csv', authenticate, rateLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const daysBack = parseInt(req.query.daysBack) || 0;
    const includeAnalytics = req.query.includeAnalytics === 'true';

    // Get entries
    const query = { userId: userId, isDeleted: false };
    if (daysBack > 0) {
      query.createdAt = { $gte: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000) };
    }

    const entries = await DiaryEntry.find(query).sort({ createdAt: -1 }).lean();

    // Generate CSV
    const csv = generateCSV(entries, { includeAnalytics });

    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="diary_export_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);

    logger.info(`Exported ${entries.length} entries to CSV for user ${userId}`);
  } catch (error) {
    logger.error('Error exporting CSV:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export CSV'
    });
  }
});

/**
 * GET /api/diary/phase7/export/analytics-csv
 * Export analytics as CSV
 */
router.get('/phase7/export/analytics-csv', authenticate, rateLimiter, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get entries
    const entries = await DiaryEntry.find({
      userId: userId,
      isDeleted: false
    }).lean();

    // Calculate analytics
    const analytics = getDashboardAnalytics(entries);

    // Generate CSV
    const csv = generateAnalyticsCSV(analytics);

    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="diary_analytics_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);

    logger.info(`Exported analytics to CSV for user ${userId}`);
  } catch (error) {
    logger.error('Error exporting analytics CSV:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export analytics CSV'
    });
  }
});

/**
 * POST /api/diary/phase7/export/pdf
 * Generate PDF export metadata
 */
router.post('/phase7/export/pdf', authenticate, rateLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const options = req.body || {};

    // Get entries
    const entries = await DiaryEntry.find({
      userId: userId,
      isDeleted: false
    }).sort({ createdAt: -1 }).lean();

    // Get analytics
    const analytics = getDashboardAnalytics(entries);

    // Generate PDF metadata
    const pdfData = generatePDFMetadata(entries, analytics, options);

    res.json({
      success: true,
      data: pdfData,
      message: 'PDF metadata generated. Use with PDF generation service.',
      generator: 'Use jsPDF or similar library on frontend'
    });

    logger.info(`Generated PDF metadata for ${entries.length} entries for user ${userId}`);
  } catch (error) {
    logger.error('Error generating PDF metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate PDF metadata'
    });
  }
});

/**
 * GET /api/diary/phase7/export/json
 * Export diary as JSON
 */
router.get('/phase7/export/json', authenticate, rateLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const includeAnalytics = req.query.includeAnalytics === 'true';

    // Get entries
    const entries = await DiaryEntry.find({
      userId: userId,
      isDeleted: false
    }).sort({ createdAt: -1 }).lean();

    // Get analytics
    const analytics = includeAnalytics ? getDashboardAnalytics(entries) : null;

    // Generate JSON export
    const jsonData = generateJSONExport(entries, analytics, { includeAnalytics });

    res.json({
      success: true,
      data: jsonData
    });

    logger.info(`Exported ${entries.length} entries to JSON for user ${userId}`);
  } catch (error) {
    logger.error('Error exporting JSON:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export JSON'
    });
  }
});

// ============= SHARING & COLLABORATION ENDPOINTS =============

/**
 * POST /api/diary/phase7/share/create
 * Create a share for an entry
 */
router.post('/phase7/share/create', authenticate, rateLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const { entryId, shareWith, options } = req.body;

    // Verify entry ownership
    const entry = await DiaryEntry.findOne({ _id: entryId, userId: userId });
    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Entry not found'
      });
    }

    // Create share
    const share = createShare(entry, userId, shareWith, options);

    res.json({
      success: true,
      data: share,
      message: 'Entry shared successfully'
    });

    logger.info(`Created share for entry ${entryId} by user ${userId}`);
  } catch (error) {
    logger.error('Error creating share:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create share'
    });
  }
});

/**
 * POST /api/diary/phase7/comments
 * Add comment to entry
 */
router.post('/phase7/comments', authenticate, rateLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const { entryId, text, options } = req.body;

    if (!entryId || !text) {
      return res.status(400).json({
        success: false,
        error: 'EntryId and text are required'
      });
    }

    // Add comment
    const comment = addComment(entryId, userId, text, options);

    res.json({
      success: true,
      data: comment,
      message: 'Comment added successfully'
    });

    logger.info(`Added comment to entry ${entryId} by user ${userId}`);
  } catch (error) {
    logger.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add comment'
    });
  }
});

/**
 * GET /api/diary/phase7/sharing-stats
 * Get sharing statistics
 */
router.get('/phase7/sharing-stats', authenticate, rateLimiter, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's entries
    const entries = await DiaryEntry.find({
      userId: userId,
      isDeleted: false
    }).lean();

    // Get shares (from database if available, or empty array)
    const shares = req.query.shares ? JSON.parse(req.query.shares) : [];

    // Generate stats
    const stats = getSharingStats(entries, shares);

    res.json({
      success: true,
      data: stats
    });

    logger.info(`Retrieved sharing stats for user ${userId}`);
  } catch (error) {
    logger.error('Error retrieving sharing stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sharing stats'
    });
  }
});

/**
 * GET /api/diary/phase7/collaboration-insights
 * Get collaboration insights
 */
router.get('/phase7/collaboration-insights', authenticate, rateLimiter, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's entries
    const entries = await DiaryEntry.find({
      userId: userId,
      isDeleted: false
    }).lean();

    // Get comments (from database if available, or empty array)
    const comments = req.query.comments ? JSON.parse(req.query.comments) : [];

    // Generate insights
    const insights = getCollaborationInsights(entries, comments);

    res.json({
      success: true,
      data: insights
    });

    logger.info(`Retrieved collaboration insights for user ${userId}`);
  } catch (error) {
    logger.error('Error retrieving collaboration insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve collaboration insights'
    });
  }
});

// ============= PERSONALIZATION ENDPOINTS =============

/**
 * GET /api/diary/phase7/preferences
 * Get user's personalization preferences
 */
router.get('/phase7/preferences', authenticate, rateLimiter, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get preferences from database (if available) or create default
    let preferences = null; // TODO: fetch from database
    
    if (!preferences) {
      preferences = createPreferences(userId, req.query.options ? JSON.parse(req.query.options) : {});
    }

    res.json({
      success: true,
      data: preferences
    });

    logger.info(`Retrieved preferences for user ${userId}`);
  } catch (error) {
    logger.error('Error retrieving preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve preferences'
    });
  }
});

/**
 * PUT /api/diary/phase7/preferences
 * Update user's personalization preferences
 */
router.put('/phase7/preferences', authenticate, rateLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Get current preferences or create default
    let preferences = null; // TODO: fetch from database
    if (!preferences) {
      preferences = createPreferences(userId);
    }

    // Update preferences
    const updated = updatePreferences(preferences, updates);

    res.json({
      success: true,
      data: updated,
      message: 'Preferences updated successfully'
    });

    logger.info(`Updated preferences for user ${userId}`);
  } catch (error) {
    logger.error('Error updating preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
});

/**
 * GET /api/diary/phase7/writing-mode
 * Get writing mode configuration
 */
router.get('/phase7/writing-mode', authenticate, rateLimiter, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user preferences
    let preferences = null; // TODO: fetch from database
    if (!preferences) {
      preferences = createPreferences(userId);
    }

    // Get writing mode
    const mode = getWritingMode(preferences);

    res.json({
      success: true,
      data: mode
    });

    logger.info(`Retrieved writing mode for user ${userId}`);
  } catch (error) {
    logger.error('Error retrieving writing mode:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve writing mode'
    });
  }
});

/**
 * GET /api/diary/phase7/theme
 * Get theme configuration
 */
router.get('/phase7/theme', authenticate, rateLimiter, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user preferences
    let preferences = null; // TODO: fetch from database
    if (!preferences) {
      preferences = createPreferences(userId);
    }

    // Get theme
    const theme = getThemeConfig(preferences);

    res.json({
      success: true,
      data: theme
    });

    logger.info(`Retrieved theme for user ${userId}`);
  } catch (error) {
    logger.error('Error retrieving theme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve theme'
    });
  }
});

module.exports = router;
