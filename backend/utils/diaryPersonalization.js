/**
 * Diary Personalization Utilities
 * Manage user preferences, writing modes, themes, and custom settings
 * Phase 7 - Advanced Personalization
 */

const logger = require('./logger');

/**
 * Create default personalization preferences
 * @param {string} userId - User ID
 * @param {Object} options - Custom preferences
 * @returns {Object} Personalization configuration
 */
function createPreferences(userId, options = {}) {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const preferences = {
      userId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      
      // Theme preferences
      theme: {
        mode: options.theme?.mode || 'light', // 'light', 'dark', 'auto'
        primaryColor: options.theme?.primaryColor || '#667eea',
        accentColor: options.theme?.accentColor || '#764ba2',
        fontSize: options.theme?.fontSize || 'medium', // 'small', 'medium', 'large'
        fontFamily: options.theme?.fontFamily || 'system', // 'system', 'serif', 'monospace', 'custom'
        lineHeight: options.theme?.lineHeight || 1.6
      },

      // Writing preferences
      writing: {
        defaultMode: options.writing?.defaultMode || 'full', // 'full', 'minimal', 'focused', 'typewriter'
        autoSave: options.writing?.autoSave !== false ? true : false,
        autoSaveInterval: options.writing?.autoSaveInterval || 30, // seconds
        wordGoal: options.writing?.wordGoal || 0,
        defaultMood: options.writing?.defaultMood || null,
        defaultCategory: options.writing?.defaultCategory || 'general',
        suggestTags: options.writing?.suggestTags !== false ? true : false,
        enableSpellCheck: options.writing?.enableSpellCheck !== false ? true : false,
        enableGrammarCheck: options.writing?.enableGrammarCheck || false,
        enableWordCounter: options.writing?.enableWordCounter !== false ? true : false,
        enableTimeCounter: options.writing?.enableTimeCounter || false
      },

      // Notification preferences
      notifications: {
        reminders: options.notifications?.reminders !== false ? true : false,
        reminderTime: options.notifications?.reminderTime || '09:00',
        reminderFrequency: options.notifications?.reminderFrequency || 'daily', // 'daily', 'weekly', 'custom'
        streakNotifications: options.notifications?.streakNotifications !== false ? true : false,
        socialNotifications: options.notifications?.socialNotifications !== false ? true : false,
        analyticsDigest: options.notifications?.analyticsDigest || 'weekly', // 'daily', 'weekly', 'monthly', 'never'
        soundEnabled: options.notifications?.soundEnabled || false,
        desktopNotifications: options.notifications?.desktopNotifications || false
      },

      // Privacy preferences
      privacy: {
        profileVisibility: options.privacy?.profileVisibility || 'private', // 'public', 'private'
        allowSharing: options.privacy?.allowSharing !== false ? true : false,
        allowCollaboration: options.privacy?.allowCollaboration || false,
        encryptEntries: options.privacy?.encryptEntries || false,
        backupEnabled: options.privacy?.backupEnabled || true,
        dataRetention: options.privacy?.dataRetention || '90days', // '30days', '90days', 'forever'
        allowAnalytics: options.privacy?.allowAnalytics !== false ? true : false
      },

      // Display preferences
      display: {
        entriesPerPage: options.display?.entriesPerPage || 10,
        sortBy: options.display?.sortBy || 'newest', // 'newest', 'oldest', 'modified'
        viewStyle: options.display?.viewStyle || 'list', // 'list', 'grid', 'timeline'
        showPreview: options.display?.showPreview !== false ? true : false,
        previewLength: options.display?.previewLength || 200,
        compactMode: options.display?.compactMode || false,
        showSidebar: options.display?.showSidebar !== false ? true : false,
        sidebarPosition: options.display?.sidebarPosition || 'left' // 'left', 'right'
      },

      // Analytics preferences
      analytics: {
        trackMood: options.analytics?.trackMood !== false ? true : false,
        trackActivity: options.analytics?.trackActivity !== false ? true : false,
        trackWellness: options.analytics?.trackWellness !== false ? true : false,
        moodScaleType: options.analytics?.moodScaleType || '5point', // '3point', '5point', '10point'
        wellnessMetrics: options.analytics?.wellnessMetrics || ['mood', 'energy', 'stress']
      },

      // Custom tags and categories
      customization: {
        customMoods: options.customization?.customMoods || [],
        customCategories: options.customization?.customCategories || [],
        customPrompts: options.customization?.customPrompts || [],
        defaultTags: options.customization?.defaultTags || []
      }
    };

    logger.info(`Created personalization preferences for user ${userId}`);
    return preferences;
  } catch (error) {
    logger.error('Error creating preferences:', error);
    throw error;
  }
}

