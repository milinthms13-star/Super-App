/**
 * Invoice Controller - Phase 12
 * REST API endpoints for invoice management
 */

const InvoiceService = require('../services/InvoiceService');
const { validationResult } = require('express-validator');

class InvoiceController {
  /**
   * POST /api/v1/invoices
   * Create invoice
   */
  static async createInvoice(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const invoice = await InvoiceService.createInvoice(req.body.paymentData, req.body);

      res.status(201).json({
        success: true,
        invoiceId: invoice.invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        data: invoice,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/invoices/:invoiceId
   * Get invoice details
   */
  static async getInvoice(req, res) {
    try {
      const invoice = await InvoiceService.getInvoice(req.params.invoiceId);

      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
      }

      res.json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/invoices/:invoiceId/send
   * Send invoice
   */
  static async sendInvoice(req, res) {
    try {
      const invoice = await InvoiceService.sendInvoice(
        req.params.invoiceId,
        req.body.sendTo,
        req.body.method || 'email'
      );

      res.json({
        success: true,
        message: `Invoice sent to ${req.body.sendTo}`,
        data: invoice,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/invoices/:invoiceId/record-payment
   * Record payment on invoice
   */
  static async recordPayment(req, res) {
    try {
      const invoice = await InvoiceService.recordPayment(req.params.invoiceId, req.body);

      res.json({
        success: true,
        message: 'Payment recorded',
        data: invoice,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/invoices/:invoiceId/pdf
   * Get invoice PDF
   */
  static async getInvoicePDF(req, res) {
    try {
      const pdfUrl = await InvoiceService.generateInvoicePDF(req.params.invoiceId);

      res.json({
        success: true,
        pdfUrl,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/invoices
   * Get invoices
   */
  static async getInvoices(req, res) {
    try {
      const invoices = await InvoiceService.getInvoices(
        {
          'billTo.email': req.query.email,
        },
        {
          page: req.query.page || 1,
          limit: req.query.limit || 20,
        }
      );

      res.json({
        success: true,
        count: invoices.length,
        data: invoices,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/invoices/overdue
   * Get overdue invoices
   */
  static async getOverdueInvoices(req, res) {
    try {
      const invoices = await InvoiceService.getOverdueInvoices();

      res.json({
        success: true,
        count: invoices.length,
        data: invoices,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/invoices/:invoiceId/mark-viewed
   * Mark invoice as viewed
   */
  static async markAsViewed(req, res) {
    try {
      const invoice = await InvoiceService.markAsViewed(
        req.params.invoiceId,
        req.body.viewedBy || 'unknown'
      );

      res.json({
        success: true,
        message: 'Invoice marked as viewed',
        data: invoice,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/invoices/stats
   * Get invoice statistics
   */
  static async getInvoiceStats(req, res) {
    try {
      const stats = await InvoiceService.getInvoiceStats({
        'billTo.email': req.query.email,
      });

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * DELETE /api/v1/invoices/:invoiceId
   * Cancel invoice
   */
  static async cancelInvoice(req, res) {
    try {
      const invoice = await InvoiceService.cancelInvoice(
        req.params.invoiceId,
        req.body.reason
      );

      res.json({
        success: true,
        message: 'Invoice cancelled',
        data: invoice,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = InvoiceController;
