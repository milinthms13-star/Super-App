/**
 * Commission Service - Phase 12
 * Commission calculation and payout management
 */

const Commission = require('../models/Commission');
const Payment = require('../models/Payment');
const { randomUUID } = require('crypto');
const logger = require('./logger');

class CommissionService {
  /**
   * Calculate and create commission
   */
  static async createCommission(commissionData) {
    try {
      const commissionId = `COM_${randomUUID()}`;

      // Calculate commission
      let commissionAmount = (commissionData.orderAmount * commissionData.commissionRate) / 100;

      // Apply minimum commission
      if (commissionData.minimumCommission) {
        commissionAmount = Math.max(commissionAmount, commissionData.minimumCommission);
      }

      // Apply maximum commission
      if (commissionData.maximumCommission) {
        commissionAmount = Math.min(commissionAmount, commissionData.maximumCommission);
      }

      // Apply discount
      const discountedAmount = commissionAmount - (commissionData.discountApplied || 0);

      // Calculate taxes (GST)
      const taxRate = commissionData.taxBreakdown?.gst?.rate || 18;
      const taxAmount = (discountedAmount * taxRate) / 100;
      const payableAmount = discountedAmount + taxAmount;

      const commission = new Commission({
        commissionId,
        ...commissionData,
        commissionAmount,
        netCommission: discountedAmount,
        totalTax: taxAmount,
        payableAmount,
        status: 'pending',
      });

      await commission.save();

      logger.info(`Commission created: ${commissionId}`, {
        linkedPaymentId: commissionData.linkedPaymentId,
        amount: commissionAmount,
      });

      return commission;
    } catch (error) {
      logger.error('Error creating commission:', error);
      throw error;
    }
  }

  /**
   * Approve commission
   */
  static async approveCommission(commissionId, approvedBy, notes) {
    try {
      const commission = await Commission.findOne({ commissionId });
      if (!commission || commission.status !== 'pending') {
        throw new Error('Commission cannot be approved');
      }

      commission.approve(approvedBy, notes);
      commission.auditTrail.push({
        timestamp: new Date(),
        action: 'approved',
        performedBy: approvedBy,
        details: { notes },
      });

      await commission.save();

      logger.info(`Commission approved: ${commissionId}`, { approvedBy });
      return commission;
    } catch (error) {
      logger.error('Error approving commission:', error);
      throw error;
    }
  }

  /**
   * Reject commission
   */
  static async rejectCommission(commissionId, reason) {
    try {
      const commission = await Commission.findOne({ commissionId });
      if (!commission) {
        throw new Error('Commission not found');
      }

      commission.reject(reason);
      commission.auditTrail.push({
        timestamp: new Date(),
        action: 'rejected',
        performedBy: 'admin',
        details: { reason },
      });

      await commission.save();

      logger.info(`Commission rejected: ${commissionId}`, { reason });
      return commission;
    } catch (error) {
      logger.error('Error rejecting commission:', error);
      throw error;
    }
  }

  /**
   * Hold commission
   */
  static async holdCommission(commissionId, reason, holdDays) {
    try {
      const commission = await Commission.findOne({ commissionId });
      if (!commission) {
        throw new Error('Commission not found');
      }

      commission.hold(reason, holdDays);
      commission.auditTrail.push({
        timestamp: new Date(),
        action: 'held',
        performedBy: 'admin',
        details: { reason, holdDays },
      });

      await commission.save();

      logger.info(`Commission held: ${commissionId}`, { holdDays });
      return commission;
    } catch (error) {
      logger.error('Error holding commission:', error);
      throw error;
    }
  }

  /**
   * Get commission by ID
   */
  static async getCommission(commissionId) {
    try {
      return await Commission.findOne({ commissionId });
    } catch (error) {
      logger.error('Error fetching commission:', error);
      throw error;
    }
  }

  /**
   * Get restaurant commissions
   */
  static async getRestaurantCommissions(restaurantId, status = null, options = {}) {
    try {
      const query = { linkedRestaurantId: restaurantId };
      if (status) {
        query.status = status;
      }

      const skip = (options.page - 1) * (options.limit || 20);

      return await Commission.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(options.limit || 20);
    } catch (error) {
      logger.error('Error fetching restaurant commissions:', error);
      throw error;
    }
  }

  /**
   * Get commissions pending settlement
   */
  static async getCommissionsPendingSettlement(status = 'approved') {
    try {
      return await Commission.find({
        status,
        payoutStatus: 'not_paid',
        holdUntilDate: { $lte: new Date() },
      }).sort({ createdAt: 1 });
    } catch (error) {
      logger.error('Error fetching commissions pending settlement:', error);
      throw error;
    }
  }

  /**
   * Mark commissions as settled
   */
  static async markAsSettled(commissionIds, settlementId) {
    try {
      const result = await Commission.updateMany(
        { commissionId: { $in: commissionIds } },
        {
          $set: {
            status: 'settled',
            settlementId,
            settledAt: new Date(),
          },
        }
      );

      logger.info(`Marked ${result.modifiedCount} commissions as settled`, { settlementId });
      return result;
    } catch (error) {
      logger.error('Error marking commissions as settled:', error);
      throw error;
    }
  }

  /**
   * Mark commission as paid
   */
  static async markAsPaid(commissionId, payoutDate) {
    try {
      const commission = await Commission.findOne({ commissionId });
      if (!commission) {
        throw new Error('Commission not found');
      }

      commission.markAsPaid(payoutDate);
      commission.auditTrail.push({
        timestamp: new Date(),
        action: 'paid',
        performedBy: 'system',
        details: { payoutDate },
      });

      await commission.save();

      logger.info(`Commission marked as paid: ${commissionId}`);
      return commission;
    } catch (error) {
      logger.error('Error marking commission as paid:', error);
      throw error;
    }
  }

  /**
   * Get commission statistics
   */
  static async getCommissionStats(restaurantId, period) {
    try {
      const startDate = new Date();
      const endDate = new Date();

      switch (period) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      const stats = await Commission.aggregate([
        {
          $match: {
            linkedRestaurantId: restaurantId,
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalCommission: { $sum: '$commissionAmount' },
            totalPayable: { $sum: '$payableAmount' },
            totalTax: { $sum: '$totalTax' },
          },
        },
      ]);

      return stats;
    } catch (error) {
      logger.error('Error fetching commission stats:', error);
      throw error;
    }
  }

  /**
   * Bulk create commissions
   */
  static async bulkCreateCommissions(commissionsData) {
    try {
      const commissions = commissionsData.map((data) => ({
        commissionId: `COM_${randomUUID()}`,
        ...data,
        status: 'pending',
      }));

      const result = await Commission.insertMany(commissions);

      logger.info(`Bulk created ${result.length} commissions`);
      return result;
    } catch (error) {
      logger.error('Error bulk creating commissions:', error);
      throw error;
    }
  }
}

module.exports = CommissionService;