/**
 * Update personalization preferences
 * @param {Object} preferences - Current preferences
 * @param {Object} updates - Updates to apply
 * @returns {Object} Updated preferences
 */
function updatePreferences(preferences, updates) {
  try {
    if (!preferences) {
      throw new Error('Preferences object is required');
    }

    const updated = { ...preferences };

    // Deep merge updates into preferences
    Object.keys(updates).forEach(key => {
      if (typeof updates[key] === 'object' && updates[key] !== null) {
        updated[key] = { ...updated[key], ...updates[key] };
      } else {
        updated[key] = updates[key];
      }
    });

    updated.updatedAt = new Date();

    logger.info(`Updated preferences for user ${preferences.userId}`);
    return updated;
  } catch (error) {
    logger.error('Error updating preferences:', error);
    throw error;
  }
}

/**
 * Get personalized writing prompts based on preferences
 * @param {Object} preferences - User preferences
 * @param {Array} entries - User's recent entries
 * @param {Object} analytics - User's analytics
 * @returns {Array} Personalized prompts
 */
function getPersonalizedPrompts(preferences, entries = [], analytics = null) {
  try {
    const prompts = [];

    if (!preferences) {
      return getDefaultPrompts();
    }

    // Use custom prompts if available
    if (preferences.customization?.customPrompts && preferences.customization.customPrompts.length > 0) {
      prompts.push(...preferences.customization.customPrompts);
    }

    // Add mood-based prompts based on tracked moods
    if (preferences.analytics?.trackMood) {
      const moodPrompts = generateMoodPrompts(preferences.customization?.customMoods || []);
      prompts.push(...moodPrompts);
    }

    // Add category-based prompts
    if (preferences.customization?.customCategories && preferences.customization.customCategories.length > 0) {
      preferences.customization.customCategories.forEach(category => {
        prompts.push(`Write about something in the "${category}" category today.`);
      });
    }

    // Add goal-based prompts
    if (preferences.writing?.wordGoal && preferences.writing.wordGoal > 0) {
      prompts.push(`Today's word goal: ${preferences.writing.wordGoal} words`);
    }

    return prompts.length > 0 ? prompts : getDefaultPrompts();
  } catch (error) {
    logger.error('Error getting personalized prompts:', error);
    return getDefaultPrompts();
  }
}

/**
 * Get personalized writing mode based on preferences
 * @param {Object} preferences - User preferences
 * @returns {Object} Writing mode configuration
 */
function getWritingMode(preferences) {
  try {
    if (!preferences) {
      return getDefaultWritingMode();
    }

    const mode = preferences.writing?.defaultMode || 'full';

    const modes = {
      full: {
        name: 'Full Interface',
        description: 'Complete editor with all features',
        showToolbar: true,
        showSidebar: true,
        showWordCount: true,
        showTimeCount: true,
        showMoodSelector: true,
        showCategorySelector: true,
        showTags: true,
        autoSuggestTags: true,
        focusMode: false,
        distraction: 'normal'
      },
      minimal: {
        name: 'Minimal',
        description: 'Clean, distraction-free interface',
        showToolbar: false,
        showSidebar: false,
        showWordCount: true,
        showTimeCount: false,
        showMoodSelector: false,
        showCategorySelector: false,
        showTags: false,
        autoSuggestTags: false,
        focusMode: true,
        distraction: 'minimal'
      },
      focused: {
        name: 'Focused',
        description: 'Center focused writing area',
        showToolbar: true,
        showSidebar: false,
        showWordCount: true,
        showTimeCount: false,
        showMoodSelector: true,
        showCategorySelector: true,
        showTags: true,
        autoSuggestTags: false,
        focusMode: true,
        distraction: 'low'
      },
      typewriter: {
        name: 'Typewriter',
        description: 'Old-school typewriter style',
        showToolbar: false,
        showSidebar: false,
        showWordCount: false,
        showTimeCount: false,
        showMoodSelector: false,
        showCategorySelector: false,
        showTags: false,
        autoSuggestTags: false,
        focusMode: true,
        distraction: 'minimal',
        typewriterScroll: true,
        monospaceFont: true
      }
    };

    return modes[mode] || modes.full;
  } catch (error) {
    logger.error('Error getting writing mode:', error);
    return getDefaultWritingMode();
  }
}

