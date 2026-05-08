const FoodDeliveryOrderService = require('../services/FoodDeliveryOrderService');

/**
 * FoodDeliveryOrderController
 * Handles HTTP requests for order operations
 */

class FoodDeliveryOrderController {
  /**
   * POST /orders - Create order from cart
   */
  async createOrder(req, res) {
    try {
      const { restaurantId } = req.params;
      const userId = req.user.id;
      const { paymentMethod, deliveryAddressId } = req.body;

      if (!paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'paymentMethod is required'
        });
      }

      const order = await FoodDeliveryOrderService.createOrderFromCart(userId, restaurantId, {
        paymentMethod,
        deliveryAddressId
      });

      res.status(201).json({
        success: true,
        data: order.toSummary(),
        message: 'Order created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /orders - Get user's orders
   */
  async getUserOrders(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 20, skip = 0 } = req.query;

      const result = await FoodDeliveryOrderService.getUserOrders(
        userId,
        parseInt(limit),
        parseInt(skip)
      );

      res.json({
        success: true,
        data: {
          orders: result.orders.map(order => order.toSummary()),
          total: result.total,
          hasMore: parseInt(skip) + parseInt(limit) < result.total
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /orders/:orderId - Get order details
   */
  async getOrderDetails(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      // Verify ownership
      const order = await FoodDeliveryOrderService.getOrderByOrderId(orderId);

      if (order.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      res.json({
        success: true,
        data: order.getDetails()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /orders/status/:status - Get orders by status
   */
  async getOrdersByStatus(req, res) {
    try {
      const userId = req.user.id;
      const { status } = req.params;

      const validStatuses = [
        'confirmed',
        'preparing',
        'ready',
        'out_for_delivery',
        'delivered',
        'cancelled'
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }

      const orders = await FoodDeliveryOrderService.getUserOrdersByStatus(userId, status);

      res.json({
        success: true,
        data: orders.map(order => order.toSummary())
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * PUT /orders/:orderId/cancel - Cancel order
   */
  async cancelOrder(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Cancellation reason is required'
        });
      }

      // Verify ownership
      const order = await FoodDeliveryOrderService.getOrderByOrderId(orderId);

      if (order.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const cancelledOrder = await FoodDeliveryOrderService.cancelOrder(
        order._id,
        reason,
        'customer'
      );

      res.json({
        success: true,
        data: cancelledOrder.toSummary(),
        message: 'Order cancelled successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /orders/:orderId/rating - Rate order
   */
  async rateOrder(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;
      const { foodQuality, delivery, packaging, restaurantRating, riderRating, comment } =
        req.body;

      // Verify ownership
      const order = await FoodDeliveryOrderService.getOrderByOrderId(orderId);

      if (order.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      // Validate ratings
      const ratings = [foodQuality, delivery, packaging, restaurantRating, riderRating].filter(
        r => r !== undefined
      );

      for (const rating of ratings) {
        if (rating < 1 || rating > 5) {
          return res.status(400).json({
            success: false,
            message: 'Ratings must be between 1 and 5'
          });
        }
      }

      const ratedOrder = await FoodDeliveryOrderService.rateOrder(order._id, {
        foodQuality,
        delivery,
        packaging,
        restaurantRating,
        riderRating,
        comment
      });

      res.json({
        success: true,
        data: ratedOrder.rating,
        message: 'Rating submitted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /orders/:orderId/issue - Report issue
   */
  async reportIssue(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;
      const { issueType, description } = req.body;

      if (!issueType || !description) {
        return res.status(400).json({
          success: false,
          message: 'issueType and description are required'
        });
      }

      const validIssueTypes = ['item_missing', 'item_damaged', 'late_delivery', 'quality_issue'];
      if (!validIssueTypes.includes(issueType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid issue type'
        });
      }

      // Verify ownership
      const order = await FoodDeliveryOrderService.getOrderByOrderId(orderId);

      if (order.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const updatedOrder = await FoodDeliveryOrderService.reportIssue(
        order._id,
        issueType,
        description
      );

      res.status(201).json({
        success: true,
        data: updatedOrder.issues[updatedOrder.issues.length - 1],
        message: 'Issue reported successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /orders/:orderId/issues - Get order issues
   */
  async getIssues(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      // Verify ownership
      const order = await FoodDeliveryOrderService.getOrderByOrderId(orderId);

      if (order.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const issues = await FoodDeliveryOrderService.getOrderIssues(order._id);

      res.json({
        success: true,
        data: issues
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /orders/stats - Get order statistics (restaurant)
   */
  async getRestaurantOrderStats(req, res) {
    try {
      const { restaurantId } = req.params;
      const { days = 7 } = req.query;

      // Verify restaurant ownership (implement in middleware)
      const stats = await FoodDeliveryOrderService.getRestaurantOrderStats(
        restaurantId,
        parseInt(days)
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /restaurants/:restaurantId/orders - Get restaurant orders
   */
  async getRestaurantOrders(req, res) {
    try {
      const { restaurantId } = req.params;
      const { status = null, limit = 50, skip = 0 } = req.query;

      // Verify restaurant ownership (implement in middleware)
      const result = await FoodDeliveryOrderService.getRestaurantOrders(
        restaurantId,
        status,
        parseInt(limit),
        parseInt(skip)
      );

      res.json({
        success: true,
        data: {
          orders: result.orders,
          total: result.total,
          hasMore: parseInt(skip) + parseInt(limit) < result.total
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * PUT /restaurants/:restaurantId/orders/:orderId/status - Update status (restaurant)
   */
  async updateOrderStatusRestaurant(req, res) {
    try {
      const { orderId } = req.params;
      const { status, note } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'status is required'
        });
      }

      const validStatuses = ['preparing', 'ready'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status for restaurant'
        });
      }

      const order = await FoodDeliveryOrderService.updateRestaurantOrderStatus(
        orderId,
        status,
        note
      );

      res.json({
        success: true,
        data: order.toSummary(),
        message: `Order status updated to ${status}`
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /orders/:orderId/assign-delivery - Assign delivery person
   */
  async assignDeliveryPerson(req, res) {
    try {
      const { orderId } = req.params;
      const { name, phone, image, rating } = req.body;

      if (!name || !phone) {
        return res.status(400).json({
          success: false,
          message: 'Delivery person name and phone are required'
        });
      }

      const order = await FoodDeliveryOrderService.assignDeliveryPerson(orderId, {
        name,
        phone,
        image,
        rating
      });

      res.json({
        success: true,
        data: order.toSummary(),
        message: 'Delivery person assigned'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /orders/:orderId/track - Track order
   */
  async trackOrder(req, res) {
    try {
      const { orderId } = req.params;

      const order = await FoodDeliveryOrderService.getOrderByOrderId(orderId);

      res.json({
        success: true,
        data: {
          orderId: order.orderId,
          status: order.status,
          statusTimeline: order.statusTimeline,
          deliveryPersonName: order.deliveryPersonName,
          deliveryPersonPhone: order.deliveryPersonPhone,
          deliveryPersonImage: order.deliveryPersonImage,
          estimatedDeliveryTime: order.estimatedDeliveryTime,
          deliveryAddress: order.deliveryAddress
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /users/:userId/stats - Get user statistics
   */
  async getUserStats(req, res) {
    try {
      const userId = req.user.id;

      const stats = await FoodDeliveryOrderService.getUserOrderStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new FoodDeliveryOrderController();
