/**
 * Inventory Alert Service
 * Detects low/out-of-stock conditions and generates alerts
 */

const logger = require('./logger');

/**
 * Detect low stock based on threshold
 * @param {Number} currentStock - Current stock level
 * @param {Number} threshold - Alert threshold
 * @returns {String} Alert type: 'low_stock', 'out_of_stock', or null
 */
const detectStockAlert = (currentStock = 0, threshold = 10) => {
  if (currentStock === 0) {
    return 'out_of_stock';
  }
  if (currentStock <= threshold) {
    return 'low_stock';
  }
  return null;
};

/**
 * Generate alert recommendation based on stock level and sales
 * @param {Object} product - Product document
 * @param {Number} averageDailySales - Average daily sales units
 * @param {Number} leadTimeDays - Days needed for reorder
 * @returns {Array} Suggestions
 */
const generateAlertSuggestions = (product = {}, averageDailySales = 0, leadTimeDays = 7) => {
  try {
    const suggestions = [];
    const currentStock = product.stock || 0;
    const projectedSalesInLeadTime = averageDailySales * leadTimeDays;

    // Suggestion 1: Reorder
    if (currentStock < projectedSalesInLeadTime) {
      const recommendedQty = Math.ceil(projectedSalesInLeadTime * 1.5); // 1.5x safety stock
      suggestions.push({
        action: 'reorder',
        details: `Reorder ${recommendedQty} units to maintain ${leadTimeDays}-day buffer`,
        estimatedImpact: 'Prevents stockouts',
      });
    }

    // Suggestion 2: Promote
    if (currentStock > 50 && averageDailySales > 5) {
      suggestions.push({
        action: 'promote',
        details: 'Increase marketing spend to boost sales velocity',
        estimatedImpact: `Could sell ~${Math.ceil(averageDailySales * 1.3)}/day`,
      });
    }

    // Suggestion 3: Discount
    if (currentStock > 100 && averageDailySales < 5) {
      suggestions.push({
        action: 'discount',
        details: 'Run promotional discount to increase turnover',
        estimatedImpact: 'Clear slower-moving inventory',
      });
    }

    return suggestions;
  } catch (error) {
    logger.error(`Error generating alert suggestions: ${error.message}`);
    return [];
  }
};

/**
 * Calculate days until stockout based on sales velocity
 * @param {Number} currentStock - Current stock level
 * @param {Number} averageDailySales - Average units sold per day
 * @returns {Number} Days until stockout (Infinity if no sales)
 */
const calculateDaysUntilStockout = (currentStock = 0, averageDailySales = 0) => {
  if (averageDailySales === 0) {
    return Infinity;
  }
  return currentStock / averageDailySales;
};

/**
 * Check if reorder should be recommended
 * @param {Number} currentStock - Current stock
 * @param {Number} threshold - Reorder point threshold
 * @param {Number} leadTimeDays - Lead time for new order
 * @param {Number} averageDailySales - Daily sales velocity
 * @returns {Boolean}
 */
const shouldReorder = (
  currentStock = 0,
  threshold = 10,
  leadTimeDays = 7,
  averageDailySales = 2
) => {
  const daysUntilStockout = calculateDaysUntilStockout(currentStock, averageDailySales);
  return currentStock <= threshold || daysUntilStockout <= leadTimeDays;
};

/**
 * Categorize alert severity
 * @param {String} alertType - Type of alert
 * @param {Number} currentStock - Current stock
 * @param {Number} averageDailySales - Daily sales
 * @returns {String} Severity: 'critical', 'high', 'medium', 'low'
 */
const assessAlertSeverity = (alertType = '', currentStock = 0, averageDailySales = 0) => {
  if (alertType === 'out_of_stock') {
    return 'critical';
  }

  if (alertType === 'low_stock') {
    const daysLeft = calculateDaysUntilStockout(currentStock, averageDailySales);
    if (daysLeft < 3) return 'critical';
    if (daysLeft < 7) return 'high';
    if (daysLeft < 14) return 'medium';
    return 'low';
  }

  return 'low';
};

/**
 * Get alerts for dashboard display
 * @param {Array} alerts - Array of inventory alerts
 * @param {Object} options - { status, severity, sortBy }
 * @returns {Array} Filtered and sorted alerts
 */
const getAlertsSummary = (alerts = [], options = {}) => {
  try {
    const { status = 'active', severity = null, sortBy = '-triggeredAt' } = options;

    let filtered = alerts.filter((alert) => {
      if (status && alert.status !== status) return false;
      if (severity && alert.severity !== severity) return false;
      return true;
    });

    // Sort
    if (sortBy === '-triggeredAt') {
      filtered.sort((a, b) => new Date(b.triggeredAt) - new Date(a.triggeredAt));
    } else if (sortBy === 'currentStock') {
      filtered.sort((a, b) => a.currentStock - b.currentStock);
    }

    return filtered;
  } catch (error) {
    logger.error(`Error getting alerts summary: ${error.message}`);
    return [];
  }
};

/**
 * Generate inventory health report
 * @param {Array} alerts - All inventory alerts
 * @returns {Object} Health metrics
 */
const generateInventoryHealthReport = (alerts = []) => {
  try {
    const critical = alerts.filter((a) => a.severity === 'critical').length;
    const highPriority = alerts.filter((a) => a.severity === 'high').length;
    const active = alerts.filter((a) => a.status === 'active').length;
    const outOfStock = alerts.filter((a) => a.alertType === 'out_of_stock').length;
    const lowStock = alerts.filter((a) => a.alertType === 'low_stock').length;

    const totalCartValue = alerts.reduce((sum, a) => sum + (a.cartValue || 0), 0);
    const affectedProducts = new Set(alerts.map((a) => a.productId)).size;

    return {
      totalAlerts: alerts.length,
      activeAlerts: active,
      criticalAlerts: critical,
      highPriorityAlerts: highPriority,
      outOfStockProducts: outOfStock,
      lowStockProducts: lowStock,
      affectedProducts,
      potentialLostRevenue: Math.round(totalCartValue * 100) / 100,
      healthScore: calculateHealthScore(critical, highPriority, alerts.length),
    };
  } catch (error) {
    logger.error(`Error generating inventory health report: ${error.message}`);
    return null;
  }
};

/**
 * Calculate overall inventory health score (0-100)
 * @param {Number} critical - Critical alert count
 * @param {Number} high - High priority alert count
 * @param {Number} total - Total alert count
 * @returns {Number} Health score 0-100
 */
const calculateHealthScore = (critical = 0, high = 0, total = 0) => {
  if (total === 0) return 100;
  const penaltyPoints = critical * 20 + high * 10;
  return Math.max(0, 100 - penaltyPoints);
};

module.exports = {
  detectStockAlert,
  generateAlertSuggestions,
  calculateDaysUntilStockout,
  shouldReorder,
  assessAlertSeverity,
  getAlertsSummary,
  generateInventoryHealthReport,
  calculateHealthScore,
};
