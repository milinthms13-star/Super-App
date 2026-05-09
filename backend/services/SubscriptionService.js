/**
 * Subscription Service - Phase 12
 * Recurring payment management
 */

const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const PaymentService = require('./PaymentService');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

class SubscriptionService {
  /**
   * Create subscription
   */
  static async createSubscription(subscriptionData) {
    try {
      const subscriptionId = `SUB_${uuidv4()}`;
      const nextBillingDate = this.calculateNextBillingDate(
        subscriptionData.startDate,
        subscriptionData.planDuration
      );

      const subscription = new Subscription({
        subscriptionId,
        ...subscriptionData,
        nextBillingDate,
        status: 'pending',
      });

      await subscription.save();

      logger.info(`Subscription created: ${subscriptionId}`, {
        orderId: subscriptionData.orderId,
        userId: subscriptionData.userId,
      });

      return subscription;
    } catch (error) {
      logger.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Activate subscription
   */
  static async activateSubscription(subscriptionId) {
    try {
      const subscription = await Subscription.findOne({ subscriptionId });
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      subscription.status = 'active';
      subscription.addAuditEntry('activated', 'system', { timestamp: new Date() });
      await subscription.save();

      logger.info(`Subscription activated: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      logger.error('Error activating subscription:', error);
      throw error;
    }
  }

  /**
   * Pause subscription
   */
  static async pauseSubscription(subscriptionId, reason) {
    try {
      const subscription = await Subscription.findOne({ subscriptionId });
      if (!subscription || !subscription.isActive()) {
        throw new Error('Subscription cannot be paused');
      }

      subscription.status = 'paused';
      subscription.pausedDate = new Date();
      subscription.pauseCount += 1;
      subscription.addAuditEntry('paused', 'user', { reason });
      await subscription.save();

      logger.info(`Subscription paused: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      logger.error('Error pausing subscription:', error);
      throw error;
    }
  }

  /**
   * Resume subscription
   */
  static async resumeSubscription(subscriptionId) {
    try {
      const subscription = await Subscription.findOne({ subscriptionId });
      if (!subscription || subscription.status !== 'paused') {
        throw new Error('Subscription cannot be resumed');
      }

      subscription.status = 'active';
      subscription.resumedDate = new Date();
      subscription.nextBillingDate = this.calculateNextBillingDate(
        new Date(),
        subscription.planDuration
      );
      subscription.addAuditEntry('resumed', 'user', { timestamp: new Date() });
      await subscription.save();

      logger.info(`Subscription resumed: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      logger.error('Error resuming subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(subscriptionId, reason) {
    try {
      const subscription = await Subscription.findOne({ subscriptionId });
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      subscription.status = 'cancelled';
      subscription.cancellationReason = reason;
      subscription.cancellationDate = new Date();
      subscription.addAuditEntry('cancelled', 'user', { reason });
      await subscription.save();

      logger.info(`Subscription cancelled: ${subscriptionId}`, { reason });
      return subscription;
    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  /**
   * Process recurring billing
   */
  static async processBilling(subscriptionId) {
    try {
      const subscription = await Subscription.findOne({ subscriptionId });
      if (!subscription || !subscription.isActive()) {
        throw new Error('Subscription not active for billing');
      }

      if (new Date() < subscription.nextBillingDate) {
        throw new Error('Billing not yet due');
      }

      // Create payment for subscription
      const payment = await PaymentService.createPayment({
        orderId: subscription.orderId,
        userId: subscription.userId,
        amount: subscription.billingAmount,
        paymentMethod: subscription.paymentMethod,
        paymentGateway: subscription.paymentGateway,
        metadata: {
          subscriptionId,
          recurringBilling: true,
        },
      });

      // Process payment
      const processedPayment = await PaymentService.processPayment(payment.paymentId);

      if (processedPayment.status === 'captured') {
        subscription.lastBillingDate = new Date();
        subscription.totalBilled += subscription.billingAmount;
        subscription.totalPayments += 1;
        subscription.nextBillingDate = this.calculateNextBillingDate(
          new Date(),
          subscription.planDuration
        );

        subscription.billingHistory.push({
          billingDate: new Date(),
          amount: subscription.billingAmount,
          paymentId: payment.paymentId,
          status: 'completed',
          transactionId: processedPayment.gatewayTransactionId,
        });

        subscription.addAuditEntry('billing_processed', 'system', {
          paymentId: payment.paymentId,
          amount: subscription.billingAmount,
        });

        await subscription.save();
      } else {
        subscription.billingHistory.push({
          billingDate: new Date(),
          amount: subscription.billingAmount,
          paymentId: payment.paymentId,
          status: 'failed',
        });
        await subscription.save();

        throw new Error('Payment processing failed');
      }

      logger.info(`Billing processed for subscription: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      logger.error('Error processing billing:', error);
      throw error;
    }
  }

  /**
   * Get subscription by ID
   */
  static async getSubscription(subscriptionId) {
    try {
      return await Subscription.findOne({ subscriptionId });
    } catch (error) {
      logger.error('Error fetching subscription:', error);
      throw error;
    }
  }

  /**
   * Get user subscriptions
   */
  static async getUserSubscriptions(userId, status = null) {
    try {
      const query = { userId };
      if (status) {
        query.status = status;
      }
      return await Subscription.find(query).sort({ createdAt: -1 });
    } catch (error) {
      logger.error('Error fetching user subscriptions:', error);
      throw error;
    }
  }

  /**
   * Get subscriptions due for billing
   */
  static async getSubscriptionsDueForBilling() {
    try {
      return await Subscription.find({
        status: 'active',
        nextBillingDate: { $lte: new Date() },
        autoRenew: true,
      });
    } catch (error) {
      logger.error('Error fetching subscriptions due for billing:', error);
      throw error;
    }
  }

  /**
   * Calculate next billing date
   */
  static calculateNextBillingDate(startDate, planDuration) {
    const nextDate = new Date(startDate);

    switch (planDuration.unit) {
      case 'days':
        nextDate.setDate(nextDate.getDate() + planDuration.value);
        break;
      case 'weeks':
        nextDate.setDate(nextDate.getDate() + planDuration.value * 7);
        break;
      case 'months':
        nextDate.setMonth(nextDate.getMonth() + planDuration.value);
        break;
      case 'years':
        nextDate.setFullYear(nextDate.getFullYear() + planDuration.value);
        break;
    }

    return nextDate;
  }

  /**
   * Get subscription statistics
   */
  static async getSubscriptionStats(userId) {
    try {
      const stats = await Subscription.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalBilled: { $sum: '$totalBilled' },
          },
        },
      ]);

      return stats;
    } catch (error) {
      logger.error('Error fetching subscription stats:', error);
      throw error;
    }
  }

