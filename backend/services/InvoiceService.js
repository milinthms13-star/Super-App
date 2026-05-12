/**
 * Invoice Service - Phase 12
 * Invoice generation and management
 */

const Invoice = require('../models/Invoice');
const { randomUUID } = require('crypto');
const PDFDocument = require('pdfkit');
const logger = require('../utils/logger');

class InvoiceService {
  /**
   * Create invoice from payment
   */
  static async createInvoice(paymentData, invoiceData) {
    try {
      const invoiceId = `INV_${randomUUID()}`;
      const invoiceNumber = await this.generateInvoiceNumber();

      const subtotal = invoiceData.items.reduce((sum, item) => sum + item.totalAmount, 0);
      const totalTax = invoiceData.taxBreakdown
        ? Object.values(invoiceData.taxBreakdown).reduce((sum, tax) => {
            return sum + (tax.amount || 0);
          }, 0)
        : 0;

      const invoice = new Invoice({
        invoiceId,
        invoiceNumber,
        linkedPaymentId: paymentData.paymentId,
        ...invoiceData,
        subtotal,
        totalTax,
        totalAmount: subtotal + totalTax - (invoiceData.discount || 0),
        outstandingAmount: subtotal + totalTax - (invoiceData.discount || 0),
        status: 'draft',
      });

      await invoice.save();

      logger.info(`Invoice created: ${invoiceId}`, {
        invoiceNumber,
        paymentId: paymentData.paymentId,
      });

      return invoice;
    } catch (error) {
      logger.error('Error creating invoice:', error);
      throw error;
    }
  }

  /**
   * Generate invoice number
   */
  static async generateInvoiceNumber() {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');

      const invoiceCount = await Invoice.countDocuments({
        invoiceDate: {
          $gte: new Date(year, today.getMonth(), 1),
          $lt: new Date(year, today.getMonth() + 1, 1),
        },
      });

      return `INV-${year}${month}-${String(invoiceCount + 1).padStart(5, '0')}`;
    } catch (error) {
      logger.error('Error generating invoice number:', error);
      throw error;
    }
  }

  /**
   * Get invoice by ID
   */
  static async getInvoice(invoiceId) {
    try {
      return await Invoice.findOne({ invoiceId });
    } catch (error) {
      logger.error('Error fetching invoice:', error);
      throw error;
    }
  }

  /**
   * Send invoice
   */
  static async sendInvoice(invoiceId, sendTo, method = 'email') {
    try {
      const invoice = await Invoice.findOne({ invoiceId });
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Generate PDF if not exists
      if (!invoice.pdfUrl) {
        await this.generateInvoicePDF(invoiceId);
      }

      invoice.markAsSent(sendTo, method);
      await invoice.save();

      // TODO: Integrate with email/SMS service
      logger.info(`Invoice sent to ${sendTo} via ${method}:`, { invoiceId });
      return invoice;
    } catch (error) {
      logger.error('Error sending invoice:', error);
      throw error;
    }
  }

  /**
   * Record invoice payment
   */
  static async recordPayment(invoiceId, paymentData) {
    try {
      const invoice = await Invoice.findOne({ invoiceId });
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      invoice.recordPayment(paymentData);
      invoice.auditTrail.push({
        timestamp: new Date(),
        action: 'payment_recorded',
        performedBy: 'system',
        details: paymentData,
      });

      await invoice.save();

      logger.info(`Payment recorded on invoice: ${invoiceId}`, paymentData);
      return invoice;
    } catch (error) {
      logger.error('Error recording payment:', error);
      throw error;
    }
  }

  /**
   * Generate invoice PDF
   */
  static async generateInvoicePDF(invoiceId) {
    try {
      const invoice = await Invoice.findOne({ invoiceId });
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // TODO: Implement actual PDF generation using pdfkit or similar
      // For now, just mark as generated
      invoice.pdfUrl = `${process.env.STORAGE_URL}/invoices/${invoiceId}.pdf`;
      invoice.pdfGeneratedAt = new Date();
      await invoice.save();

      logger.info(`Invoice PDF generated: ${invoiceId}`);
      return invoice.pdfUrl;
    } catch (error) {
      logger.error('Error generating PDF:', error);
      throw error;
    }
  }

  /**
   * Get invoices for user/business
   */
  static async getInvoices(criteria, options = {}) {
    try {
      const query = criteria;
      const skip = (options.page - 1) * (options.limit || 20);

      return await Invoice.find(query)
        .sort({ invoiceDate: -1 })
        .skip(skip)
        .limit(options.limit || 20);
    } catch (error) {
      logger.error('Error fetching invoices:', error);
      throw error;
    }
  }

  /**
   * Get overdue invoices
   */
  static async getOverdueInvoices() {
    try {
      return await Invoice.find({
        dueDate: { $lt: new Date() },
        paymentStatus: { $ne: 'paid' },
      }).sort({ dueDate: 1 });
    } catch (error) {
      logger.error('Error fetching overdue invoices:', error);
      throw error;
    }
  }

  /**
   * Mark invoice as viewed
   */
  static async markAsViewed(invoiceId, viewedBy) {
    try {
      const invoice = await Invoice.findOne({ invoiceId });
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      invoice.viewHistory.push({
        viewedAt: new Date(),
        viewedBy,
      });

      if (invoice.status === 'sent') {
        invoice.status = 'viewed';
      }

      await invoice.save();

      return invoice;
    } catch (error) {
      logger.error('Error marking invoice as viewed:', error);
      throw error;
    }
  }

  /**
   * Get invoice statistics
   */
  static async getInvoiceStats(criteria) {
    try {
      const stats = await Invoice.aggregate([
        { $match: criteria },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
            totalPaid: { $sum: '$amountPaid' },
            totalOutstanding: { $sum: '$outstandingAmount' },
          },
        },
      ]);

      return stats;
    } catch (error) {
      logger.error('Error fetching invoice stats:', error);
      throw error;
    }
  }

  /**
   * Cancel invoice
   */
  static async cancelInvoice(invoiceId, reason) {
    try {
      const invoice = await Invoice.findOne({ invoiceId });
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      invoice.status = 'cancelled';
      invoice.auditTrail.push({
        timestamp: new Date(),
        action: 'cancelled',
        performedBy: 'admin',
        details: { reason },
      });

      await invoice.save();

      logger.info(`Invoice cancelled: ${invoiceId}`, { reason });
      return invoice;
    } catch (error) {
      logger.error('Error cancelling invoice:', error);
      throw error;
    }
  }
}

module.exports = InvoiceService;
