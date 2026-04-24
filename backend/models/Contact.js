const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    // User who has the contact
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // The contact user
    contactUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Custom display name for contact
    displayName: {
      type: String,
      sparse: true,
    },

    // Contact category/group
    category: {
      type: String,
      enum: ['personal', 'business', 'family', 'friends', 'work', 'other'],
      default: 'personal',
    },

    // Is favorite
    isFavorite: {
      type: Boolean,
      default: false,
    },

    // Contact blocked
    isBlocked: {
      type: Boolean,
      default: false,
    },

    blockedAt: {
      type: Date,
      sparse: true,
    },

    // Scheduled blocks (time-based or period-based)
    scheduledBlocks: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          auto: true,
        },
        type: {
          type: String,
          enum: ['time', 'period'], // 'time' = daily time range, 'period' = date range
          required: true,
        },
        // For time-based blocks (HH:MM format, 24-hour)
        startTime: {
          type: String, // e.g., "22:00"
          sparse: true,
        },
        endTime: {
          type: String, // e.g., "06:00"
          sparse: true,
        },
        // Days of week for recurring blocks (0-6, 0 = Sunday)
        daysOfWeek: {
          type: [Number],
          sparse: true,
          default: [0, 1, 2, 3, 4, 5, 6], // All days by default
        },
        // For period-based blocks
        blockStartDate: {
          type: Date,
          sparse: true,
        },
        blockEndDate: {
          type: Date,
          sparse: true,
        },
        // Overall block validity period (optional)
        validFrom: {
          type: Date,
          default: Date.now,
        },
        validUntil: {
          type: Date,
          sparse: true, // If null, block is permanent
        },
        // Description of the block
        reason: {
          type: String,
          sparse: true, // e.g., "Sleep time", "Work hours"
        },
        // Is this block active
        isActive: {
          type: Boolean,
          default: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Last interaction
    lastInteractionAt: {
      type: Date,
      default: Date.now,
    },

    // Contact notes
    notes: {
      type: String,
      sparse: true,
    },

    // Phone number (if saved)
    phoneNumber: {
      type: String,
      sparse: true,
    },

    // Email (if saved)
    email: {
      type: String,
      sparse: true,
    },

    // Contact shared by user
    isSharedContact: {
      type: Boolean,
      default: false,
    },

    // Custom avatar/color for contact
    customColor: {
      type: String,
      sparse: true,
    },

    customAvatar: {
      type: String,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique index: a user can have each contact only once
contactSchema.index({ userId: 1, contactUserId: 1 }, { unique: true });

// Indexes for performance
contactSchema.index({ userId: 1, isFavorite: -1 });
contactSchema.index({ userId: 1, category: 1 });
contactSchema.index({ userId: 1, isBlocked: 1 });
contactSchema.index({ userId: 1, 'scheduledBlocks.isActive': 1 });
contactSchema.index({ userId: 1, 'scheduledBlocks.validUntil': 1 });
contactSchema.index({ lastInteractionAt: -1 });

// Method to check if contact is currently blocked (considering time-based blocks)
contactSchema.methods.isCurrentlyBlocked = function () {
  // Check permanent block
  if (this.isBlocked) {
    return true;
  }

  // Check scheduled blocks
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
  const dayOfWeek = now.getDay();

  for (const block of this.scheduledBlocks) {
    if (!block.isActive) continue;

    // Check if block is within valid period
    if (block.validUntil && now > new Date(block.validUntil)) {
      continue; // Block has expired
    }

    if (block.type === 'time') {
      // Check if current day is in daysOfWeek
      const blockedDays = block.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
      if (!blockedDays.includes(dayOfWeek)) {
        continue;
      }

      // Check if current time is within block range
      const startTime = block.startTime;
      const endTime = block.endTime;

      if (startTime && endTime) {
        // Handle blocks that span midnight (e.g., 22:00 to 06:00)
        if (startTime < endTime) {
          // Normal case: 09:00 to 17:00
          if (currentTime >= startTime && currentTime < endTime) {
            return true;
          }
        } else {
          // Midnight-spanning case: 22:00 to 06:00
          if (currentTime >= startTime || currentTime < endTime) {
            return true;
          }
        }
      }
    } else if (block.type === 'period') {
      // Check if today is within block period
      const blockStart = new Date(block.blockStartDate);
      const blockEnd = new Date(block.blockEndDate);

      blockStart.setHours(0, 0, 0, 0);
      blockEnd.setHours(23, 59, 59, 999);
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      if (today >= blockStart && today <= blockEnd) {
        return true;
      }
    }
  }

  return false;
};

// Method to clean up expired scheduled blocks
contactSchema.methods.cleanupExpiredBlocks = function () {
  const now = new Date();
  this.scheduledBlocks = this.scheduledBlocks.filter((block) => {
    if (block.validUntil && now > new Date(block.validUntil)) {
      return false; // Remove expired block
    }
    return true;
  });
};

module.exports = mongoose.model('Contact', contactSchema);
