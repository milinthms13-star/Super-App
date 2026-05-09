/**
 * TaxCalculationService.js
 * Handles tax and GST calculations for products and orders
 */

const logger = require('../config/logger');

class TaxCalculationService {
  // GST rate categories
  static GST_RATES = {
    '0%': 0,
    '5%': 5,
    '12%': 12,
    '18%': 18,
    '28%': 28,
  };

  /**
   * Get HSN/SAC code for product
   */
  static getHSNCode(productCategory) {
    // Map product categories to HSN codes
    const hsnCodes = {
      'electronics': '8471',
      'clothing': '6204',
      'books': '4901',
      'beauty': '3304',
      'food': '1904',
      'furniture': '9403',
      'toys': '9503',
      'sports': '9506',
      'jewelry': '7113',
      'watches': '9102',
    };

    return hsnCodes[productCategory?.toLowerCase()] || '9999';
  }

  /**
   * Calculate GST for product
   */
  static calculateGST(productPrice, gstRate) {
    const rate = this.GST_RATES[gstRate] || 0;
    const gstAmount = (productPrice * rate) / 100;
    return {
      gstRate: rate,
      gstAmount: parseFloat(gstAmount.toFixed(2)),
      totalPrice: parseFloat((productPrice + gstAmount).toFixed(2)),
    };
  }

  /**
   * Calculate tax for order
   */
  static async calculateOrderTax(order) {
    try {
      let totalGST = 0;
      let totalTax = 0;
      let taxBreakdown = [];

      for (const item of order.items) {
        const itemTax = this.calculateGST(item.price * item.quantity, item.gstRate || '18%');
        totalGST += itemTax.gstAmount;

        taxBreakdown.push({
          itemId: item._id,
          itemName: item.name,
          unitPrice: item.price,
          quantity: item.quantity,
          gstRate: item.gstRate || '18%',
          gstAmount: itemTax.gstAmount,
          itemTotal: itemTax.totalPrice,
        });
      }

      // Additional taxes
      let shippingTax = 0;
      if (order.shippingCost > 0) {
        // Shipping GST is typically 5%
        const shippingTaxCalc = this.calculateGST(order.shippingCost, '5%');
        shippingTax = shippingTaxCalc.gstAmount;
      }

      totalTax = totalGST + shippingTax;

      return {
        subtotal: order.subtotal,
        gst: parseFloat(totalGST.toFixed(2)),
        shippingTax: parseFloat(shippingTax.toFixed(2)),
        totalTax: parseFloat(totalTax.toFixed(2)),
        totalAmount: parseFloat((order.subtotal + totalTax + order.shippingCost).toFixed(2)),
        breakdown: taxBreakdown,
      };
    } catch (error) {
      logger.error('Error calculating order tax:', error);
      throw error;
    }
  }

  /**
   * Generate GST Invoice
   */
  static async generateGSTInvoice(orderId) {
    try {
      const Order = require('../models/Order');
      const User = require('../models/User');

      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const buyer = await User.findById(order.userId);
      const taxCalculation = await this.calculateOrderTax(order);

      const invoice = {
        invoiceNumber: `INV-${orderId.toString().slice(-8).toUpperCase()}`,
        invoiceDate: new Date(),
        orderDate: order.createdAt,
        
        // Buyer details
        buyer: {
          name: buyer.firstName + ' ' + buyer.lastName,
          email: buyer.email,
          phone: buyer.phoneNumber,
          address: buyer.address,
        },

        // Items with HSN
        items: order.items.map(item => ({
          description: item.name,
          hsn: this.getHSNCode(item.category),
          quantity: item.quantity,
          unitPrice: item.price,
          gstRate: item.gstRate || '18%',
          amount: item.price * item.quantity,
          gst: ((item.price * item.quantity) * (this.GST_RATES[item.gstRate || '18%'] || 18)) / 100,
        })),

        // Tax summary
        taxSummary: {
          subtotal: taxCalculation.subtotal,
          gst: taxCalculation.gst,
          shipping: order.shippingCost,
          shippingTax: taxCalculation.shippingTax,
          total: taxCalculation.totalAmount,
        },

        // Reverse charge (if applicable)
        reverseCharge: this._isReverseChargeApplicable(order),

        // Payment terms
        paymentTerms: 'Due on receipt',
        paymentStatus: order.paymentStatus,
      };

      return invoice;
    } catch (error) {
      logger.error('Error generating GST invoice:', error);
      throw error;
    }
  }

