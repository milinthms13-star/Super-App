/**
 * Inventory Alerts Routes
 * Handles inventory alert management, configuration, and status tracking
 */

const express = require('express');
const router = express.Router();
const InventoryAlert = require('../models/InventoryAlert');
const { authenticate } = require('../middleware/auth');
const {
  detectStockAlert,
  generateAlertSuggestions,
  assessAlertSeverity,
  getAlertsSummary,
  generateInventoryHealthReport,
} = require('../utils/inventoryAlertService');
const logger = require('../utils/logger');

/**
 * GET /api/alerts/inventory/list
 * Get inventory alerts for authenticated seller
 * Query: status, alertType, page, limit, sortBy
 */
router.get('/list', authenticate, async (req, res) => {
  try {
    const sellerEmail = req.user?.email;
    const { status = 'active', alertType, page = 1, limit = 10, sortBy = '-triggeredAt' } = req.query;

    const query = { sellerEmail };
    if (status) query.status = status;
    if (alertType) query.alertType = alertType;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const alerts = await InventoryAlert.find(query)
      .sort(sortBy)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await InventoryAlert.countDocuments(query);

    return res.json({
      success: true,
      data: alerts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error(`Error fetching inventory alerts: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/alerts/inventory/:alertId
 * Get detailed alert information
 */
router.get('/:alertId', authenticate, async (req, res) => {
  try {
    const { alertId } = req.params;
    const sellerEmail = req.user?.email;

    const alert = await InventoryAlert.findOne({ alertId, sellerEmail });

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    return res.json({ success: true, data: alert });
  } catch (error) {
    logger.error(`Error fetching alert: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/alerts/inventory/configure
 * Create/update alert rule for product
 * Body: { productId, productName, alertType, notifyThreshold, reorderQuantity, maxStockLevel, leadTimeDays }
 */
router.post('/configure', authenticate, async (req, res) => {
  try {
    const sellerEmail = req.user?.email;
    const {
      productId,
      productName,
      productSku,
      alertType,
      notifyThreshold,
      reorderQuantity,
      maxStockLevel,
      leadTimeDays,
    } = req.body;

    if (!productId || !productName || !alertType || notifyThreshold === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: productId, productName, alertType, notifyThreshold',
      });
    }

    if (!['low_stock', 'out_of_stock', 'overstock'].includes(alertType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid alertType. Must be low_stock, out_of_stock, or overstock',
      });
    }

    // Check if alert rule exists
    let alert = await InventoryAlert.findOne({
      productId,
      sellerEmail,
      alertType,
    });

    if (alert) {
      // Update existing rule
      alert.settings.notifyThreshold = notifyThreshold;
      alert.settings.reorderQuantity = reorderQuantity || alert.settings.reorderQuantity;
      alert.settings.maxStockLevel = maxStockLevel || alert.settings.maxStockLevel;
      alert.settings.leadTimeDays = leadTimeDays || alert.settings.leadTimeDays;

      await alert.save();

      return res.json({
        success: true,
        message: 'Alert rule updated',
        data: alert,
      });
    }

    // Create new rule
    alert = new InventoryAlert({
      productId,
      productName,
      productSku: productSku || '',
      sellerEmail,
      alertType,
      threshold: notifyThreshold,
      currentStock: 0,
      settings: {
        enabled: true,
        notifyThreshold,
        reorderQuantity: reorderQuantity || notifyThreshold * 2,
        maxStockLevel: maxStockLevel || null,
        leadTimeDays: leadTimeDays || 7,
      },
      status: 'active',
    });

    await alert.save();

    logger.info(`Alert rule created: ${alertId} for product ${productId}`);

    return res.json({
      success: true,
      message: 'Alert rule created',
      data: alert,
    });
  } catch (error) {
    logger.error(`Error configuring alert: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /api/alerts/inventory/:alertId/acknowledge
 * Mark alert as acknowledged
 */
router.patch('/:alertId/acknowledge', authenticate, async (req, res) => {
  try {
    const { alertId } = req.params;
    const sellerEmail = req.user?.email;

    const alert = await InventoryAlert.findOne({ alertId, sellerEmail });

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    // Add notification acknowledgement
    if (alert.notifications && alert.notifications.length > 0) {
      alert.notifications[alert.notifications.length - 1].acknowledgedAt = new Date();
      alert.notifications[alert.notifications.length - 1].acknowledgedBy = sellerEmail;
    }

    await alert.save();

    return res.json({
      success: true,
      message: 'Alert acknowledged',
      data: alert,
    });
  } catch (error) {
    logger.error(`Error acknowledging alert: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /api/alerts/inventory/:alertId/resolve
 * Mark alert as resolved
 * Body: { action, reason, quantity }
 */
router.patch('/:alertId/resolve', authenticate, async (req, res) => {
  try {
    const { alertId } = req.params;
    const sellerEmail = req.user?.email;
    const { action, reason, quantity } = req.body;

    const alert = await InventoryAlert.findOne({ alertId, sellerEmail });

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    alert.resolutionDetails = {
      action: action || 'manual_restock',
      quantity: quantity || null,
      reason: reason || 'Alert resolved',
    };

    await alert.save();

    logger.info(`Alert resolved: ${alertId}`);

    return res.json({
      success: true,
      message: 'Alert marked as resolved',
      data: alert,
    });
  } catch (error) {
    logger.error(`Error resolving alert: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/alerts/inventory/dashboard/summary
 * Get inventory health dashboard summary
 */
router.get('/dashboard/summary', authenticate, async (req, res) => {
  try {
    const sellerEmail = req.user?.email;

    const alerts = await InventoryAlert.find({ sellerEmail }).lean();

    const summary = {
      totalAlerts: alerts.length,
      activeAlerts: alerts.filter((a) => a.status === 'active').length,
      lowStockAlerts: alerts.filter((a) => a.alertType === 'low_stock').length,
      outOfStockAlerts: alerts.filter((a) => a.alertType === 'out_of_stock').length,
      resolvedToday: alerts.filter(
        (a) =>
          a.status === 'resolved' &&
          new Date(a.resolvedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length,
      productsAffected: new Set(alerts.map((a) => a.productId)).size,
    };

    const byAlertType = {
      low_stock: alerts.filter((a) => a.alertType === 'low_stock'),
      out_of_stock: alerts.filter((a) => a.alertType === 'out_of_stock'),
      overstock: alerts.filter((a) => a.alertType === 'overstock'),
    };

    return res.json({
      success: true,
      summary,
      alertsByType: {
        lowStock: byAlertType.low_stock.slice(0, 5),
        outOfStock: byAlertType.out_of_stock.slice(0, 5),
        overstock: byAlertType.overstock.slice(0, 5),
      },
    });
  } catch (error) {
    logger.error(`Error fetching dashboard summary: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
