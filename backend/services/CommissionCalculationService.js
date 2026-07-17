/**
 * Commission Calculation Service
 * Handles all commission-related calculations and tracking
 */

const EcommerceSellerProfile = require('../models/EcommerceSellerProfile');
const EcommerceTransaction = require('../models/EcommerceTransaction');
const EcommerceCategory = require('../models/EcommerceCategory');
const Order = require('../models/Order');
const logger = require('../utils/logger');

class CommissionCalculationService {
  /**
   * Calculate commission for an order
   */
  static async calculateOrderCommission(orderId, orderData = null) {
    try {
      let order = orderData;
      if (!order) {
        order = await Order.findById(orderId);
        if (!order) {
          throw new Error('Order not found');
        }
      }

      const commissionBreakdown = [];
      let totalCommission = 0;

      // Group items by seller
      const sellerItems = {};
      for (const item of order.items) {
        const sellerEmail = item.sellerEmail || item.seller?.email;
        if (!sellerEmail) continue;

        if (!sellerItems[sellerEmail]) {
          sellerItems[sellerEmail] = {
            items: [],
            subtotal: 0,
          };
        }

        sellerItems[sellerEmail].items.push(item);
        sellerItems[sellerEmail].subtotal += item.price * item.quantity;
      }

      // Calculate commission for each seller
      for (const [sellerEmail, data] of Object.entries(sellerItems)) {
        const seller = await EcommerceSellerProfile.findOne({ sellerEmail });

        if (!seller) {
          logger.warn(`Seller profile not found for ${sellerEmail}`);
          continue;
        }

        let sellerCommission = 0;

        // Calculate commission for each item
        for (const item of data.items) {
          const itemSubtotal = item.price * item.quantity;
          const category = item.category || 'General';

          // Get commission rate
          const commissionRate = seller.getCommissionRate(category, itemSubtotal);
          let itemCommission = 0;

          if (seller.commissionConfig.type === 'flat') {
            itemCommission = commissionRate;
          } else {
            itemCommission = (itemSubtotal * commissionRate) / 100;
          }

          // Apply min/max limits
          if (seller.commissionConfig.minimumCommission) {
            itemCommission = Math.max(itemCommission, seller.commissionConfig.minimumCommission);
          }
          if (seller.commissionConfig.maximumCommission) {
            itemCommission = Math.min(itemCommission, seller.commissionConfig.maximumCommission);
          }

          sellerCommission += itemCommission;
        }

        // Calculate GST on commission (18%)
        const gstRate = 18;
        const gstAmount = (sellerCommission * gstRate) / 100;
        const totalSellerCommission = sellerCommission + gstAmount;

        commissionBreakdown.push({
          sellerEmail,
          sellerName: seller.businessName,
          sellerId: seller._id,
          subtotal: data.subtotal,
          commissionRate: seller.commissionConfig.rate,
          commissionType: seller.commissionConfig.type,
          commission: sellerCommission,
          gst: {
            rate: gstRate,
            amount: gstAmount,
          },
          totalCommission: totalSellerCommission,
          netPayable: data.subtotal - totalSellerCommission,
          subscriptionPlan: seller.subscription.plan,
          items: data.items.map((item) => ({
            productId: item.productId,
            productName: item.productName || item.name,
            quantity: item.quantity,
            price: item.price,
            category: item.category,
          })),
        });

        totalCommission += totalSellerCommission;
      }

      return {
        orderId: order._id,
        orderAmount: order.total,
        totalCommission,
        breakdown: commissionBreakdown,
        calculatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error calculating order commission:', error);
      throw error;
    }
  }

  /**
   * Create transaction records for an order
   */
  static async createTransactionRecords(orderId, commissionData) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const transactions = [];

      for (const breakdown of commissionData.breakdown) {
        const seller = await EcommerceSellerProfile.findById(breakdown.sellerId);

        const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        const transaction = new EcommerceTransaction({
          transactionId,
          orderId: order._id,
          sellerId: breakdown.sellerId,
          sellerEmail: breakdown.sellerEmail,
          buyerId: order.userId,
          buyerEmail: order.customerEmail,
          type: 'sale',
          orderAmount: order.total,
          productAmount: breakdown.subtotal,
          shippingAmount: 0,
          taxAmount: order.taxAmount || 0,
          discountAmount: order.discountAmount || 0,
          totalAmount: breakdown.subtotal,
          currency: 'INR',
          commission: {
            type: breakdown.commissionType,
            rate: breakdown.commissionRate,
            amount: breakdown.commission,
            calculationBase: breakdown.subtotal,
            gst: breakdown.gst,
            totalCommission: breakdown.totalCommission,
            category: breakdown.items[0]?.category || 'General',
            subscriptionPlan: breakdown.subscriptionPlan,
          },
          settlement: {
            grossAmount: breakdown.subtotal,
            netAmount: breakdown.netPayable,
            deductions: [
              {
                type: 'commission',
                amount: breakdown.totalCommission,
                description: `Platform commission (${breakdown.commissionRate}%) + GST`,
              },
            ],
            status: 'pending',
            scheduledDate: this.calculateSettlementDate(),
          },
          products: breakdown.items,
          paymentGateway: {
            gateway: order.paymentGateway || 'unknown',
            transactionId: order.paymentDetails?.transactionId || '',
            status: 'completed',
            method: order.paymentMethod,
            timestamp: new Date(),
            fees: 0,
          },
          status: 'completed',
        });

        // Calculate commission and settlement
        transaction.calculateCommission(seller, breakdown.items[0]?.category);

        await transaction.save();
        transactions.push(transaction);

        // Update seller metrics
        seller.metrics.totalRevenue += breakdown.subtotal;
        seller.metrics.totalCommissionPaid += breakdown.totalCommission;
        seller.metrics.currentMonthRevenue += breakdown.subtotal;
        await seller.save();

        logger.info(`Transaction ${transactionId} created for seller ${breakdown.sellerEmail}`);
      }

      // Update order with commission info
      order.commission = {
        platformCommissionPercentage: commissionData.totalCommission / commissionData.orderAmount * 100,
        items: commissionData.breakdown.map((b) => ({
          vendorEmail: b.sellerEmail,
          revenue: b.subtotal,
          commission: b.totalCommission,
          netPayable: b.netPayable,
        })),
      };
      await order.save();

      return transactions;
    } catch (error) {
      logger.error('Error creating transaction records:', error);
      throw error;
    }
  }

  /**
   * Calculate settlement date based on payout schedule
   */
  static calculateSettlementDate(payoutCycle = 'weekly') {
    const now = new Date();
    const scheduledDate = new Date(now);

    switch (payoutCycle) {
      case 'daily':
        scheduledDate.setDate(scheduledDate.getDate() + 1);
        break;
      case 'weekly':
        // Next Friday
        const daysUntilFriday = (5 - scheduledDate.getDay() + 7) % 7 || 7;
        scheduledDate.setDate(scheduledDate.getDate() + daysUntilFriday);
        break;
      case 'bi-weekly':
        scheduledDate.setDate(scheduledDate.getDate() + 14);
        break;
      case 'monthly':
        // Last day of next month
        scheduledDate.setMonth(scheduledDate.getMonth() + 1);
        scheduledDate.setDate(0);
        break;
      default:
        scheduledDate.setDate(scheduledDate.getDate() + 7);
    }

    return scheduledDate;
  }

  /**
   * Get commission summary for a seller
   */
  static async getSellerCommissionSummary(sellerId, startDate, endDate) {
    try {
      const seller = await EcommerceSellerProfile.findById(sellerId);
      if (!seller) {
        throw new Error('Seller not found');
      }

      const match = {
        sellerId: seller._id,
        status: 'completed',
        type: 'sale',
      };

      if (startDate && endDate) {
        match.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const transactions = await EcommerceTransaction.find(match);

      const summary = {
        totalOrders: transactions.length,
        totalRevenue: 0,
        totalCommission: 0,
        totalGST: 0,
        netPayable: 0,
        pendingSettlement: 0,
        settledAmount: 0,
        byCategory: {},
        byMonth: {},
      };

      for (const txn of transactions) {
        summary.totalRevenue += txn.productAmount;
        summary.totalCommission += txn.commission.amount;
        summary.totalGST += txn.commission.gst.amount;
        summary.netPayable += txn.settlement.netAmount;

        if (txn.settlement.status === 'pending' || txn.settlement.status === 'processing') {
          summary.pendingSettlement += txn.settlement.netAmount;
        } else if (txn.settlement.status === 'completed') {
          summary.settledAmount += txn.settlement.netAmount;
        }

        // By category
        const category = txn.commission.category || 'General';
        if (!summary.byCategory[category]) {
          summary.byCategory[category] = {
            revenue: 0,
            commission: 0,
            orders: 0,
          };
        }
        summary.byCategory[category].revenue += txn.productAmount;
        summary.byCategory[category].commission += txn.commission.totalCommission;
        summary.byCategory[category].orders += 1;

        // By month
        const month = new Date(txn.createdAt).toISOString().slice(0, 7); // YYYY-MM
        if (!summary.byMonth[month]) {
          summary.byMonth[month] = {
            revenue: 0,
            commission: 0,
            orders: 0,
          };
        }
        summary.byMonth[month].revenue += txn.productAmount;
        summary.byMonth[month].commission += txn.commission.totalCommission;
        summary.byMonth[month].orders += 1;
      }

      return {
        seller: {
          id: seller._id,
          email: seller.sellerEmail,
          businessName: seller.businessName,
          subscriptionPlan: seller.subscription.plan,
        },
        period: { startDate, endDate },
        summary,
      };
    } catch (error) {
      logger.error('Error getting seller commission summary:', error);
      throw error;
    }
  }

  /**
   * Calculate commission preview (before order creation)
   */
  static async previewCommission(items, sellerEmail) {
    try {
      const seller = await EcommerceSellerProfile.findOne({ sellerEmail });
      if (!seller) {
        throw new Error('Seller not found');
      }

      let subtotal = 0;
      let totalCommission = 0;

      for (const item of items) {
        const itemSubtotal = item.price * item.quantity;
        subtotal += itemSubtotal;

        const category = item.category || 'General';
        const commissionRate = seller.getCommissionRate(category, itemSubtotal);

        let itemCommission = 0;
        if (seller.commissionConfig.type === 'flat') {
          itemCommission = commissionRate;
        } else {
          itemCommission = (itemSubtotal * commissionRate) / 100;
        }

        totalCommission += itemCommission;
      }

      const gstAmount = (totalCommission * 18) / 100;
      const totalWithGST = totalCommission + gstAmount;
      const netEarnings = subtotal - totalWithGST;

      return {
        subtotal,
        commission: totalCommission,
        gst: gstAmount,
        totalCommission: totalWithGST,
        netEarnings,
        commissionRate: seller.commissionConfig.rate,
        commissionType: seller.commissionConfig.type,
        subscriptionPlan: seller.subscription.plan,
      };
    } catch (error) {
      logger.error('Error previewing commission:', error);
      throw error;
    }
  }

  /**
   * Get commission comparison across subscription plans
   */
  static async getCommissionComparison(orderAmount, category = 'General') {
    try {
      const EcommerceSubscriptionPlan = require('../models/EcommerceSubscriptionPlan');
      const plans = await EcommerceSubscriptionPlan.getActivePlans();

      const comparison = [];

      for (const plan of plans) {
        const commissionRate = plan.getCommissionRate(category);
        const commission = (orderAmount * commissionRate) / 100;
        const gst = (commission * 18) / 100;
        const totalCommission = commission + gst;
        const netEarnings = orderAmount - totalCommission;

        comparison.push({
          plan: plan.name,
          slug: plan.slug,
          commissionRate,
          commission,
          gst,
          totalCommission,
          netEarnings,
          savingsVsFree: 0,
        });
      }

      // Calculate savings compared to free plan
      const freePlanCommission = comparison.find((c) => c.slug === 'free')?.totalCommission || 0;
      comparison.forEach((c) => {
        c.savingsVsFree = freePlanCommission - c.totalCommission;
      });

      return {
        orderAmount,
        category,
        comparison,
      };
    } catch (error) {
      logger.error('Error getting commission comparison:', error);
      throw error;
    }
  }

  /**
   * Apply category-specific commission override
   */
  static async applyCategoryCommission(sellerId, categoryId, orderAmount) {
    try {
      const seller = await EcommerceSellerProfile.findById(sellerId);
      const category = await EcommerceCategory.findById(categoryId);

      if (!seller || !category) {
        throw new Error('Seller or category not found');
      }

      let commissionRate = seller.getCommissionRate(category.name, orderAmount);

      // Check for category-specific override
      if (category.commissionOverride?.enabled) {
        commissionRate = category.commissionOverride.rate;
      }

      const commission = (orderAmount * commissionRate) / 100;
      const gst = (commission * 18) / 100;
      const totalCommission = commission + gst;

      return {
        category: category.name,
        commissionRate,
        commission,
        gst,
        totalCommission,
        netAmount: orderAmount - totalCommission,
        overrideApplied: category.commissionOverride?.enabled || false,
      };
    } catch (error) {
      logger.error('Error applying category commission:', error);
      throw error;
    }
  }

  /**
   * Get platform commission earnings summary
   */
  static async getPlatformCommissionSummary(startDate, endDate) {
    try {
      const match = {
        type: 'sale',
        status: 'completed',
      };

      if (startDate && endDate) {
        match.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const result = await EcommerceTransaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$productAmount' },
            totalCommission: { $sum: '$commission.amount' },
            totalGST: { $sum: '$commission.gst.amount' },
            totalCommissionWithGST: { $sum: '$commission.totalCommission' },
            transactionCount: { $sum: 1 },
            averageCommissionRate: { $avg: '$commission.rate' },
          },
        },
      ]);

      const summary = result[0] || {
        totalRevenue: 0,
        totalCommission: 0,
        totalGST: 0,
        totalCommissionWithGST: 0,
        transactionCount: 0,
        averageCommissionRate: 0,
      };

      // Get breakdown by subscription plan
      const planBreakdown = await EcommerceTransaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$commission.subscriptionPlan',
            revenue: { $sum: '$productAmount' },
            commission: { $sum: '$commission.totalCommission' },
            transactions: { $sum: 1 },
          },
        },
      ]);

      return {
        period: { startDate, endDate },
        summary,
        byPlan: planBreakdown.map((p) => ({
          plan: p._id,
          revenue: p.revenue,
          commission: p.commission,
          transactions: p.transactions,
          averageCommission: p.commission / p.transactions,
        })),
      };
    } catch (error) {
      logger.error('Error getting platform commission summary:', error);
      throw error;
    }
  }
}

module.exports = CommissionCalculationService;
