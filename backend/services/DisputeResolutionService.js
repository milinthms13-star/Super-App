/**
 * DisputeResolutionService.js
 * Buyer-seller dispute resolution workflow and escalation
 */

const logger = require('../config/logger');

class DisputeResolutionService {
  /**
   * Create dispute
   */
  static async createDispute(userId, orderId, disputeData) {
    try {
      const User = require('../models/User');
      const Order = require('../models/Order');
      const Dispute = require('../models/Dispute');

      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const order = await Order.findById(orderId);
      if (!order) throw new Error('Order not found');

      if (order.userId.toString() !== userId.toString() && !user.role === 'admin') {
        throw new Error('Unauthorized to create dispute for this order');
      }

      // Check if dispute already exists
      const existingDispute = await Dispute.findOne({
        orderId,
        status: { $in: ['open', 'in-review', 'escalated'] },
      });

      if (existingDispute) {
        throw new Error('An active dispute already exists for this order');
      }

      // Categorize dispute
      const category = this._categorizeDispute(disputeData.reason);

      const dispute = new Dispute({
        orderId,
        buyerId: order.userId,
        sellerId: order.vendorId,
        reason: disputeData.reason,
        description: disputeData.description,
        category,
        evidenceFiles: disputeData.evidenceFiles || [],
        status: 'open',
        priority: this._calculatePriority(disputeData.reason),
        timeline: {
          openedAt: new Date(),
          sellerResponseDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
          resolutionDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
        },
        resolution: null,
        escalatons: 0,
      });

      await dispute.save();

      // Notify seller
      await this._notifyParty(order.vendorId, 'dispute_created', dispute._id);

      logger.info(`Dispute created for order ${orderId}`);

      return {
        success: true,
        data: dispute,
        message: 'Dispute created successfully',
      };
    } catch (error) {
      logger.error('Error creating dispute:', error);
      throw error;
    }
  }

  /**
   * Submit seller response
   */
  static async submitSellerResponse(disputeId, vendorId, responseData) {
    try {
      const Dispute = require('../models/Dispute');

      const dispute = await Dispute.findById(disputeId);
      if (!dispute) throw new Error('Dispute not found');

      if (dispute.sellerId.toString() !== vendorId.toString()) {
        throw new Error('Unauthorized');
      }

      if (dispute.status !== 'open') {
        throw new Error('Can only respond to open disputes');
      }

      dispute.sellerResponse = {
        text: responseData.text,
        submittedAt: new Date(),
        evidenceFiles: responseData.evidenceFiles || [],
      };

      dispute.status = 'in-review';

      await dispute.save();

      // Notify buyer
      await this._notifyParty(dispute.buyerId, 'seller_responded', disputeId);

      logger.info(`Seller response submitted to dispute ${disputeId}`);

      return {
        success: true,
        data: dispute,
        message: 'Response submitted successfully',
      };
    } catch (error) {
      logger.error('Error submitting seller response:', error);
      throw error;
    }
  }

  /**
   * Submit buyer reply
   */
  static async submitBuyerReply(disputeId, userId, replyData) {
    try {
      const Dispute = require('../models/Dispute');

      const dispute = await Dispute.findById(disputeId);
      if (!dispute) throw new Error('Dispute not found');

      if (dispute.buyerId.toString() !== userId.toString()) {
        throw new Error('Unauthorized');
      }

      if (!dispute.sellerResponse) {
        throw new Error('Cannot reply before seller responds');
      }

      dispute.buyerReplies = dispute.buyerReplies || [];
      dispute.buyerReplies.push({
        text: replyData.text,
        submittedAt: new Date(),
        evidenceFiles: replyData.evidenceFiles || [],
      });

      await dispute.save();

      logger.info(`Buyer reply added to dispute ${disputeId}`);

      return {
        success: true,
        data: dispute,
        message: 'Reply submitted',
      };
    } catch (error) {
      logger.error('Error submitting buyer reply:', error);
      throw error;
    }
  }

  /**
   * Get dispute details
   */
  static async getDisputeDetails(disputeId, userId = null) {
    try {
      const Dispute = require('../models/Dispute');

      const dispute = await Dispute.findById(disputeId)
        .populate('orderId')
        .populate('buyerId', 'name email')
        .populate('sellerId', 'storeName email');

      if (!dispute) throw new Error('Dispute not found');

      // Check if user has access
      if (
        userId &&
        dispute.buyerId._id.toString() !== userId &&
        dispute.sellerId._id.toString() !== userId
      ) {
        // Filter sensitive data for non-involved parties
        dispute.sellerResponse = null;
      }

      return {
        dispute,
      };
    } catch (error) {
      logger.error('Error getting dispute details:', error);
      throw error;
    }
  }

