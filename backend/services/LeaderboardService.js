/**
 * Leaderboard Service - Phase 9 Feature C
 * Ranking system, leaderboard management, competitive rankings
 */

const UserBadge = require('../models/UserBadge');

class LeaderboardService {
  /**
   * Get global leaderboard by orders
   */
  static async getGlobalLeaderboard(limit = 100) {
    try {
      const leaderboard = await UserBadge.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            userId: 1,
            username: '$user.name',
            level: '$level.currentLevel',
            experience: '$level.experience',
            engagementScore: '$gamificationScores.engagementScore',
          },
        },
        { $sort: { experience: -1 } },
        { $limit: limit },
        {
          $group: {
            _id: null,
            users: {
              $push: {
                rank: { $add: [{ $indexOfArray: ['$experience'] }, 1] },
                userId: '$userId',
                username: '$username',
                level: '$level',
                experience: '$experience',
                score: '$engagementScore',
              },
            },
          },
        },
      ]);

      return {
        success: true,
        data: leaderboard[0]?.users || [],
        message: 'Global leaderboard retrieved',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get leaderboard by city
   */
  static async getCityLeaderboard(city, limit = 50) {
    try {
      const leaderboard = await UserBadge.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        { $match: { 'user.city': city } },
        {
          $project: {
            userId: 1,
            username: '$user.name',
            level: '$level.currentLevel',
            experience: '$level.experience',
            engagementScore: '$gamificationScores.engagementScore',
          },
        },
        { $sort: { experience: -1 } },
        { $limit: limit },
      ]);

      return {
        success: true,
        data: leaderboard,
        message: `${city} leaderboard retrieved`,
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get leaderboard by category
   */
  static async getCategoryLeaderboard(category = 'spending', limit = 50) {
    try {
      let sortField = 'engagementScore';

      if (category === 'reviews') {
        sortField = { $size: '$achievements' };
      } else if (category === 'level') {
        sortField = '$level.currentLevel';
      } else if (category === 'streaks') {
        sortField = '$streaks.orderingStreak.currentStreak';
      }

      const leaderboard = await UserBadge.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            userId: 1,
            username: '$user.name',
            level: '$level.currentLevel',
            experience: '$level.experience',
            categoryScore: sortField,
            badges: { $size: '$badges' },
          },
        },
        { $sort: { categoryScore: -1 } },
        { $limit: limit },
      ]);

      return {
        success: true,
        data: leaderboard,
        message: `${category} leaderboard retrieved`,
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get user rank in global leaderboard
   */
  static async getUserRank(userId) {
    try {
      const userBadges = await UserBadge.findOne({ userId });
      if (!userBadges) {
        return { success: false, message: 'User badges not found' };
      }

      // Count users with more experience
      const rank = await UserBadge.countDocuments({
        'level.experience': { $gt: userBadges.level.experience },
      });

      return {
        success: true,
        data: {
          userId,
          rank: rank + 1,
          experience: userBadges.level.experience,
          level: userBadges.level.currentLevel,
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get friends leaderboard
   */
  static async getFriendsLeaderboard(userId, limit = 20) {
    try {
      const userBadges = await UserBadge.findOne({ userId });
      if (!userBadges) {
        return { success: false, message: 'User badges not found' };
      }

      // Get friends list (would be from User model in real app)
      // For now, return top users similar to current user's level
      const leaderboard = await UserBadge.find({
        'level.currentLevel': {
          $gte: userBadges.level.currentLevel - 2,
          $lte: userBadges.level.currentLevel + 2,
        },
        userId: { $ne: userId },
      })
        .sort({ 'level.experience': -1 })
        .limit(limit);

      return {
        success: true,
        data: leaderboard,
        message: 'Friends leaderboard retrieved',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get seasonal leaderboard
   */
  static async getSeasonalLeaderboard(season, limit = 50) {
    try {
      // Season would be based on date range or explicit field
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - (season === 'current' ? 1 : 3));

      const leaderboard = await UserBadge.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            userId: 1,
            username: '$user.name',
            level: '$level.currentLevel',
            experience: '$level.experience',
            communityScore: '$gamificationScores.communityScore',
          },
        },
        { $sort: { communityScore: -1, experience: -1 } },
        { $limit: limit },
      ]);

      return {
        success: true,
        data: leaderboard,
        message: `${season} seasonal leaderboard`,
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Update leaderboard rankings
   */
  static async updateLeaderboardRankings() {
    try {
      const users = await UserBadge.find({}).sort({ 'level.experience': -1 });

      let rank = 1;
      for (const user of users) {
        user.leaderboardPositions.globalRank = rank;
        await user.save();
        rank++;
      }

      return {
        success: true,
        data: {
          totalUsersRanked: users.length,
        },
        message: 'Leaderboard rankings updated',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get top performers
   */
  static async getTopPerformers(category = 'experience', limit = 10) {
    try {
      const topUsers = await UserBadge.find({})
        .sort({ 'leaderboardPositions.globalRank': 1 })
        .limit(limit);

      return {
        success: true,
        data: topUsers,
        message: 'Top performers retrieved',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }
}

module.exports = LeaderboardService;
