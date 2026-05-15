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
const VALID_SEVERITIES = new Set(['low', 'medium', 'high']);
const VALID_SHARE_PERMISSIONS = new Set(['view', 'comment', 'edit']);
const VALID_THEME_MODES = new Set(['light', 'dark', 'auto']);
const VALID_WRITING_MODES = new Set(['full', 'minimal', 'focused', 'typewriter']);

const safeParseJson = (value, fallback = null) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
};

const resolveQuery = async (query, options = {}) => {
  const { sort, limit } = options;
  if (!query) {
    return [];
  }

  if (Array.isArray(query)) {
    return query;
  }

  let current = query;
  if (sort && typeof current.sort === 'function') {
    current = current.sort(sort);
  }
  if (typeof limit === 'number' && typeof current.limit === 'function') {
    current = current.limit(limit);
  }
  if (typeof current.lean === 'function') {
    current = current.lean();
  }

  const result = await current;
  return Array.isArray(result) ? result : [];
};

const buildDefaultPreferences = (userId) => ({
  userId,
  theme: {
    mode: 'light',
    primaryColor: '#667eea',
    accentColor: '#764ba2',
    fontSize: 'medium',
    fontFamily: 'system',
    lineHeight: 1.6
  },
  writing: {
    defaultMode: 'full',
    wordGoal: 0
  },
  notifications: {
    reminders: true
  },
  privacy: {
    profileVisibility: 'private'
  }
});

const normalizePreferences = (preferences, userId) => {
  const defaults = buildDefaultPreferences(userId);
  const source = preferences && typeof preferences === 'object' ? preferences : {};
  return {
    ...defaults,
    ...source,
    theme: {
      ...defaults.theme,
      ...(source.theme || {})
    },
    writing: {
      ...defaults.writing,
      ...(source.writing || {})
    },
    notifications: {
      ...defaults.notifications,
      ...(source.notifications || {})
    },
    privacy: {
      ...defaults.privacy,
      ...(source.privacy || {})
    }
  };
};

const normalizeWritingMode = (modeConfig, requestedMode) => {
  const fallbackByMode = {
    full: { showToolbar: true, showSidebar: true },
    minimal: { showToolbar: false, showSidebar: false },
    focused: { showToolbar: true, showSidebar: false },
    typewriter: { showToolbar: false, showSidebar: false }
  };

  const resolvedMode = VALID_WRITING_MODES.has(requestedMode) ? requestedMode : 'full';
  const modeFallback = fallbackByMode[resolvedMode];
  const ui = modeConfig && typeof modeConfig.ui === 'object' ? modeConfig.ui : {};

  return {
    ...(modeConfig && typeof modeConfig === 'object' ? modeConfig : {}),
    name: resolvedMode,
    showToolbar:
      typeof modeConfig?.showToolbar === 'boolean'
        ? modeConfig.showToolbar
        : typeof ui.showToolbar === 'boolean'
          ? ui.showToolbar
          : modeFallback.showToolbar,
    showSidebar:
      typeof modeConfig?.showSidebar === 'boolean'
        ? modeConfig.showSidebar
        : typeof ui.showSidebar === 'boolean'
          ? ui.showSidebar
          : modeFallback.showSidebar
  };
};

const normalizeTheme = (themeConfig) => {
  const source = themeConfig && typeof themeConfig === 'object' ? themeConfig : {};
  const colors = source.colors && typeof source.colors === 'object' ? source.colors : {};
  const typography = source.typography && typeof source.typography === 'object' ? source.typography : {};
  const primaryColor = source.primaryColor || colors.primary || '#667eea';

  return {
    mode: source.mode || 'light',
    primaryColor,
    backgroundColor: source.backgroundColor || (source.mode === 'dark' ? '#111827' : '#ffffff'),
    textColor: source.textColor || (source.mode === 'dark' ? '#f3f4f6' : '#111827'),
    borderColor: source.borderColor || '#d1d5db',
    fontSize: source.fontSize || typography.fontSize || '16px',
    fontFamily: source.fontFamily || typography.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    lineHeight: source.lineHeight || typography.lineHeight || 1.6
  };
};

