const mongoose = require('mongoose');

/**
 * DiaryStreak Schema
 * Tracks user writing streaks and consistency
 */
const diaryStreakSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Current streak information
  currentStreak: {
    type: Number,
    default: 0,
  },

  // All-time longest streak
  longestStreak: {
    type: Number,
    default: 0,
  },

  // Start date of current streak
  currentStreakStartDate: Date,

  // End date of current streak (when it ends)
  currentStreakEndDate: Date,

  // Total days written (all time)
  totalDaysWritten: {
    type: Number,
    default: 0,
  },

  // Last date an entry was written
  lastEntryDate: {
    type: Date,
    default: null,
  },

  // Dates written (for quick lookup)
  datesWritten: {
    type: [String], // ISO date strings YYYY-MM-DD
    default: [],
    index: true,
  },

  // Streak milestones reached
  milestonesReached: {
    type: [Number], // e.g., [7, 30, 100]
    default: [],
  },

  // Streak freeze purchased (temporary streak break protection)
  streakFreezeUsed: {
    type: Boolean,
    default: false,
  },

  streakFreezeUsedDate: Date,

  // Stats tracked
  bestWeekStreak: {
    type: Number,
    default: 0,
  },

  bestMonthEntries: {
    type: Number,
    default: 0,
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp on save
diaryStreakSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Index for user queries
diaryStreakSchema.index({ userId: 1, lastEntryDate: -1 });

/**
 * Update streak based on entry date
 */
diaryStreakSchema.statics.updateStreak = async function (userId, entryDate = new Date()) {
  const dateStr = entryDate.toISOString().split('T')[0];

  let streak = await this.findOne({ userId });

  if (!streak) {
    streak = new this({
      userId,
      currentStreak: 1,
      longestStreak: 1,
      currentStreakStartDate: entryDate,
      currentStreakEndDate: entryDate,
      totalDaysWritten: 1,
      lastEntryDate: entryDate,
      datesWritten: [dateStr],
    });
  } else {
    // Check if already written today
    const lastDate = streak.lastEntryDate ? new Date(streak.lastEntryDate) : null;
    const lastDateStr = lastDate ? lastDate.toISOString().split('T')[0] : null;

    if (lastDateStr === dateStr) {
      // Already written today, no streak update needed
      return streak;
    }

    // Check if streak continues (written yesterday)
    const yesterday = new Date(entryDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastDateStr === yesterdayStr) {
      // Streak continues
      streak.currentStreak += 1;
      streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
    } else if (
      !lastDateStr ||
      new Date(lastDateStr) < new Date(yesterdayStr)
    ) {
      // Streak broken, start new
      if (streak.streakFreezeUsed && streak.streakFreezeUsedDate) {
        const freezeDate = new Date(streak.streakFreezeUsedDate);
        const today = new Date();
        const daysSinceFreeze = (today - freezeDate) / (1000 * 60 * 60 * 24);

        if (daysSinceFreeze < 1) {
          // Freeze still active, continue streak
          streak.currentStreak += 1;
        } else {
          // Freeze expired, restart streak
          streak.currentStreak = 1;
          streak.currentStreakStartDate = entryDate;
          streak.streakFreezeUsed = false;
        }
      } else {
        streak.currentStreak = 1;
        streak.currentStreakStartDate = entryDate;
      }
    } else {
      // Streak continues (same day)
      return streak;
    }

    streak.lastEntryDate = entryDate;
    streak.currentStreakEndDate = entryDate;
    streak.totalDaysWritten += 1;

    // Add to datesWritten if not already there
    if (!streak.datesWritten.includes(dateStr)) {
      streak.datesWritten.push(dateStr);
    }

    // Check for milestones
    const milestones = [7, 14, 30, 60, 100, 365];
    milestones.forEach((m) => {
      if (
        streak.currentStreak === m &&
        !streak.milestonesReached.includes(m)
      ) {
        streak.milestonesReached.push(m);
      }
    });
  }

  await streak.save();
  return streak;
};

/**
 * Get streak info for user
 */
diaryStreakSchema.statics.getStreakInfo = async function (userId) {
  const streak = await this.findOne({ userId });

  if (!streak) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalDaysWritten: 0,
      lastEntryDate: null,
      milestonesReached: [],
    };
  }

  return {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    totalDaysWritten: streak.totalDaysWritten,
    lastEntryDate: streak.lastEntryDate,
    milestonesReached: streak.milestonesReached,
    streakFreezeUsed: streak.streakFreezeUsed,
  };
};

/**
 * Purchase streak freeze (protects streak if missed a day)
 */
diaryStreakSchema.statics.useStreakFreeze = async function (userId) {
  const streak = await this.findOne({ userId });

  if (!streak) {
    throw new Error('Streak not found');
  }

  if (streak.streakFreezeUsed) {
    throw new Error('Streak freeze already used this month');
  }

  streak.streakFreezeUsed = true;
  streak.streakFreezeUsedDate = new Date();
  await streak.save();

  return streak;
};

const DiaryStreak = mongoose.model('DiaryStreak', diaryStreakSchema);

module.exports = DiaryStreak;
