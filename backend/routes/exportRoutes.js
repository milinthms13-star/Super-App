const express = require('express');
const router = express.Router();
const exportService = require('../services/exportService');
const auditLogService = require('../services/auditLogService');
const { authenticate } = require('../middleware/auth');

// Import models
const Business = require('../models/Business');
const BusinessBuilderOrder = require('../models/BusinessBuilderOrder');
const BusinessBuilderLead = require('../models/BusinessBuilderLead');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');

/**
 * @route   POST /api/export/businesses
 * @desc    Export businesses data
 * @access  Private
 */
router.post('/businesses', authenticate, async (req, res) => {
  try {
    const { format = 'csv', filters = {}, filename } = req.body;

    // Build query based on filters
    const query = { userId: req.user.id };
    if (filters.industry) query.industry = filters.industry;
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const businesses = await Business.find(query)
      .sort({ createdAt: -1 })
      .lean();

    if (businesses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No businesses found to export'
      });
    }

    const result = await exportService.exportBusinesses(businesses, format, {
      filename
    });

    // Log the export action
    await auditLogService.log({
      userId: req.user.id,
      action: 'data.export',
      resourceType: 'Business',
      metadata: {
        format,
        recordCount: businesses.length,
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      success: true,
      message: 'Businesses exported successfully',
      data: result
    });
  } catch (error) {
    console.error('Error exporting businesses:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to export businesses'
    });
  }
});

/**
 * @route   POST /api/export/orders
 * @desc    Export orders data
 * @access  Private
 */
router.post('/orders', authenticate, async (req, res) => {
  try {
    const { format = 'csv', filters = {}, filename } = req.body;

    // Build query based on filters
    const query = {};
    
    if (filters.businessId) {
      query.businessId = filters.businessId;
    } else {
      // Get user's businesses
      const businesses = await Business.find({ userId: req.user.id }).select('_id');
      query.businessId = { $in: businesses.map(b => b._id) };
    }

    if (filters.status) query.status = filters.status;
    if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const orders = await BusinessBuilderOrder.find(query)
      .populate('businessId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No orders found to export'
      });
    }

    const result = await exportService.exportOrders(orders, format, {
      filename
    });

    // Log the export action
    await auditLogService.log({
      userId: req.user.id,
      action: 'data.export',
      resourceType: 'Order',
      metadata: {
        format,
        recordCount: orders.length,
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      success: true,
      message: 'Orders exported successfully',
      data: result
    });
  } catch (error) {
    console.error('Error exporting orders:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to export orders'
    });
  }
});

/**
 * @route   POST /api/export/leads
 * @desc    Export leads data
 * @access  Private
 */
router.post('/leads', authenticate, async (req, res) => {
  try {
    const { format = 'csv', filters = {}, filename } = req.body;

    // Build query based on filters
    const query = {};
    
    if (filters.businessId) {
      query.businessId = filters.businessId;
    } else {
      // Get user's businesses
      const businesses = await Business.find({ userId: req.user.id }).select('_id');
      query.businessId = { $in: businesses.map(b => b._id) };
    }

    if (filters.status) query.status = filters.status;
    if (filters.source) query.source = filters.source;
    if (filters.minScore) query.score = { $gte: filters.minScore };
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const leads = await BusinessBuilderLead.find(query)
      .populate('businessId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    if (leads.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No leads found to export'
      });
    }

    const result = await exportService.exportLeads(leads, format, {
      filename
    });

    // Log the export action
    await auditLogService.log({
      userId: req.user.id,
      action: 'data.export',
      resourceType: 'Lead',
      metadata: {
        format,
        recordCount: leads.length,
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      success: true,
      message: 'Leads exported successfully',
      data: result
    });
  } catch (error) {
    console.error('Error exporting leads:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to export leads'
    });
  }
});

/**
 * @route   POST /api/export/invoices
 * @desc    Export invoices data
 * @access  Private
 */
router.post('/invoices', authenticate, async (req, res) => {
  try {
    const { format = 'csv', filters = {}, filename } = req.body;

    // Build query based on filters
    const query = {};
    
    if (filters.businessId) {
      query.businessId = filters.businessId;
    } else {
      // Get user's businesses
      const businesses = await Business.find({ userId: req.user.id }).select('_id');
      query.businessId = { $in: businesses.map(b => b._id) };
    }

    if (filters.status) query.status = filters.status;
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const invoices = await Invoice.find(query)
      .populate('businessId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    if (invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No invoices found to export'
      });
    }

    // Prepare data for export
    const data = invoices.map(invoice => ({
      invoiceNumber: invoice.invoiceNumber,
      businessName: invoice.businessId?.name,
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail,
      items: invoice.items?.length || 0,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      status: invoice.status,
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '',
      createdAt: new Date(invoice.createdAt).toLocaleDateString()
    }));

    const columns = [
      { key: 'invoiceNumber', header: 'Invoice #', width: 20 },
      { key: 'businessName', header: 'Business', width: 25 },
      { key: 'customerName', header: 'Customer', width: 25 },
      { key: 'customerEmail', header: 'Email', width: 30 },
      { key: 'items', header: 'Items', width: 10 },
      { key: 'subtotal', header: 'Subtotal', width: 15 },
      { key: 'tax', header: 'Tax', width: 15 },
      { key: 'total', header: 'Total', width: 15 },
      { key: 'status', header: 'Status', width: 15 },
      { key: 'dueDate', header: 'Due Date', width: 15 },
      { key: 'createdAt', header: 'Created', width: 15 }
    ];

    const fields = columns.map(col => ({ label: col.header, value: col.key }));

    let result;
    switch (format.toLowerCase()) {
      case 'csv':
        result = await exportService.exportToCSV(data, fields, {
          filename: filename || `invoices_${Date.now()}.csv`
        });
        break;
      case 'excel':
      case 'xlsx':
        result = await exportService.exportToExcel(data, {
          filename: filename || `invoices_${Date.now()}.xlsx`,
          sheetName: 'Invoices',
          columns,
          title: 'Invoices Report'
        });
        break;
      case 'pdf':
        result = await exportService.exportToPDF(data, {
          filename: filename || `invoices_${Date.now()}.pdf`,
          title: 'Invoices Report',
          columns
        });
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    // Log the export action
    await auditLogService.log({
      userId: req.user.id,
      action: 'data.export',
      resourceType: 'Invoice',
      metadata: {
        format,
        recordCount: invoices.length,
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      success: true,
      message: 'Invoices exported successfully',
      data: result
    });
  } catch (error) {
    console.error('Error exporting invoices:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to export invoices'
    });
  }
});

