/**
 * B2BServiceLayerService.js
 * B2B functionality: bulk orders, corporate accounts, invoicing
 */

const logger = require('../config/logger');

class B2BServiceLayerService {
  /**
   * Create corporate account
   */
  static async createCorporateAccount(accountData) {
    try {
      const CorporateAccount = require('../models/CorporateAccount');

      const account = new CorporateAccount({
        companyName: accountData.companyName,
        registrationNumber: accountData.registrationNumber,
        taxId: accountData.taxId,
        address: accountData.address,
        contactEmail: accountData.contactEmail,
        contactPhone: accountData.contactPhone,
        accountManager: accountData.accountManager,
        creditLimit: accountData.creditLimit || 500000,
        paymentTerms: accountData.paymentTerms || 'net30', // net15, net30, net45
        status: 'pending_approval',
        createdAt: new Date(),
      });

      await account.save();

      logger.info(`Corporate account created: ${account._id}`);

      return {
        success: true,
        data: account,
        message: 'Corporate account created successfully',
      };
    } catch (error) {
      logger.error('Error creating corporate account:', error);
      throw error;
    }
  }

  /**
   * Create bulk order
   */
  static async createBulkOrder(userId, orderData) {
    try {
      const User = require('../models/User');
      const Product = require('../models/Product');
      const BulkOrder = require('../models/BulkOrder');

      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      // Validate items and calculate total
      let totalAmount = 0;
      const validatedItems = [];

      for (const item of orderData.items) {
        const product = await Product.findById(item.productId);
        if (!product) throw new Error(`Product ${item.productId} not found`);

        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }

        const bulkPrice = this._calculateBulkPrice(product.price, item.quantity);
        const itemTotal = bulkPrice * item.quantity;

        validatedItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: bulkPrice,
          total: itemTotal,
        });

