const mongoose = require('mongoose');

/**
 * FamilyAccess Schema
 * Manages family relationships and auto-access permissions
 * When a family admin grants access, all family members get automatic location and camera access
 */
const FamilyAccessSchema = new mongoose.Schema(
  {
    // Admin/Owner of the family group
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Family group metadata
    familyGroupId: {
      type: String,
      unique: true,
      sparse: true,
      default: () => `family_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    },

    familyName: {
      type: String,
      required: true,
      trim: true,
    },

    // Family members array
    members: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        email: String,
        phone: String,
        name: String,
        // Role: admin (owner), manager (can add members), member
        role: {
          type: String,
          enum: ['admin', 'manager', 'member'],
          default: 'member',
        },
        // Whether this member has auto-access enabled
        autoAccessEnabled: {
          type: Boolean,
          default: false,
        },
        // Relationship type
        relationship: {
          type: String,
          enum: ['self', 'spouse', 'parent', 'child', 'sibling', 'grandparent', 'grandchild', 'other'],
          default: 'other',
        },
        // When member was added
        addedAt: {
          type: Date,
          default: Date.now,
        },
        // Status: active, inactive, removed
        status: {
          type: String,
          enum: ['active', 'inactive', 'removed'],
          default: 'active',
        },
      },
    ],

    // Access permissions configuration
    accessPermissions: {
      // Location access settings
      location: {
        enabled: {
          type: Boolean,
          default: true,
        },
        // How often to share location updates (in seconds)
        updateInterval: {
          type: Number,
          default: 30, // 30 seconds
        },
        // Whether location is real-time
        realTime: {
          type: Boolean,
          default: true,
        },
        // Location accuracy level: 'high', 'medium', 'low'
        accuracy: {
          type: String,
          enum: ['high', 'medium', 'low'],
          default: 'high',
        },
      },

      // Camera access settings
      camera: {
        enabled: {
          type: Boolean,
          default: true,
        },
        // Can view live camera feed
        liveView: {
          type: Boolean,
          default: true,
        },
        // Can take snapshots
        snapshot: {
          type: Boolean,
          default: true,
        },
        // Can record video
        recordVideo: {
          type: Boolean,
          default: false,
        },
        // Video recording max duration in minutes
        maxRecordingDuration: {
          type: Number,
          default: 5,
        },
      },

      // Additional permissions
      activity: {
        enabled: {
          type: Boolean,
          default: true,
        },
      },
      smsAlerts: {
        enabled: {
          type: Boolean,
          default: true,
        },
      },
      pushNotifications: {
        enabled: {
          type: Boolean,
          default: true,
        },
      },
    },

    // Emergency SOS settings
    emergencySettings: {
      autoAlertOnEmergency: {
        type: Boolean,
        default: true,
      },
      shareLocationOnSOS: {
        type: Boolean,
        default: true,
      },
      shareVideoOnSOS: {
        type: Boolean,
        default: true,
      },
      emergencyContacts: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
    },

    // Approval/Consent tracking
    approvals: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        consentedAt: Date,
        consentType: {
          type: String,
          enum: ['location', 'camera', 'all'],
        },
        // Whether they actively consented or it's auto-approved by admin
        autoApproved: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // Activity log
    activityLog: [
      {
        action: String,
        performedBy: mongoose.Schema.Types.ObjectId,
        targetUser: mongoose.Schema.Types.ObjectId,
        details: mongoose.Schema.Types.Mixed,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Privacy and settings
    settings: {
      maxStorageRetention: {
        type: Number,
        default: 30, // days
      },
      // Can members see each other's data or only admin?
      memberDataVisibility: {
        type: String,
        enum: ['all', 'admin_only', 'role_based'],
        default: 'all',
      },
      // Require additional approval for sensitive actions
      requireApprovalForSensitiveAccess: {
        type: Boolean,
        default: false,
      },
    },

    // Status and metadata
    isActive: {
      type: Boolean,
      default: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },

    // Encryption and security
    encryptionKey: String, // For encrypted data storage

    // Audit trail
    auditLog: [
      {
        action: String,
        timestamp: Date,
        userId: mongoose.Schema.Types.ObjectId,
        ipAddress: String,
        userAgent: String,
      },
    ],
  },
  {
    timestamps: true,
    collection: 'family_access',
  }
);

// Index for faster queries
FamilyAccessSchema.index({ adminId: 1, isActive: 1 });
FamilyAccessSchema.index({ familyGroupId: 1 });
FamilyAccessSchema.index({ 'members.userId': 1 });

module.exports = mongoose.model('FamilyAccess', FamilyAccessSchema);
