const express = require('express');
const { authenticate } = require('../middleware/auth');
const Business = require('../models/Business');
const Invoice = require('../models/Invoice');
const MiniApp = require('../models/MiniApp');
const BusinessBuilderLead = require('../models/BusinessBuilderLead');
const BusinessBuilderOrder = require('../models/BusinessBuilderOrder');
const BusinessBuilderEvent = require('../models/BusinessBuilderEvent');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * Search across all business builder entities
 * GET /api/business-builder/search
 */
router.get('/search', async (req, res) => {
  try {
    const { q, type, businessId } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters',
      });
    }

    const searchQuery = new RegExp(q.trim(), 'i');
    const results = {};

    // Search businesses
    if (!type || type === 'business') {
      results.businesses = await Business.find({
        userId: req.user.id,
        $or: [
          { businessName: searchQuery },
          { 'address.city': searchQuery },
          { email: searchQuery },
        ],
      })
        .limit(10)
        .select('businessId businessName businessType address');
    }

    // Search invoices
    if (!type || type === 'invoice') {
      const invoiceQuery = { userId: req.user.id };
      if (businessId) {
        const business = await Business.findOne({ businessId, userId: req.user.id });
        if (business) invoiceQuery.businessId = business._id;
      }
      
      invoiceQuery.$or = [
        { invoiceNumber: searchQuery },
        { 'customer.name': searchQuery },
        { 'customer.email': searchQuery },
      ];

      results.invoices = await Invoice.find(invoiceQuery)
        .limit(10)
        .select('invoiceId invoiceNumber customer totalAmount status createdAt')
        .populate('businessId', 'businessName');
    }

    // Search mini apps
    if (!type || type === 'miniapp') {
      const miniAppQuery = { userId: req.user.id };
      if (businessId) {
        const business = await Business.findOne({ businessId, userId: req.user.id });
        if (business) miniAppQuery.businessId = business._id;
      }
      
      miniAppQuery.$or = [
        { appName: searchQuery },
        { slug: searchQuery },
        { appDescription: searchQuery },
      ];

      results.miniApps = await MiniApp.find(miniAppQuery)
        .limit(10)
        .select('miniAppId appName slug status analytics')
        .populate('businessId', 'businessName');
    }

    // Search leads
    if (!type || type === 'lead') {
      const leadQuery = {};
      if (businessId) {
        const business = await Business.findOne({ businessId, userId: req.user.id });
        if (business) leadQuery.businessId = business._id;
      }
      
      leadQuery.$or = [
        { 'customer.name': searchQuery },
        { 'customer.phone': searchQuery },
        { 'customer.email': searchQuery },
      ];

      results.leads = await BusinessBuilderLead.find(leadQuery)
        .limit(10)
        .select('leadId customer status source createdAt')
        .sort({ createdAt: -1 });
    }

    // Search orders
    if (!type || type === 'order') {
      const orderQuery = {};
      if (businessId) {
        const business = await Business.findOne({ businessId, userId: req.user.id });
        if (business) orderQuery.businessId = business._id;
      }
      
      orderQuery.$or = [
        { orderId: searchQuery },
        { 'customer.name': searchQuery },
        { 'customer.phone': searchQuery },
      ];

      results.orders = await BusinessBuilderOrder.find(orderQuery)
        .limit(10)
        .select('orderId customer totalAmount status createdAt')
        .sort({ createdAt: -1 });
    }

    res.json({
      success: true,
      data: results,
      query: q,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Get leads with advanced filtering
 * GET /api/business-builder/leads
 */
router.get('/leads', async (req, res) => {
  try {
    const { businessId, miniAppId, status, source, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = {};

    if (businessId) {
      const business = await Business.findOne({ businessId, userId: req.user.id });
      if (business) query.businessId = business._id;
    }

    if (miniAppId) {
      const miniApp = await MiniApp.findOne({ miniAppId, userId: req.user.id });
      if (miniApp) query.miniAppId = miniApp._id;
    }

    if (status) query.status = status;
    if (source) query.source = source;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [leads, total] = await Promise.all([
      BusinessBuilderLead.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('miniAppId', 'appName slug')
        .populate('convertedOrderId', 'orderId totalAmount'),
      BusinessBuilderLead.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        leads,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Update lead status
 * PATCH /api/business-builder/leads/:leadId/status
 */
router.patch('/leads/:leadId/status', async (req, res) => {
  try {
    const { status, notes } = req.body;

    const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'lost'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const lead = await BusinessBuilderLead.findOne({ leadId: req.params.leadId })
      .populate('businessId', 'userId');

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    if (String(lead.businessId.userId) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    lead.status = status;
    if (notes) {
      if (!lead.notes) lead.notes = [];
      lead.notes.push({
        content: notes,
        createdAt: new Date(),
        createdBy: req.user.id,
      });
    }

    await lead.save();

    res.json({
      success: true,
      data: lead,
      message: 'Lead status updated',
    });
  } catch (error) {
    console.error('Update lead status error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Bulk update lead status
 * POST /api/business-builder/leads/bulk-update
 */
router.post('/leads/bulk-update', async (req, res) => {
  try {
    const { leadIds, status } = req.body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Lead IDs array is required',
      });
    }

    const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'lost'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    // Verify user owns all leads
    const leads = await BusinessBuilderLead.find({ leadId: { $in: leadIds } })
      .populate('businessId', 'userId');

    const authorizedLeadIds = leads
      .filter((lead) => String(lead.businessId.userId) === String(req.user.id))
      .map((lead) => lead.leadId);

    if (authorizedLeadIds.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update any of these leads',
      });
    }

    const result = await BusinessBuilderLead.updateMany(
      { leadId: { $in: authorizedLeadIds } },
      { status }
    );

    res.json({
      success: true,
      data: {
        updated: result.modifiedCount,
        requested: leadIds.length,
        authorized: authorizedLeadIds.length,
      },
      message: `${result.modifiedCount} lead(s) updated`,
    });
  } catch (error) {
    console.error('Bulk update leads error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Get orders with advanced filtering
 * GET /api/business-builder/orders
 */
router.get('/orders', async (req, res) => {
  try {
    const {
      businessId,
      miniAppId,
      status,
      paymentStatus,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (businessId) {
      const business = await Business.findOne({ businessId, userId: req.user.id });
      if (business) query.businessId = business._id;
    }

    if (miniAppId) {
      const miniApp = await MiniApp.findOne({ miniAppId, userId: req.user.id });
      if (miniApp) query.miniAppId = miniApp._id;
    }

    if (status) query.status = status;
    if (paymentStatus) query['payment.status'] = paymentStatus;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (minAmount || maxAmount) {
      query.totalAmount = {};
      if (minAmount) query.totalAmount.$gte = parseFloat(minAmount);
      if (maxAmount) query.totalAmount.$lte = parseFloat(maxAmount);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      BusinessBuilderOrder.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('miniAppId', 'appName slug'),
      BusinessBuilderOrder.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Bulk update order status
 * POST /api/business-builder/orders/bulk-update
 */
router.post('/orders/bulk-update', async (req, res) => {
  try {
    const { orderIds, status } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order IDs array is required',
      });
    }

    const validStatuses = ['initiated', 'pending_payment', 'paid', 'confirmed', 'processing', 'completed', 'cancelled', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    // Verify user owns all orders
    const orders = await BusinessBuilderOrder.find({ orderId: { $in: orderIds } })
      .populate('businessId', 'userId');

    const authorizedOrders = orders.filter(
      (order) => String(order.businessId.userId) === String(req.user.id)
    );

    if (authorizedOrders.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update any of these orders',
      });
    }

    // Update each order with timeline
    const updatePromises = authorizedOrders.map(async (order) => {
      order.pushStatus(status, `Bulk update by user ${req.user.id}`);
      return order.save();
    });

    await Promise.all(updatePromises);

    res.json({
      success: true,
      data: {
        updated: authorizedOrders.length,
        requested: orderIds.length,
      },
      message: `${authorizedOrders.length} order(s) updated`,
    });
  } catch (error) {
    console.error('Bulk update orders error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Get analytics events with filtering
 * GET /api/business-builder/events
 */
router.get('/events', async (req, res) => {
  try {
    const {
      businessId,
      miniAppId,
      eventType,
      source,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    const query = {};

    if (businessId) {
      const business = await Business.findOne({ businessId, userId: req.user.id });
      if (business) query.businessId = business._id;
    }

    if (miniAppId) {
      const miniApp = await MiniApp.findOne({ miniAppId, userId: req.user.id });
      if (miniApp) query.miniAppId = miniApp._id;
    }

    if (eventType) query.eventType = eventType;
    if (source) query.source = source;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [events, total] = await Promise.all([
      BusinessBuilderEvent.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      BusinessBuilderEvent.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Bulk delete invoices
 * POST /api/business-builder/invoices/bulk-delete
 */
router.post('/invoices/bulk-delete', async (req, res) => {
  try {
    const { invoiceIds } = req.body;

    if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invoice IDs array is required',
      });
    }

    const result = await Invoice.deleteMany({
      invoiceId: { $in: invoiceIds },
      userId: req.user.id,
    });

    res.json({
      success: true,
      data: {
        deleted: result.deletedCount,
        requested: invoiceIds.length,
      },
      message: `${result.deletedCount} invoice(s) deleted`,
    });
  } catch (error) {
    console.error('Bulk delete invoices error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Get dashboard stats summary
 * GET /api/business-builder/stats/summary
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const { businessId } = req.query;

    let businessQuery = { userId: req.user.id };
    if (businessId) {
      businessQuery.businessId = businessId;
    }

    const businesses = await Business.find(businessQuery);
    const businessObjectIds = businesses.map((b) => b._id);

    if (businessObjectIds.length === 0) {
      return res.json({
        success: true,
        data: {
          businesses: 0,
          miniApps: 0,
          invoices: 0,
          leads: 0,
          orders: 0,
          revenue: 0,
        },
      });
    }

    const [miniAppsCount, invoicesCount, leadsCount, ordersCount, revenueData] = await Promise.all([
      MiniApp.countDocuments({ businessId: { $in: businessObjectIds } }),
      Invoice.countDocuments({ businessId: { $in: businessObjectIds } }),
      BusinessBuilderLead.countDocuments({ businessId: { $in: businessObjectIds } }),
      BusinessBuilderOrder.countDocuments({ businessId: { $in: businessObjectIds } }),
      BusinessBuilderOrder.aggregate([
        {
          $match: {
            businessId: { $in: businessObjectIds },
            status: { $in: ['paid', 'confirmed', 'completed'] },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        businesses: businesses.length,
        miniApps: miniAppsCount,
        invoices: invoicesCount,
        leads: leadsCount,
        orders: ordersCount,
        revenue: revenueData[0]?.totalRevenue || 0,
      },
    });
  } catch (error) {
    console.error('Get stats summary error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