  /**
   * Auto-resolve dispute based on evidence
   */
  static async autoResolveDispute(disputeId) {
    try {
      const Dispute = require('../models/Dispute');

      const dispute = await Dispute.findById(disputeId);
      if (!dispute) throw new Error('Dispute not found');

      // Analysis logic (simplified)
      const resolution = this._analyzeEvidence(dispute);

      dispute.status = 'resolved';
      dispute.resolution = resolution;
      dispute.resolvedAt = new Date();

      await dispute.save();

      // Process refund if needed
      if (resolution.action === 'refund') {
        await this._processRefund(dispute.orderId, resolution.amount);
      }

      // Notify both parties
      await this._notifyParty(dispute.buyerId, 'dispute_resolved', disputeId);
      await this._notifyParty(dispute.sellerId, 'dispute_resolved', disputeId);

      logger.info(`Dispute ${disputeId} auto-resolved`);

      return {
        success: true,
        data: dispute,
        message: 'Dispute resolved',
      };
    } catch (error) {
      logger.error('Error auto-resolving dispute:', error);
      throw error;
    }
  }

  /**
   * Escalate dispute to admin
   */
  static async escalateDispute(disputeId, reason = '') {
    try {
      const Dispute = require('../models/Dispute');

      const dispute = await Dispute.findById(disputeId);
      if (!dispute) throw new Error('Dispute not found');

      if (dispute.escalatons >= 2) {
        throw new Error('Maximum escalation limit reached');
      }

      dispute.status = 'escalated';
      dispute.escalatons = (dispute.escalatons || 0) + 1;
      dispute.escalationHistory = dispute.escalationHistory || [];
      dispute.escalationHistory.push({
        escalatedAt: new Date(),
        reason,
        escalationLevel: dispute.escalatons,
      });

      dispute.timeline.escalationDeadline = new Date(
        Date.now() + 5 * 24 * 60 * 60 * 1000
      ); // 5 days

      await dispute.save();

      // Notify admin
      await this._notifyAdmin('dispute_escalated', disputeId);

      logger.info(`Dispute ${disputeId} escalated to level ${dispute.escalatons}`);

      return {
        success: true,
        data: dispute,
        message: 'Dispute escalated to admin',
      };
    } catch (error) {
      logger.error('Error escalating dispute:', error);
      throw error;
    }
  }

  /**
   * Admin decision on dispute
   */
  static async adminDecision(disputeId, decision) {
    try {
      const Dispute = require('../models/Dispute');

      const dispute = await Dispute.findById(disputeId);
      if (!dispute) throw new Error('Dispute not found');

      const resolution = {
        decidedBy: 'admin',
        action: decision.action, // 'refund', 'reject', 'partial_refund'
        amount: decision.amount || 0,
        reason: decision.reason,
        decidedAt: new Date(),
      };

      dispute.status = 'resolved';
      dispute.resolution = resolution;

      await dispute.save();

      // Process action
      if (resolution.action === 'refund' || resolution.action === 'partial_refund') {
        await this._processRefund(dispute.orderId, resolution.amount);
      }

      // Notify both parties
      await this._notifyParty(dispute.buyerId, 'admin_decision', disputeId);
      await this._notifyParty(dispute.sellerId, 'admin_decision', disputeId);

      logger.info(`Admin decision made on dispute ${disputeId}`);

      return {
        success: true,
        data: dispute,
        message: 'Decision recorded',
      };
    } catch (error) {
      logger.error('Error recording admin decision:', error);
      throw error;
    }
  }

  /**
   * Get user's disputes
   */
  static async getUserDisputes(userId, role = 'buyer') {
    try {
      const Dispute = require('../models/Dispute');

      const field = role === 'seller' ? 'sellerId' : 'buyerId';
      const disputes = await Dispute.find({ [field]: userId }).sort({ createdAt: -1 });

      return {
        disputes,
        total: disputes.length,
        byStatus: this._groupByStatus(disputes),
      };
    } catch (error) {
      logger.error('Error getting user disputes:', error);
      throw error;
    }
  }

