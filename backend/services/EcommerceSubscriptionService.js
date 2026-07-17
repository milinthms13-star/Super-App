/**
 * Ecommerce Subscription Service
 * Manages seller subscription lifecycle
 */

const EcommerceSellerProfile = require('../models/EcommerceSellerProfile');
const EcommerceSubscriptionPlan = require('../models/EcommerceSubscriptionPlan');
const logger = require('../utils/logger');

class EcommerceSubscriptionService {
  /**
   * Get all available subscription plans
   */
  static async getAvailablePlans() {
    try {
      const plans = await EcommerceSubscriptionPlan.getActivePlans();
      return plans;
    } catch (error) {
      logger.error('Error fetching subscription plans:', error);
      throw error;
    }
  }

  /**
   * Get plan details by slug
   */
  static async getPlanBySlug(slug) {
    try {
      const plan = await EcommerceSubscriptionPlan.getPlanBySlug(slug);
      if (!plan) {
        throw new Error('Subscription plan not found');
      }
      return plan;
    } catch (error) {
      logger.error('Error fetching plan by slug:', error);
      throw error;
    }
  }

  /**
   * Initialize free trial for new seller
   */
  static async initializeFreeTrial(sellerId) {
    try {
      const seller = await EcommerceSellerProfile.findById(sellerId);
      if (!seller) {
        throw new Error('Seller profile not found');
      }

      const freePlan = await EcommerceSubscriptionPlan.getFreePlan();
      if (!freePlan) {
        throw new Error('Free plan not configured');
      }

      const trialDays = freePlan.trial.durationDays || 14;
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + trialDays);

      seller.subscription = {
        plan: 'free',
        startDate: new Date(),
        endDate: null, // Free plan doesn't expire
        status: 'trial',
        autoRenew: false,
        trialEndsAt: trialEndDate,
        paymentHistory: [],
      };

      // Set commission config based on free plan
      seller.commissionConfig = {
        type: freePlan.commission.type,
        rate: freePlan.commission.defaultRate,
        flatAmount: 0,
        categoryWiseRates: [],
        minimumCommission: freePlan.commission.minimumAmount || 0,
      };

      await seller.save();

      logger.info(`Free trial initialized for seller ${sellerId}`);
      return seller;
    } catch (error) {
      logger.error('Error initializing free trial:', error);
      throw error;
    }
  }

  /**
   * Upgrade seller subscription
   */
  static async upgradeSubscription(sellerId, planSlug, duration = 'monthly', paymentDetails) {
    try {
      const seller = await EcommerceSellerProfile.findById(sellerId);
      if (!seller) {
        throw new Error('Seller profile not found');
      }

      const newPlan = await EcommerceSubscriptionPlan.getPlanBySlug(planSlug);
      if (!newPlan) {
        throw new Error('Subscription plan not found');
      }

      // Calculate subscription period
      const startDate = new Date();
      const endDate = new Date();

      switch (duration) {
        case 'monthly':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'quarterly':
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case 'yearly':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        default:
          throw new Error('Invalid subscription duration');
      }

      const amount = newPlan.getDiscountedPrice(duration);

      // Update subscription
      seller.subscription.plan = planSlug;
      seller.subscription.startDate = startDate;
      seller.subscription.endDate = endDate;
      seller.subscription.status = 'active';
      seller.subscription.autoRenew = true;

      // Add payment to history
      seller.subscription.paymentHistory.push({
        amount,
        currency: 'INR',
        paymentDate: new Date(),
        paymentMethod: paymentDetails.method,
        transactionId: paymentDetails.transactionId,
        planDuration: duration,
        status: 'completed',
      });

      // Update commission config
      seller.commissionConfig = {
        type: newPlan.commission.type,
        rate: newPlan.commission.defaultRate,
        flatAmount: 0,
        categoryWiseRates: newPlan.commission.categoryRates || [],
        minimumCommission: newPlan.commission.minimumAmount || 0,
      };

      await seller.save();

      logger.info(`Subscription upgraded for seller ${sellerId} to ${planSlug}`);

      return {
        success: true,
        seller,
        plan: newPlan,
        subscription: seller.subscription,
      };
    } catch (error) {
      logger.error('Error upgrading subscription:', error);
      throw error;
    }
  }

  /**
   * Renew subscription
   */
  static async renewSubscription(sellerId, paymentDetails) {
    try {
      const seller = await EcommerceSellerProfile.findById(sellerId);
      if (!seller) {
        throw new Error('Seller profile not found');
      }

      if (!seller.subscription.autoRenew) {
        throw new Error('Auto-renewal is not enabled');
      }

      const currentPlan = await EcommerceSubscriptionPlan.getPlanBySlug(seller.subscription.plan);
      if (!currentPlan) {
        throw new Error('Current subscription plan not found');
      }

      // Get the duration from last payment
      const lastPayment = seller.subscription.paymentHistory[seller.subscription.paymentHistory.length - 1];
      const duration = lastPayment?.planDuration || 'monthly';
      const amount = currentPlan.getDiscountedPrice(duration);

      // Extend subscription period
      const newEndDate = new Date(seller.subscription.endDate);
      switch (duration) {
        case 'monthly':
          newEndDate.setMonth(newEndDate.getMonth() + 1);
          break;
        case 'quarterly':
          newEndDate.setMonth(newEndDate.getMonth() + 3);
          break;
        case 'yearly':
          newEndDate.setFullYear(newEndDate.getFullYear() + 1);
          break;
      }

      seller.subscription.endDate = newEndDate;
      seller.subscription.status = 'active';

      // Add renewal payment to history
      seller.subscription.paymentHistory.push({
        amount,
        currency: 'INR',
        paymentDate: new Date(),
        paymentMethod: paymentDetails.method,
        transactionId: paymentDetails.transactionId,
        planDuration: duration,
        status: 'completed',
      });

      await seller.save();

      logger.info(`Subscription renewed for seller ${sellerId}`);

      return {
        success: true,
        seller,
        subscription: seller.subscription,
      };
    } catch (error) {
      logger.error('Error renewing subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(sellerId, reason) {
    try {
      const seller = await EcommerceSellerProfile.findById(sellerId);
      if (!seller) {
        throw new Error('Seller profile not found');
      }

      // Keep subscription active until end date, but disable auto-renewal
      seller.subscription.autoRenew = false;
      seller.subscription.status = 'cancelled';

      await seller.save();

      logger.info(`Subscription cancelled for seller ${sellerId}. Reason: ${reason}`);

      return {
        success: true,
        message: 'Subscription will remain active until the end of the current billing period',
        expiresAt: seller.subscription.endDate,
      };
    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  /**
   * Downgrade to free plan
   */
  static async downgradeToFree(sellerId) {
    try {
      const seller = await EcommerceSellerProfile.findById(sellerId);
      if (!seller) {
        throw new Error('Seller profile not found');
      }

      const freePlan = await EcommerceSubscriptionPlan.getFreePlan();
      if (!freePlan) {
        throw new Error('Free plan not configured');
      }

      seller.subscription.plan = 'free';
      seller.subscription.status = 'active';
      seller.subscription.endDate = null;
      seller.subscription.autoRenew = false;

      // Update commission config to free plan rates
      seller.commissionConfig = {
        type: freePlan.commission.type,
        rate: freePlan.commission.defaultRate,
        flatAmount: 0,
        categoryWiseRates: [],
        minimumCommission: freePlan.commission.minimumAmount || 0,
      };

      await seller.save();

      logger.info(`Seller ${sellerId} downgraded to free plan`);

      return {
        success: true,
        seller,
      };
    } catch (error) {
      logger.error('Error downgrading to free:', error);
      throw error;
    }
  }

  /**
   * Check and update expired subscriptions
   */
  static async checkExpiredSubscriptions() {
    try {
      const now = new Date();

      const expiredSellers = await EcommerceSellerProfile.find({
        'subscription.status': 'active',
        'subscription.endDate': { $lt: now },
        'subscription.plan': { $ne: 'free' },
      });

      for (const seller of expiredSellers) {
        if (seller.subscription.autoRenew) {
          // Try to renew automatically
          logger.info(`Auto-renewing subscription for seller ${seller._id}`);
          // This would integrate with payment gateway
          // For now, just mark as expired
          seller.subscription.status = 'expired';
        } else {
          seller.subscription.status = 'expired';
        }

        await seller.save();
      }

      logger.info(`Checked ${expiredSellers.length} expired subscriptions`);

      return {
        checked: expiredSellers.length,
      };
    } catch (error) {
      logger.error('Error checking expired subscriptions:', error);
      throw error;
    }
  }

  /**
   * Get subscription status for seller
   */
  static async getSubscriptionStatus(sellerId) {
    try {
      const seller = await EcommerceSellerProfile.findById(sellerId);
      if (!seller) {
        throw new Error('Seller profile not found');
      }

      const plan = await EcommerceSubscriptionPlan.getPlanBySlug(seller.subscription.plan);

      const now = new Date();
      const isExpiringSoon = seller.subscription.endDate && 
        (new Date(seller.subscription.endDate) - now) < (7 * 24 * 60 * 60 * 1000); // 7 days

      return {
        subscription: seller.subscription,
        plan: plan,
        features: plan?.features || {},
        isExpiringSoon,
        daysRemaining: seller.subscription.endDate 
          ? Math.ceil((new Date(seller.subscription.endDate) - now) / (24 * 60 * 60 * 1000))
          : null,
        canListProducts: seller.canListProducts(),
        productLimit: seller.getProductLimit(),
        currentProductCount: seller.metrics.activeProducts,
      };
    } catch (error) {
      logger.error('Error getting subscription status:', error);
      throw error;
    }
  }

  /**
   * Calculate upgrade/downgrade cost
   */
  static async calculatePlanChange(sellerId, newPlanSlug, duration = 'monthly') {
    try {
      const seller = await EcommerceSellerProfile.findById(sellerId);
      if (!seller) {
        throw new Error('Seller profile not found');
      }

      const currentPlan = await EcommerceSubscriptionPlan.getPlanBySlug(seller.subscription.plan);
      const newPlan = await EcommerceSubscriptionPlan.getPlanBySlug(newPlanSlug);

      if (!newPlan) {
        throw new Error('New subscription plan not found');
      }

      const newPlanCost = newPlan.getDiscountedPrice(duration);
      let proratedAmount = newPlanCost;

      // Calculate prorated refund for remaining days if upgrading
      if (currentPlan && seller.subscription.endDate) {
        const now = new Date();
        const endDate = new Date(seller.subscription.endDate);
        const daysRemaining = Math.ceil((endDate - now) / (24 * 60 * 60 * 1000));

        if (daysRemaining > 0) {
          const lastPayment = seller.subscription.paymentHistory[seller.subscription.paymentHistory.length - 1];
          const paidAmount = lastPayment?.amount || 0;
          const totalDays = duration === 'yearly' ? 365 : duration === 'quarterly' ? 90 : 30;
          const dailyRate = paidAmount / totalDays;
          const refundAmount = dailyRate * daysRemaining;

          proratedAmount = newPlanCost - refundAmount;
        }
      }

      return {
        currentPlan: currentPlan?.name,
        newPlan: newPlan.name,
        newPlanCost,
        proratedAmount: Math.max(0, proratedAmount),
        duration,
        savings: newPlan.pricing[duration]?.discount || 0,
        features: newPlan.features,
        commissionRate: newPlan.commission.defaultRate,
      };
    } catch (error) {
      logger.error('Error calculating plan change:', error);
      throw error;
    }
  }

  /**
   * Get payment history for seller
   */
  static async getPaymentHistory(sellerId, limit = 20) {
    try {
      const seller = await EcommerceSellerProfile.findById(sellerId);
      if (!seller) {
        throw new Error('Seller profile not found');
      }

      const history = seller.subscription.paymentHistory
        .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
        .slice(0, limit);

      return history;
    } catch (error) {
      logger.error('Error fetching payment history:', error);
      throw error;
    }
  }
}

module.exports = EcommerceSubscriptionService;
