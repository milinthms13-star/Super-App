/**
 * Badge & Gamification Service - Phase 9 Feature C
 * Badge unlocking, achievement tracking, level progression
 */

const UserBadge = require('../models/UserBadge');
const Challenge = require('../models/Challenge');

class BadgeService {
  /**
   * Initialize gamification account
   */
  static async initializeUserBadges(userId) {
    try {
      const badgeId = `BADGE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const userBadges = new UserBadge({
        badgeId,
        userId,
      });

      await userBadges.save();

      return {
        success: true,
        data: userBadges,
        message: 'Gamification account created',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Check and unlock badges based on conditions
   */
  static async checkAndUnlockBadges(userId, orderData) {
    try {
      const userBadges = await UserBadge.findOne({ userId });
      if (!userBadges) {
        return { success: false, message: 'User badges not found' };
      }

      const unlockedBadges = [];

      // First Order Badge
      if (orderData.totalOrders === 1 && !userBadges.badges.find((b) => b.badgeType === 'first_order')) {
        await userBadges.unlockBadge('first_order', 'common');
        unlockedBadges.push('first_order');
      }

      // Milestone Badges
      if (orderData.totalOrders === 10 && !userBadges.badges.find((b) => b.badgeType === 'milestone_10')) {
        await userBadges.unlockBadge('milestone_10', 'uncommon');
        unlockedBadges.push('milestone_10');
      }

      if (orderData.totalOrders === 50 && !userBadges.badges.find((b) => b.badgeType === 'milestone_50')) {
        await userBadges.unlockBadge('milestone_50', 'rare');
        unlockedBadges.push('milestone_50');
      }

      if (orderData.totalOrders === 100 && !userBadges.badges.find((b) => b.badgeType === 'milestone_100')) {
        await userBadges.unlockBadge('milestone_100', 'epic');
        unlockedBadges.push('milestone_100');
      }

      // Loyalty Badge
      if (orderData.totalOrders >= 20 && orderData.averageRating >= 4 && !userBadges.badges.find((b) => b.badgeType === 'loyal_customer')) {
        await userBadges.unlockBadge('loyal_customer', 'uncommon');
        unlockedBadges.push('loyal_customer');
      }

      return {
        success: true,
        data: {
          userId,
          unlockedBadges,
        },
        message: `${unlockedBadges.length} badge(s) unlocked`,
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Add experience and level up
   */
  static async addExperience(userId, amount, reason = '') {
    try {
      const userBadges = await UserBadge.findOne({ userId });
      if (!userBadges) {
        return { success: false, message: 'User badges not found' };
      }

      const xpPerLevel = 500;
      const previousLevel = userBadges.level.currentLevel;

      userBadges.level.experience += amount;

      // Check for level up
      const newLevel = Math.floor(userBadges.level.experience / xpPerLevel) + 1;
      if (newLevel > previousLevel) {
        userBadges.level.currentLevel = Math.min(newLevel, 50);
        userBadges.level.achievedAt = new Date();

        // Set level name
        const levelNames = [
          'Bronze',
          'Silver',
          'Gold',
          'Platinum',
          'Diamond',
          'Legend',
        ];
        userBadges.level.levelName = levelNames[Math.min(userBadges.level.currentLevel - 1, 5)];
      }

      userBadges.level.experienceToNextLevel = xpPerLevel - (userBadges.level.experience % xpPerLevel);

      await userBadges.save();

      return {
        success: true,
        data: {
          userId,
          experience: userBadges.level.experience,
          level: userBadges.level.currentLevel,
          levelName: userBadges.level.levelName,
          leveledUp: newLevel > previousLevel,
        },
        message: reason,
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Update streaks
   */
  static async updateStreaks(userId, streakType) {
    try {
      const userBadges = await UserBadge.findOne({ userId });
      if (!userBadges) {
        return { success: false, message: 'User badges not found' };
      }

      await userBadges.updateStreak(streakType + 'Streak');

      return {
        success: true,
        data: userBadges.streaks,
        message: 'Streak updated',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get user badges
   */
  static async getUserBadges(userId) {
    try {
      const userBadges = await UserBadge.findOne({ userId });
      if (!userBadges) {
        return { success: false, message: 'User badges not found' };
      }

      return {
        success: true,
        data: {
          badgeId: userBadges.badgeId,
          badges: userBadges.badges,
          level: userBadges.level,
          streaks: userBadges.streaks,
          gamificationScores: userBadges.gamificationScores,
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Record achievement
   */
  static async recordAchievement(userId, achievementType, title, reward) {
    try {
      const userBadges = await UserBadge.findOne({ userId });
      if (!userBadges) {
        return { success: false, message: 'User badges not found' };
      }

      const achievementId = `ACH-${Date.now()}`;

      userBadges.achievements.push({
        achievementId,
        achievementType,
        title,
        unlockedAt: new Date(),
        reward,
      });

      await userBadges.save();

      return {
        success: true,
        data: userBadges,
        message: 'Achievement recorded',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get achievement summary
   */
  static async getAchievementSummary(userId) {
    try {
      const userBadges = await UserBadge.findOne({ userId });
      if (!userBadges) {
        return { success: false, message: 'User badges not found' };
      }

      return {
        success: true,
        data: {
          totalBadges: userBadges.badges.length,
          totalAchievements: userBadges.achievements.length,
          currentLevel: userBadges.level.currentLevel,
          totalExperience: userBadges.level.experience,
          gamificationScores: userBadges.gamificationScores,
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }
}

module.exports = BadgeService;
