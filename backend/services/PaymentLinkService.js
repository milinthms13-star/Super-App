/**
 * Payment Link Service - Phase 12
 * Shareable payment links with tracking
 */

const PaymentLink = require('../models/PaymentLink');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const QRCode = require('qrcode');
const logger = require('./logger');

class PaymentLinkService {
  /**
   * Create payment link
   */
  static async createPaymentLink(linkData) {
    try {
      const linkId = `PL_${uuidv4()}`;
      const linkToken = crypto.randomBytes(32).toString('hex');
      const expiryDate = new Date(Date.now() + (linkData.expiryDays || 30) * 24 * 60 * 60 * 1000);

      const paymentLink = new PaymentLink({
        linkId,
        linkToken,
        ...linkData,
        expiryDate,
        status: 'active',
      });

      // Generate QR code
      if (linkData.qrCode?.enabled !== false) {
        const shareUrl = paymentLink.getShareUrl();
        const qrCodeUrl = await QRCode.toDataURL(shareUrl);
        paymentLink.qrCode.imageUrl = qrCodeUrl;
        paymentLink.qrCode.generatedAt = new Date();
      }

      await paymentLink.save();

      logger.info(`Payment link created: ${linkId}`, {
        createdBy: linkData.createdBy,
        amount: linkData.paymentAmount,
      });

      return paymentLink;
    } catch (error) {
      logger.error('Error creating payment link:', error);
      throw error;
    }
  }

  /**
   * Get link by token
   */
  static async getLinkByToken(linkToken) {
    try {
      const link = await PaymentLink.findOne({ linkToken });

      if (!link) {
        throw new Error('Payment link not found');
      }

      if (link.isExpired()) {
        link.isExpired = true;
        link.status = 'expired';
        await link.save();
        throw new Error('Payment link has expired');
      }

      // Track view
      link.trackView();
      await link.save();

      return link;
    } catch (error) {
      logger.error('Error fetching payment link:', error);
      throw error;
    }
  }

  /**
   * Track payment link click
   */
  static async trackClick(linkToken) {
    try {
      const link = await PaymentLink.findOne({ linkToken });
      if (!link) {
        throw new Error('Payment link not found');
      }

      link.trackClick();
      await link.save();

      return link;
    } catch (error) {
      logger.error('Error tracking click:', error);
      throw error;
    }
  }

  /**
   * Record payment on link
   */
  static async recordPayment(linkToken, paymentData) {
    try {
      const link = await PaymentLink.findOne({ linkToken });
      if (!link) {
        throw new Error('Payment link not found');
      }

      link.analytics.paymentInitiatedCount += 1;

      if (paymentData.status === 'completed') {
        link.analytics.successfulPaymentCount += 1;
        link.analytics.totalAmountPaid += paymentData.amount;

        if (!link.allowPartialPayment || link.analytics.totalAmountPaid >= link.paymentAmount) {
          link.status = 'used';
        }
      }

      link.addPaymentRecord(paymentData);
      await link.save();

      logger.info(`Payment recorded on link: ${link.linkId}`, paymentData);
      return link;
    } catch (error) {
      logger.error('Error recording payment:', error);
      throw error;
    }
  }

  /**
   * Share payment link
   */
  static async shareLink(linkToken, shareMethod, sharedWith) {
    try {
      const link = await PaymentLink.findOne({ linkToken });
      if (!link) {
        throw new Error('Payment link not found');
      }

      link.shareInfo.sharedVia.push({
        method: shareMethod,
        sharedAt: new Date(),
        sharedWith,
      });

      await link.save();

      logger.info(`Link shared via ${shareMethod}:`, { linkId: link.linkId, sharedWith });
      return link;
    } catch (error) {
      logger.error('Error sharing link:', error);
      throw error;
    }
  }

  /**
   * Get links by creator
   */
  static async getLinksByCreator(createdBy, status = null) {
    try {
      const query = { createdBy };
      if (status) {
        query.status = status;
      }
      return await PaymentLink.find(query).sort({ createdAt: -1 });
    } catch (error) {
      logger.error('Error fetching links:', error);
      throw error;
    }
  }

  /**
   * Cancel payment link
   */
  static async cancelLink(linkToken, reason) {
    try {
      const link = await PaymentLink.findOne({ linkToken });
      if (!link) {
        throw new Error('Payment link not found');
      }

      link.status = 'cancelled';
      link.auditTrail.push({
        timestamp: new Date(),
        action: 'cancelled',
        details: { reason },
      });

      await link.save();

      logger.info(`Payment link cancelled: ${link.linkId}`, { reason });
      return link;
    } catch (error) {
      logger.error('Error cancelling link:', error);
      throw error;
    }
  }

  /**
   * Get link analytics
   */
  static async getLinkAnalytics(linkToken) {
    try {
      const link = await PaymentLink.findOne({ linkToken });
      if (!link) {
        throw new Error('Payment link not found');
      }

      return {
        linkId: link.linkId,
        status: link.status,
        analytics: link.analytics,
        paymentAmount: link.paymentAmount,
        paymentHistory: link.paymentHistory,
      };
    } catch (error) {
      logger.error('Error fetching analytics:', error);
      throw error;
    }
  }

  /**
   * Cleanup expired links
   */
  static async cleanupExpiredLinks() {
    try {
      const result = await PaymentLink.updateMany(
        { expiryDate: { $lt: new Date() }, isExpired: false },
        { isExpired: true, status: 'expired' }
      );

      logger.info(`Cleaned up ${result.modifiedCount} expired payment links`);
      return result;
    } catch (error) {
      logger.error('Error cleaning up expired links:', error);
      throw error;
    }
  }

  /**
   * Get link statistics
   */
  static async getLinkStatistics(createdBy) {
    try {
      const stats = await PaymentLink.aggregate([
        { $match: { createdBy } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalViews: { $sum: '$analytics.viewCount' },
            totalClicks: { $sum: '$analytics.clickCount' },
            totalPayments: { $sum: '$analytics.successfulPaymentCount' },
            totalAmount: { $sum: '$analytics.totalAmountPaid' },
          },
        },
      ]);

      return stats;
    } catch (error) {
      logger.error('Error fetching link statistics:', error);
      throw error;
    }
  }
}

module.exports = PaymentLinkService;