  /**
   * Get open disputes for admin
   */
  static async getOpenDisputes(limit = 50) {
    try {
      const Dispute = require('../models/Dispute');

      const disputes = await Dispute.find({
        status: { $in: ['open', 'in-review', 'escalated'] },
      })
        .sort({ priority: -1, createdAt: 1 })
        .limit(limit)
        .populate('orderId', 'orderNumber totalAmount')
        .populate('buyerId', 'name email')
        .populate('sellerId', 'storeName email');

      return {
        disputes,
        total: disputes.length,
      };
    } catch (error) {
      logger.error('Error getting open disputes:', error);
      throw error;
    }
  }

  /**
   * Categorize dispute
   */
  static _categorizeDispute(reason) {
    const reasonLower = reason.toLowerCase();

    if (
      reasonLower.includes('not received') ||
      reasonLower.includes('missing')
    ) {
      return 'item_not_received';
    }
    if (reasonLower.includes('damaged') || reasonLower.includes('broken')) {
      return 'item_damaged';
    }
    if (reasonLower.includes('defective') || reasonLower.includes('not working')) {
      return 'item_defective';
    }
    if (reasonLower.includes('fake') || reasonLower.includes('counterfeit')) {
      return 'counterfeit_item';
    }
    if (reasonLower.includes('different') || reasonLower.includes('wrong')) {
      return 'wrong_item';
    }
    if (reasonLower.includes('quality')) {
      return 'quality_issue';
    }
    if (reasonLower.includes('false')) {
      return 'false_advertisement';
    }

    return 'other';
  }

  /**
   * Calculate dispute priority
   */
  static _calculatePriority(reason) {
    const reasonLower = reason.toLowerCase();

    if (
      reasonLower.includes('fake') ||
      reasonLower.includes('counterfeit') ||
      reasonLower.includes('fraud')
    ) {
      return 'high';
    }
    if (reasonLower.includes('not received') || reasonLower.includes('missing')) {
      return 'high';
    }
    if (reasonLower.includes('damaged')) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Analyze evidence to auto-resolve
   */
  static _analyzeEvidence(dispute) {
    const buyerEvidence = dispute.buyerReplies?.length || 0;
    const sellerEvidence = dispute.sellerResponse ? 1 : 0;

    // Simple logic: if buyer has more evidence, favor buyer
    if (buyerEvidence > sellerEvidence) {
      return {
        action: 'refund',
        amount: dispute.orderId?.totalAmount || 0,
        reason: 'Buyer evidence more compelling',
        confidence: 0.8,
      };
    }

    if (sellerEvidence > buyerEvidence) {
      return {
        action: 'reject',
        amount: 0,
        reason: 'Seller evidence contradicts claim',
        confidence: 0.75,
      };
    }

    // Balanced evidence: partial refund
    return {
      action: 'partial_refund',
      amount: (dispute.orderId?.totalAmount || 0) * 0.5,
      reason: 'Evidence balanced, partial resolution',
      confidence: 0.6,
    };
  }

  /**
   * Group disputes by status
   */
  static _groupByStatus(disputes) {
    return {
      open: disputes.filter(d => d.status === 'open').length,
      in_review: disputes.filter(d => d.status === 'in-review').length,
      escalated: disputes.filter(d => d.status === 'escalated').length,
      resolved: disputes.filter(d => d.status === 'resolved').length,
    };
  }

  /**
   * Process refund (mock)
   */
  static async _processRefund(orderId, amount) {
    try {
      const Order = require('../models/Order');

      await Order.findByIdAndUpdate(orderId, {
        refundStatus: 'initiated',
        refundAmount: amount,
        refundProcessedAt: new Date(),
      });

      logger.info(`Refund initiated for order ${orderId}: ₹${amount}`);
    } catch (error) {
      logger.error('Error processing refund:', error);
    }
  }

  /**
   * Notify party (mock)
   */
  static async _notifyParty(userId, eventType, disputeId) {
    try {
      logger.info(`Notification sent to user ${userId}: ${eventType} for dispute ${disputeId}`);
      // In production: send email/SMS/push notification
    } catch (error) {
      logger.error('Error notifying party:', error);
    }
  }

  /**
   * Notify admin (mock)
   */
  static async _notifyAdmin(eventType, disputeId) {
    try {
      logger.info(`Admin notification: ${eventType} for dispute ${disputeId}`);
    } catch (error) {
      logger.error('Error notifying admin:', error);
    }
  }
}

module.exports = DisputeResolutionService;
