/**
 * RatingAndReviewService.js
 * Comprehensive rating and review management for ridesharing platform
 * Supports user ratings, driver ratings, ride feedback, review moderation
 */

const mongoose = require('mongoose');

class RatingAndReviewService {
  /**
   * Submit a rating and review for a completed ride
   */
  static async submitRating(ratingData) {
    try {
      const {
        userId,
        riderId,
        driverId,
        rideId,
        ratingType, // 'driver' or 'rider'
        rating, // 1-5 stars
        categories, // {communication, cleanliness, safety, comfort, professionalism}
        reviewText,
        tags, // ['friendly', 'professional', 'safe-driver', etc.]
        isAnonymous = false
      } = ratingData;

      // Validation
      if (rating < 1 || rating > 5) {
        return {
          success: false,
          message: 'Rating must be between 1 and 5 stars'
        };
      }

      if (categories) {
        for (const [key, value] of Object.entries(categories)) {
          if (value < 1 || value > 5) {
            return {
              success: false,
              message: `Category ${key} must be between 1 and 5`
            };
          }
        }
      }

      const RatingModel = mongoose.model('ratings', new mongoose.Schema({}, { strict: false }));
      
      const ratingRecord = {
        ratingId: `rating_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        riderId,
        driverId,
        rideId,
        ratingType,
        rating,
        categories: categories || {},
        reviewText: reviewText || '',
        tags: tags || [],
        isAnonymous,
        status: 'pending_moderation', // pending_moderation, approved, rejected
        helpfulCount: 0,
        unhelpfulCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const collection = mongoose.connection.collection('ratings');
      const result = await collection.insertOne(ratingRecord);

      return {
        success: true,
        message: 'Rating submitted successfully',
        data: {
          ratingId: ratingRecord.ratingId,
          status: ratingRecord.status
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error submitting rating: ${error.message}`
      };
    }
  }