/**
 * @route   POST /api/export/payments
 * @desc    Export payments data
 * @access  Private
 */
router.post('/payments', authenticate, async (req, res) => {
  try {
    const { format = 'csv', filters = {}, filename } = req.body;

    // Build query based on filters
    const query = { userId: req.user.id };
    
    if (filters.businessId) query.businessId = filters.businessId;
    if (filters.status) query.status = filters.status;
    if (filters.method) query.method = filters.method;
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const payments = await Payment.find(query)
      .populate('businessId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No payments found to export'
      });
    }

    // Prepare data for export
    const data = payments.map(payment => ({
      razorpayPaymentId: payment.razorpayPaymentId,
      razorpayOrderId: payment.razorpayOrderId,
      businessName: payment.businessId?.name,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      customerName: payment.customerName,
      customerEmail: payment.customerEmail,
      refundAmount: payment.refundAmount,
      netAmount: payment.amount - payment.refundAmount,
      createdAt: new Date(payment.createdAt).toLocaleDateString()
    }));

    const columns = [
      { key: 'razorpayPaymentId', header: 'Payment ID', width: 25 },
      { key: 'razorpayOrderId', header: 'Order ID', width: 25 },
      { key: 'businessName', header: 'Business', width: 25 },
      { key: 'amount', header: 'Amount', width: 15 },
      { key: 'currency', header: 'Currency', width: 10 },
      { key: 'status', header: 'Status', width: 15 },
      { key: 'method', header: 'Method', width: 15 },
      { key: 'customerName', header: 'Customer', width: 25 },
      { key: 'refundAmount', header: 'Refunded', width: 15 },
      { key: 'netAmount', header: 'Net Amount', width: 15 },
      { key: 'createdAt', header: 'Date', width: 15 }
    ];

    const fields = columns.map(col => ({ label: col.header, value: col.key }));

    let result;
    switch (format.toLowerCase()) {
      case 'csv':
        result = await exportService.exportToCSV(data, fields, {
          filename: filename || `payments_${Date.now()}.csv`
        });
        break;
      case 'excel':
      case 'xlsx':
        result = await exportService.exportToExcel(data, {
          filename: filename || `payments_${Date.now()}.xlsx`,
          sheetName: 'Payments',
          columns,
          title: 'Payments Report'
        });
        break;
      case 'pdf':
        result = await exportService.exportToPDF(data, {
          filename: filename || `payments_${Date.now()}.pdf`,
          title: 'Payments Report',
          columns
        });
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    // Log the export action
    await auditLogService.log({
      userId: req.user.id,
      action: 'data.export',
      resourceType: 'Order',
      metadata: {
        format,
        recordCount: payments.length,
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      success: true,
      message: 'Payments exported successfully',
      data: result
    });
  } catch (error) {
    console.error('Error exporting payments:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to export payments'
    });
  }
});

/**
 * @route   DELETE /api/export/:filename
 * @desc    Delete export file
 * @access  Private
 */
router.delete('/:filename', authenticate, async (req, res) => {
  try {
    const { filename } = req.params;

    const result = await exportService.deleteExport(filename);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error deleting export file:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete export file'
    });
  }
});

/**
 * @route   POST /api/export/cleanup
 * @desc    Cleanup old export files
 * @access  Private (Admin)
 */
router.post('/cleanup', authenticate, async (req, res) => {
  try {
    const { daysToKeep = 7 } = req.body;

    const result = await exportService.cleanupOldExports(daysToKeep);

    res.json({
      success: true,
      message: result.message,
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    console.error('Error cleaning up exports:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cleanup exports'
    });
  }
});

/**
 * @route   GET /api/export/formats
 * @desc    Get available export formats
 * @access  Private
 */
router.get('/formats', authenticate, async (req, res) => {
  try {
    const formats = [
      {
        value: 'csv',
        label: 'CSV (Comma-Separated Values)',
        extension: '.csv',
        mimeType: 'text/csv',
        description: 'Simple text format, compatible with Excel and other spreadsheet applications'
      },
      {
        value: 'excel',
        label: 'Excel Spreadsheet',
        extension: '.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        description: 'Microsoft Excel format with formatting and styling'
      },
      {
        value: 'pdf',
        label: 'PDF Document',
        extension: '.pdf',
        mimeType: 'application/pdf',
        description: 'Portable Document Format, ideal for printing and sharing'
      }
    ];

    res.json({
      success: true,
      message: 'Export formats retrieved',
      data: formats
    });
  } catch (error) {
    console.error('Error fetching export formats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch export formats'
    });
  }
});

module.exports = router;
