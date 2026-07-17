const EcommercePayout = require('../models/EcommercePayout');
const EcommerceTransaction = require('../models/EcommerceTransaction');
const EcommerceSellerProfile = require('../models/EcommerceSellerProfile');

class PayoutManagementService {
  /**
   * Get seller payout history
   */
  async getSellerPayouts(sellerId, filters = {}) {
    try {
      const sellerProfile = await EcommerceSellerProfile.findOne({ user: sellerId });
      if (!sellerProfile) {
        throw new Error('Seller profile not found');
      }

      const {
        status,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = filters;

      const query = { seller: sellerProfile._id };

      if (status) {
        query.status = status;
      }

      if (startDate || endDate) {
        query.periodStart = {};
        if (startDate) query.periodStart.$gte = new Date(startDate);
        if (endDate) query.periodStart.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;

      const [payouts, total] = await Promise.all([
        EcommercePayout.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        EcommercePayout.countDocuments(query)
      ]);

      return {
        payouts,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get payout details
   */
  async getPayoutDetails(payoutId, sellerId) {
    try {
      const sellerProfile = await EcommerceSellerProfile.findOne({ user: sellerId });
      if (!sellerProfile) {
        throw new Error('Seller profile not found');
      }

      const payout = await EcommercePayout.findOne({
        _id: payoutId,
        seller: sellerProfile._id
      }).lean();

      if (!payout) {
        throw new Error('Payout not found');
      }

      // Get transaction breakdown
      const transactions = await EcommerceTransaction.find({
        _id: { $in: payout.transactions }
      })
        .populate('order', 'orderId createdAt')
        .lean();

      return {
        payout,
        transactions
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Request payout (early payout request)
   */
  async requestPayout(sellerId) {
    try {
      const sellerProfile = await EcommerceSellerProfile.findOne({ user: sellerId });
      if (!sellerProfile) {
        throw new Error('Seller profile not found');
      }

      // Check if bank details are verified
      if (!sellerProfile.bankDetails?.verified) {
        throw new Error('Please verify your bank details before requesting payout');
      }

      // Get pending transactions
      const transactions = await EcommerceTransaction.find({
        seller: sellerProfile._id,
        payoutStatus: 'pending',
        status: 'completed'
      });

      if (transactions.length === 0) {
        throw new Error('No pending transactions available for payout');
      }

      const totalAmount = transactions.reduce((sum, t) => sum + t.sellerAmount, 0);

      // Check minimum payout threshold (e.g., ₹1000)
      const minThreshold = 1000;
      if (totalAmount < minThreshold) {
        throw new Error(`Minimum payout amount is ₹${minThreshold}. Current balance: ₹${totalAmount}`);
      }

      // Create payout request
      const payout = new EcommercePayout({
        seller: sellerProfile._id,
        amount: totalAmount,
        currency: 'INR',
        status: 'pending_approval',
        paymentMethod: 'bank_transfer',
        bankDetails: {
          accountNumber: sellerProfile.bankDetails.accountNumber,
          ifscCode: sellerProfile.bankDetails.ifscCode,
          accountHolderName: sellerProfile.bankDetails.accountHolderName,
          bankName: sellerProfile.bankDetails.bankName
        },
        transactions: transactions.map(t => t._id),
        transactionCount: transactions.length,
        requestedAt: new Date()
      });

      await payout.save();

      // Update transaction payout status
      await EcommerceTransaction.updateMany(
        { _id: { $in: transactions.map(t => t._id) } },
        { payoutStatus: 'processing', payoutId: payout._id }
      );

      return {
        success: true,
        payout,
        message: 'Payout request submitted successfully. It will be processed within 2-3 business days.'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get seller payout summary
   */
  async getPayoutSummary(sellerId) {
    try {
      const sellerProfile = await EcommerceSellerProfile.findOne({ user: sellerId });
      if (!sellerProfile) {
        throw new Error('Seller profile not found');
      }

      // Get pending balance
      const pendingTransactions = await EcommerceTransaction.find({
        seller: sellerProfile._id,
        payoutStatus: 'pending',
        status: 'completed'
      });

      const pendingBalance = pendingTransactions.reduce((sum, t) => sum + t.sellerAmount, 0);

      // Get processing payouts
      const processingPayouts = await EcommercePayout.find({
        seller: sellerProfile._id,
        status: { $in: ['pending_approval', 'approved', 'processing'] }
      });

      const processingAmount = processingPayouts.reduce((sum, p) => sum + p.amount, 0);

      // Get completed payouts (this month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const completedPayouts = await EcommercePayout.find({
        seller: sellerProfile._id,
        status: 'completed',
        completedAt: { $gte: startOfMonth }
      });

      const thisMonthPaid = completedPayouts.reduce((sum, p) => sum + p.amount, 0);

      // Get total lifetime payouts
      const lifetimePayouts = await EcommercePayout.aggregate([
        {
          $match: {
            seller: sellerProfile._id,
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);

      const lifetimeStats = lifetimePayouts[0] || { total: 0, count: 0 };

      // Next scheduled payout date (assuming weekly schedule)
      const nextPayoutDate = this._getNextPayoutDate();

      return {
        pendingBalance,
        processingAmount,
        thisMonthPaid,
        lifetimePaid: lifetimeStats.total,
        totalPayouts: lifetimeStats.count,
        nextPayoutDate,
        bankVerified: sellerProfile.bankDetails?.verified || false,
        minPayoutAmount: 1000
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Admin: Get all pending payout requests
   */
  async getPendingPayoutRequests(filters = {}) {
    try {
      const {
        page = 1,
        limit = 20
      } = filters;

      const query = {
        status: 'pending_approval'
      };

      const skip = (page - 1) * limit;

      const [payouts, total] = await Promise.all([
        EcommercePayout.find(query)
          .populate({
            path: 'seller',
            populate: { path: 'user', select: 'email username' }
          })
          .sort({ requestedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        EcommercePayout.countDocuments(query)
      ]);

      return {
        payouts,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Admin: Approve payout
   */
  async approvePayout(payoutId, adminId, approvalNotes = '') {
    try {
      const payout = await EcommercePayout.findById(payoutId);
      if (!payout) {
        throw new Error('Payout not found');
      }

      if (payout.status !== 'pending_approval') {
        throw new Error('Payout is not pending approval');
      }

      payout.status = 'approved';
      payout.approvedBy = adminId;
      payout.approvedAt = new Date();
      payout.approvalNotes = approvalNotes;
      await payout.save();

      return {
        success: true,
        payout,
        message: 'Payout approved successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Admin: Reject payout
   */
  async rejectPayout(payoutId, adminId, rejectionReason) {
    try {
      const payout = await EcommercePayout.findById(payoutId);
      if (!payout) {
        throw new Error('Payout not found');
      }

      if (payout.status !== 'pending_approval') {
        throw new Error('Payout is not pending approval');
      }

      payout.status = 'rejected';
      payout.rejectedBy = adminId;
      payout.rejectedAt = new Date();
      payout.rejectionReason = rejectionReason;
      await payout.save();

      // Reset transaction payout status
      await EcommerceTransaction.updateMany(
        { _id: { $in: payout.transactions } },
        { payoutStatus: 'pending', $unset: { payoutId: 1 } }
      );

      return {
        success: true,
        message: 'Payout rejected successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Admin: Mark payout as completed
   */
  async completePayout(payoutId, adminId, paymentDetails) {
    try {
      const payout = await EcommercePayout.findById(payoutId);
      if (!payout) {
        throw new Error('Payout not found');
      }

      if (payout.status !== 'approved' && payout.status !== 'processing') {
        throw new Error('Payout must be approved before marking as completed');
      }

      payout.status = 'completed';
      payout.completedAt = new Date();
      payout.paymentReference = paymentDetails.paymentReference;
      payout.paymentDetails = paymentDetails;
      await payout.save();

      // Update transaction payout status
      await EcommerceTransaction.updateMany(
        { _id: { $in: payout.transactions } },
        { payoutStatus: 'completed' }
      );

      // Update seller metrics
      const sellerProfile = await EcommerceSellerProfile.findById(payout.seller);
      if (sellerProfile) {
        sellerProfile.metrics.totalCommissionPaid += payout.amount;
        await sellerProfile.save();
      }

      return {
        success: true,
        payout,
        message: 'Payout marked as completed successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate payout invoice
   */
  async generatePayoutInvoice(payoutId, sellerId) {
    try {
      const sellerProfile = await EcommerceSellerProfile.findOne({ user: sellerId });
      if (!sellerProfile) {
        throw new Error('Seller profile not found');
      }

      const payout = await EcommercePayout.findOne({
        _id: payoutId,
        seller: sellerProfile._id
      }).populate('seller');

      if (!payout) {
        throw new Error('Payout not found');
      }

      const transactions = await EcommerceTransaction.find({
        _id: { $in: payout.transactions }
      }).populate('order');

      // Generate invoice data
      const invoice = {
        invoiceNumber: `PAY-${payout._id.toString().slice(-8).toUpperCase()}`,
        date: payout.completedAt || payout.createdAt,
        seller: {
          name: sellerProfile.businessName,
          email: sellerProfile.sellerEmail,
          gst: sellerProfile.taxInfo?.gstNumber,
          address: sellerProfile.businessAddress
        },
        payout: {
          id: payout._id,
          amount: payout.amount,
          transactionCount: payout.transactionCount,
          periodStart: payout.periodStart,
          periodEnd: payout.periodEnd,
          status: payout.status
        },
        transactions: transactions.map(t => ({
          orderId: t.order?.orderId,
          date: t.createdAt,
          orderAmount: t.orderAmount,
          commissionAmount: t.commissionAmount,
          commissionRate: t.commissionRate,
          sellerAmount: t.sellerAmount,
          gstAmount: t.gstAmount
        })),
        summary: {
          totalOrderAmount: transactions.reduce((sum, t) => sum + t.orderAmount, 0),
          totalCommission: transactions.reduce((sum, t) => sum + t.commissionAmount, 0),
          totalGST: transactions.reduce((sum, t) => sum + t.gstAmount, 0),
          netPayout: payout.amount
        }
      };

      return invoice;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get next scheduled payout date
   */
  _getNextPayoutDate() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // Assuming payouts are processed every Friday
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    
    const nextPayout = new Date(today);
    nextPayout.setDate(today.getDate() + daysUntilFriday);
    nextPayout.setHours(0, 0, 0, 0);
    
    return nextPayout;
  }

  /**
   * Get payout statistics for admin
   */
  async getPayoutStatistics(filters = {}) {
    try {
      const { startDate, endDate } = filters;
      const dateQuery = {};
      
      if (startDate || endDate) {
        dateQuery.createdAt = {};
        if (startDate) dateQuery.createdAt.$gte = new Date(startDate);
        if (endDate) dateQuery.createdAt.$lte = new Date(endDate);
      }

      const [
        totalPayouts,
        pendingApproval,
        processing,
        completed,
        rejected,
        totalAmount,
        avgPayoutAmount
      ] = await Promise.all([
        EcommercePayout.countDocuments(dateQuery),
        EcommercePayout.countDocuments({ ...dateQuery, status: 'pending_approval' }),
        EcommercePayout.countDocuments({ ...dateQuery, status: { $in: ['approved', 'processing'] } }),
        EcommercePayout.countDocuments({ ...dateQuery, status: 'completed' }),
        EcommercePayout.countDocuments({ ...dateQuery, status: 'rejected' }),
        EcommercePayout.aggregate([
          { $match: { ...dateQuery, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        EcommercePayout.aggregate([
          { $match: dateQuery },
          { $group: { _id: null, avg: { $avg: '$amount' } } }
        ])
      ]);

      return {
        totalPayouts,
        pendingApproval,
        processing,
        completed,
        rejected,
        totalAmount: totalAmount[0]?.total || 0,
        avgPayoutAmount: avgPayoutAmount[0]?.avg || 0
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PayoutManagementService();
