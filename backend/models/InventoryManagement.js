/**
 * Inventory Management Model - Phase 9 Feature E
 * Real-time stock levels, reorder triggers, supply chain optimization
 */

const mongoose = require('mongoose');

const InventoryManagementSchema = new mongoose.Schema(
  {
    inventoryId: { type: String, unique: true, required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },

    // Current Stock Information
    itemName: String,
    category: String,
    currentStock: { type: Number, required: true, default: 0 },
    unit: { type: String, enum: ['pieces', 'kg', 'liters', 'boxes', 'servings'], default: 'pieces' },
    lastUpdated: { type: Date, default: Date.now },
    lastUpdatedBy: String, // staff member ID

    // Stock Thresholds
    minimumStock: { type: Number, required: true },
    maximumStock: { type: Number, required: true },
    reorderPoint: { type: Number, required: true },
    reorderQuantity: Number,
    safetyStock: Number,

    // Stock Status
    stockStatus: {
      type: String,
      enum: ['in_stock', 'low_stock', 'critical_stock', 'out_of_stock', 'overstock'],
      default: 'in_stock',
    },
    lastRestockedAt: Date,
    nextExpectedRestockDate: Date,

    // Cost Tracking
    unitCost: { type: Number, required: true },
    sellingPrice: Number,
    totalStockValue: Number, // currentStock * unitCost
    profitMargin: Number,

    // Expiry & Shelf Life Management
    expiryTracking: {
      hasExpiryDate: { type: Boolean, default: false },
      expiryDate: Date,
      shelfLifeDays: Number,
      expiryAlertDays: Number, // alert X days before expiry
      batchNumber: String,
      storageTemperature: String, // e.g., 'room_temp', 'chilled', 'frozen'
    },

    // Movement & Demand Analytics
    movementAnalytics: {
      averageDailySales: Number,
      averageWeeklySales: Number,
      averageMonthlySales: Number,
      salesTrend: { type: String, enum: ['increasing', 'stable', 'decreasing'], default: 'stable' },
      stockTurnoverRatio: Number, // cost of goods sold / average inventory
      leadTimeVariability: Number, // std dev of lead time
    },

    // Supplier Information
    primarySupplier: {
      supplierId: mongoose.Schema.Types.ObjectId,
      supplierName: String,
      contactNumber: String,
      leadTimeDays: Number,
      minimumOrderQuantity: Number,
      pricePerUnit: Number,
      lastPurchaseDate: Date,
      lastPurchaseQuantity: Number,
    },

    secondarySupplier: {
      supplierId: mongoose.Schema.Types.ObjectId,
      supplierName: String,
      contactNumber: String,
      leadTimeDays: Number,
      minimumOrderQuantity: Number,
      pricePerUnit: Number,
    },

    // Reorder Management
    reorderRules: {
      autoReorder: { type: Boolean, default: true },
      reorderMethod: { type: String, enum: ['manual', 'automatic', 'periodic'], default: 'automatic' },
      reorderTrigger: {
        type: String,
        enum: ['stock_level', 'date_based', 'usage_based'],
        default: 'stock_level',
      },
      reorderFrequency: { type: String, enum: ['daily', 'weekly', 'bi_weekly', 'monthly', 'as_needed'], default: 'as_needed' },
    },

    // Stock Audit Trail
    stockAuditLog: [
      {
        action: { type: String, enum: ['purchase', 'sale', 'adjustment', 'damage', 'expiry', 'recount'] },
        quantity: Number,
        quantityBefore: Number,
        quantityAfter: Number,
        reason: String,
        performedBy: String,
        timestamp: Date,
        orderId: mongoose.Schema.Types.ObjectId,
        supplierId: mongoose.Schema.Types.ObjectId,
        notes: String,
      },
    ],

    // Waste & Loss Tracking
    wasteTracking: {
      wasteQuantity: { type: Number, default: 0 },
      wastePercentage: Number,
      wasteCost: Number,
      wasteReason: [String], // spoilage, breakage, expiry, etc.
      lastWasteRecorded: Date,
    },

    // Seasonal Planning
    seasonalDemand: [
      {
        season: String, // summer, winter, monsoon, festival
        averageSales: Number,
        peakSalesMonth: String,
        recommendedStockLevel: Number,
        recommendations: String,
      },
    ],

    // Forecasting & Predictions
    forecasting: {
      forecastedDemandNextWeek: Number,
      forecastedDemandNextMonth: Number,
      confidenceLevel: { type: Number, min: 0, max: 100 }, // % confidence
      forecastMethod: String, // simple_avg, weighted_avg, exponential_smoothing, etc.
      lastForecastDate: Date,
    },

    // Storage Location
    storageLocation: {
      warehouseSection: String,
      shelf: String,
      binNumber: String,
      coordinates: {
        row: String,
        column: Number,
      },
      storageConditions: {
        temperature: Number,
        humidity: Number,
        lighting: String,
      },
    },

    // Integration with Ordering System
    integratedWithPOS: { type: Boolean, default: true },
    autoDeductOnOrder: { type: Boolean, default: true },
    notificationSettings: {
      notifyWhenLowStock: { type: Boolean, default: true },
      notifyWhenOutOfStock: { type: Boolean, default: true },
      notifyWhenExpiring: { type: Boolean, default: true },
      notificationChannels: [String], // email, sms, push, in_app
    },

    // Status Tracking
    isActive: { type: Boolean, default: true },
    discontinuedAt: Date,
    status: { type: String, enum: ['active', 'inactive', 'discontinued'], default: 'active' },
  },
  { timestamps: true, collection: 'inventorymanagement' }
);

