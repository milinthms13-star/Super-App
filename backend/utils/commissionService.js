/**
 * Commission & Settlement calculation utilities
 * Handles vendor payouts and settlement report generation
 */

const { COMMISSION_CONFIG } = require('../config/constants');
const logger = require('./logger');

/**
 * Calculate commission for a single order based on configured rules
 * @param {Object} order - Order document
 * @param {Object} item - Order item (product in order)
 * @param {Number} vendorItemRevenue - Total revenue from this vendor's items in order
 * @param {Number} commissionPercentage - Override commission % (optional, uses config default)
 * @returns {Object} { revenue, commission, netPayable }
 */
const calculateItemCommission = (
  order = {},
  item = {},
  vendorItemRevenue = 0,
  commissionPercentage = null
) => {
  try {
    const commissionPct = commissionPercentage || COMMISSION_CONFIG.PLATFORM_COMMISSION_PERCENTAGE;
    const commission = (vendorItemRevenue * commissionPct) / 100;

    return {
      itemRevenue: vendorItemRevenue,
      commissionAmount: Math.round(commission * 100) / 100, // 2 decimal places
      netPayable: Math.round((vendorItemRevenue - commission) * 100) / 100,
      commissionPercentage: commissionPct,
    };
  } catch (error) {
    logger.error(`Error calculating item commission: ${error.message}`);
    throw error;
  }
};

/**
 * Calculate total settlement for a vendor across multiple orders
 * @param {Array} orders - Array of order documents
 * @param {String} vendorEmail - Vendor email to filter items
 * @param {Object} options - { commissionPercentage, periodStartDate, periodEndDate }
 * @returns {Object} Settlement summary
 */
const calculateVendorSettlement = (orders = [], vendorEmail = '', options = {}) => {
  try {
    const {
      commissionPercentage = COMMISSION_CONFIG.PLATFORM_COMMISSION_PERCENTAGE,
      periodStartDate = null,
      periodEndDate = null,
    } = options;

    let totalRevenue = 0;
    let totalCommission = 0;
    let deliveredOrderCount = 0;
    const settlementOrders = [];

    orders.forEach((order) => {
      // Filter out cancelled orders from settlement
      if (order.status === 'Cancelled') {
        return;
      }

      // Only include orders within period (if specified)
      const orderDate = new Date(order.createdAt);
      if (periodStartDate && orderDate < periodStartDate) {
        return;
      }
      if (periodEndDate && orderDate > periodEndDate) {
        return;
      }

      // Calculate revenue for this vendor's items in the order
      let vendorRevenue = 0;
      const vendorItems = (order.items || []).filter(
        (item) => item.sellerEmail?.toLowerCase() === vendorEmail.toLowerCase()
      );

      vendorItems.forEach((item) => {
        const itemSubtotal = item.price * item.quantity;
        vendorRevenue += itemSubtotal;
      });

      if (vendorRevenue > 0) {
        const itemCommission = calculateItemCommission(order, null, vendorRevenue, commissionPercentage);
        totalRevenue += itemCommission.itemRevenue;
        totalCommission += itemCommission.commissionAmount;

        if (order.status === 'Delivered') {
          deliveredOrderCount += 1;
        }

        settlementOrders.push({
          orderId: order._id?.toString() || order.id,
          orderDate: orderDate,
          customerEmail: order.customerEmail,
          itemCount: vendorItems.length,
          itemRevenue: itemCommission.itemRevenue,
          commissionAmount: itemCommission.commissionAmount,
          netPayable: itemCommission.netPayable,
          status: order.status,
        });
      }
    });

    return {
      vendorEmail,
      summary: {
        totalOrderCount: settlementOrders.length,
        deliveredOrderCount,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        platformCommission: Math.round(totalCommission * 100) / 100,
        commissionPercentage,
        netPayable: Math.round((totalRevenue - totalCommission) * 100) / 100,
        deductions: 0, // Can be updated by admin
      },
      orders: settlementOrders,
    };
  } catch (error) {
    logger.error(`Error calculating vendor settlement: ${error.message}`);
    throw error;
  }
};

/**
 * Generate settlement report for a vendor within a date range
 * @param {Array} orders - Array of order documents
 * @param {String} vendorEmail - Vendor email
 * @param {Date} startDate - Settlement period start
 * @param {Date} endDate - Settlement period end
 * @returns {Object} Settlement report with order breakdown
 */
const generateSettlementReport = (orders = [], vendorEmail = '', startDate, endDate) => {
  try {
    const settlement = calculateVendorSettlement(orders, vendorEmail, {
      periodStartDate: startDate,
      periodEndDate: endDate,
    });

    // Group orders by status for report
    const ordersByStatus = {
      delivered: settlement.orders.filter((o) => o.status === 'Delivered'),
      pending: settlement.orders.filter((o) => o.status !== 'Delivered'),
    };

    return {
      reportId: `report-${Date.now()}`,
      generatedAt: new Date(),
      period: {
        startDate,
        endDate,
      },
      vendor: {
        email: vendorEmail,
      },
      summary: settlement.summary,
      ordersByStatus,
      totalOrders: settlement.orders,
    };
  } catch (error) {
    logger.error(`Error generating settlement report: ${error.message}`);
    throw error;
  }
};

/**
 * Check if vendor qualifies for settlement (minimum amount threshold)
 * @param {Number} netPayable - Net amount payable to vendor
 * @param {Number} minAmount - Minimum settlement threshold (from config)
 * @returns {Boolean}
 */
const qualifiesForSettlement = (
  netPayable = 0,
  minAmount = COMMISSION_CONFIG.SETTLEMENT_MIN_AMOUNT
) => {
  return netPayable >= minAmount;
};

/**
 * Calculate next settlement date based on cycle
 * @param {Date} lastSettlementDate - Date of last settlement
 * @param {Number} cycleDays - Settlement cycle in days (from config)
 * @returns {Date}
 */
const calculateNextSettlementDate = (
  lastSettlementDate = new Date(),
  cycleDays = COMMISSION_CONFIG.SETTLEMENT_CYCLE_DAYS
) => {
  const nextDate = new Date(lastSettlementDate);
  nextDate.setDate(nextDate.getDate() + cycleDays);
  return nextDate;
};

module.exports = {
  calculateItemCommission,
  calculateVendorSettlement,
  generateSettlementReport,
  qualifiesForSettlement,
  calculateNextSettlementDate,
};
