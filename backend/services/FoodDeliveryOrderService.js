const FoodDeliveryOrder = require('../models/FoodDeliveryOrder');
const FoodDeliveryCart = require('../models/FoodDeliveryCart');
const FoodDeliveryRestaurant = require('../models/FoodDeliveryRestaurant');
const FoodDeliveryMenuItem = require('../models/FoodDeliveryMenuItem');
const FoodDeliveryCartService = require('./FoodDeliveryCartService');

/**
 * FoodDeliveryOrderService
 * Handles order creation, status updates, tracking, cancellation, ratings
 */

class FoodDeliveryOrderService {
  /**
   * Create order from cart
   */
  async createOrderFromCart(userId, restaurantId, checkoutData) {
    const { paymentMethod, deliveryAddressId } = checkoutData;

    // Validate cart
    const validation = await FoodDeliveryCartService.validateCart(userId, restaurantId);
    const cart = validation.cart;

    // Validate delivery address is set
    if (!cart.deliveryAddressId) {
      throw new Error('Delivery address not set');
    }

    // Validate payment method
    const validMethods = ['cash', 'card', 'upi', 'wallet', 'netbanking'];
    if (!validMethods.includes(paymentMethod)) {
      throw new Error('Invalid payment method');
    }

    // Create order from cart items
    const restaurant = await FoodDeliveryRestaurant.findById(restaurantId);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    // Generate unique order ID
    const orderId = await FoodDeliveryOrder.generateOrderId();

    // Map cart items to order items
    const orderItems = cart.items.map(cartItem => ({
      menuItemId: cartItem.menuItemId,
      itemName: cartItem.itemName,
      basePrice: cartItem.basePrice,
      quantity: cartItem.quantity,
      selectedVariant: cartItem.selectedVariant,
      selectedAddons: cartItem.selectedAddons,
      specialInstructions: cartItem.specialInstructions,
      itemTotal: cartItem.itemTotal,
      status: 'pending'
    }));

    // Create order object
    const order = new FoodDeliveryOrder({
      orderId,
      userId,
      restaurantId,
      restaurantName: restaurant.name,
      restaurantPhone: restaurant.phoneNumber,
      items: orderItems,
      deliveryAddress: cart.deliveryAddress,
      deliveryAddressId: cart.deliveryAddressId,
      deliveryInstructions: cart.deliveryInstructions,
      isScheduled: !!cart.scheduleDeliveryFor,
      scheduleDeliveryFor: cart.scheduleDeliveryFor,

      // Pricing
      subtotal: cart.subtotal,
      itemDiscount: cart.itemDiscount,
      appliedCoupon: cart.appliedCoupon,
      restaurantOffer: cart.restaurantOffer,
      deliveryCharges: cart.deliveryCharges,
      platformFee: cart.platformFee,
      taxes: cart.taxes,
      tip: cart.tip,
      total: cart.total,

      // Payment
      paymentMethod,
      paymentStatus: paymentMethod === 'cash' ? 'pending' : 'pending',
      walletUsed: cart.walletUsed,

      // Status
      status: 'confirmed',
      statusTimeline: [
        {
          status: 'confirmed',
          timestamp: new Date(),
          note: 'Order confirmed',
          updatedBy: 'system'
        }
      ],

      // Timing
      estimatedPrepTime: this._getEstimatedPrepTime(restaurant, orderItems.length),
      estimatedDeliveryTime: this._getEstimatedDeliveryTime(cart, restaurant)
    });

    // Save order
    await order.save();

    // Update restaurant order metrics
    restaurant.totalOrders = (restaurant.totalOrders || 0) + 1;
    if (!restaurant.metrics) restaurant.metrics = {};
    restaurant.metrics.orderCount30Days = (restaurant.metrics.orderCount30Days || 0) + 1;
    await restaurant.save();

    // Update menu item popularity metrics
    for (const item of orderItems) {
      await FoodDeliveryMenuItem.findByIdAndUpdate(
        item.menuItemId,
        {
          $inc: {
            'metrics.orderCount': item.quantity,
            'metrics.orderCount30Days': item.quantity,
            'metrics.orderCount7Days': item.quantity
          }
        }
      );
    }

    // Mark cart as converted
    cart.status = 'converted';
    await cart.save();

    return order;
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId) {
    const order = await FoodDeliveryOrder.findById(orderId)
      .populate('restaurantId', 'name phoneNumber profileImage')
      .populate('items.menuItemId', 'name imageUrl');

    if (!order) {
      throw new Error('Order not found');
    }

    return order;
  }

