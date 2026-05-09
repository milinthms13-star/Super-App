/**
 * Flash Sale & Time-Bound Promotion Engine
 * Phase 7: Advanced Revenue Features
 * 
 * Manages:
 * - Flash sales (limited time, limited quantity)
 * - Tiered time-based discounts
 * - Bulk purchase offers
 * - Seasonal promotions
 * - Countdown mechanics for urgency
 */

const FlashSale = require('../models/FlashSale');
const Product = require('../models/Product');
const Order = require('../models/Order');
const logger = require('../utils/logger');

class FlashSaleService {
  /**
   * Create a new flash sale
   */
  async createFlashSale(saleData) {
    try {
      const {
        productIds,
        vendorId,
        discountPercent,
        startTime,
        endTime,
        maxQuantity,
        minOrderValue,
        targetAudience
      } = saleData;

      // Validate times
      if (new Date(endTime) <= new Date(startTime)) {
        throw new Error('End time must be after start time');
      }

      if (new Date(startTime) < new Date()) {
        throw new Error('Start time must be in the future');
      }

      // Create sale record
      const flashSale = new FlashSale({
        productIds,
        vendorId,
        discountPercent,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        maxQuantity,
        quantitySold: 0,
        minOrderValue,
        targetAudience,
        status: 'scheduled',
        createdAt: new Date()
      });

      await flashSale.save();

      // Schedule automatic status updates
      this._scheduleStatusUpdates(flashSale._id, startTime, endTime);

      logger.info(`Flash sale created: ${flashSale._id}`);

      return {
        id: flashSale._id,
        status: 'scheduled',
        startsIn: Math.round((new Date(startTime) - new Date()) / 1000 / 60), // minutes
        message: `Flash sale will start in ${Math.round((new Date(startTime) - new Date()) / 1000 / 60)} minutes`
      };
    } catch (error) {
      logger.error('Error creating flash sale:', error);
      throw error;
    }
  }

  /**
   * Schedule automatic status updates
   */
  _scheduleStatusUpdates(saleId, startTime, endTime) {
    const startDelay = new Date(startTime).getTime() - Date.now();
    const endDelay = new Date(endTime).getTime() - Date.now();

    // Activate sale
    if (startDelay > 0) {
      setTimeout(() => {
        this._updateSaleStatus(saleId, 'active');
      }, startDelay);
    }

    // Complete sale
    if (endDelay > 0) {
      setTimeout(() => {
        this._updateSaleStatus(saleId, 'completed');
      }, endDelay);
    }
  }

  /**
   * Update sale status
   */
  async _updateSaleStatus(saleId, newStatus) {
    try {
      await FlashSale.findByIdAndUpdate(saleId, { status: newStatus });
      logger.info(`Flash sale ${saleId} status updated to ${newStatus}`);
    } catch (error) {
      logger.error('Error updating flash sale status:', error);
    }
  }