// Indexes
InventoryManagementSchema.index({ restaurantId: 1, menuItemId: 1 });
InventoryManagementSchema.index({ stockStatus: 1, restaurantId: 1 });
InventoryManagementSchema.index({ currentStock: 1, minimumStock: 1 });
InventoryManagementSchema.index({ expiryTracking: 1, restaurantId: 1 });
InventoryManagementSchema.index({ restaurantId: 1, isActive: 1 });

// Instance Methods
InventoryManagementSchema.methods.updateStock = function (quantity, action, reason = '', performedBy = 'system') {
  const quantityBefore = this.currentStock;
  this.stockAuditLog.push({
    action,
    quantity: Math.abs(quantity),
    quantityBefore,
    quantityAfter: quantityBefore + quantity,
    reason,
    performedBy,
    timestamp: new Date(),
  });

  this.currentStock += quantity;
  this.lastUpdated = new Date();
  this.lastUpdatedBy = performedBy;

  // Update status
  if (this.currentStock <= 0) {
    this.stockStatus = 'out_of_stock';
  } else if (this.currentStock <= this.minimumStock) {
    this.stockStatus = 'critical_stock';
  } else if (this.currentStock <= this.reorderPoint) {
    this.stockStatus = 'low_stock';
  } else if (this.currentStock >= this.maximumStock) {
    this.stockStatus = 'overstock';
  } else {
    this.stockStatus = 'in_stock';
  }

  this.totalStockValue = this.currentStock * this.unitCost;
  return this.save();
};

InventoryManagementSchema.methods.needsReorder = function () {
  return this.currentStock <= this.reorderPoint && this.autoReorder;
};

InventoryManagementSchema.methods.recordWaste = function (wasteQuantity, reason) {
  this.wasteTracking.wasteQuantity += wasteQuantity;
  this.wasteTracking.wastePercentage = (this.wasteTracking.wasteQuantity / (this.currentStock + this.wasteTracking.wasteQuantity)) * 100;
  this.wasteTracking.wasteCost = this.wasteTracking.wasteQuantity * this.unitCost;
  this.wasteTracking.lastWasteRecorded = new Date();

  if (!this.wasteTracking.wasteReason.includes(reason)) {
    this.wasteTracking.wasteReason.push(reason);
  }

  return this.updateStock(-wasteQuantity, 'waste', reason);
};

module.exports = mongoose.model('InventoryManagement', InventoryManagementSchema);