  /**
   * Get order by order ID (not MongoDB _id)
   */
  async getOrderByOrderId(orderId) {
    const order = await FoodDeliveryOrder.findOne({ orderId })
      .populate('restaurantId', 'name phoneNumber profileImage')
      .populate('items.menuItemId', 'name imageUrl');

    if (!order) {
      throw new Error('Order not found');
    }

    return order;
  }

  /**
   * Get user's orders
   */
  async getUserOrders(userId, limit = 20, skip = 0) {
    const orders = await FoodDeliveryOrder.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('restaurantId', 'name profileImage');

    const total = await FoodDeliveryOrder.countDocuments({ userId });

    return { orders, total };
  }

  /**
   * Get user's orders by status
   */
  async getUserOrdersByStatus(userId, status) {
    const orders = await FoodDeliveryOrder.find({ userId, status })
      .sort({ createdAt: -1 })
      .populate('restaurantId', 'name profileImage');

    return orders;
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, newStatus, note = '', updatedBy = 'system') {
    const order = await FoodDeliveryOrder.findByIdAndUpdate(
      orderId,
      { $set: { status: newStatus, updatedAt: new Date() } },
      { new: true }
    );

    if (!order) {
      throw new Error('Order not found');
    }

    // Add to status timeline
    order.updateStatus(newStatus, note, updatedBy);
    await order.save();

    return order;
  }

  /**
   * Get restaurant's orders
   */
  async getRestaurantOrders(restaurantId, status = null, limit = 50, skip = 0) {
    const query = { restaurantId };
    if (status) query.status = status;

    const orders = await FoodDeliveryOrder.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('userId', 'firstName lastName phoneNumber');

    const total = await FoodDeliveryOrder.countDocuments(query);

    return { orders, total };
  }

  /**
   * Update restaurant order status (restaurant-initiated)
   */
  async updateRestaurantOrderStatus(orderId, newStatus, note = '') {
    const validStatuses = ['preparing', 'ready'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error('Invalid status for restaurant');
    }

    return this.updateOrderStatus(orderId, newStatus, note, 'restaurant');
  }