  /**
   * Get active flash sales
   */
  async getActiveFlashSales(filters = {}) {
    try {
      const now = new Date();
      
      const query = {
        status: { $in: ['active', 'scheduled'] },
        startTime: { $lte: filters.maxStartTime || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        endTime: { $gte: now }
      };

      if (filters.vendorId) {
        query.vendorId = filters.vendorId;
      }

      const sales = await FlashSale.find(query)
        .populate('productIds', 'name price imageUrl category')
        .sort({ startTime: 1 })
        .lean();

      return sales.map(sale => this._enrichSaleData(sale));
    } catch (error) {
      logger.error('Error fetching active flash sales:', error);
      throw error;
    }
  }

  /**
   * Enrich sale data with computed values
   */
  _enrichSaleData(sale) {
    const now = new Date();
    const startTime = new Date(sale.startTime);
    const endTime = new Date(sale.endTime);

    let status = sale.status;
    let timeRemaining = 0;

    if (now < startTime) {
      status = 'scheduled';
      timeRemaining = startTime - now;
    } else if (now >= startTime && now < endTime) {
      status = 'active';
      timeRemaining = endTime - now;
    } else {
      status = 'completed';
    }

    const quantityRemaining = sale.maxQuantity - sale.quantitySold;
    const quantityPercent = (sale.quantitySold / sale.maxQuantity) * 100;

    return {
      ...sale,
      status,
      timeRemaining: Math.round(timeRemaining / 1000),
      timeRemainingFormatted: this._formatTimeRemaining(timeRemaining),
      quantityRemaining,
      quantityPercent: Math.min(quantityPercent, 100),
      stockStatus: quantityRemaining === 0 ? 'sold_out' : quantityRemaining <= 5 ? 'limited' : 'available',
      urgencyLevel: this._calculateUrgencyLevel(quantityRemaining, sale.maxQuantity, timeRemaining)
    };
  }

  /**
   * Format time remaining in human-readable format
   */
  _formatTimeRemaining(ms) {
    if (ms <= 0) return 'Ended';

    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }

  /**
   * Calculate urgency level for UX
   */
  _calculateUrgencyLevel(remaining, total, timeMs) {
    const quantityPercent = (total - remaining) / total;
    const timePercent = 1 - (timeMs / (48 * 60 * 60 * 1000)); // 48 hour reference

    if (quantityPercent > 0.8 || timePercent > 0.8) return 'critical';
    if (quantityPercent > 0.5 || timePercent > 0.5) return 'high';
    if (quantityPercent > 0.2 || timePercent > 0.2) return 'medium';
    return 'low';
  }

  /**
   * Apply flash sale discount
   */
  async applyFlashSaleDiscount(productId, quantity, userId) {
    try {
      const now = new Date();

      // Find active flash sale for product
      const flashSale = await FlashSale.findOne({
        productIds: productId,
        status: 'active',
        startTime: { $lte: now },
        endTime: { $gte: now }
      });

      if (!flashSale) {
        return {
          applicable: false,
          message: 'No active flash sale for this product'
        };
      }

      // Check quantity availability
      if (flashSale.quantitySold + quantity > flashSale.maxQuantity) {
        return {
          applicable: false,
          message: `Only ${flashSale.maxQuantity - flashSale.quantitySold} items remaining`
        };
      }

      // Check user eligibility
      if (flashSale.targetAudience && flashSale.targetAudience.length > 0) {
        // Could implement user segment checking here
      }

      return {
        applicable: true,
        discountPercent: flashSale.discountPercent,
        saleId: flashSale._id,
        expiresAt: flashSale.endTime,
        message: `${flashSale.discountPercent}% discount applied!`
      };
    } catch (error) {
      logger.error('Error applying flash sale discount:', error);
      throw error;
    }
  }

  /**
   * Get tiered time-based discounts
   */
  async getTimedDiscounts(productId) {
    try {
      const discounts = {
        immediate: 0,
        earlyBird: 0,
        lastChance: 0
      };

      // Check for flash sales
      const flashSale = await FlashSale.findOne({
        productIds: productId,
        status: 'active'
      });

      if (flashSale) {
        const now = new Date();
        const endTime = new Date(flashSale.endTime);
        const timeRemaining = endTime - now;
        const saleDuration = new Date(flashSale.endTime) - new Date(flashSale.startTime);

        // Immediate discount
        discounts.immediate = flashSale.discountPercent;

        // Early bird bonus (first 25% of time)
        if (timeRemaining > (saleDuration * 0.75)) {
          discounts.earlyBird = Math.min(flashSale.discountPercent + 5, 50);
        }

        // Last chance bonus (last 25% of time)
        if (timeRemaining < (saleDuration * 0.25)) {
          discounts.lastChance = Math.min(flashSale.discountPercent + 10, 60);
        }
      }

      return discounts;
    } catch (error) {
      logger.error('Error fetching timed discounts:', error);
      throw error;
    }
  }

  /**
   * Create bulk purchase offer
   */
  async createBulkOffer(productId, tiers) {
    try {
      // tiers format: [{quantity: 5, discountPercent: 10}, ...]
      const offer = {
        productId,
        bulkTiers: tiers.sort((a, b) => a.quantity - b.quantity),
        createdAt: new Date(),
        active: true
      };

      // Save to product or separate model as needed
      await Product.findByIdAndUpdate(productId, { bulkOffer: offer });

      return offer;
    } catch (error) {
      logger.error('Error creating bulk offer:', error);
      throw error;
    }
  }

  /**
   * Calculate bulk discount
   */
  async calculateBulkDiscount(productId, quantity) {
    try {
      const product = await Product.findById(productId);

      if (!product || !product.bulkOffer || !product.bulkOffer.active) {
        return { discountPercent: 0 };
      }

      let applicableDiscount = 0;

      for (const tier of product.bulkOffer.bulkTiers) {
        if (quantity >= tier.quantity) {
          applicableDiscount = tier.discountPercent;
        } else {
          break;
        }
      }

      return { discountPercent: applicableDiscount };
    } catch (error) {
      logger.error('Error calculating bulk discount:', error);
      throw error;
    }
  }

  /**
   * Get promotion impact analytics
   */
  async getPromotionImpact(saleId) {
    try {
      const flashSale = await FlashSale.findById(saleId);

      if (!flashSale) {
        throw new Error('Flash sale not found');
      }

      const orders = await Order.find({
        'appliedPromotions.saleId': saleId
      });

      const totalRevenue = orders.reduce((sum, order) => {
        const saleItems = order.items.filter(item => 
          flashSale.productIds.includes(item.productId.toString())
        );
        return sum + saleItems.reduce((s, item) => s + (item.price * item.quantity), 0);
      }, 0);

      const discountGiven = orders.reduce((sum, order) => {
        const salePromo = order.appliedPromotions.find(p => p.saleId === saleId.toString());
        return sum + (salePromo ? salePromo.discountAmount : 0);
      }, 0);

      return {
        saleId,
        totalOrders: orders.length,
        totalUnits: flashSale.quantitySold,
        totalRevenue: Math.round(totalRevenue),
        discountGiven: Math.round(discountGiven),
        netRevenue: Math.round(totalRevenue - discountGiven),
        averageOrderValue: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0,
        roi: orders.length > 0 ? ((totalRevenue - discountGiven) / discountGiven * 100).toFixed(2) : 0
      };
    } catch (error) {
      logger.error('Error calculating promotion impact:', error);
      throw error;
    }
  }

  /**
   * End flash sale early
   */
  async endFlashSaleEarly(saleId, reason) {
    try {
      const flashSale = await FlashSale.findByIdAndUpdate(
        saleId,
        {
          status: 'completed',
          endedEarly: true,
          earlyEndReason: reason,
          actualEndTime: new Date()
        },
        { new: true }
      );

      logger.info(`Flash sale ${saleId} ended early: ${reason}`);

      return flashSale;
    } catch (error) {
      logger.error('Error ending flash sale early:', error);
      throw error;
    }
  }
}

module.exports = new FlashSaleService();
