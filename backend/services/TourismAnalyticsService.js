const TourismPackage = require('../models/TourismPackage');
const TourismBooking = require('../models/TourismBooking');
const TourismVendor = require('../models/TourismVendor');
const TourismReview = require('../models/TourismReview');
const TourismPayment = require('../models/TourismPayment');
const logger = require('../utils/logger');

class TourismAnalyticsService {
  /**
   * Get overall dashboard metrics
   */
  async getDashboardMetrics(dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      const dateFilter = this.buildDateFilter(startDate, endDate);

      const [
        totalBookings,
        totalRevenue,
        totalPackages,
        totalVendors,
        avgBookingValue,
        conversionRate,
        topPackages,
        revenueByMonth,
      ] = await Promise.all([
        this.getTotalBookings(dateFilter),
        this.getTotalRevenue(dateFilter),
        TourismPackage.countDocuments({ isActive: true }),
        TourismVendor.countDocuments({ isActive: true }),
        this.getAverageBookingValue(dateFilter),
        this.getConversionRate(dateFilter),
        this.getTopPackages(5, dateFilter),
        this.getRevenueByMonth(dateFilter),
      ]);

      return {
        overview: {
          totalBookings,
          totalRevenue,
          totalPackages,
          totalVendors,
          avgBookingValue,
          conversionRate,
        },
        topPackages,
        revenueByMonth,
      };
    } catch (error) {
      logger.error('Error getting dashboard metrics:', error);
      throw error;
    }
  }

  /**
   * Get vendor performance metrics
   */
  async getVendorAnalytics(vendorId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      const dateFilter = this.buildDateFilter(startDate, endDate);
      const filter = { vendorId, ...dateFilter };

      const [
        totalBookings,
        totalRevenue,
        activePackages,
        avgRating,
        bookingsByStatus,
        revenueByPackage,
        conversionRate,
      ] = await Promise.all([
        TourismBooking.countDocuments(filter),
        this.calculateRevenue(filter),
        TourismPackage.countDocuments({ vendorId, isActive: true }),
        this.getVendorAverageRating(vendorId),
        this.getBookingsByStatus(filter),
        this.getRevenueByPackage(vendorId, dateFilter),
        this.getVendorConversionRate(vendorId, dateFilter),
      ]);

      return {
        overview: {
          totalBookings,
          totalRevenue,
          activePackages,
          avgRating,
          conversionRate,
        },
        bookingsByStatus,
        revenueByPackage,
      };
    } catch (error) {
      logger.error('Error getting vendor analytics:', error);
      throw error;
    }
  }

  /**
   * Get booking analytics
   */
  async getBookingAnalytics(dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      const dateFilter = this.buildDateFilter(startDate, endDate);

      const [
        bookingsByStatus,
        bookingsByCategory,
        bookingsByDestination,
        bookingTrends,
        avgDaysToBooking,
        paymentMethodDistribution,
      ] = await Promise.all([
        this.getBookingsByStatus(dateFilter),
        this.getBookingsByCategory(dateFilter),
        this.getBookingsByDestination(dateFilter),
        this.getBookingTrends(dateFilter),
        this.getAverageDaysToBooking(dateFilter),
        this.getPaymentMethodDistribution(dateFilter),
      ]);

      return {
        bookingsByStatus,
        bookingsByCategory,
        bookingsByDestination,
        bookingTrends,
        avgDaysToBooking,
        paymentMethodDistribution,
      };
    } catch (error) {
      logger.error('Error getting booking analytics:', error);
      throw error;
    }
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      const dateFilter = this.buildDateFilter(startDate, endDate);

      const [
        totalRevenue,
        revenueByMonth,
        revenueByCategory,
        revenueByVendor,
        refundedAmount,
        pendingRevenue,
      ] = await Promise.all([
        this.calculateRevenue(dateFilter),
        this.getRevenueByMonth(dateFilter),
        this.getRevenueByCategory(dateFilter),
        this.getTopVendorsByRevenue(10, dateFilter),
        this.getRefundedAmount(dateFilter),
        this.getPendingRevenue(dateFilter),
      ]);

      return {
        totalRevenue,
        revenueByMonth,
        revenueByCategory,
        topVendors: revenueByVendor,
        refundedAmount,
        pendingRevenue,
        netRevenue: totalRevenue - refundedAmount,
      };
    } catch (error) {
      logger.error('Error getting revenue analytics:', error);
      throw error;
    }
  }

  /**
   * Get popular packages
   */
  async getPopularPackages(limit = 10, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      const dateFilter = this.buildDateFilter(startDate, endDate);

      const packages = await TourismPackage.aggregate([
        { $match: { isActive: true, approvalStatus: 'approved' } },
        {
          $lookup: {
            from: 'tourismbookings',
            let: { packageId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$packageId', '$$packageId'] },
                  ...dateFilter,
                },
              },
            ],
            as: 'bookings',
          },
        },
        {
          $addFields: {
            bookingsCount: { $size: '$bookings' },
            totalRevenue: {
              $sum: '$bookings.amountSummary.paidAmount',
            },
          },
        },
        { $sort: { bookingsCount: -1, views: -1 } },
        { $limit: limit },
        {
          $project: {
            title: 1,
            destination: 1,
            category: 1,
            rating: 1,
            reviewsCount: 1,
            bookingsCount: 1,
            totalRevenue: 1,
            views: 1,
          },
        },
      ]);

      return packages;
    } catch (error) {
      logger.error('Error getting popular packages:', error);
      throw error;
    }
  }

  // Helper methods

  buildDateFilter(startDate, endDate) {
    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    return filter;
  }

  async getTotalBookings(filter = {}) {
    return await TourismBooking.countDocuments(filter);
  }

  async calculateRevenue(filter = {}) {
    const result = await TourismBooking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: '$amountSummary.paidAmount' },
        },
      },
    ]);
    return result[0]?.total || 0;
  }

  async getTotalRevenue(filter = {}) {
    return await this.calculateRevenue(filter);
  }

  async getAverageBookingValue(filter = {}) {
    const result = await TourismBooking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          avg: { $avg: '$amountSummary.totalAmount' },
        },
      },
    ]);
    return Math.round(result[0]?.avg || 0);
  }

  async getConversionRate(filter = {}) {
    const [packages, bookings] = await Promise.all([
      TourismPackage.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, totalViews: { $sum: '$views' } } },
      ]),
      TourismBooking.countDocuments(filter),
    ]);

    const totalViews = packages[0]?.totalViews || 0;
    return totalViews > 0 ? ((bookings / totalViews) * 100).toFixed(2) : 0;
  }

  async getTopPackages(limit, filter = {}) {
    return await TourismPackage.find({ isActive: true })
      .sort({ bookingsCount: -1, rating: -1 })
      .limit(limit)
      .select('title destination bookingsCount rating reviewsCount')
      .lean();
  }

  async getRevenueByMonth(filter = {}) {
    const result = await TourismBooking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: '$amountSummary.paidAmount' },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: [
                  { $lt: ['$_id.month', 10] },
                  { $concat: ['0', { $toString: '$_id.month' }] },
                  { $toString: '$_id.month' },
                ],
              },
            ],
          },
          revenue: 1,
          bookings: 1,
        },
      },
    ]);
    return result;
  }

  async getBookingsByStatus(filter = {}) {
    const result = await TourismBooking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$bookingStatus',
          count: { $sum: 1 },
        },
      },
    ]);
    return result.map(item => ({ status: item._id, count: item.count }));
  }

  async getBookingsByCategory(filter = {}) {
    const result = await TourismBooking.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'tourismpackages',
          localField: 'packageId',
          foreignField: '_id',
          as: 'package',
        },
      },
      { $unwind: '$package' },
      {
        $group: {
          _id: '$package.category',
          count: { $sum: 1 },
          revenue: { $sum: '$amountSummary.paidAmount' },
        },
      },
      { $sort: { count: -1 } },
    ]);
    return result.map(item => ({
      category: item._id,
      count: item.count,
      revenue: item.revenue,
    }));
  }

  async getBookingsByDestination(filter = {}) {
    const result = await TourismBooking.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'tourismpackages',
          localField: 'packageId',
          foreignField: '_id',
          as: 'package',
        },
      },
      { $unwind: '$package' },
      {
        $group: {
          _id: '$package.destination',
          count: { $sum: 1 },
          revenue: { $sum: '$amountSummary.paidAmount' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    return result.map(item => ({
      destination: item._id,
      count: item.count,
      revenue: item.revenue,
    }));
  }

  async getBookingTrends(filter = {}) {
    const result = await TourismBooking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
          revenue: { $sum: '$amountSummary.paidAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    return result.map(item => ({
      date: item._id,
      count: item.count,
      revenue: item.revenue,
    }));
  }

  async getAverageDaysToBooking(filter = {}) {
    const result = await TourismBooking.aggregate([
      { $match: { ...filter, travelDate: { $exists: true } } },
      {
        $project: {
          daysToTravel: {
            $divide: [
              { $subtract: [{ $dateFromString: { dateString: '$travelDate' } }, '$createdAt'] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgDays: { $avg: '$daysToTravel' },
        },
      },
    ]);
    return Math.round(result[0]?.avgDays || 0);
  }

  async getPaymentMethodDistribution(filter = {}) {
    const result = await TourismPayment.aggregate([
      { $match: { ...filter, status: 'success' } },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);
    return result.map(item => ({
      method: item._id || 'online',
      count: item.count,
      totalAmount: item.totalAmount,
    }));
  }

  async getRevenueByCategory(filter = {}) {
    return await this.getBookingsByCategory(filter);
  }

  async getRevenueByPackage(vendorId, filter = {}) {
    const result = await TourismBooking.aggregate([
      { $match: { vendorId, ...filter } },
      {
        $group: {
          _id: '$packageId',
          packageTitle: { $first: '$packageTitle' },
          revenue: { $sum: '$amountSummary.paidAmount' },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]);
    return result.map(item => ({
      packageTitle: item.packageTitle,
      revenue: item.revenue,
      bookings: item.bookings,
    }));
  }

  async getTopVendorsByRevenue(limit, filter = {}) {
    const result = await TourismBooking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$vendorId',
          vendorName: { $first: '$vendorName' },
          revenue: { $sum: '$amountSummary.paidAmount' },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
    ]);
    return result.map(item => ({
      vendorName: item.vendorName,
      revenue: item.revenue,
      bookings: item.bookings,
    }));
  }

  async getRefundedAmount(filter = {}) {
    const result = await TourismBooking.aggregate([
      {
        $match: {
          ...filter,
          refundStatus: { $in: ['completed', 'processing'] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$refundAmount' },
        },
      },
    ]);
    return result[0]?.total || 0;
  }

  async getPendingRevenue(filter = {}) {
    const result = await TourismBooking.aggregate([
      {
        $match: {
          ...filter,
          bookingStatus: { $in: ['pending', 'confirmed'] },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $subtract: ['$amountSummary.totalAmount', '$amountSummary.paidAmount'],
            },
          },
        },
      },
    ]);
    return result[0]?.total || 0;
  }

  async getVendorAverageRating(vendorId) {
    const packages = await TourismPackage.find({ vendorId }).select('rating');
    if (packages.length === 0) return 0;
    const avgRating = packages.reduce((sum, pkg) => sum + (pkg.rating || 0), 0) / packages.length;
    return Number(avgRating.toFixed(1));
  }

  async getVendorConversionRate(vendorId, filter = {}) {
    const packages = await TourismPackage.find({ vendorId }).select('views');
    const totalViews = packages.reduce((sum, pkg) => sum + (pkg.views || 0), 0);
    const bookings = await TourismBooking.countDocuments({ vendorId, ...filter });
    return totalViews > 0 ? ((bookings / totalViews) * 100).toFixed(2) : 0;
  }
}

module.exports = new TourismAnalyticsService();
