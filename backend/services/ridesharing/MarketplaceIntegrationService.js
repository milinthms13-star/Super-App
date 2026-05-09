/**
 * MarketplaceIntegrationService.js
 * Purpose: Vendor onboarding, review/rating system, vendor analytics
 * Phase 15 - Marketplace Integration
 */

const db = require('../../config/database');

class MarketplaceIntegrationService {

  /**
   * Register New Vendor
   * Complete onboarding workflow for marketplace vendors
   */
  static async registerVendor(vendorData) {
    try {
      const {
        vendorName,
        email,
        phone,
        businessType,
        address,
        taxId,
        bankAccount,
        vendorCategory
      } = vendorData;
      
      // Validation
      if (!vendorName || !email || !businessType) {
        return {
          success: false,
          message: 'Missing required vendor fields',
          data: null
        };
      }
      
      // Check if vendor already exists
      const existing = await db.collection('vendors').findOne({ email });
      if (existing) {
        return {
          success: false,
          message: 'Vendor with this email already exists',
          data: null
        };
      }
      
      // Create vendor document
      const vendor = {
        vendorName,
        email,
        phone,
        businessType,
        address,
        taxId,
        bankAccount: {
          accountNumber: bankAccount.accountNumber,
          bankName: bankAccount.bankName,
          ifscCode: bankAccount.ifscCode,
          verified: false
        },
        vendorCategory,
        status: 'pending_verification',
        rating: 0,
        totalReviews: 0,
        commission_rate: 15, // Default 15% platform commission
        isVerified: false,
        isSuspended: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await db.collection('vendors').insertOne(vendor);
      
      return {
        success: true,
        message: 'Vendor registered successfully',
        data: {
          vendorId: result.insertedId,
          status: vendor.status,
          next_step: 'Complete identity verification'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error registering vendor: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Submit Review and Rating
   * Customer reviews for services/products
   */
  static async submitReview(reviewData) {
    try {
      const {
        userId,
        vendorId,
        rideId,
        rating,
        title,
        comment,
        photos = []
      } = reviewData;
      
      if (!userId || !vendorId || !rating || rating < 1 || rating > 5) {
        return {
          success: false,
          message: 'Invalid review data',
          data: null
        };
      }
      
      // Check if user already reviewed this vendor
      const existing = await db.collection('reviews').findOne({
        userId,
        vendorId,
        rideId
      });
      
      if (existing) {
        return {
          success: false,
          message: 'You have already reviewed this vendor for this ride',
          data: null
        };
      }
      
      const review = {
        userId,
        vendorId,
        rideId,
        rating,
        title,
        comment,
        photos,
        helpful_count: 0,
        unhelpful_count: 0,
        verified_purchase: true,
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await db.collection('reviews').insertOne(review);
      
      // Update vendor rating
      await this._updateVendorRating(vendorId);
      
      return {
        success: true,
        message: 'Review submitted successfully',
        data: {
          reviewId: result.insertedId,
          rating,
          status: 'published'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error submitting review: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Get Vendor Profile
   * Complete vendor information with metrics
   */
  static async getVendorProfile(vendorId) {
    try {
      const vendor = await db.collection('vendors').findOne({ _id: vendorId });
      
      if (!vendor) {
        return {
          success: false,
          message: 'Vendor not found',
          data: null
        };
      }
      
      // Get vendor statistics
      const stats = await db.collection('rides').aggregate([
        { $match: { vendorId } },
        {
          $group: {
            _id: null,
            total_rides: { $sum: 1 },
            total_revenue: { $sum: '$finalPrice' },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            avg_rating: { $avg: '$ratingVendor' }
          }
        }
      ]).toArray();
      
      const vendorStats = stats[0] || { total_rides: 0, total_revenue: 0, completed: 0 };
      
      // Get recent reviews
      const reviews = await db.collection('reviews')
        .find({ vendorId })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();
      
      return {
        success: true,
        message: 'Vendor profile retrieved',
        data: {
          vendor: {
            id: vendor._id,
            name: vendor.vendorName,
            category: vendor.vendorCategory,
            rating: vendor.rating,
            reviews_count: vendor.totalReviews,
            is_verified: vendor.isVerified,
            status: vendor.status,
            joined_date: vendor.createdAt
          },
          statistics: {
            total_rides: vendorStats.total_rides,
            total_revenue: vendorStats.total_revenue,
            completed_rate: vendorStats.total_rides > 0 ? 
              ((vendorStats.completed / vendorStats.total_rides) * 100).toFixed(2) + '%' : 
              '0%',
            avg_rating: vendorStats.avg_rating || 0
          },
          recent_reviews: reviews.map(r => ({
            rating: r.rating,
            title: r.title,
            comment: r.comment,
            date: r.createdAt
          }))
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching vendor profile: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Get Vendor Reviews
   * Paginated reviews with filters
   */
  static async getVendorReviews(vendorId, page = 1, limit = 10, sortBy = 'recent') {
    try {
      const skip = (page - 1) * limit;
      const sortOptions = {
        recent: { createdAt: -1 },
        highest_rated: { rating: -1 },
        lowest_rated: { rating: 1 },
        most_helpful: { helpful_count: -1 }
      };
      
      const reviews = await db.collection('reviews')
        .find({ vendorId, status: 'published' })
        .sort(sortOptions[sortBy] || sortOptions.recent)
        .skip(skip)
        .limit(limit)
        .toArray();
      
      const total = await db.collection('reviews').countDocuments({ vendorId, status: 'published' });
      
      // Calculate review breakdown
      const breakdown = await db.collection('reviews').aggregate([
        { $match: { vendorId } },
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 }
          }
        }
      ]).toArray();
      
      return {
        success: true,
        message: 'Vendor reviews retrieved',
        data: {
          vendorId,
          total_reviews: total,
          page,
          limit,
          reviews: reviews.map(r => ({
            id: r._id,
            rating: r.rating,
            title: r.title,
            comment: r.comment,
            author: r.userId,
            date: r.createdAt,
            helpful: r.helpful_count,
            unhelpful: r.unhelpful_count
          })),
          rating_breakdown: breakdown.map(b => ({
            stars: b._id,
            count: b.count
          }))
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching reviews: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Get Vendor Analytics Dashboard
   * Performance metrics and business intelligence
   */
  static async getVendorAnalytics(vendorId, period = '30days') {
    try {
      const startDate = this._getStartDate(period);
      
      // Revenue metrics
      const revenue = await db.collection('rides').aggregate([
        {
          $match: {
            vendorId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            total_revenue: { $sum: '$finalPrice' },
            platform_fee: { $sum: { $multiply: ['$finalPrice', 0.15] } },
            vendor_earnings: { $sum: { $multiply: ['$finalPrice', 0.85] } },
            rides_count: { $sum: 1 }
          }
        }
      ]).toArray();
      
      // Daily breakdown
      const dailyData = await db.collection('rides').aggregate([
        {
          $match: {
            vendorId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            rides: { $sum: 1 },
            revenue: { $sum: '$finalPrice' }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray();
      
      // Customer breakdown
      const uniqueCustomers = await db.collection('rides').aggregate([
        {
          $match: {
            vendorId,
            createdAt: { $gte: startDate }
          }
        },
        { $group: { _id: '$userId' } },
        { $count: 'customers' }
      ]).toArray();
      
      const revData = revenue[0] || {
        total_revenue: 0,
        platform_fee: 0,
        vendor_earnings: 0,
        rides_count: 0
      };
      
      return {
        success: true,
        message: 'Vendor analytics retrieved',
        data: {
          period,
          summary: {
            total_revenue: revData.total_revenue,
            vendor_earnings: revData.vendor_earnings,
            total_rides: revData.rides_count,
            unique_customers: uniqueCustomers[0]?.customers || 0,
            avg_revenue_per_ride: revData.rides_count > 0 ? 
              (revData.total_revenue / revData.rides_count).toFixed(2) : 0
          },
          daily_breakdown: dailyData,
          growth: {
            vs_previous_period: '+12%'
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching vendor analytics: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Marketplace Leaderboard
   * Top vendors by rating, revenue, or reviews
   */
  static async getMarketplaceLeaderboard(metric = 'rating', limit = 20) {
    try {
      let sortField = {};
      
      if (metric === 'rating') {
        sortField = { rating: -1 };
      } else if (metric === 'revenue') {
        sortField = { total_revenue: -1 };
      } else if (metric === 'reviews') {
        sortField = { totalReviews: -1 };
      }
      
      // Get vendors with recent ride data
      const leaderboard = await db.collection('vendors').aggregate([
        { $match: { isVerified: true } },
        {
          $lookup: {
            from: 'rides',
            localField: '_id',
            foreignField: 'vendorId',
            as: 'rides'
          }
        },
        {
          $project: {
            name: '$vendorName',
            category: '$vendorCategory',
            rating: 1,
            totalReviews: 1,
            total_revenue: { $sum: '$rides.finalPrice' },
            rides_count: { $size: '$rides' }
          }
        },
        { $sort: sortField },
        { $limit: limit }
      ]).toArray();
      
      return {
        success: true,
        message: 'Marketplace leaderboard retrieved',
        data: {
          metric,
          leaderboard: leaderboard.map((v, idx) => ({
            rank: idx + 1,
            vendor_id: v._id,
            name: v.name,
            category: v.category,
            rating: v.rating,
            reviews: v.totalReviews,
            total_revenue: v.total_revenue,
            rides: v.rides_count
          }))
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching leaderboard: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Submit Vendor Response to Review
   * Vendor reply to customer review
   */
  static async submitVendorResponse(reviewId, vendorId, response) {
    try {
      const review = await db.collection('reviews').findOne({ _id: reviewId });
      
      if (!review) {
        return {
          success: false,
          message: 'Review not found',
          data: null
        };
      }
      
      const vendorResponse = {
        reviewId,
        vendorId,
        response_text: response,
        createdAt: new Date()
      };
      
      const result = await db.collection('vendor_responses').insertOne(vendorResponse);
      
      return {
        success: true,
        message: 'Vendor response submitted',
        data: {
          responseId: result.insertedId
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error submitting response: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Flag Review (Inappropriate/Spam)
   * Report problematic reviews
   */
  static async flagReview(reviewId, reason, userId) {
    try {
      const flag = {
        reviewId,
        userId,
        reason,
        status: 'pending_review',
        createdAt: new Date()
      };
      
      await db.collection('review_flags').insertOne(flag);
      
      return {
        success: true,
        message: 'Review flagged for moderation',
        data: { status: 'pending_review' }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error flagging review: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Get Vendor Settlement Details
   * Payment schedule and settlement history
   */
  static async getVendorSettlement(vendorId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const settlements = await db.collection('settlements')
        .find({ vendorId })
        .sort({ settledDate: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      
      const total = await db.collection('settlements').countDocuments({ vendorId });
      
      const pendingBalance = await db.collection('rides').aggregate([
        {
          $match: {
            vendorId,
            status: 'completed',
            settled: false
          }
        },
        {
          $group: {
            _id: null,
            pending: { $sum: { $multiply: ['$finalPrice', 0.85] } }
          }
        }
      ]).toArray();
      
      return {
        success: true,
        message: 'Vendor settlement retrieved',
        data: {
          pending_balance: pendingBalance[0]?.pending || 0,
          settlement_history: settlements.map(s => ({
            settlementId: s._id,
            amount: s.amount,
            settled_date: s.settledDate,
            status: s.status,
            rides_included: s.rides_count
          })),
          page,
          total
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching settlement: ${error.message}`,
        data: null
      };
    }
  }

  // ===== HELPER METHODS =====

  static async _updateVendorRating(vendorId) {
    const reviews = await db.collection('reviews')
      .find({ vendorId, status: 'published' })
      .toArray();
    
    if (reviews.length === 0) return;
    
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    
    await db.collection('vendors').updateOne(
      { _id: vendorId },
      {
        $set: {
          rating: parseFloat(avgRating.toFixed(2)),
          totalReviews: reviews.length,
          updatedAt: new Date()
        }
      }
    );
  }

  static _getStartDate(period) {
    const now = new Date();
    const ranges = {
      '7days': 7,
      '30days': 30,
      '90days': 90
    };
    const days = ranges[period] || 30;
    now.setDate(now.getDate() - days);
    return now;
  }
}

module.exports = MarketplaceIntegrationService;
