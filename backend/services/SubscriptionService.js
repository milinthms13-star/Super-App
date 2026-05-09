/**
 * Subscription Service - Phase 12
 * Recurring payment management
 */

const Subscription = require('../models/Subscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
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

  // ============================================
  // PLAN MANAGEMENT METHODS (Phase 5B)
  // ============================================

  /**
   * Get all active plans
   */
  static async getAllPlans() {
    try {
      return await SubscriptionPlan.find({ isActive: true }).sort({ displayOrder: 1 });
    } catch (error) {
      logger.error('Error fetching all plans:', error);
      throw error;
    }
  }

  /**
   * Get plan by ID
   */
  static async getPlanById(planId) {
    try {
      const plan = await SubscriptionPlan.findById(planId);
      if (!plan) throw new Error('Plan not found');
      return plan;
    } catch (error) {
      logger.error('Error fetching plan by ID:', error);
      throw error;
    }
  }

  /**
   * Get plan by tier
   */
  static async getPlanByTier(tier) {
    try {
      const plan = await SubscriptionPlan.findOne({ planTier: tier, isActive: true });
      if (!plan) throw new Error(`Plan with tier "${tier}" not found`);
      return plan;
    } catch (error) {
      logger.error('Error fetching plan by tier:', error);
      throw error;
    }
  }

  /**
   * Get recommended plan
   */
  static async getRecommendedPlan() {
    try {
      const plan = await SubscriptionPlan.findOne({ 
        planTier: 'gold', 
        isActive: true 
      });
      return plan || (await SubscriptionPlan.findOne({ isActive: true }).sort({ activeSubscriptions: -1 }));
    } catch (error) {
      logger.error('Error fetching recommended plan:', error);
      throw error;
    }
  }

  /**
   * Get popular plans
   */
  static async getPopularPlans(limit = 5) {
    try {
      return await SubscriptionPlan.find({ isActive: true })
        .sort({ activeSubscriptions: -1 })
        .limit(limit);
    } catch (error) {
      logger.error('Error fetching popular plans:', error);
      throw error;
    }
  }

  /**
   * Compare multiple plans
   */
  static async comparePlans(planIds) {
    try {
      const plans = await SubscriptionPlan.find({ _id: { $in: planIds } });
      if (plans.length === 0) throw new Error('No plans found for comparison');
      
      return plans.map(plan => ({
        id: plan._id,
        name: plan.planName,
        tier: plan.planTier,
        monthlyPrice: plan.monthlyPrice,
        annualPrice: plan.annualPrice,
        features: plan.features,
        limits: plan.limits,
      }));
    } catch (error) {
      logger.error('Error comparing plans:', error);
      throw error;
    }
  }

  /**
   * Subscribe user to plan
   */
  static async subscribeToPlan(userId, planId, billingCycle = 'monthly', paymentMethodId = null) {
    try {
      const plan = await SubscriptionPlan.findById(planId);
      if (!plan) throw new Error('Plan not found');

      // Cancel existing subscription if any
      await Subscription.updateMany(
        { userId, status: 'active', planTier: { $exists: true } },
        { status: 'cancelled', cancellationDate: new Date() }
      );

      const amount = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
      const renewalDate = new Date();
      renewalDate.setMonth(renewalDate.getMonth() + (billingCycle === 'annual' ? 12 : 1));

      const subscription = new Subscription({
        subscriptionId: `SUB_${uuidv4()}`,
        userId,
        planId: plan._id,
        planTier: plan.planTier,
        planName: plan.planName,
        status: 'active',
        billingCycle,
        amount,
        renewalDate,
        startDate: new Date(),
        autoRenew: true,
        paymentMethodId,
      });

      await subscription.save();

      // Update plan metrics
      plan.activeSubscriptions = (plan.activeSubscriptions || 0) + 1;
      await plan.save();

      logger.info(`User ${userId} subscribed to plan ${plan.planName}`);
      return subscription;
    } catch (error) {
      logger.error('Error subscribing to plan:', error);
      throw error;
    }
  }

  /**
   * Get active subscription for user
   */
  static async getActiveSubscription(userId) {
    try {
      return await Subscription.findOne({ 
        userId, 
        status: 'active',
        planTier: { $exists: true }
      }).populate('planId');
    } catch (error) {
      logger.error('Error fetching active subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription history for user
   */
  static async getSubscriptionHistory(userId) {
    try {
      return await Subscription.find({ 
        userId,
        planTier: { $exists: true }
      }).sort({ createdAt: -1 });
    } catch (error) {
      logger.error('Error fetching subscription history:', error);
      throw error;
    }
  }

  /**
   * Upgrade plan
   */
  static async upgradePlan(userId, newPlanId) {
    try {
      const currentSubscription = await this.getActiveSubscription(userId);
      if (!currentSubscription) throw new Error('No active subscription found');

      const newPlan = await this.getPlanById(newPlanId);
      const currentPlan = await this.getPlanById(currentSubscription.planId);

      if (newPlan.monthlyPrice <= currentPlan.monthlyPrice) {
        throw new Error('New plan must have higher price than current plan');
      }

      // Cancel current subscription
      currentSubscription.status = 'cancelled';
      currentSubscription.cancellationType = 'upgrade';
      await currentSubscription.save();

      // Decrease old plan subscription count
      currentPlan.activeSubscriptions = Math.max(0, (currentPlan.activeSubscriptions || 1) - 1);
      await currentPlan.save();

      // Create new subscription
      const newSubscription = await this.subscribeToPlan(
        userId,
        newPlanId,
        currentSubscription.billingCycle,
        currentSubscription.paymentMethodId
      );

      logger.info(`User ${userId} upgraded from ${currentPlan.planName} to ${newPlan.planName}`);
      return newSubscription;
    } catch (error) {
      logger.error('Error upgrading plan:', error);
      throw error;
    }
  }

  /**
   * Downgrade plan
   */
  static async downgradePlan(userId, newPlanId) {
    try {
      const currentSubscription = await this.getActiveSubscription(userId);
      if (!currentSubscription) throw new Error('No active subscription found');

      const newPlan = await this.getPlanById(newPlanId);
      const currentPlan = await this.getPlanById(currentSubscription.planId);

      if (newPlan.monthlyPrice >= currentPlan.monthlyPrice) {
        throw new Error('New plan must have lower price than current plan');
      }

      // Cancel current subscription
      currentSubscription.status = 'cancelled';
      currentSubscription.cancellationType = 'downgrade';
      await currentSubscription.save();

      // Decrease old plan subscription count
      currentPlan.activeSubscriptions = Math.max(0, (currentPlan.activeSubscriptions || 1) - 1);
      await currentPlan.save();

      // Create new subscription
      const newSubscription = await this.subscribeToPlan(
        userId,
        newPlanId,
        currentSubscription.billingCycle,
        currentSubscription.paymentMethodId
      );

      logger.info(`User ${userId} downgraded from ${currentPlan.planName} to ${newPlan.planName}`);
      return newSubscription;
    } catch (error) {
      logger.error('Error downgrading plan:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(userId, reason = null) {
    try {
      const subscription = await this.getActiveSubscription(userId);
      if (!subscription) throw new Error('No active subscription found');

      const plan = await this.getPlanById(subscription.planId);

      subscription.status = 'cancelled';
      subscription.cancellationDate = new Date();
      subscription.cancellationReason = reason;
      await subscription.save();

      // Decrease plan subscription count
      plan.activeSubscriptions = Math.max(0, (plan.activeSubscriptions || 1) - 1);
      await plan.save();

      logger.info(`User ${userId} cancelled subscription: ${reason}`);
      return subscription;
    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  /**
   * Calculate benefits for user's subscription
   */
  static async calculateBenefits(userId, orderAmount, ordersPerMonth = 1) {
    try {
      const subscription = await this.getActiveSubscription(userId);
      if (!subscription) return { benefits: [], totalSavings: 0 };

      const plan = await this.getPlanById(subscription.planId);
      const benefits = [];
      let totalSavings = 0;

      // Order discount
      if (plan.features.orderDiscount > 0) {
        const discount = (orderAmount * plan.features.orderDiscount) / 100;
        benefits.push({
          name: 'Order Discount',
          value: `${plan.features.orderDiscount}%`,
          savings: discount,
        });
        totalSavings += discount;
      }

      // Free shipping
      if (plan.features.freeShipping) {
        const savedShipping = 50; // Estimate
        benefits.push({
          name: 'Free Shipping',
          value: 'Unlimited',
          savings: savedShipping,
        });
        totalSavings += savedShipping;
      }

      // Loyalty multiplier
      if (plan.features.loyaltyPointsMultiplier > 1) {
        const basePoints = orderAmount / 100;
        const extraPoints = basePoints * (plan.features.loyaltyPointsMultiplier - 1);
        benefits.push({
          name: 'Loyalty Points',
          value: `${plan.features.loyaltyPointsMultiplier}x`,
          savings: extraPoints * 1, // Assuming 1 rupee = 1 point
        });
        totalSavings += extraPoints;
      }

      return { benefits, totalSavings };
    } catch (error) {
      logger.error('Error calculating benefits:', error);
      throw error;
    }
  }

  /**
   * Check order eligibility for subscription
   */
  static async checkOrderEligibility(userId, orderAmount) {
    try {
      const subscription = await this.getActiveSubscription(userId);
      
      if (!subscription) {
        return {
          eligible: true,
          reason: 'Free user - no restrictions',
          plan: null,
        };
      }

      const plan = await this.getPlanById(subscription.planId);
      
      if (orderAmount < plan.limits.minOrderValue) {
        return {
          eligible: false,
          reason: `Minimum order value is ₹${plan.limits.minOrderValue}`,
          plan: plan.planName,
        };
      }

      if (orderAmount > plan.limits.maxOrderValue) {
        return {
          eligible: false,
          reason: `Maximum order value is ₹${plan.limits.maxOrderValue}`,
          plan: plan.planName,
        };
      }

      return {
        eligible: true,
        reason: 'Order is eligible',
        plan: plan.planName,
      };
    } catch (error) {
      logger.error('Error checking order eligibility:', error);
      throw error;
    }
  }

}

module.exports = SubscriptionService;