        totalAmount += itemTotal;
      }

      // Create bulk order
      const bulkOrder = new BulkOrder({
        userId,
        corporateAccountId: orderData.corporateAccountId,
        items: validatedItems,
        totalAmount,
        discountPercentage: orderData.discountPercentage || 0,
        finalAmount: totalAmount * (1 - (orderData.discountPercentage || 0) / 100),
        status: 'pending',
        deliveryAddress: orderData.deliveryAddress,
        paymentTerms: orderData.paymentTerms || 'net30',
        poNumber: orderData.poNumber,
        createdAt: new Date(),
      });

      await bulkOrder.save();

      logger.info(`Bulk order created: ${bulkOrder._id}, amount: ₹${bulkOrder.finalAmount}`);

      return {
        success: true,
        data: bulkOrder,
        message: 'Bulk order created successfully',
      };
    } catch (error) {
      logger.error('Error creating bulk order:', error);
      throw error;
    }
  }

  /**
   * Approve bulk order
   */
  static async approveBulkOrder(bulkOrderId, approverNotes = '') {
    try {
      const BulkOrder = require('../models/BulkOrder');
      const Product = require('../models/Product');

      const bulkOrder = await BulkOrder.findById(bulkOrderId);
      if (!bulkOrder) throw new Error('Bulk order not found');

      // Reserve stock
      for (const item of bulkOrder.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: -item.quantity, reservedStock: item.quantity },
        });
      }

      bulkOrder.status = 'approved';
      bulkOrder.approvedAt = new Date();
      bulkOrder.approverNotes = approverNotes;

      await bulkOrder.save();

      logger.info(`Bulk order ${bulkOrderId} approved`);

      return {
        success: true,
        data: bulkOrder,
        message: 'Bulk order approved successfully',
      };
    } catch (error) {
      logger.error('Error approving bulk order:', error);
      throw error;
    }
  }

  /**
   * Generate invoice for bulk order
   */
  static async generateInvoice(bulkOrderId, invoiceData = {}) {
    try {
      const BulkOrder = require('../models/BulkOrder');
      const Invoice = require('../models/Invoice');

      const bulkOrder = await BulkOrder.findById(bulkOrderId);
      if (!bulkOrder) throw new Error('Bulk order not found');

      const invoice = new Invoice({
        bulkOrderId,
        invoiceNumber: this._generateInvoiceNumber(),
        userId: bulkOrder.userId,
        items: bulkOrder.items,
        subtotal: bulkOrder.totalAmount,
        discountPercentage: bulkOrder.discountPercentage,
        discountAmount: bulkOrder.totalAmount * (bulkOrder.discountPercentage / 100),
        gstPercentage: 18, // Mock GST
        gstAmount: bulkOrder.finalAmount * 0.18,
        totalAmount: bulkOrder.finalAmount * 1.18,
        paymentTerms: bulkOrder.paymentTerms,
        dueDate: this._calculateDueDate(bulkOrder.paymentTerms),
        issueDate: new Date(),
        notes: invoiceData.notes || '',
        status: 'issued',
      });

      await invoice.save();

      bulkOrder.invoiceId = invoice._id;
      bulkOrder.status = 'invoiced';
      await bulkOrder.save();

      logger.info(`Invoice ${invoice.invoiceNumber} generated for bulk order ${bulkOrderId}`);

      return {
        success: true,
        data: invoice,
        message: 'Invoice generated successfully',
      };
    } catch (error) {
      logger.error('Error generating invoice:', error);
      throw error;
    }
  }

  /**
   * Get B2B dashboard
   */
  static async getB2BDashboard(userId) {
    try {
      const User = require('../models/User');
      const BulkOrder = require('../models/BulkOrder');
      const Invoice = require('../models/Invoice');

      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      // Get recent orders
      const recentOrders = await BulkOrder.find({ userId }).sort({ createdAt: -1 }).limit(10);

      // Get pending invoices
      const pendingInvoices = await Invoice.find({
        userId,
        status: { $ne: 'paid' },
      });

      // Calculate statistics
      const totalOrders = await BulkOrder.countDocuments({ userId });
      const totalSpent = await BulkOrder.aggregate([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } },
      ]);

      const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

      return {
        userId,
        statistics: {
          totalOrders,
          totalSpent: totalSpent[0]?.total || 0,
          pendingInvoices: pendingInvoices.length,
          pendingAmount,
        },
        recentOrders,
        pendingInvoices,
      };
    } catch (error) {
      logger.error('Error getting B2B dashboard:', error);
      throw error;
    }
  }

  /**
   * Get bulk pricing for products
   */
  static async getBulkPricing(productId, quantity) {
    try {
      const Product = require('../models/Product');

      const product = await Product.findById(productId);
      if (!product) throw new Error('Product not found');

      const bulkPrice = this._calculateBulkPrice(product.price, quantity);
      const savings = (product.price - bulkPrice) * quantity;
      const savingsPercentage = ((savings / (product.price * quantity)) * 100).toFixed(2);

      return {
        productId,
        productName: product.name,
        regularPrice: product.price,
        bulkPrice,
        quantity,
        totalPrice: bulkPrice * quantity,
        savings,
        savingsPercentage: `${savingsPercentage}%`,
      };
    } catch (error) {
      logger.error('Error calculating bulk pricing:', error);
      throw error;
    }
  }

  /**
   * Get payment history for corporate account
   */
  static async getPaymentHistory(corporateAccountId, limit = 50) {
    try {
      const Payment = require('../models/Payment');

      const payments = await Payment.find({
        corporateAccountId,
      })
        .sort({ paymentDate: -1 })
        .limit(limit);

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

      return {
        corporateAccountId,
        payments,
        totalPaid,
        paymentCount: payments.length,
      };
    } catch (error) {
      logger.error('Error getting payment history:', error);
      throw error;
    }
  }

  /**
   * Request credit limit increase
   */
  static async requestCreditLimitIncrease(corporateAccountId, requestedLimit) {
    try {
      const CorporateAccount = require('../models/CorporateAccount');

      const account = await CorporateAccount.findById(corporateAccountId);
      if (!account) throw new Error('Corporate account not found');

      account.creditLimitRequests = account.creditLimitRequests || [];
      account.creditLimitRequests.push({
        requestedAmount: requestedLimit,
        status: 'pending',
        requestDate: new Date(),
      });

      await account.save();

      logger.info(
        `Credit limit increase requested for account ${corporateAccountId}: ₹${requestedLimit}`
      );

      return {
        success: true,
        data: account,
        message: 'Credit limit request submitted',
      };
    } catch (error) {
      logger.error('Error requesting credit limit increase:', error);
      throw error;
    }
  }

  /**
   * Approve credit limit increase
   */
  static async approveCreditLimitIncrease(corporateAccountId, newLimit) {
    try {
      const CorporateAccount = require('../models/CorporateAccount');

      const account = await CorporateAccount.findById(corporateAccountId);
      if (!account) throw new Error('Corporate account not found');

      account.creditLimit = newLimit;
      account.creditLimitUpdatedAt = new Date();

      if (account.creditLimitRequests && account.creditLimitRequests.length > 0) {
        account.creditLimitRequests[account.creditLimitRequests.length - 1].status = 'approved';
        account.creditLimitRequests[
          account.creditLimitRequests.length - 1
        ].approvalDate = new Date();
      }

      await account.save();

      logger.info(`Credit limit increased for account ${corporateAccountId} to ₹${newLimit}`);

      return {
        success: true,
        data: account,
        message: 'Credit limit increased successfully',
      };
    } catch (error) {
      logger.error('Error approving credit limit increase:', error);
      throw error;
    }
  }

  /**
   * Calculate bulk price based on quantity
   */
  static _calculateBulkPrice(price, quantity) {
    if (quantity >= 1000) return price * 0.7; // 30% discount
    if (quantity >= 500) return price * 0.75; // 25% discount
    if (quantity >= 100) return price * 0.8; // 20% discount
    if (quantity >= 50) return price * 0.85; // 15% discount
    if (quantity >= 10) return price * 0.9; // 10% discount
    return price; // No discount
  }

  /**
   * Generate unique invoice number
   */
  static _generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(5, '0');
    return `INV-${year}${month}-${random}`;
  }

  /**
   * Calculate due date based on payment terms
   */
  static _calculateDueDate(paymentTerms) {
    const now = new Date();

    if (paymentTerms === 'net45') {
      return new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
    } else if (paymentTerms === 'net30') {
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else {
      // net15
      return new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    }
  }
}

module.exports = B2BServiceLayerService;