  /**
   * Get all ratings for a specific user (driver or rider)
   */
  static async getUserRatings(userId, ratingType, page = 1, limit = 20) {
    try {
      const collection = mongoose.connection.collection('ratings');
      
      const skip = (page - 1) * limit;
      const query = {
        [ratingType === 'driver' ? 'driverId' : 'riderId']: userId,
        status: 'approved'
      };

      const ratings = await collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .toArray();

      const total = await collection.countDocuments(query);

      return {
        success: true,
        data: {
          ratings,
          pagination: {
            total,
            pages: Math.ceil(total / limit),
            currentPage: page
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching ratings: ${error.message}`
      };
    }
  }

  /**
   * Get rating statistics for a user
   */
  static async getUserRatingStats(userId, ratingType) {
    try {
      const collection = mongoose.connection.collection('ratings');
      const query = {
        [ratingType === 'driver' ? 'driverId' : 'riderId']: userId,
        status: 'approved'
      };

      const ratings = await collection.find(query).lean().toArray();
      
      if (ratings.length === 0) {
        return {
          success: true,
          data: {
            averageRating: 0,
            totalRatings: 0,
            distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            categoryAverages: {}
          }
        };
      }

      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const categoryTotals = {};
      let ratingSum = 0;

      ratings.forEach(r => {
        ratingSum += r.rating;
        distribution[r.rating]++;
        
        if (r.categories) {
          Object.entries(r.categories).forEach(([key, value]) => {
            if (!categoryTotals[key]) categoryTotals[key] = [];
            categoryTotals[key].push(value);
          });
        }
      });

      const categoryAverages = {};
      Object.entries(categoryTotals).forEach(([key, values]) => {
        categoryAverages[key] = values.reduce((a, b) => a + b, 0) / values.length;
      });

      return {
        success: true,
        data: {
          averageRating: (ratingSum / ratings.length).toFixed(2),
          totalRatings: ratings.length,
          distribution,
          categoryAverages
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error calculating rating stats: ${error.message}`
      };
    }
  }

  /**
   * Moderate a review (approve/reject)
   */
  static async moderateReview(ratingId, action, reason = '') {
    try {
      if (!['approve', 'reject'].includes(action)) {
        return {
          success: false,
          message: 'Action must be approve or reject'
        };
      }

      const collection = mongoose.connection.collection('ratings');
      const status = action === 'approve' ? 'approved' : 'rejected';

      const result = await collection.updateOne(
        { ratingId },
        {
          $set: {
            status,
            moderatedAt: new Date(),
            moderationReason: reason,
            updatedAt: new Date()
          }
        }
      );

      if (result.matchedCount === 0) {
        return {
          success: false,
          message: 'Rating not found'
        };
      }

      return {
        success: true,
        message: `Review ${action}ed successfully`,
        data: { ratingId, status }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error moderating review: ${error.message}`
      };
    }
  }

  /**
   * Mark review as helpful/unhelpful
   */
  static async markHelpful(ratingId, helpful = true) {
    try {
      const collection = mongoose.connection.collection('ratings');
      const field = helpful ? 'helpfulCount' : 'unhelpfulCount';

      const result = await collection.updateOne(
        { ratingId },
        {
          $inc: { [field]: 1 },
          $set: { updatedAt: new Date() }
        }
      );

      if (result.matchedCount === 0) {
        return {
          success: false,
          message: 'Rating not found'
        };
      }

      return {
        success: true,
        message: `Marked as ${helpful ? 'helpful' : 'unhelpful'}`,
        data: { ratingId, [field]: true }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error marking helpful: ${error.message}`
      };
    }
  }

  /**
   * Get detailed ride review
   */
  static async getRideReview(rideId) {
    try {
      const collection = mongoose.connection.collection('ratings');
      
      const riderReview = await collection.findOne({
        rideId,
        ratingType: 'driver',
        status: 'approved'
      });

      const driverReview = await collection.findOne({
        rideId,
        ratingType: 'rider',
        status: 'approved'
      });

      return {
        success: true,
        data: {
          rideId,
          riderReview: riderReview || null,
          driverReview: driverReview || null
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching ride review: ${error.message}`
      };
    }
  }

  /**
   * Get trending tags and categories
   */
  static async getTrendingTags(period = 'weekly', limit = 20) {
    try {
      const collection = mongoose.connection.collection('ratings');
      
      const daysAgo = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
      const dateFilter = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      const tags = await collection.aggregate([
        {
          $match: {
            createdAt: { $gte: dateFilter },
            status: 'approved',
            tags: { $exists: true, $ne: [] }
          }
        },
        {
          $unwind: '$tags'
        },
        {
          $group: {
            _id: '$tags',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: limit
        }
      ]).toArray();

      return {
        success: true,
        data: {
          period,
          tags: tags.map(t => ({ tag: t._id, count: t.count }))
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching trending tags: ${error.message}`
      };
    }
  }

  /**
   * Respond to a review
   */
  static async respondToReview(ratingId, userId, responseText) {
    try {
      const collection = mongoose.connection.collection('ratings');

      const result = await collection.updateOne(
        { ratingId },
        {
          $set: {
            response: {
              userId,
              text: responseText,
              createdAt: new Date()
            },
            updatedAt: new Date()
          }
        }
      );

      if (result.matchedCount === 0) {
        return {
          success: false,
          message: 'Rating not found'
        };
      }

      return {
        success: true,
        message: 'Response added successfully',
        data: { ratingId }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error responding to review: ${error.message}`
      };
    }
  }

  /**
   * Flag review as inappropriate
   */
  static async flagReview(ratingId, reportingUserId, reason, description = '') {
    try {
      const collection = mongoose.connection.collection('rating_flags');

      const flagRecord = {
        flagId: `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ratingId,
        reportingUserId,
        reason, // 'offensive', 'fake', 'spam', 'other'
        description,
        status: 'pending', // pending, resolved, dismissed
        createdAt: new Date()
      };

      const result = await collection.insertOne(flagRecord);

      // Increment flag count on rating
      const ratingsCollection = mongoose.connection.collection('ratings');
      await ratingsCollection.updateOne(
        { ratingId },
        { $inc: { flagCount: 1 }, $set: { updatedAt: new Date() } }
      );

      return {
        success: true,
        message: 'Review flagged successfully',
        data: { flagId: flagRecord.flagId }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error flagging review: ${error.message}`
      };
    }
  }
}

module.exports = RatingAndReviewService;
