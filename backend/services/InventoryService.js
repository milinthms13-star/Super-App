/**
 * Inventory Management Service - Phase 9 Feature E
 * Real-time stock tracking, reorder management, waste tracking
 */

const InventoryManagement = require('../models/InventoryManagement');

class InventoryService {
  /**
   * Create inventory item
   */
  static async createInventoryItem(restaurantId, itemData) {
    try {
      const inventoryId = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const inventory = new InventoryManagement({
        inventoryId,
        restaurantId,
        menuItemId: itemData.menuItemId,
        itemName: itemData.itemName,
        currentStock: itemData.currentStock,
        minimumStock: itemData.minimumStock || 5,
        maximumStock: itemData.maximumStock || 100,
        reorderPoint: itemData.reorderPoint || 10,
        reorderQuantity: itemData.reorderQuantity || 50,
        unitCost: itemData.unitCost,
      });

      await inventory.save();

      return {
        success: true,
        data: inventory,
        message: 'Inventory item created',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Update stock level
   */
  static async updateStock(inventoryId, quantity, action, reason = '') {
    try {
      const inventory = await InventoryManagement.findOne({ inventoryId });
      if (!inventory) {
        return { success: false, message: 'Inventory item not found' };
      }

      await inventory.updateStock(quantity, action, reason);

      return {
        success: true,
        data: {
          inventoryId,
          previousStock: inventory.stockAuditLog[inventory.stockAuditLog.length - 2]?.quantityBefore,
          currentStock: inventory.currentStock,
          status: inventory.stockStatus,
        },
        message: `Stock updated: ${action}`,
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Check if reorder needed
   */
  static async checkReorderNeeded(restaurantId) {
    try {
      const items = await InventoryManagement.find({
        restaurantId,
        isActive: true,
        status: 'active',
      });

      const needsReorder = items.filter((item) => item.needsReorder());

      return {
        success: true,
        data: {
          restaurantId,
          totalItems: items.length,
          itemsNeedingReorder: needsReorder.length,
          items: needsReorder.map((item) => ({
            inventoryId: item.inventoryId,
            itemName: item.itemName,
            currentStock: item.currentStock,
            reorderPoint: item.reorderPoint,
            reorderQuantity: item.reorderQuantity,
          })),
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Record waste
   */
  static async recordWaste(inventoryId, wasteQuantity, reason) {
    try {
      const inventory = await InventoryManagement.findOne({ inventoryId });
      if (!inventory) {
        return { success: false, message: 'Inventory item not found' };
      }

      await inventory.recordWaste(wasteQuantity, reason);

      return {
        success: true,
        data: {
          inventoryId,
          wasteQuantity,
          totalWaste: inventory.wasteTracking.wasteQuantity,
          wastePercentage: inventory.wasteTracking.wastePercentage,
        },
        message: 'Waste recorded',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get low stock items
   */
  static async getLowStockItems(restaurantId, limit = 20) {
    try {
      const items = await InventoryManagement.find({
        restaurantId,
        stockStatus: { $in: ['low_stock', 'critical_stock', 'out_of_stock'] },
        isActive: true,
      })
        .limit(limit)
        .sort({ stockStatus: 1, currentStock: 1 });

      return {
        success: true,
        data: items,
        message: `${items.length} low stock items`,
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get inventory value
   */
  static async getInventoryValue(restaurantId) {
    try {
      const items = await InventoryManagement.find({
        restaurantId,
        isActive: true,
      });

      const totalValue = items.reduce((sum, item) => sum + (item.totalStockValue || 0), 0);

      return {
        success: true,
        data: {
          restaurantId,
          totalItems: items.length,
          totalInventoryValue: totalValue,
          itemsByValue: items
            .sort((a, b) => (b.totalStockValue || 0) - (a.totalStockValue || 0))
            .slice(0, 10),
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get audit log for item
   */
  static async getAuditLog(inventoryId, limit = 50) {
    try {
      const inventory = await InventoryManagement.findOne({ inventoryId });
      if (!inventory) {
        return { success: false, message: 'Inventory item not found' };
      }

      const auditLog = inventory.stockAuditLog.slice(-limit);

      return {
        success: true,
        data: {
          inventoryId,
          itemName: inventory.itemName,
          auditLog,
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get expiring items
   */
  static async getExpiringItems(restaurantId, daysUntilExpiry = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + daysUntilExpiry);

      const items = await InventoryManagement.find({
        restaurantId,
        'expiryTracking.hasExpiryDate': true,
        'expiryTracking.expiryDate': {
          $lte: cutoffDate,
          $gte: new Date(),
        },
        isActive: true,
      }).sort({ 'expiryTracking.expiryDate': 1 });

      return {
        success: true,
        data: items,
        message: `${items.length} items expiring within ${daysUntilExpiry} days`,
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get forecast summary
   */
  static async getForecastSummary(restaurantId) {
    try {
      const items = await InventoryManagement.find({
        restaurantId,
        isActive: true,
        'forecasting.forecastedDemandNextWeek': { $exists: true },
      });

      const totalForecastedDemand = items.reduce((sum, item) => sum + (item.forecasting.forecastedDemandNextWeek || 0), 0);

      return {
        success: true,
        data: {
          restaurantId,
          itemsWithForecasts: items.length,
          totalForecastedDemandNextWeek: totalForecastedDemand,
          recommendations: items.map((item) => ({
            itemName: item.itemName,
            forecastedDemand: item.forecasting.forecastedDemandNextWeek,
            currentStock: item.currentStock,
            recommendedAction: item.currentStock < item.forecasting.forecastedDemandNextWeek ? 'REORDER' : 'OK',
          })),
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get waste report
   */
  static async getWasteReport(restaurantId) {
    try {
      const items = await InventoryManagement.find({
        restaurantId,
        isActive: true,
        'wasteTracking.wasteQuantity': { $gt: 0 },
      }).sort({ 'wasteTracking.wasteQuantity': -1 });

      const totalWaste = items.reduce((sum, item) => sum + (item.wasteTracking.wasteQuantity || 0), 0);
      const totalWasteCost = items.reduce((sum, item) => sum + (item.wasteTracking.wasteCost || 0), 0);

      return {
        success: true,
        data: {
          restaurantId,
          totalWasteQuantity: totalWaste,
          totalWasteCost,
          itemsWithWaste: items.length,
          topWasteItems: items.slice(0, 10),
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }
}

module.exports = InventoryService;