  /**
   * Check if reverse charge is applicable
   */
  static _isReverseChargeApplicable(order) {
    // Reverse charge is applicable if:
    // 1. Buyer is registered business (B2B)
    // 2. Turnover is above threshold
    return order.isBusiness === true && order.buyerGSTIN;
  }

  /**
   * Calculate state-wise tax (IGST/SGST/CGST)
   */
  static calculateStateWiseTax(price, gstRate, buyerState, sellerState) {
    const rate = this.GST_RATES[gstRate] || 18;

    // If buyer and seller in same state
    if (buyerState === sellerState) {
      // SGST + CGST (split 50-50)
      const sgst = (price * rate) / 200;
      const cgst = (price * rate) / 200;
      return {
        sgst: parseFloat(sgst.toFixed(2)),
        cgst: parseFloat(cgst.toFixed(2)),
        igst: 0,
        totalTax: parseFloat((sgst + cgst).toFixed(2)),
        type: 'INTRA-STATE',
      };
    } else {
      // IGST (integrated GST)
      const igst = (price * rate) / 100;
      return {
        sgst: 0,
        cgst: 0,
        igst: parseFloat(igst.toFixed(2)),
        totalTax: parseFloat(igst.toFixed(2)),
        type: 'INTER-STATE',
      };
    }
  }

  /**
   * Validate GST number
   */
  static validateGSTNumber(gstNumber) {
    // GST number format: 2 digits state code + 10 digit PAN + 1 entity check digit + 1 check digit
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gstNumber);
  }

  /**
   * Apply discount on tax calculation
   */
  static applyDiscount(price, discountPercentage, gstRate) {
    const discountAmount = (price * discountPercentage) / 100;
    const finalPrice = price - discountAmount;
    const taxCalc = this.calculateGST(finalPrice, gstRate);

    return {
      originalPrice: price,
      discountPercentage,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      finalPrice: parseFloat(finalPrice.toFixed(2)),
      gstAmount: taxCalc.gstAmount,
      totalPrice: taxCalc.totalPrice,
    };
  }

  /**
   * Generate tax report for seller
   */
  static async generateTaxReport(sellerId, startDate, endDate) {
    try {
      const Order = require('../models/Order');

      const orders = await Order.find({
        sellerId,
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $ne: 'cancelled' },
      });

      let totalRevenue = 0;
      let totalGST = 0;
      const taxByRate = {};

      for (const order of orders) {
        const taxCalc = await this.calculateOrderTax(order);
        totalRevenue += order.totalAmount;
        totalGST += taxCalc.gst;

        const rate = `${taxCalc.gst}%`;
        if (!taxByRate[rate]) {
          taxByRate[rate] = 0;
        }
        taxByRate[rate] += taxCalc.gst;
      }

      return {
        period: { startDate, endDate },
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalGST: parseFloat(totalGST.toFixed(2)),
        taxByRate,
        numberOfOrders: orders.length,
      };
    } catch (error) {
      logger.error('Error generating tax report:', error);
      throw error;
    }
  }

  /**
   * Check tax applicability for product
   */
  static isTaxApplicable(product) {
    // Some products are tax-exempt (e.g., basic food items)
    const taxExemptCategories = ['vegetables', 'fruits', 'milk', 'bread'];
    return !taxExemptCategories.includes(product.category?.toLowerCase());
  }
}

module.exports = TaxCalculationService;