/**
 * Get theme configuration
 * @param {Object} preferences - User preferences
 * @returns {Object} Theme configuration
 */
function getThemeConfig(preferences) {
  try {
    if (!preferences || !preferences.theme) {
      return getDefaultTheme();
    }

    return {
      mode: preferences.theme.mode,
      colors: {
        primary: preferences.theme.primaryColor,
        accent: preferences.theme.accentColor
      },
      typography: {
        fontSize: mapFontSize(preferences.theme.fontSize),
        fontFamily: mapFontFamily(preferences.theme.fontFamily),
        lineHeight: preferences.theme.lineHeight
      }
    };
  } catch (error) {
    logger.error('Error getting theme config:', error);
    return getDefaultTheme();
  }
}

/**
 * Sync personalization across devices
 * @param {Object} preferences - Preferences to sync
 * @param {string} deviceId - Device identifier
 * @returns {Object} Sync result
 */
function syncPreferences(preferences, deviceId) {
  try {
    if (!preferences || !deviceId) {
      throw new Error('Preferences and deviceId are required');
    }

    return {
      userId: preferences.userId,
      deviceId: deviceId,
      syncedAt: new Date(),
      preferences: preferences,
      status: 'synced'
    };
  } catch (error) {
    logger.error('Error syncing preferences:', error);
    throw error;
  }
}

/**
 * Export personalization settings
 * @param {Object} preferences - Preferences to export
 * @returns {string} JSON string of preferences
 */
function exportPreferences(preferences) {
  try {
    if (!preferences) {
      throw new Error('Preferences object is required');
    }

    return JSON.stringify(preferences, null, 2);
  } catch (error) {
    logger.error('Error exporting preferences:', error);
    throw error;
  }
}

/**
 * Import personalization settings
 * @param {string} jsonString - JSON string of preferences
 * @returns {Object} Imported preferences
 */
function importPreferences(jsonString) {
  try {
    if (!jsonString) {
      throw new Error('JSON string is required');
    }

    const preferences = JSON.parse(jsonString);
    preferences.updatedAt = new Date();

    return preferences;
  } catch (error) {
    logger.error('Error importing preferences:', error);
    throw error;
  }
}

/**
 * Helper: Get default prompts
 * @private
 */
function getDefaultPrompts() {
  return [
    'What happened today that mattered?',
    'How are you feeling right now?',
    'What are you grateful for?',
    'What challenged you today?',
    'What made you smile today?',
    'What would your future self want to know?',
    'What did you learn today?',
    'What are you looking forward to?'
  ];
}

/**
 * Helper: Generate mood-based prompts
 * @private
 */
function generateMoodPrompts(customMoods = []) {
  const prompts = [];
  const defaultMoods = ['happy', 'sad', 'anxious', 'calm', 'excited'];
  const moods = customMoods.length > 0 ? customMoods : defaultMoods;

  moods.forEach(mood => {
    prompts.push(`What made you feel ${mood} today?`);
  });

  return prompts;
}

/**
 * Helper: Get default writing mode
 * @private
 */
function getDefaultWritingMode() {
  return {
    name: 'Full Interface',
    description: 'Complete editor with all features',
    showToolbar: true,
    showSidebar: true,
    focusMode: false
  };
}

/**
 * Helper: Get default theme
 * @private
 */
function getDefaultTheme() {
  return {
    mode: 'light',
    colors: {
      primary: '#667eea',
      accent: '#764ba2'
    },
    typography: {
      fontSize: 'medium',
      fontFamily: 'system',
      lineHeight: 1.6
    }
  };
}

/**
 * Helper: Map font size
 * @private
 */
function mapFontSize(size) {
  const sizeMap = {
    small: '14px',
    medium: '16px',
    large: '18px'
  };
  return sizeMap[size] || '16px';
}

/**
 * Helper: Map font family
 * @private
 */
function mapFontFamily(family) {
  const familyMap = {
    system: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    serif: 'Georgia, serif',
    monospace: '"Courier New", monospace',
    custom: 'inherit'
  };
  return familyMap[family] || familyMap.system;
}

module.exports = {
  createPreferences,
  updatePreferences,
  getPersonalizedPrompts,
  getWritingMode,
  getThemeConfig,
  syncPreferences,
  exportPreferences,
  importPreferences
};
