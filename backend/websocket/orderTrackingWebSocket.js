/**
 * orderTrackingWebSocket.js
 * Phase 5E: Real-time order and shipment tracking via WebSocket
 * Handles live updates for order status and tracking information
 */

const logger = require('../utils/logger');

class OrderTrackingWebSocket {
  constructor(io) {
    this.io = io;
    this.activeTracking = new Map(); // userId -> Set of tracked order/shipment IDs
    this.setupHandlers();
  }

  setupHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`User connected to tracking: ${socket.id}`);

      // Subscribe to order tracking
      socket.on('track:order', (orderId, userId) => {
        this.handleTrackOrder(socket, orderId, userId);
      });

      // Subscribe to shipment tracking
      socket.on('track:shipment', (trackingNumber, userId) => {
        this.handleTrackShipment(socket, trackingNumber, userId);
      });

      // Subscribe to all user orders
      socket.on('track:user-orders', (userId) => {
        this.handleTrackUserOrders(socket, userId);
      });

      // Unsubscribe from tracking
      socket.on('untrack:order', (orderId) => {
        this.handleUntrackOrder(socket, orderId);
      });

      socket.on('disconnect', () => {
        logger.info(`User disconnected from tracking: ${socket.id}`);
        this.activeTracking.delete(socket.id);
      });
    });
  }

  handleTrackOrder(socket, orderId, userId) {
    try {
      const roomName = `order:${orderId}`;
      socket.join(roomName);

      if (!this.activeTracking.has(socket.id)) {
        this.activeTracking.set(socket.id, new Set());
      }
      this.activeTracking.get(socket.id).add(orderId);

      socket.emit('track:subscribed', {
        type: 'order',
        id: orderId,
        message: `Tracking order ${orderId}`,
      });

      logger.info(`User subscribed to order tracking: ${orderId}`);
    } catch (error) {
      logger.error(`Error subscribing to order tracking: ${error.message}`);
      socket.emit('track:error', { message: 'Failed to subscribe to tracking' });
    }
  }

  handleTrackShipment(socket, trackingNumber, userId) {
    try {
      const roomName = `shipment:${trackingNumber}`;
      socket.join(roomName);

      if (!this.activeTracking.has(socket.id)) {
        this.activeTracking.set(socket.id, new Set());
      }
      this.activeTracking.get(socket.id).add(trackingNumber);

      socket.emit('track:subscribed', {
        type: 'shipment',
        id: trackingNumber,
        message: `Tracking shipment ${trackingNumber}`,
      });

      logger.info(`User subscribed to shipment tracking: ${trackingNumber}`);
    } catch (error) {
      logger.error(`Error subscribing to shipment tracking: ${error.message}`);
      socket.emit('track:error', { message: 'Failed to subscribe to tracking' });
    }
  }

  handleTrackUserOrders(socket, userId) {
    try {
      const roomName = `user-orders:${userId}`;
      socket.join(roomName);

      socket.emit('track:subscribed', {
        type: 'user-orders',
        id: userId,
        message: `Tracking all orders for user ${userId}`,
      });

      logger.info(`User subscribed to all order tracking: ${userId}`);
    } catch (error) {
      logger.error(`Error subscribing to user order tracking: ${error.message}`);
      socket.emit('track:error', { message: 'Failed to subscribe to tracking' });
    }
  }

  handleUntrackOrder(socket, orderId) {
    try {
      const roomName = `order:${orderId}`;
      socket.leave(roomName);

      if (this.activeTracking.has(socket.id)) {
        this.activeTracking.get(socket.id).delete(orderId);
      }

      logger.info(`User unsubscribed from order tracking: ${orderId}`);
    } catch (error) {
      logger.error(`Error unsubscribing from order tracking: ${error.message}`);
    }
  }

  /**
   * Broadcast order status update to all subscribers
   */
  broadcastOrderStatusUpdate(orderId, userId, statusUpdate) {
    const roomName = `order:${orderId}`;
    const userRoomName = `user-orders:${userId}`;

    this.io.to(roomName).emit('order:status-update', {
      orderId,
      ...statusUpdate,
      timestamp: new Date().toISOString(),
    });

    this.io.to(userRoomName).emit('order:status-update', {
      orderId,
      ...statusUpdate,
      timestamp: new Date().toISOString(),
    });

    logger.info(`Broadcasted order status update: ${orderId}`);
  }

  /**
   * Broadcast shipment tracking update to all subscribers
   */
  broadcastShipmentUpdate(trackingNumber, orderId, userId, trackingUpdate) {
    const shipmentRoomName = `shipment:${trackingNumber}`;
    const orderRoomName = `order:${orderId}`;
    const userRoomName = `user-orders:${userId}`;

    const update = {
      trackingNumber,
      orderId,
      ...trackingUpdate,
      timestamp: new Date().toISOString(),
    };

    this.io.to(shipmentRoomName).emit('shipment:update', update);
    this.io.to(orderRoomName).emit('shipment:update', update);
    this.io.to(userRoomName).emit('shipment:update', update);

    logger.info(`Broadcasted shipment update: ${trackingNumber}`);
  }

  /**
   * Broadcast that shipment is out for delivery
   */
  broadcastOutForDelivery(trackingNumber, orderId, userId, estimatedDelivery) {
    this.broadcastShipmentUpdate(trackingNumber, orderId, userId, {
      status: 'out_for_delivery',
      message: 'Your package is out for delivery today',
      estimatedDelivery,
      lastLocation: 'Local Delivery Hub',
    });
  }

  /**
   * Broadcast delivery confirmation
   */
  broadcastDelivered(trackingNumber, orderId, userId, deliveryDetails) {
    this.broadcastShipmentUpdate(trackingNumber, orderId, userId, {
      status: 'delivered',
      message: 'Your package has been delivered',
      ...deliveryDetails,
    });
  }

  /**
   * Broadcast location update
   */
  broadcastLocationUpdate(trackingNumber, orderId, userId, location, timestamp) {
    this.broadcastShipmentUpdate(trackingNumber, orderId, userId, {
      status: 'in_transit',
      currentLocation: location,
      lastLocationUpdate: timestamp,
      message: `Package in transit at ${location}`,
    });
  }

  /**
   * Get connection stats for monitoring
   */
  getStats() {
    const totalConnections = Object.keys(this.io.sockets.sockets).length;
    const totalTrackedItems = Array.from(this.activeTracking.values()).reduce(
      (sum, set) => sum + set.size,
      0
    );

    return {
      activeConnections: totalConnections,
      totalTrackedItems,
      trackedBySocket: Array.from(this.activeTracking.entries()).map(([socketId, items]) => ({
        socketId,
        itemCount: items.size,
      })),
    };
  }
}

module.exports = OrderTrackingWebSocket;
