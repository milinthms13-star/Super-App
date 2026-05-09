/**
 * SubscriptionManagementService.js
 * Subscription plans, billing, renewals, and analytics
 */

const logger = require('../config/logger');

class SubscriptionManagementService {
  /**
   * Create a subscription plan
   */
  static async createSubscriptionPlan(planData) {
    try {
      const SubscriptionPlan = require('../models/SubscriptionPlan');

      const plan = new SubscriptionPlan({
        name: planData.name,
        description: planData.description,
        price: planData.price,
        billingCycle: planData.billingCycle || 'monthly', // monthly, quarterly, annual
        features: planData.features || [],
        maxOrders: planData.maxOrders,
        discountPercentage: planData.discountPercentage || 0,
        status: 'active',
        createdAt: new Date(),
      });

      await plan.save();

      logger.info(`Subscription plan created: ${plan._id}`);

      return {
        success: true,
        data: plan,
        message: 'Subscription plan created successfully',
      };
    } catch (error) {
      logger.error('Error creating subscription plan:', error);
      throw error;
    }
  }

  /**
   * Subscribe user to a plan
   */
  static async subscribeToPlan(userId, planId) {
    try {
      const User = require('../models/User');
      const SubscriptionPlan = require('../models/SubscriptionPlan');
      const Subscription = require('../models/Subscription');

      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const plan = await SubscriptionPlan.findById(planId);
      if (!plan) throw new Error('Plan not found');

      // Cancel existing subscription if any
      await Subscription.updateMany(
        { userId, status: { $in: ['active', 'pending'] } },
        { status: 'cancelled', cancelledAt: new Date() }
      );

      // Create new subscription
      const nextBillingDate = this._calculateNextBillingDate(plan.billingCycle);

      const subscription = new Subscription({
        userId,
        planId,
        status: 'active',
        startDate: new Date(),
        nextBillingDate,
        billingCycle: plan.billingCycle,
        price: plan.price,
        autoRenew: true,
      });

      await subscription.save();

      // Update user subscription
      user.subscription = {
        subscriptionId: subscription._id,
        planId,
        status: 'active',
        nextBillingDate,
      };

      await user.save();

      logger.info(`User ${userId} subscribed to plan ${planId}`);

      return {
        success: true,
        data: subscription,
        message: 'Subscription activated successfully',
      };
    } catch (error) {
      logger.error('Error subscribing to plan:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(userId, subscriptionId, reason = '') {
    try {
      const Subscription = require('../models/Subscription');
      const User = require('../models/User');

      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription) throw new Error('Subscription not found');

      if (subscription.userId.toString() !== userId.toString()) {
        throw new Error('Unauthorized');
      }

      subscription.status = 'cancelled';
      subscription.cancelledAt = new Date();
      subscription.cancellationReason = reason;

      await subscription.save();

      // Update user
      await User.findByIdAndUpdate(userId, {
        'subscription.status': 'cancelled',
      });

      logger.info(`Subscription ${subscriptionId} cancelled for user ${userId}`);

      return {
        success: true,
        data: subscription,
        message: 'Subscription cancelled successfully',
      };
    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  /**
   * Process subscription renewal
   */
  static async processRenewal(subscriptionId) {
    try {
      const Subscription = require('../models/Subscription');
      const SubscriptionPlan = require('../models/SubscriptionPlan');
      const Payment = require('../models/Payment');

      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription) throw new Error('Subscription not found');

      const plan = await SubscriptionPlan.findById(subscription.planId);
      if (!plan) throw new Error('Plan not found');

      // Process payment (mock)
      const payment = new Payment({
        userId: subscription.userId,
        amount: plan.price,
        type: 'subscription_renewal',
        status: 'completed',
        description: `${plan.name} renewal`,
        paymentDate: new Date(),
      });

      await payment.save();

      // Update subscription
      const nextBillingDate = this._calculateNextBillingDate(plan.billingCycle);
      subscription.nextBillingDate = nextBillingDate;
      subscription.renewalCount = (subscription.renewalCount || 0) + 1;
      subscription.lastRenewalDate = new Date();

      await subscription.save();

      logger.info(`Subscription ${subscriptionId} renewed successfully`);

      return {
        success: true,
        data: {
          subscription,
          payment,
        },
        message: 'Subscription renewed successfully',
      };
    } catch (error) {
      logger.error('Error processing renewal:', error);
      throw error;
    }
  }

  /**
   * Get subscription status
   */
  static async getSubscriptionStatus(userId) {
    try {
      const User = require('../models/User');
      const Subscription = require('../models/Subscription');
      const SubscriptionPlan = require('../models/SubscriptionPlan');

      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      if (!user.subscription || !user.subscription.subscriptionId) {
        return {
          userId,
          subscription: null,
          plan: null,
          status: 'none',
          message: 'No active subscription',
        };
      }

      const subscription = await Subscription.findById(user.subscription.subscriptionId);
      const plan = await SubscriptionPlan.findById(subscription.planId);

      const daysUntilRenewal = Math.ceil(
        (new Date(subscription.nextBillingDate) - new Date()) / (1000 * 60 * 60 * 24)
      );

      return {
        userId,
        subscription,
        plan,
        daysUntilRenewal,
        status: subscription.status,
      };
    } catch (error) {
      logger.error('Error getting subscription status:', error);
      throw error;
    }
  }

  /**
   * Get all subscription plans
   */
  static async getAllPlans(filters = {}) {
    try {
      const SubscriptionPlan = require('../models/SubscriptionPlan');

      const query = { status: 'active' };

      const plans = await SubscriptionPlan.find(query).lean();

      return {
        success: true,
        data: plans,
        message: `Found ${plans.length} plans`,
      };
    } catch (error) {
      logger.error('Error getting subscription plans:', error);
      throw error;
    }
  }

  /**
   * Get subscription analytics
   */
  static async getSubscriptionAnalytics(period = '30') {
    try {
      const Subscription = require('../models/Subscription');

      const daysBack = parseInt(period);
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysBack);

      // Active subscriptions
      const activeCount = await Subscription.countDocuments({
        status: 'active',
      });

      // Churned subscriptions
      const churnedCount = await Subscription.countDocuments({
        status: 'cancelled',
        cancelledAt: { $gte: dateThreshold },
      });

      // Revenue
      const revenue = await Subscription.aggregate([
        {
          $match: {
            startDate: { $gte: dateThreshold },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$price' },
            count: { $sum: 1 },
          },
        },
      ]);

      // Renewal rate
      const renewals = await Subscription.countDocuments({
        lastRenewalDate: { $gte: dateThreshold },
      });

      // Churn rate
      const churnRate = activeCount > 0 ? ((churnedCount / activeCount) * 100).toFixed(2) : 0;

      return {
        period: `${daysBack} days`,
        activeSubscriptions: activeCount,
        churnedCount,
        churnRate: `${churnRate}%`,
        renewalCount: renewals,
        revenue: revenue[0]?.totalRevenue || 0,
        mrr: Math.round((activeCount * 500) / 12), // Mock monthly recurring revenue
      };
    } catch (error) {
      logger.error('Error getting subscription analytics:', error);
      throw error;
    }
  }

  /**
   * Update subscription plan
   */
  static async updateSubscriptionPlan(planId, updates) {
    try {
      const SubscriptionPlan = require('../models/SubscriptionPlan');

      const plan = await SubscriptionPlan.findByIdAndUpdate(planId, updates, {
        new: true,
      });

      if (!plan) throw new Error('Plan not found');

      logger.info(`Subscription plan ${planId} updated`);

      return {
        success: true,
        data: plan,
        message: 'Plan updated successfully',
      };
    } catch (error) {
      logger.error('Error updating subscription plan:', error);
      throw error;
    }
  }

  /**
   * Deactivate subscription plan
   */
  static async deactivatePlan(planId) {
    try {
      const SubscriptionPlan = require('../models/SubscriptionPlan');

      const plan = await SubscriptionPlan.findByIdAndUpdate(
        planId,
        { status: 'inactive' },
        { new: true }
      );

      if (!plan) throw new Error('Plan not found');

      logger.info(`Subscription plan ${planId} deactivated`);

      return {
        success: true,
        data: plan,
        message: 'Plan deactivated successfully',
      };
    } catch (error) {
      logger.error('Error deactivating plan:', error);
      throw error;
    }
  }

  /**
   * Calculate next billing date
   */
  static _calculateNextBillingDate(billingCycle) {
    const now = new Date();

    if (billingCycle === 'annual') {
      return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    } else if (billingCycle === 'quarterly') {
      return new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
    } else {
      // monthly
      return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }
  }
}

module.exports = SubscriptionManagementService;
