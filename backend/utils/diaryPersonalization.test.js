/**
 * Diary Personalization Utility Tests
 * Unit tests for user preferences and customization
 * Jest test suite with 55+ test cases
 */

const {
  createPreferences,
  updatePreferences,
  getPersonalizedPrompts,
  getWritingMode,
  getThemeConfig,
  syncPreferences,
  exportPreferences,
  importPreferences,
  validatePreferences,
  getDefaultPreferences
} = require('../diaryPersonalization');

describe('Diary Personalization Module', () => {
  // Test data
  const mockPreferences = {
    theme: {
      mode: 'dark',
      primaryColor: '#6366f1',
      fontSize: 'medium',
      fontFamily: 'Segoe UI',
      lineHeight: 1.6
    },
    writing: {
      defaultMode: 'focused',
      autoSave: true,
      autoSaveInterval: 30,
      wordGoal: 500,
      defaultMood: 'neutral',
      suggestTags: true,
      spellCheck: true,
      grammarCheck: false
    },
    notifications: {
      reminders: { enabled: true, time: '09:00', frequency: 'daily' },
      streakNotifications: true,
      analyticsDigest: 'weekly'
    },
    privacy: {
      profileVisibility: 'private',
      allowSharing: true,
      allowCollaboration: true,
      encryptEntries: false,
      backupEnabled: true,
      dataRetention: '1year'
    },
    display: {
      entriesPerPage: 20,
      sortBy: 'newest',
      viewStyle: 'list',
      compactMode: false,
      sidebarCollapsed: false
    }
  };

  describe('createPreferences', () => {
    test('should create preference object with all sections', () => {
      const result = createPreferences('user1', {});
      expect(result).toHaveProperty('theme');
      expect(result).toHaveProperty('writing');
      expect(result).toHaveProperty('notifications');
      expect(result).toHaveProperty('privacy');
      expect(result).toHaveProperty('display');
    });

    test('should include default theme settings', () => {
      const result = createPreferences('user1', {});
      expect(result.theme).toHaveProperty('mode');
      expect(result.theme).toHaveProperty('primaryColor');
      expect(result.theme).toHaveProperty('fontSize');
    });

    test('should include default writing settings', () => {
      const result = createPreferences('user1', {});
      expect(result.writing).toHaveProperty('defaultMode');
      expect(result.writing).toHaveProperty('autoSave');
      expect(result.writing).toHaveProperty('wordGoal');
    });

    test('should include default notification settings', () => {
      const result = createPreferences('user1', {});
      expect(result.notifications).toHaveProperty('reminders');
      expect(result.notifications).toHaveProperty('streakNotifications');
    });

    test('should include default privacy settings', () => {
      const result = createPreferences('user1', {});
      expect(result.privacy).toHaveProperty('profileVisibility');
      expect(result.privacy).toHaveProperty('allowSharing');
    });

    test('should merge custom options with defaults', () => {
      const custom = { theme: { mode: 'light' } };
      const result = createPreferences('user1', custom);
      expect(result.theme.mode).toBe('light');
      expect(result.theme.primaryColor).toBeDefined();
    });

    test('should set theme mode to light', () => {
      const result = createPreferences('user1', { theme: { mode: 'light' } });
      expect(result.theme.mode).toBe('light');
    });

    test('should set theme mode to dark', () => {
      const result = createPreferences('user1', { theme: { mode: 'dark' } });
      expect(result.theme.mode).toBe('dark');
    });

    test('should set writing mode to full', () => {
      const result = createPreferences('user1', { writing: { defaultMode: 'full' } });
      expect(result.writing.defaultMode).toBe('full');
    });

    test('should set writing mode to minimal', () => {
      const result = createPreferences('user1', { writing: { defaultMode: 'minimal' } });
      expect(result.writing.defaultMode).toBe('minimal');
    });

    test('should set writing mode to focused', () => {
      const result = createPreferences('user1', { writing: { defaultMode: 'focused' } });
      expect(result.writing.defaultMode).toBe('focused');
    });

    test('should set writing mode to typewriter', () => {
      const result = createPreferences('user1', { writing: { defaultMode: 'typewriter' } });
      expect(result.writing.defaultMode).toBe('typewriter');
    });

    test('should record creation timestamp', () => {
      const result = createPreferences('user1', {});
      expect(result.createdAt).toBeDefined();
      expect(result.createdAt instanceof Date).toBe(true);
    });
  });

  describe('updatePreferences', () => {
    test('should merge updates with existing preferences', () => {
      const updates = { theme: { mode: 'light' } };
      const result = updatePreferences(mockPreferences, updates);
      expect(result.theme.mode).toBe('light');
      expect(result.writing.defaultMode).toBe('focused');
    });

    test('should deep merge nested properties', () => {
      const updates = { theme: { primaryColor: '#ff0000' } };
      const result = updatePreferences(mockPreferences, updates);
      expect(result.theme.primaryColor).toBe('#ff0000');
      expect(result.theme.mode).toBe('dark');
    });

    test('should update multiple sections', () => {
      const updates = {
        theme: { fontSize: 'large' },
        writing: { wordGoal: 1000 }
      };
      const result = updatePreferences(mockPreferences, updates);
      expect(result.theme.fontSize).toBe('large');
      expect(result.writing.wordGoal).toBe(1000);
    });

    test('should record update timestamp', () => {
      const result = updatePreferences(mockPreferences, {});
      expect(result.updatedAt).toBeDefined();
    });

    test('should not remove unspecified properties', () => {
      const updates = { theme: { mode: 'light' } };
      const result = updatePreferences(mockPreferences, updates);
      expect(result.writing).toBeDefined();
      expect(result.privacy).toBeDefined();
    });

    test('should handle empty updates', () => {
      const result = updatePreferences(mockPreferences, {});
      expect(result).toBeDefined();
    });

    test('should validate updated values', () => {
      const result = updatePreferences(mockPreferences, { theme: { mode: 'light' } });
      expect(['light', 'dark', 'auto']).toContain(result.theme.mode);
    });
  });

  describe('getPersonalizedPrompts', () => {
    test('should return array of prompts', () => {
      const result = getPersonalizedPrompts(mockPreferences);
      expect(Array.isArray(result)).toBe(true);
    });

    test('should return at least 3 prompts', () => {
      const result = getPersonalizedPrompts(mockPreferences);
      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    test('should return no more than 10 prompts', () => {
      const result = getPersonalizedPrompts(mockPreferences);
      expect(result.length).toBeLessThanOrEqual(10);
    });

    test('should include prompt text', () => {
      const result = getPersonalizedPrompts(mockPreferences);
      result.forEach(prompt => {
        expect(prompt.text).toBeDefined();
        expect(prompt.text.length).toBeGreaterThan(0);
      });
    });

    test('should include prompt category', () => {
      const result = getPersonalizedPrompts(mockPreferences);
      result.forEach(prompt => {
        expect(prompt.category).toBeDefined();
      });
    });

    test('should personalize based on user preferences', () => {
      const happyPrefs = { ...mockPreferences, writing: { ...mockPreferences.writing, defaultMood: 'happy' } };
      const sadPrefs = { ...mockPreferences, writing: { ...mockPreferences.writing, defaultMood: 'sad' } };

      const happyPrompts = getPersonalizedPrompts(happyPrefs);
      const sadPrompts = getPersonalizedPrompts(sadPrefs);

      expect(happyPrompts.length).toBeGreaterThan(0);
      expect(sadPrompts.length).toBeGreaterThan(0);
    });
  });

  describe('getWritingMode', () => {
    test('should return mode configuration for full mode', () => {
      const result = getWritingMode('full');
      expect(result).toBeDefined();
      expect(result).toHaveProperty('name');
      expect(result.name).toBe('full');
    });

    test('should return mode configuration for minimal mode', () => {
      const result = getWritingMode('minimal');
      expect(result.name).toBe('minimal');
    });

    test('should return mode configuration for focused mode', () => {
      const result = getWritingMode('focused');
      expect(result.name).toBe('focused');
    });

    test('should return mode configuration for typewriter mode', () => {
      const result = getWritingMode('typewriter');
      expect(result.name).toBe('typewriter');
    });

    test('should include showToolbar setting', () => {
      const result = getWritingMode('full');
      expect(result).toHaveProperty('showToolbar');
      expect(typeof result.showToolbar).toBe('boolean');
    });

    test('should include showSidebar setting', () => {
      const result = getWritingMode('full');
      expect(result).toHaveProperty('showSidebar');
      expect(typeof result.showSidebar).toBe('boolean');
    });

    test('should include focusMode setting', () => {
      const result = getWritingMode('focused');
      expect(result).toHaveProperty('focusMode');
    });

    test('full mode should show all UI elements', () => {
      const result = getWritingMode('full');
      expect(result.showToolbar).toBe(true);
      expect(result.showSidebar).toBe(true);
    });

    test('minimal mode should hide most UI', () => {
      const result = getWritingMode('minimal');
      expect(result.showToolbar).toBe(false);
    });

    test('typewriter mode should use monospace font', () => {
      const result = getWritingMode('typewriter');
      expect(result.fontFamily).toContain('monospace');
    });

    test('should handle invalid mode gracefully', () => {
      expect(() => getWritingMode('invalid')).not.toThrow();
    });
  });

  describe('getThemeConfig', () => {
    test('should return CSS-ready theme object', () => {
      const result = getThemeConfig(mockPreferences);
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('should include color properties', () => {
      const result = getThemeConfig(mockPreferences);
      expect(result).toHaveProperty('primaryColor');
      expect(result).toHaveProperty('backgroundColor');
      expect(result).toHaveProperty('textColor');
    });

    test('should include typography properties', () => {
      const result = getThemeConfig(mockPreferences);
      expect(result).toHaveProperty('fontSize');
      expect(result).toHaveProperty('fontFamily');
      expect(result).toHaveProperty('lineHeight');
    });

    test('should respect light mode colors', () => {
      const lightPrefs = { ...mockPreferences, theme: { ...mockPreferences.theme, mode: 'light' } };
      const result = getThemeConfig(lightPrefs);
      expect(result.backgroundColor).toBe('#ffffff') || expect(result.backgroundColor).toBeDefined();
    });

    test('should respect dark mode colors', () => {
      const darkPrefs = { ...mockPreferences, theme: { ...mockPreferences.theme, mode: 'dark' } };
      const result = getThemeConfig(darkPrefs);
      expect(result).toHaveProperty('backgroundColor');
    });

    test('should include custom primary color', () => {
      const result = getThemeConfig(mockPreferences);
      expect(result.primaryColor).toBe('#6366f1');
    });

    test('should map font sizes to pixels', () => {
      const result = getThemeConfig(mockPreferences);
      expect(result.fontSize).toMatch(/^\d+px$/);
    });
  });

  describe('syncPreferences', () => {
    test('should synchronize across devices', () => {
      const result = syncPreferences(mockPreferences, 'device1', 'device2');
      expect(result).toBeDefined();
    });

    test('should track device syncs', () => {
      const result = syncPreferences(mockPreferences, 'device1', 'device2');
      expect(result).toHaveProperty('syncedDevices');
    });

    test('should record sync timestamp', () => {
      const result = syncPreferences(mockPreferences, 'device1', 'device2');
      expect(result).toHaveProperty('lastSyncedAt');
      expect(result.lastSyncedAt instanceof Date).toBe(true);
    });

    test('should handle multiple devices', () => {
      let result = syncPreferences(mockPreferences, 'device1', 'device2');
      result = syncPreferences(result, 'device2', 'device3');
      expect(result.syncedDevices.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('exportPreferences', () => {
    test('should return JSON string', () => {
      const result = exportPreferences(mockPreferences);
      expect(typeof result).toBe('string');
    });

    test('should be valid JSON when parsed', () => {
      const result = exportPreferences(mockPreferences);
      expect(() => JSON.parse(result)).not.toThrow();
    });

    test('should preserve all preference properties', () => {
      const result = exportPreferences(mockPreferences);
      const parsed = JSON.parse(result);
      expect(parsed.theme).toBeDefined();
      expect(parsed.writing).toBeDefined();
    });

    test('should include version information', () => {
      const result = exportPreferences(mockPreferences);
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('version');
    });

    test('should include export timestamp', () => {
      const result = exportPreferences(mockPreferences);
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('exportedAt');
    });

    test('should handle null preferences', () => {
      expect(() => exportPreferences(null)).not.toThrow();
    });
  });

  describe('importPreferences', () => {
    test('should import from JSON string', () => {
      const exported = exportPreferences(mockPreferences);
      const result = importPreferences(exported);
      expect(result).toBeDefined();
    });

    test('should validate imported preferences', () => {
      const exported = exportPreferences(mockPreferences);
      const result = importPreferences(exported);
      expect(result.theme).toBeDefined();
    });

    test('should reject invalid JSON', () => {
      expect(() => importPreferences('invalid json')).toThrow();
    });

    test('should merge with existing preferences', () => {
      const exported = exportPreferences({ theme: { mode: 'light' } });
      const result = importPreferences(exported, mockPreferences);
      expect(result).toBeDefined();
    });

    test('should preserve data types', () => {
      const exported = exportPreferences(mockPreferences);
      const result = importPreferences(exported);
      expect(typeof result.writing.wordGoal).toBe('number');
      expect(typeof result.theme.primaryColor).toBe('string');
    });

    test('should handle version conflicts gracefully', () => {
      const oldVersion = { ...mockPreferences, version: '1.0' };
      const exported = exportPreferences(oldVersion);
      expect(() => importPreferences(exported)).not.toThrow();
    });
  });

  describe('validatePreferences', () => {
    test('should return true for valid preferences', () => {
      const result = validatePreferences(mockPreferences);
      expect(result).toBe(true);
    });

    test('should return false for invalid theme mode', () => {
      const invalid = { ...mockPreferences, theme: { ...mockPreferences.theme, mode: 'invalid' } };
      const result = validatePreferences(invalid);
      expect(result).toBe(false);
    });

    test('should return false for invalid writing mode', () => {
      const invalid = { ...mockPreferences, writing: { ...mockPreferences.writing, defaultMode: 'invalid' } };
      const result = validatePreferences(invalid);
      expect(result).toBe(false);
    });

    test('should return false for invalid font size', () => {
      const invalid = { ...mockPreferences, theme: { ...mockPreferences.theme, fontSize: 'huge' } };
      const result = validatePreferences(invalid);
      expect(result).toBe(false);
    });

    test('should return false for negative word goal', () => {
      const invalid = { ...mockPreferences, writing: { ...mockPreferences.writing, wordGoal: -100 } };
      const result = validatePreferences(invalid);
      expect(result).toBe(false);
    });

    test('should validate privacy settings', () => {
      const result = validatePreferences(mockPreferences);
      expect(result).toBe(true);
    });

    test('should return false for null preferences', () => {
      const result = validatePreferences(null);
      expect(result).toBe(false);
    });
  });

  describe('getDefaultPreferences', () => {
    test('should return default preferences object', () => {
      const result = getDefaultPreferences();
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('should include all required sections', () => {
      const result = getDefaultPreferences();
      expect(result).toHaveProperty('theme');
      expect(result).toHaveProperty('writing');
      expect(result).toHaveProperty('notifications');
      expect(result).toHaveProperty('privacy');
      expect(result).toHaveProperty('display');
    });

    test('should return valid preferences', () => {
      const result = getDefaultPreferences();
      expect(validatePreferences(result)).toBe(true);
    });

    test('should have reasonable defaults', () => {
      const result = getDefaultPreferences();
      expect(result.writing.wordGoal).toBeGreaterThan(0);
      expect(result.writing.autoSaveInterval).toBeGreaterThan(0);
      expect(result.display.entriesPerPage).toBeGreaterThan(0);
    });
  });

  describe('Theme Configuration', () => {
    test('should support light theme', () => {
      const prefs = { ...mockPreferences, theme: { mode: 'light' } };
      const config = getThemeConfig(prefs);
      expect(config).toBeDefined();
    });

    test('should support dark theme', () => {
      const prefs = { ...mockPreferences, theme: { mode: 'dark' } };
      const config = getThemeConfig(prefs);
      expect(config).toBeDefined();
    });

    test('should support auto theme', () => {
      const prefs = { ...mockPreferences, theme: { mode: 'auto' } };
      const config = getThemeConfig(prefs);
      expect(config).toBeDefined();
    });

    test('should support custom primary color', () => {
      const prefs = { ...mockPreferences, theme: { primaryColor: '#ff0000' } };
      const config = getThemeConfig(prefs);
      expect(config.primaryColor).toBe('#ff0000');
    });
  });

  describe('Performance', () => {
    test('should create preferences within 50ms', () => {
      const start = performance.now();
      createPreferences('user1', {});
      const end = performance.now();
      expect(end - start).toBeLessThan(50);
    });

    test('should export preferences within 100ms', () => {
      const start = performance.now();
      exportPreferences(mockPreferences);
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });

    test('should get theme config within 50ms', () => {
      const start = performance.now();
      getThemeConfig(mockPreferences);
      const end = performance.now();
      expect(end - start).toBeLessThan(50);
    });
  });
});
