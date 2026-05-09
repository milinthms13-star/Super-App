/**
 * DriverRatingService.js
 * Manages driver ratings and reviews
 */

const DriverRating = require('../../models/DriverRating');
const Driver = require('../../models/Driver');
const RideRequest = require('../../models/RideRequest');

class DriverRatingService {
  /**
   * Submit rating and review for driver
   */
  async submitRating(rideId, ratedBy, rating, comment = '', tags = []) {
    try {
      // Validate rating
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      // Get ride details
      const ride = await RideRequest.findById(rideId).populate('driverId');
      if (!ride) {
        throw new Error('Ride not found');
      }

      // Prevent duplicate ratings
      const existingRating = await DriverRating.findOne({
        rideId,
        ratedBy,
      });
      if (existingRating) {
        throw new Error('You have already rated this ride');
      }

      // Create rating
      const driverRating = new DriverRating({
        rideId,
        driverId: ride.driverId._id,
        ratedBy,
        rating,
        comment: comment.substring(0, 500), // Limit comment length
        tags: tags.slice(0, 5), // Limit to 5 tags
        timestamp: new Date(),
      });

      await driverRating.save();

      // Update driver's average rating
      const ratings = await DriverRating.find({ driverId: ride.driverId._id });
      const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
      const ratingCount = ratings.length;

      await Driver.findByIdAndUpdate(
        ride.driverId._id,
        {
          averageRating: parseFloat(avgRating.toFixed(2)),
          totalRatings: ratingCount,
          lastRated: new Date(),
        },
        { new: true }
      );

      return {
        success: true,
        ratingId: driverRating._id,
        averageRating: avgRating.toFixed(2),
        ratingCount,
      };
    } catch (error) {
      throw new Error(`Rating submission failed: ${error.message}`);
    }
  }

  /**
   * Get driver's ratings and reviews
   */
  async getDriverRatings(driverId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const ratings = await DriverRating.find({ driverId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('ratedBy', 'firstName lastName avatar');

      const total = await DriverRating.countDocuments({ driverId });

      // Calculate rating distribution
      const allRatings = await DriverRating.find({ driverId });
      const distribution = {
        5: allRatings.filter(r => r.rating === 5).length,
        4: allRatings.filter(r => r.rating === 4).length,
        3: allRatings.filter(r => r.rating === 3).length,
        2: allRatings.filter(r => r.rating === 2).length,
        1: allRatings.filter(r => r.rating === 1).length,
      };

      return {
        ratings,
        distribution,
        total,
        page,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new Error(`Failed to fetch ratings: ${error.message}`);
    }
  }

  /**
   * Get driver rating summary
   */
  async getDriverRatingSummary(driverId) {
    try {
      const driver = await Driver.findById(driverId).select(
        'averageRating totalRatings'
      );

      if (!driver) {
        throw new Error('Driver not found');
      }

      const ratings = await DriverRating.find({ driverId });

      const distribution = {
        5: ratings.filter(r => r.rating === 5).length,
        4: ratings.filter(r => r.rating === 4).length,
        3: ratings.filter(r => r.rating === 3).length,
        2: ratings.filter(r => r.rating === 2).length,
        1: ratings.filter(r => r.rating === 1).length,
      };

      const topTags = this.getTopTags(ratings);

      return {
        averageRating: driver.averageRating || 0,
        totalRatings: driver.totalRatings || 0,
        distribution,
        topTags,
        recentComment: ratings[0]?.comment || null,
      };
    } catch (error) {
      throw new Error(`Failed to get rating summary: ${error.message}`);
    }
  }

  /**
   * Get top rated tags for driver
   */
  getTopTags(ratings) {
    const tagCount = {};
    ratings.forEach(rating => {
      rating.tags.forEach(tag => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));
  }

  /**
   * Update rating (only by the person who rated)
   */
  async updateRating(ratingId, ratedBy, rating, comment = '', tags = []) {
    try {
      const existingRating = await DriverRating.findById(ratingId);
      if (!existingRating) {
        throw new Error('Rating not found');
      }

      if (existingRating.ratedBy.toString() !== ratedBy) {
        throw new Error('Unauthorized to update this rating');
      }

      existingRating.rating = rating;
      existingRating.comment = comment.substring(0, 500);
      existingRating.tags = tags.slice(0, 5);
      existingRating.updatedAt = new Date();

      await existingRating.save();

      // Recalculate driver rating
      const ratings = await DriverRating.find({
        driverId: existingRating.driverId,
      });
      const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

      await Driver.findByIdAndUpdate(
        existingRating.driverId,
        {
          averageRating: parseFloat(avgRating.toFixed(2)),
          lastRated: new Date(),
        },
        { new: true }
      );

      return {
        success: true,
        averageRating: avgRating.toFixed(2),
      };
    } catch (error) {
      throw new Error(`Failed to update rating: ${error.message}`);
    }
  }

  /**
   * Delete rating (only by the person who rated)
   */
  async deleteRating(ratingId, ratedBy) {
    try {
      const rating = await DriverRating.findById(ratingId);
      if (!rating) {
        throw new Error('Rating not found');
      }

      if (rating.ratedBy.toString() !== ratedBy) {
        throw new Error('Unauthorized to delete this rating');
      }

      const driverId = rating.driverId;
      await DriverRating.findByIdAndDelete(ratingId);

      // Recalculate driver rating
      const ratings = await DriverRating.find({ driverId });
      if (ratings.length > 0) {
        const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
        await Driver.findByIdAndUpdate(
          driverId,
          {
            averageRating: parseFloat(avgRating.toFixed(2)),
            totalRatings: ratings.length,
          },
          { new: true }
        );
      } else {
        await Driver.findByIdAndUpdate(
          driverId,
          {
            averageRating: 0,
            totalRatings: 0,
          },
          { new: true }
        );
      }

      return { success: true, message: 'Rating deleted' };
    } catch (error) {
      throw new Error(`Failed to delete rating: ${error.message}`);
    }
  }

  /**
   * Get ratings statistics
   */
  async getRatingStatistics(driverId) {
    try {
      const ratings = await DriverRating.find({ driverId });

      if (ratings.length === 0) {
        return {
          averageRating: 0,
          totalRatings: 0,
          avgCommentLength: 0,
          mostCommonTag: null,
          ratingTrend: [],
        };
      }

      const avgCommentLength =
        ratings.reduce((sum, r) => sum + r.comment.length, 0) / ratings.length;

      // Get tag frequency
      const tagCount = {};
      ratings.forEach(r => {
        r.tags.forEach(tag => {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        });
      });

      const mostCommonTag = Object.entries(tagCount).sort((a, b) => b[1] - a[1])[0]?.[0];

      return {
        averageRating: (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(2),
        totalRatings: ratings.length,
        avgCommentLength: avgCommentLength.toFixed(0),
        mostCommonTag,
        ratingTrend: this.calculateRatingTrend(ratings),
      };
    } catch (error) {
      throw new Error(`Failed to get statistics: ${error.message}`);
    }
  }

  /**
   * Calculate rating trend over time
   */
  calculateRatingTrend(ratings) {
    const trend = {};
    ratings.forEach(r => {
      const date = r.timestamp.toISOString().split('T')[0];
      if (!trend[date]) {
        trend[date] = { count: 0, total: 0 };
      }
      trend[date].count += 1;
      trend[date].total += r.rating;
    });

    return Object.entries(trend)
      .map(([date, data]) => ({
        date,
        averageRating: (data.total / data.count).toFixed(2),
        count: data.count,
      }))
      .slice(-7); // Last 7 days
  }
}

module.exports = new DriverRatingService();
