/**
 * WebSocket handlers for real-time classified listings updates
 */

const setupClassifiedsWebSocket = (io) => {
  const classifieds = io.of('/classifieds');

  // Track active connections
  const activeConnections = new Map();

  classifieds.on('connection', (socket) => {
    console.log(`✅ Classifieds WebSocket client connected: ${socket.id}`);

    // Store user connection
    const userId = socket.handshake.auth?.userId || socket.id;
    activeConnections.set(socket.id, {
      userId,
      connectedAt: new Date(),
      watchingListings: new Set(),
    });

    // ============ LISTENING ============

    /**
     * Watch a listing for real-time updates
     */
    socket.on('watch-listing', (listingId) => {
      const connection = activeConnections.get(socket.id);
      if (connection) {
        connection.watchingListings.add(listingId);
        socket.join(`listing-${listingId}`);
        console.log(`👀 User watching listing: ${listingId}`);
      }
    });

    /**
     * Stop watching a listing
     */
    socket.on('unwatch-listing', (listingId) => {
      const connection = activeConnections.get(socket.id);
      if (connection) {
        connection.watchingListings.delete(listingId);
        socket.leave(`listing-${listingId}`);
      }
    });

    /**
     * User is typing a message
     */
    socket.on('typing', (data) => {
      const { listingId, userName } = data;
      classifieds.to(`listing-${listingId}`).emit('user-typing', {
        userName,
        timestamp: new Date(),
      });
    });

    /**
     * User stopped typing
     */
    socket.on('stopped-typing', (listingId) => {
      classifieds.to(`listing-${listingId}`).emit('user-stopped-typing', {
        timestamp: new Date(),
      });
    });

    /**
     * Join seller chat room
     */
    socket.on('join-chat', (data) => {
      const { listingId, userId } = data;
      const roomId = `chat-${listingId}-${userId}`;
      socket.join(roomId);
      console.log(`💬 User joined chat: ${roomId}`);

      // Notify others in the room
      classifieds.to(roomId).emit('user-joined', {
        userId,
        timestamp: new Date(),
      });
    });

    /**
     * Leave chat room
     */
    socket.on('leave-chat', (data) => {
      const { listingId, userId } = data;
      const roomId = `chat-${listingId}-${userId}`;
      socket.leave(roomId);

      classifieds.to(roomId).emit('user-left', {
        userId,
        timestamp: new Date(),
      });
    });

    /**
     * Handle disconnect
     */
    socket.on('disconnect', () => {
      activeConnections.delete(socket.id);
      console.log(`❌ Classifieds WebSocket client disconnected: ${socket.id}`);
    });
  });

  // ============ BROADCASTING ============

  /**
   * Notify when new listing is posted
   */
  const broadcastNewListing = (listing) => {
    classifieds.emit('new-listing', {
      id: listing.id,
      title: listing.title,
      category: listing.category,
      location: listing.location,
      price: listing.price,
      timestamp: new Date(),
    });
  };

  /**
   * Notify listing update
   */
  const broadcastListingUpdate = (listingId, updates) => {
    classifieds.to(`listing-${listingId}`).emit('listing-updated', {
      listingId,
      updates,
      timestamp: new Date(),
    });
  };

  /**
   * Notify new message
   */
  const broadcastNewMessage = (listingId, message) => {
    classifieds.to(`listing-${listingId}`).emit('new-message', {
      listingId,
      message,
      timestamp: new Date(),
    });
  };

  /**
   * Notify view count update
   */
  const broadcastViewUpdate = (listingId, views) => {
    classifieds.to(`listing-${listingId}`).emit('view-updated', {
      listingId,
      views,
      timestamp: new Date(),
    });
  };

  /**
   * Notify engagement (chats/favorites)
   */
  const broadcastEngagementUpdate = (listingId, chats, favorites) => {
    classifieds.to(`listing-${listingId}`).emit('engagement-updated', {
      listingId,
      chats,
      favorites,
      timestamp: new Date(),
    });
  };

  /**
   * Notify price change
   */
  const broadcastPriceChange = (listingId, newPrice, oldPrice) => {
    classifieds.to(`listing-${listingId}`).emit('price-changed', {
      listingId,
      newPrice,
      oldPrice,
      percentChange: ((newPrice - oldPrice) / oldPrice * 100).toFixed(2),
      timestamp: new Date(),
    });
  };

  /**
   * Notify listing approval/rejection
   */
  const broadcastModerationUpdate = (listingId, status, reason) => {
    classifieds.to(`listing-${listingId}`).emit('moderation-update', {
      listingId,
      status,
      reason,
      timestamp: new Date(),
    });
  };

  /**
   * Notify about listing expiry
   */
  const broadcastExpiryWarning = (listingId, daysRemaining) => {
    classifieds.to(`listing-${listingId}`).emit('expiry-warning', {
      listingId,
      daysRemaining,
      message: `This listing will expire in ${daysRemaining} days`,
      timestamp: new Date(),
    });
  };

  /**
   * Broadcast seller status
   */
  const broadcastSellerStatus = (sellerEmail, status) => {
    classifieds.emit('seller-status', {
      sellerEmail,
      status, // 'online', 'offline', 'away'
      timestamp: new Date(),
    });
  };

  /**
   * Get active connections count
   */
  const getActiveConnectionsCount = () => {
    return activeConnections.size;
  };

  /**
   * Get users watching a listing
   */
  const getUsersWatchingListing = (listingId) => {
    const users = [];
    activeConnections.forEach((conn) => {
      if (conn.watchingListings.has(listingId)) {
        users.push(conn.userId);
      }
    });
    return users;
  };

  return {
    broadcastNewListing,
    broadcastListingUpdate,
    broadcastNewMessage,
    broadcastViewUpdate,
    broadcastEngagementUpdate,
    broadcastPriceChange,
    broadcastModerationUpdate,
    broadcastExpiryWarning,
    broadcastSellerStatus,
    getActiveConnectionsCount,
    getUsersWatchingListing,
  };
};

module.exports = {
  setupClassifiedsWebSocket,
};
