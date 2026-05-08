/**
 * ScheduledDeliveryController
 * HTTP endpoints for scheduled orders management
 */

const ScheduledDeliveryService = require('../services/ScheduledDeliveryService');

class ScheduledDeliveryController {
  /**
   * Create scheduled order
   * POST /api/v1/food/scheduled-orders
   */
  static async createScheduledOrder(req, res) {
    try {
      const {
        orderId,
        userId,
        restaurantId,
        scheduledDeliveryTime,
        deliveryWindow,
        items,
        pricing,
        paymentMethod,
        deliveryAddress,
      } = req.body;

      const result = await ScheduledDeliveryService.createScheduledOrder({
        orderId,
        userId,
        restaurantId,
        scheduledDeliveryTime,
        deliveryWindow,
        items,
        pricing,
        paymentMethod,
        deliveryAddress,
      });

      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Get user's scheduled orders
   * GET /api/v1/food/users/:userId/scheduled-orders
   */
  static async getUserScheduledOrders(req, res) {
    try {
      const { userId } = req.params;
      const { status } = req.query;

      const result = await ScheduledDeliveryService.getUserScheduledOrders(userId, status);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Get restaurant's upcoming scheduled orders
   * GET /api/v1/food/restaurants/:restaurantId/upcoming-orders
   */
  static async getUpcomingOrders(req, res) {
    try {
      const { restaurantId } = req.params;

      const result = await ScheduledDeliveryService.getRestaurantUpcomingOrders(restaurantId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Get scheduled order details
   * GET /api/v1/food/scheduled-orders/:scheduledOrderId
   */
  static async getScheduledOrder(req, res) {
    try {
      const { scheduledOrderId } = req.params;

      const result = await ScheduledDeliveryService.getScheduledOrderById(scheduledOrderId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Check if order can be modified
   * GET /api/v1/food/scheduled-orders/:scheduledOrderId/can-modify
   */
  static async checkCanModify(req, res) {
    try {
      const { scheduledOrderId } = req.params;

      const result = await ScheduledDeliveryService.canModifyOrder(scheduledOrderId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Modify scheduled order
   * PATCH /api/v1/food/scheduled-orders/:scheduledOrderId
   */
  static async modifyOrder(req, res) {
    try {
      const { scheduledOrderId } = req.params;

      const result = await ScheduledDeliveryService.modifyScheduledOrder(scheduledOrderId, req.body);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Update order status
   * PUT /api/v1/food/scheduled-orders/:scheduledOrderId/status
   */
  static async updateStatus(req, res) {
    try {
      const { scheduledOrderId } = req.params;
      const { status, notes } = req.body;

      const result = await ScheduledDeliveryService.updateOrderStatus(scheduledOrderId, status, notes);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Cancel scheduled order
   * DELETE /api/v1/food/scheduled-orders/:scheduledOrderId
   */
  static async cancelOrder(req, res) {
    try {
      const { scheduledOrderId } = req.params;
      const { reason, cancelledBy = 'user' } = req.body;

      const result = await ScheduledDeliveryService.cancelScheduledOrder(scheduledOrderId, reason, cancelledBy);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Get statistics
   * GET /api/v1/food/scheduled-orders/statistics
   */
  static async getStatistics(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const result = await ScheduledDeliveryService.getStatistics(startDate, endDate);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }

  /**
   * Rate scheduled order
   * POST /api/v1/food/scheduled-orders/:scheduledOrderId/rate
   */
  static async rateOrder(req, res) {
    try {
      const { scheduledOrderId } = req.params;
      const { score, comment } = req.body;

      const result = await ScheduledDeliveryService.rateScheduledOrder(scheduledOrderId, score, comment);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  }
}

module.exports = ScheduledDeliveryController;