  /**
   * Assign delivery person to order
   */
  async assignDeliveryPerson(orderId, deliveryPersonData) {
    const order = await FoodDeliveryOrder.findByIdAndUpdate(
      orderId,
      {
        $set: {
          deliveryPersonName: deliveryPersonData.name,
          deliveryPersonPhone: deliveryPersonData.phone,
          deliveryPersonImage: deliveryPersonData.image,
          deliveryPersonRating: deliveryPersonData.rating,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!order) {
      throw new Error('Order not found');
    }

    order.updateStatus('out_for_delivery', 'Rider assigned and on the way', 'system');
    await order.save();

    return order;
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId, reason, cancelledBy) {
    const order = await FoodDeliveryOrder.findById(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    if (!order.canBeCancelled()) {
      throw new Error(`Order cannot be cancelled in ${order.status} status`);
    }

    order.cancel(reason, cancelledBy);
    await order.save();

    return order;
  }

  /**
   * Add rating to order
   */
  async rateOrder(orderId, ratingData) {
    const order = await FoodDeliveryOrder.findById(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    if (!order.canBeRated()) {
      throw new Error('Order cannot be rated in current status');
    }

    order.addRating(ratingData);
    await order.save();

    // Update restaurant ratings
    if (ratingData.restaurantRating) {
      await this._updateRestaurantRating(order.restaurantId, ratingData.restaurantRating);
    }

    // Update menu item ratings
    for (const item of order.items) {
      if (ratingData.foodQuality) {
        await FoodDeliveryMenuItem.findByIdAndUpdate(
          item.menuItemId,
          {
            $inc: { 'ratings.totalRatings': 1 },
            $push: { reviews: { rating: ratingData.foodQuality } }
          }
        );
      }
    }

    return order;
  }

  /**
   * Report issue with order
   */
  async reportIssue(orderId, issueType, description) {
    const order = await FoodDeliveryOrder.findById(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    order.reportIssue(issueType, description);
    await order.save();

    return order;
  }

  /**
   * Get order issues
   */
  async getOrderIssues(orderId) {
    const order = await FoodDeliveryOrder.findById(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    return order.issues;
  }

  /**
   * Mark issue as resolved
   */
  async resolveIssue(orderId, issueIndex, resolution) {
    const order = await FoodDeliveryOrder.findById(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    if (issueIndex >= order.issues.length) {
      throw new Error('Issue not found');
    }

    order.issues[issueIndex].status = 'resolved';
    await order.save();

    return order;
  }

  /**
   * Get order statistics for restaurant
   */
  async getRestaurantOrderStats(restaurantId, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await FoodDeliveryOrder.aggregate([
      {
        $match: {
          restaurantId: mongoose.Types.ObjectId(restaurantId),
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$total' }
        }
      }
    ]);

    return stats;
  }

  /**
   * Get order statistics for user
   */
  async getUserOrderStats(userId) {
    const totalOrders = await FoodDeliveryOrder.countDocuments({ userId });
    const completedOrders = await FoodDeliveryOrder.countDocuments({
      userId,
      status: 'delivered'
    });
    const cancelledOrders = await FoodDeliveryOrder.countDocuments({
      userId,
      status: 'cancelled'
    });

    const lastOrder = await FoodDeliveryOrder.findOne({ userId })
      .sort({ createdAt: -1 })
      .select('createdAt');

    const totalSpent = await FoodDeliveryOrder.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId), status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    return {
      totalOrders,
      completedOrders,
      cancelledOrders,
      totalSpent: totalSpent[0]?.total || 0,
      lastOrderDate: lastOrder?.createdAt
    };
  }

  /**
   * Internal: Get estimated prep time
   */
  _getEstimatedPrepTime(restaurant, itemCount) {
    const baseTime = restaurant?.deliveryTime || 30;
    const itemPrepTime = Math.min(itemCount * 3, 15); // 3 min per item, max 15 min
    return baseTime + itemPrepTime;
  }

  /**
   * Internal: Get estimated delivery time
   */
  _getEstimatedDeliveryTime(cart, restaurant) {
    const prepTime = this._getEstimatedPrepTime(
      restaurant,
      cart.items.length
    );
    const deliveryDistance = cart.deliveryAddress?.coordinates
      ? this._calculateDistance(
          restaurant.location.coordinates[1],
          restaurant.location.coordinates[0],
          cart.deliveryAddress.coordinates.latitude,
          cart.deliveryAddress.coordinates.longitude
        )
      : 2; // Default 2km

    const deliveryTime = Math.ceil(deliveryDistance * 3); // 3 min per km
    return prepTime + deliveryTime;
  }

  /**
   * Calculate distance in km
   */
  _calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = this._toRad(lat2 - lat1);
    const dLon = this._toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._toRad(lat1)) *
        Math.cos(this._toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  _toRad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Internal: Update restaurant rating
   */
  async _updateRestaurantRating(restaurantId, newRating) {
    const restaurant = await FoodDeliveryRestaurant.findById(restaurantId);

    if (restaurant && restaurant.ratings) {
      const totalRatings = restaurant.ratings.totalRatings || 0;
      const currentAverage = restaurant.ratings.average || 0;

      const newAverage =
        (currentAverage * totalRatings + newRating) / (totalRatings + 1);

      restaurant.ratings.average = Math.round(newAverage * 10) / 10;
      restaurant.ratings.totalRatings = totalRatings + 1;

      await restaurant.save();
    }
  }
}

module.exports = new FoodDeliveryOrderService();