  /**
   * Renew subscription at expiry
   */
  static async renewSubscription(subscriptionId) {
    try {
      const subscription = await Subscription.findOne({ subscriptionId });
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const newEndDate = new Date(subscription.endDate);
      newEndDate.setDate(
        newEndDate.getDate() + subscription.planDuration.value
      );

      subscription.endDate = newEndDate;
      subscription.nextBillingDate = this.calculateNextBillingDate(
        new Date(),
        subscription.planDuration
      );
      subscription.renewalNotificationSent = false;
      subscription.addAuditEntry('renewed', 'system', { newEndDate });
      await subscription.save();

      logger.info(`Subscription renewed: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      logger.error('Error renewing subscription:', error);
      throw error;
    }
  }

  /**
   * Send renewal reminder notification
   */
  static async sendRenewalReminder(subscriptionId) {
    try {
      const subscription = await Subscription.findOne({ subscriptionId });
      if (!subscription || subscription.renewalNotificationSent) {
        return;
      }

      // TODO: Integrate with notification service
      logger.info(`Renewal reminder sent for subscription: ${subscriptionId}`);

      subscription.renewalNotificationSent = true;
      await subscription.save();
    } catch (error) {
      logger.error('Error sending renewal reminder:', error);
      throw error;
    }
  }
}

module.exports = SubscriptionService;
