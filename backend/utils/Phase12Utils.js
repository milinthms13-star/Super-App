/**
 * Phase 12 Utilities - Advanced Payment Features
 * Helper functions for subscriptions, links, invoices, settlements, commissions
 */

const logger = require('./logger');

class Phase12Utils {
  /**
   * Calculate billing cycle end date
   */
  static calculateBillingEndDate(startDate, duration, unit) {
    const endDate = new Date(startDate);

    switch (unit) {
      case 'days':
        endDate.setDate(endDate.getDate() + duration);
        break;
      case 'weeks':
        endDate.setDate(endDate.getDate() + duration * 7);
        break;
      case 'months':
        endDate.setMonth(endDate.getMonth() + duration);
        break;
      case 'years':
        endDate.setFullYear(endDate.getFullYear() + duration);
        break;
    }

    return endDate;
  }

  /**
   * Calculate days remaining in subscription
   */
  static calculateDaysRemaining(startDate, endDate) {
    const today = new Date();
    const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysRemaining);
  }

  /**
   * Calculate commission breakdown
   */
  static calculateCommissionBreakdown(orderAmount, commissionRate, minCommission, maxCommission) {
    let commissionAmount = (orderAmount * commissionRate) / 100;

    if (minCommission) {
      commissionAmount = Math.max(commissionAmount, minCommission);
    }

    if (maxCommission) {
      commissionAmount = Math.min(commissionAmount, maxCommission);
    }

    // Calculate GST (18%)
    const gstRate = 18;
    const gstAmount = (commissionAmount * gstRate) / 100;
    const totalPayable = commissionAmount + gstAmount;

    return {
      commissionAmount,
      gstAmount,
      gstRate,
      totalPayable,
      netCommission: commissionAmount,
    };
  }

  /**
   * Generate invoice number with sequence
   */
  static generateSequentialInvoiceNumber(prefix, sequence) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const seqNumber = String(sequence).padStart(5, '0');

    return `${prefix}-${year}${month}-${seqNumber}`;
  }

  /**
   * Format invoice total with breakdown
   */
  static formatInvoiceTotals(items, discount, taxBreakdown) {
    const subtotal = items.reduce((sum, item) => sum + item.totalAmount, 0);
    const discountAmount = discount || 0;
    const afterDiscount = subtotal - discountAmount;

    let totalTax = 0;
    if (taxBreakdown) {
      totalTax = Object.values(taxBreakdown).reduce((sum, tax) => {
        return sum + (tax.amount || 0);
      }, 0);
    }

    const totalAmount = afterDiscount + totalTax;

    return {
      subtotal,
      discountAmount,
      afterDiscount,
      totalTax,
      totalAmount,
    };
  }

  /**
   * Validate payment link expiry
   */
  static isPaymentLinkExpired(expiryDate) {
    return expiryDate < new Date();
  }

  /**
   * Calculate settlement fee
   */
  static calculateSettlementFee(amount, feePercentage, minFee, maxFee) {
    let fee = (amount * feePercentage) / 100;

    if (minFee) {
      fee = Math.max(fee, minFee);
    }

    if (maxFee) {
      fee = Math.min(fee, maxFee);
    }

    return fee;
  }

  /**
   * Get settlement processing time estimate
   */
  static getSettlementTimeEstimate(paymentGateway, amount) {
    const estimates = {
      razorpay: { standard: 24, fast: 2 },
      stripe: { standard: 48, fast: 24 },
      paytm: { standard: 24, fast: 2 },
    };

    const gatewayEstimate = estimates[paymentGateway] || { standard: 48, fast: 24 };

    // Fast settlement for amounts < 5000
    if (amount < 5000) {
      return gatewayEstimate.fast;
    }

    return gatewayEstimate.standard;
  }

  /**
   * Validate subscription plan configuration
   */
  static validateSubscriptionPlan(planData) {
    const errors = [];

    if (!planData.planType) {
      errors.push('Plan type is required');
    }

    if (!planData.billingAmount || planData.billingAmount <= 0) {
      errors.push('Billing amount must be positive');
    }

    if (planData.planDuration?.value <= 0) {
      errors.push('Plan duration must be positive');
    }

    return errors;
  }

  /**
   * Format payment link expiry time remaining
   */
  static formatExpiryRemaining(expiryDate) {
    const now = new Date();
    const diffMs = expiryDate - now;

    if (diffMs < 0) {
      return 'Expired';
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} remaining`;
    }

    if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} remaining`;
    }

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} remaining`;
  }

  /**
   * Generate settlement report
   */
  static generateSettlementReport(settlements) {
    const report = {
      totalSettlements: settlements.length,
      totalAmount: 0,
      totalFees: 0,
      totalNetAmount: 0,
      byStatus: {},
      byGateway: {},
    };

    settlements.forEach((settlement) => {
      report.totalAmount += settlement.settlementAmount;
      report.totalFees += settlement.settlementFee;
      report.totalNetAmount += settlement.netAmount;

      // Group by status
      if (!report.byStatus[settlement.status]) {
        report.byStatus[settlement.status] = 0;
      }
      report.byStatus[settlement.status]++;

      // Group by gateway
      if (!report.byGateway[settlement.paymentGateway]) {
        report.byGateway[settlement.paymentGateway] = {
          count: 0,
          amount: 0,
        };
      }
      report.byGateway[settlement.paymentGateway].count++;
      report.byGateway[settlement.paymentGateway].amount += settlement.netAmount;
    });

    return report;
  }

  /**
   * Generate commission report
   */
  static generateCommissionReport(commissions) {
    const report = {
      totalCommissions: commissions.length,
      totalCommissionAmount: 0,
      totalTax: 0,
      totalPayable: 0,
      byStatus: {},
      byType: {},
      byRestaurant: {},
    };

    commissions.forEach((commission) => {
      report.totalCommissionAmount += commission.commissionAmount;
      report.totalTax += commission.totalTax;
      report.totalPayable += commission.payableAmount;

      // Group by status
      if (!report.byStatus[commission.status]) {
        report.byStatus[commission.status] = 0;
      }
      report.byStatus[commission.status]++;

      // Group by type
      if (!report.byType[commission.commissionType]) {
        report.byType[commission.commissionType] = 0;
      }
      report.byType[commission.commissionType]++;

      // Group by restaurant
      if (!report.byRestaurant[commission.linkedRestaurantId]) {
        report.byRestaurant[commission.linkedRestaurantId] = {
          count: 0,
          amount: 0,
        };
      }
      report.byRestaurant[commission.linkedRestaurantId].count++;
      report.byRestaurant[commission.linkedRestaurantId].amount += commission.payableAmount;
    });

    return report;
  }

  /**
   * Validate bank account details (basic)
   */
  static validateBankAccountDetails(bankDetails) {
    const errors = [];

    if (!bankDetails.accountNumber || bankDetails.accountNumber.length < 9) {
      errors.push('Invalid account number');
    }

    if (!bankDetails.ifscCode || bankDetails.ifscCode.length !== 11) {
      errors.push('IFSC code must be 11 characters');
    }

    if (!bankDetails.bankName) {
      errors.push('Bank name is required');
    }

    return errors;
  }

  /**
   * Get payment link share channels
   */
  static getShareChannels() {
    return [
      { id: 'email', name: 'Email', icon: 'envelope' },
      { id: 'sms', name: 'SMS', icon: 'message' },
      { id: 'whatsapp', name: 'WhatsApp', icon: 'whatsapp' },
      { id: 'link_copy', name: 'Copy Link', icon: 'link' },
      { id: 'qr_scan', name: 'QR Code', icon: 'qrcode' },
    ];
  }

  /**
   * Format currency amount
   */
  static formatCurrency(amount, currency = 'INR') {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
    });

    return formatter.format(amount);
  }

  /**
   * Calculate invoice due status
   */
  static getInvoiceDueStatus(dueDate, isPaid) {
    if (isPaid) {
      return 'Paid';
    }

    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) {
      return `Overdue by ${Math.abs(daysUntilDue)} days`;
    }

    if (daysUntilDue === 0) {
      return 'Due today';
    }

    return `Due in ${daysUntilDue} days`;
  }
}

module.exports = Phase12Utils;
