/**
 * User Preferences Model
 * Stores user-specific settings and preferences for Photo Studio
 */

const mongoose = require('mongoose');

const userPreferencesSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    preferences: {
      // Canvas Settings
      canvas: {
        defaultWidth: {
          type: Number,
          default: 1920,
        },
        defaultHeight: {
          type: Number,
          default: 1080,
        },
        backgroundColor: {
          type: String,
          default: '#ffffff',
        },
        defaultZoom: {
          type: Number,
          default: 100,
        },
      },

      // Editor Settings
      editor: {
        theme: {
          type: String,
          enum: ['dark', 'light'],
          default: 'dark',
        },
        showRulers: {
          type: Boolean,
          default: true,
        },
        showGrid: {
          type: Boolean,
          default: false,
        },
        snapToGrid: {
          type: Boolean,
          default: false,
        },
        gridSize: {
          type: Number,
          default: 10,
        },
        leftPanelOpen: {
          type: Boolean,
          default: true,
        },
        rightPanelOpen: {
          type: Boolean,
          default: true,
        },
        activeRightTab: {
          type: String,
          default: 'layers',
        },
      },

      // Tool Defaults
      tools: {
        defaultBrushSize: {
          type: Number,
          default: 20,
        },
        defaultBrushHardness: {
          type: Number,
          default: 100,
        },
        defaultBrushColor: {
          type: String,
          default: '#000000',
        },
        defaultTextFont: {
          type: String,
          default: 'Arial',
        },
        defaultTextSize: {
          type: Number,
          default: 48,
        },
        defaultTextColor: {
          type: String,
          default: '#000000',
        },
        recentColors: [{
          type: String,
        }],
        recentFonts: [{
          type: String,
        }],
      },

      // Keyboard Shortcuts
      shortcuts: {
        type: Map,
        of: String,
        default: new Map(),
      },

      // Performance Settings
      performance: {
        maxHistorySize: {
          type: Number,
          default: 50,
          min: 10,
          max: 100,
        },
        enableWebGL: {
          type: Boolean,
          default: true,
        },
        enableHardwareAcceleration: {
          type: Boolean,
          default: true,
        },
        autoSave: {
          type: Boolean,
          default: true,
        },
        autoSaveInterval: {
          type: Number,
          default: 300000, // 5 minutes in milliseconds
        },
        cacheSize: {
          type: Number,
          default: 100, // MB
        },
      },

      // Export Settings
      export: {
        defaultFormat: {
          type: String,
          enum: ['png', 'jpeg', 'webp'],
          default: 'png',
        },
        defaultQuality: {
          type: Number,
          default: 1.0,
          min: 0.1,
          max: 1.0,
        },
        defaultFilenamePattern: {
          type: String,
          default: 'export_%date%_%time%',
        },
      },

      // UI Preferences
      ui: {
        showTooltips: {
          type: Boolean,
          default: true,
        },
        tooltipDelay: {
          type: Number,
          default: 500, // milliseconds
        },
        showNotifications: {
          type: Boolean,
          default: true,
        },
        notificationDuration: {
          type: Number,
          default: 3000, // milliseconds
        },
        language: {
          type: String,
          default: 'en',
        },
      },

      // AI Features
      ai: {
        enableAIFeatures: {
          type: Boolean,
          default: true,
        },
        aiQuality: {
          type: String,
          enum: ['fast', 'balanced', 'quality'],
          default: 'balanced',
        },
        cacheAIModels: {
          type: Boolean,
          default: true,
        },
      },

      // Cloud & Collaboration
      cloud: {
        autoSync: {
          type: Boolean,
          default: false,
        },
        syncInterval: {
          type: Number,
          default: 600000, // 10 minutes
        },
        enableVersionHistory: {
          type: Boolean,
          default: true,
        },
        maxVersions: {
          type: Number,
          default: 10,
        },
      },
    },

    // Recently used items
    recentProjects: [{
      projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PhotoStudioProject',
      },
      lastOpened: {
        type: Date,
        default: Date.now,
      },
    }],

    recentTemplates: [{
      templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PhotoStudioProject',
      },
      lastUsed: {
        type: Date,
        default: Date.now,
      },
    }],

    // Favorites
    favoriteProjects: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PhotoStudioProject',
    }],

    favoriteTemplates: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PhotoStudioProject',
    }],

    // Usage Statistics
    statistics: {
      totalProjects: {
        type: Number,
        default: 0,
      },
      totalEditingTime: {
        type: Number,
        default: 0, // milliseconds
      },
      featuresUsed: {
        type: Map,
        of: Number,
        default: new Map(),
      },
      lastActiveDate: {
        type: Date,
        default: Date.now,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Methods
userPreferencesSchema.methods.addRecentProject = async function (projectId) {
  // Remove if already exists
  this.recentProjects = this.recentProjects.filter(
    (p) => p.projectId.toString() !== projectId.toString()
  );

  // Add to beginning
  this.recentProjects.unshift({
    projectId,
    lastOpened: new Date(),
  });

  // Keep only last 10
  this.recentProjects = this.recentProjects.slice(0, 10);

  await this.save();
};

userPreferencesSchema.methods.addRecentColor = async function (color) {
  const colors = this.preferences.tools.recentColors || [];

  // Remove if exists
  const filtered = colors.filter((c) => c !== color);

  // Add to beginning
  filtered.unshift(color);

  // Keep only last 10
  this.preferences.tools.recentColors = filtered.slice(0, 10);

  await this.save();
};

userPreferencesSchema.methods.incrementFeatureUsage = async function (featureName) {
  const current = this.statistics.featuresUsed.get(featureName) || 0;
  this.statistics.featuresUsed.set(featureName, current + 1);
  this.statistics.lastActiveDate = new Date();
  await this.save();
};

userPreferencesSchema.methods.updateEditingTime = async function (duration) {
  this.statistics.totalEditingTime += duration;
  await this.save();
};

// Static methods
userPreferencesSchema.statics.getOrCreate = async function (userId) {
  let preferences = await this.findOne({ userId });

  if (!preferences) {
    preferences = await this.create({ userId });
  }

  return preferences;
};

const UserPreferences = mongoose.model('UserPreferences', userPreferencesSchema);

module.exports = UserPreferences;
