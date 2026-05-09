/**
 * Inventory Management Controller - Phase 9 Feature E
 * REST endpoints for stock management and inventory operations
 */

const InventoryService = require('../services/InventoryService');

class InventoryController {
  /**
   * POST /api/phase9/inventory
   * Create inventory item
   */
  static async createInventoryItem(req, res) {
    try {
      const { restaurantId, itemData } = req.body;

      if (!restaurantId || !itemData || !itemData.menuItemId) {
        return res.status(400).json({
          success: false,
          message: 'restaurantId and itemData with menuItemId are required',
        });
      }

      const result = await InventoryService.createInventoryItem(restaurantId, itemData);
      res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /api/phase9/inventory/:inventoryId/stock
   * Update stock
   */
  static async updateStock(req, res) {
    try {
      const { inventoryId } = req.params;
      const { quantity, action, reason } = req.body;

      if (!inventoryId || !quantity || !action) {
        return res.status(400).json({
          success: false,
          message: 'inventoryId, quantity, and action are required',
        });
      }

      const result = await InventoryService.updateStock(inventoryId, quantity, action, reason);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/inventory/:inventoryId/reorder-check
   * Check if reorder is needed
   */
  static async checkReorderNeeded(req, res) {
    try {
      const { inventoryId } = req.params;

      if (!inventoryId) {
        return res.status(400).json({
          success: false,
          message: 'inventoryId is required',
        });
      }

      const result = await InventoryService.checkReorderNeeded(inventoryId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/phase9/inventory/:inventoryId/waste
   * Record waste
   */
  static async recordWaste(req, res) {
    try {
      const { inventoryId } = req.params;
      const { wasteQuantity, reason } = req.body;

      if (!inventoryId || !wasteQuantity) {
        return res.status(400).json({
          success: false,
          message: 'inventoryId and wasteQuantity are required',
        });
      }

      const result = await InventoryService.recordWaste(inventoryId, wasteQuantity, reason);
      res.status(result.success ? 201 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/inventory/restaurant/:restaurantId/low-stock
   * Get low stock items
   */
  static async getLowStockItems(req, res) {
    try {
      const { restaurantId } = req.params;

      if (!restaurantId) {
        return res.status(400).json({
          success: false,
          message: 'restaurantId is required',
        });
      }

      const result = await InventoryService.getLowStockItems(restaurantId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/inventory/restaurant/:restaurantId/value
   * Get inventory value
   */
  static async getInventoryValue(req, res) {
    try {
      const { restaurantId } = req.params;

      if (!restaurantId) {
        return res.status(400).json({
          success: false,
          message: 'restaurantId is required',
        });
      }

      const result = await InventoryService.getInventoryValue(restaurantId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/inventory/:inventoryId/audit-log
   * Get audit log
   */
  static async getAuditLog(req, res) {
    try {
      const { inventoryId } = req.params;
      const { limit } = req.query;

      if (!inventoryId) {
        return res.status(400).json({
          success: false,
          message: 'inventoryId is required',
        });
      }

      const result = await InventoryService.getAuditLog(inventoryId, parseInt(limit) || 50);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/inventory/restaurant/:restaurantId/expiring
   * Get expiring items
   */
  static async getExpiringItems(req, res) {
    try {
      const { restaurantId } = req.params;
      const { daysThreshold } = req.query;

      if (!restaurantId) {
        return res.status(400).json({
          success: false,
          message: 'restaurantId is required',
        });
      }

      const result = await InventoryService.getExpiringItems(restaurantId, parseInt(daysThreshold) || 7);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/inventory/restaurant/:restaurantId/forecast
   * Get forecast summary
   */
  static async getForecastSummary(req, res) {
    try {
      const { restaurantId } = req.params;

      if (!restaurantId) {
        return res.status(400).json({
          success: false,
          message: 'restaurantId is required',
        });
      }

      const result = await InventoryService.getForecastSummary(restaurantId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/inventory/restaurant/:restaurantId/waste-report
   * Get waste report
   */
  static async getWasteReport(req, res) {
    try {
      const { restaurantId } = req.params;
      const { period } = req.query;

      if (!restaurantId) {
        return res.status(400).json({
          success: false,
          message: 'restaurantId is required',
        });
      }

      const result = await InventoryService.getWasteReport(restaurantId, period || 'monthly');
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = InventoryController;