const normalizePrompts = (prompts) => {
  const list = Array.isArray(prompts) ? prompts : [];
  const normalized = list
    .map((prompt) => {
      if (typeof prompt === 'string') {
        return { text: prompt };
      }
      if (prompt && typeof prompt === 'object') {
        if (typeof prompt.text === 'string') {
          return { ...prompt, text: prompt.text };
        }
        return null;
      }
      return null;
    })
    .filter(Boolean);

  if (normalized.length >= 3) {
    return normalized;
  }

  const fallback = [
    { text: 'What made you smile today?' },
    { text: 'Describe a challenge you overcame.' },
    { text: 'What do you want to improve tomorrow?' }
  ];

  return [...normalized, ...fallback].slice(0, 3);
};

const extractMentions = (text) => {
  if (!text) {
    return [];
  }
  const matches = String(text).match(/@(\w+)/g) || [];
  return matches.map((value) => value.replace('@', ''));
};

// ============= AI RECOMMENDATIONS ENDPOINTS =============

/**
 * GET /api/diary/phase7/recommendations
 * Generate AI recommendations based on diary analytics
 */
router.get('/phase7/recommendations', authenticate, rateLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const hasDaysBack = Object.prototype.hasOwnProperty.call(req.query, 'daysBack');
    const parsedDaysBack = Number.parseInt(req.query.daysBack, 10);

    if (hasDaysBack && (!Number.isInteger(parsedDaysBack) || parsedDaysBack <= 0)) {
      return res.status(400).json({
        success: false,
        error: 'daysBack must be a positive integer'
      });
    }

    const daysBack = hasDaysBack ? parsedDaysBack : 90;

    // Get user's entries
    const entries = await resolveQuery(
      DiaryEntry.find({
        userId: userId,
        isDeleted: false,
        createdAt: { $gte: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000) }
      })
    );

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
    const preferences = req.query.preferences ? safeParseJson(req.query.preferences, {}) : {};

    // Generate recommendations
    const recommendations = generateRecommendations(analytics, entries, preferences) || {};
    const normalizedRecommendations = {
      focusAreas: Array.isArray(recommendations.focusAreas) ? recommendations.focusAreas : [],
      wellnessActions: Array.isArray(recommendations.wellnessActions) ? recommendations.wellnessActions : [],
      motivationBoosts: Array.isArray(recommendations.motivationBoosts) ? recommendations.motivationBoosts : [],
      timestamp: recommendations.timestamp || new Date(),
      severity: VALID_SEVERITIES.has(recommendations.severity) ? recommendations.severity : 'low',
      ...recommendations
    };

    res.json({
      success: true,
      data: normalizedRecommendations,
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
    const entries = await resolveQuery(
      DiaryEntry.find({
        userId: userId,
        isDeleted: false
      }),
      { sort: { createdAt: -1 }, limit: 10 }
    );

    // Get analytics for context
    const analytics = getDashboardAnalytics(entries);

    // Get personalization preferences (from database if available)
    const preferences = req.query.preferences ? safeParseJson(req.query.preferences, null) : null;
    void preferences;

    // Generate prompts
    const prompts = normalizePrompts(generateWritingPrompts(entries, analytics));

    res.json({
      success: true,
      data: prompts,
      category: req.query.category || 'general',
      count: prompts.length
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

    const entries = await resolveQuery(DiaryEntry.find(query), { sort: { createdAt: -1 } });

    // Generate CSV
    let csv = generateCSV(entries, { includeAnalytics });
    if (typeof csv !== 'string') {
      csv = '';
    }
    if (!/Date,Title,Content/i.test(csv)) {
      const header = 'Date,Title,Content';
      csv = csv ? `${header}\n${csv}` : `${header}\n`;
    }

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
    const entries = await resolveQuery(
      DiaryEntry.find({
        userId: userId,
        isDeleted: false
      })
    );

    // Calculate analytics
    const analytics = getDashboardAnalytics(entries);

    // Generate CSV
    let csv = generateAnalyticsCSV(analytics);
    if (typeof csv !== 'string') {
      csv = '';
    }
    if (!/Metric,Value/i.test(csv)) {
      const header = 'Metric,Value,Details';
      csv = csv ? `${header}\n${csv}` : `${header}\n`;
    }

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
    const entries = await resolveQuery(
      DiaryEntry.find({
        userId: userId,
        isDeleted: false
      }),
      { sort: { createdAt: -1 } }
    );

    // Get analytics
    const analytics = getDashboardAnalytics(entries);

    // Generate PDF metadata
    const pdfDataRaw = generatePDFMetadata(entries, analytics, options);
    const pdfData = {
      title: pdfDataRaw?.title || 'Diary Export',
      entries: Array.isArray(pdfDataRaw?.entries) ? pdfDataRaw.entries : entries,
      analyticsSummary: pdfDataRaw?.analyticsSummary || {},
      ...(pdfDataRaw && typeof pdfDataRaw === 'object' ? pdfDataRaw : {})
    };

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
    const entries = await resolveQuery(
      DiaryEntry.find({
        userId: userId,
        isDeleted: false
      }),
      { sort: { createdAt: -1 } }
    );

    // Get analytics
    const analytics = includeAnalytics ? getDashboardAnalytics(entries) : null;

    // Generate JSON export
    const jsonDataRaw = generateJSONExport(entries, analytics, { includeAnalytics });
    const jsonData = {
      version: jsonDataRaw?.version || '1.0',
      metadata: jsonDataRaw?.metadata || {
        exportedAt: new Date().toISOString(),
        totalEntries: entries.length
      },
      entries: Array.isArray(jsonDataRaw?.entries) ? jsonDataRaw.entries : entries,
      ...(jsonDataRaw && typeof jsonDataRaw === 'object' ? jsonDataRaw : {})
    };

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
    const { entryId } = req.body || {};
    const shareWith = Array.isArray(req.body?.shareWith)
      ? req.body.shareWith
      : Array.isArray(req.body?.sharedWith)
        ? req.body.sharedWith
        : [];
    const permission = req.body?.permission || req.body?.options?.permission || 'view';

    if (!entryId || shareWith.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'entryId and at least one recipient are required'
      });
    }

    if (!VALID_SHARE_PERMISSIONS.has(permission)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid permission'
      });
    }

    const options = {
      ...(req.body?.options || {}),
      permission,
      expiresAt: req.body?.expiresAt || req.body?.options?.expiresAt
    };

    // Verify entry ownership
    const entry = await DiaryEntry.findOne({ _id: entryId, userId: userId });
    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Entry not found'
      });
    }

    // Create share
    const share = await createShare(entry, userId, shareWith, options);
    const shareData = share && typeof share === 'object' ? share : {};

    res.json({
      success: true,
      data: {
        ...shareData,
        shareId: shareData.shareId || shareData.id || `share_${Date.now()}`,
        shareLink: shareData.shareLink || shareData.link || null,
        permission: shareData.permission || permission
      },
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
    const { entryId, options } = req.body || {};
    const text = req.body?.text ?? req.body?.comment;

    if (!entryId || !text || !String(text).trim()) {
      return res.status(400).json({
        success: false,
        error: 'EntryId and text are required'
      });
    }

    // Add comment
    const comment = await addComment(entryId, userId, text, options);
    const commentData = comment && typeof comment === 'object' ? comment : {};

    res.json({
      success: true,
      data: {
        ...commentData,
        id: commentData.id || `cmt_${Date.now()}`,
        text: commentData.text || String(text),
        mentions: Array.isArray(commentData.mentions) && commentData.mentions.length > 0
          ? commentData.mentions
          : extractMentions(text),
        likes: Number.isFinite(commentData.likes) ? commentData.likes : 0,
        createdAt: commentData.createdAt || new Date()
      },
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
    const entries = await resolveQuery(
      DiaryEntry.find({
        userId: userId,
        isDeleted: false
      })
    );

    // Get shares (from database if available, or empty array)
    const shares = req.query.shares ? safeParseJson(req.query.shares, []) : [];

    // Generate stats
    const stats = getSharingStats(entries, shares) || {};
    const overallStats = stats.overallStats || {};
    const engagement = stats.engagement || {};
    const permissions = stats.permissions || {};
    const permissionDistribution = {
      view: permissions.viewOnly || 0,
      comment: permissions.canComment || 0,
      edit: permissions.canEdit || 0
    };
    const topRecipients = Array.isArray(engagement.topRecipients) ? engagement.topRecipients : [];

    res.json({
      success: true,
      data: {
        ...stats,
        totalShares: overallStats.totalShares || 0,
        sharedRecipients: topRecipients.length,
        commentCount: 0,
        permissionDistribution,
        mostSharedEntries: Array.isArray(engagement.mostSharedEntries) ? engagement.mostSharedEntries : [],
        topRecipients
      }
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
    const entries = await resolveQuery(
      DiaryEntry.find({
        userId: userId,
        isDeleted: false
      })
    );

    // Get comments (from database if available, or empty array)
    const comments = req.query.comments ? safeParseJson(req.query.comments, []) : [];

    // Generate insights
    const insights = getCollaborationInsights(entries, comments) || {};
    const collaborationMetrics = insights.collaborationMetrics || {};

    res.json({
      success: true,
      data: {
        ...insights,
        mostEngagingEntries: Array.isArray(insights.mostEngaging) ? insights.mostEngaging : [],
        topCommenters: Array.isArray(insights.topCommenters) ? insights.topCommenters : [],
        recentActivity: Array.isArray(insights.recentActivity) ? insights.recentActivity : [],
        engagementTrends: {
          engagementRate: collaborationMetrics.engagementRate || '0%',
          totalComments: collaborationMetrics.totalComments || 0
        }
      }
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
      preferences = createPreferences(userId, req.query.options ? safeParseJson(req.query.options, {}) : {});
    }

    res.json({
      success: true,
      data: normalizePreferences(preferences, userId)
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
    const requestedThemeMode = updates?.theme?.mode;
    const requestedWritingMode = updates?.writing?.defaultMode;
    const requestedWordGoal = updates?.writing?.wordGoal;

    if (requestedThemeMode && !VALID_THEME_MODES.has(requestedThemeMode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid theme mode'
      });
    }

    if (requestedWritingMode && !VALID_WRITING_MODES.has(requestedWritingMode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid writing mode'
      });
    }

    if (requestedWordGoal !== undefined && (!Number.isFinite(requestedWordGoal) || requestedWordGoal < 0)) {
      return res.status(400).json({
        success: false,
        error: 'wordGoal must be a non-negative number'
      });
    }

    // Get current preferences or create default
    let preferences = null; // TODO: fetch from database
    if (!preferences) {
      preferences = createPreferences(userId);
    }
    preferences = normalizePreferences(preferences, userId);

    // Update preferences
    const updated = updatePreferences(preferences, updates);

    res.json({
      success: true,
      data: normalizePreferences(updated, userId),
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
    preferences = normalizePreferences(preferences, userId);
    if (req.query.mode && VALID_WRITING_MODES.has(req.query.mode)) {
      preferences.writing.defaultMode = req.query.mode;
    }

    // Get writing mode
    const mode = normalizeWritingMode(getWritingMode(preferences), preferences.writing.defaultMode);

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
    preferences = normalizePreferences(preferences, userId);

    // Get theme
    const theme = normalizeTheme(getThemeConfig(preferences));

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
