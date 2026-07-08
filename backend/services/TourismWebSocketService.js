const logger = require('../utils/logger');

/**
 * Tourism WebSocket Service
 * Handles real-time events for bookings, payments, leads, and status updates
 */
class TourismWebSocketService {
  constructor() {
    this.io = null;
    this.clients = new Map(); // userId -> socket mapping
  }

  /**
   * Initialize WebSocket server
   */
  initialize(io) {
    this.io = io;
    logger.info('TourismWebSocketService initialized');

    // Create tourism namespace
    const tourismNamespace = this.io.of('/tourism');

    tourismNamespace.on('connection', (socket) => {
      logger.info(`Tourism client connected: ${socket.id}`);

      // Handle user authentication
      socket.on('authenticate', (data) => {
        const { userId, email, role } = data;
        socket.userId = userId;
        socket.email = email;
        socket.role = role;
        
        this.clients.set(userId, socket);
        logger.info(`Tourism user authenticated: ${userId} (${email})`);

        // Join user-specific room
        socket.join(`user:${userId}`);
        
        // Join role-specific rooms
        if (role === 'vendor' || role === 'business') {
          socket.join('vendors');
        }
        if (role === 'admin') {
          socket.join('admins');
        }

        socket.emit('authenticated', { success: true, socketId: socket.id });
      });

      // Handle vendor room join
      socket.on('join:vendor', (vendorId) => {
        socket.join(`vendor:${vendorId}`);
        logger.info(`Socket ${socket.id} joined vendor room: ${vendorId}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        if (socket.userId) {
          this.clients.delete(socket.userId);
        }
        logger.info(`Tourism client disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Emit booking created event
   */
  emitBookingCreated(booking) {
    if (!this.io) return;

    try {
      const tourismNamespace = this.io.of('/tourism');
      
      // Notify admins
      tourismNamespace.to('admins').emit('booking:created', {
        type: 'booking_created',
        booking: {
          _id: booking._id,
          confirmationNumber: booking.confirmationNumber,
          packageTitle: booking.packageTitle,
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          bookingStatus: booking.bookingStatus,
          payableAmount: booking.amountSummary.payableAmount,
          travelDate: booking.travelDate,
          createdAt: booking.createdAt,
        },
        timestamp: new Date(),
      });

      // Notify vendor
      tourismNamespace.to(`vendor:${booking.vendorId}`).emit('booking:created', {
        type: 'booking_created',
        booking: {
          _id: booking._id,
          confirmationNumber: booking.confirmationNumber,
          packageTitle: booking.packageTitle,
          customerName: booking.customerName,
          travelerCount: booking.travelerCount,
          travelDate: booking.travelDate,
          payableAmount: booking.amountSummary.payableAmount,
        },
        timestamp: new Date(),
      });

      // Notify user if available
      if (booking.userId) {
        tourismNamespace.to(`user:${booking.userId}`).emit('booking:created', {
          type: 'booking_created',
          booking: {
            _id: booking._id,
            confirmationNumber: booking.confirmationNumber,
            bookingStatus: booking.bookingStatus,
            packageTitle: booking.packageTitle,
          },
          timestamp: new Date(),
        });
      }

      logger.info(`Emitted booking:created event for ${booking.confirmationNumber}`);
    } catch (error) {
      logger.error('Error emitting booking created event:', error);
    }
  }

  /**
   * Emit payment confirmed event
   */
  emitPaymentConfirmed(booking, payment) {
    if (!this.io) return;

    try {
      const tourismNamespace = this.io.of('/tourism');
      
      const eventData = {
        type: 'payment_confirmed',
        booking: {
          _id: booking._id,
          confirmationNumber: booking.confirmationNumber,
          packageTitle: booking.packageTitle,
          bookingStatus: booking.bookingStatus,
        },
        payment: {
          _id: payment._id,
          amount: payment.amount,
          status: payment.status,
          paymentMethod: payment.paymentMethod,
          paidAt: payment.paidAt,
        },
        timestamp: new Date(),
      };

      // Notify admins
      tourismNamespace.to('admins').emit('payment:confirmed', eventData);

      // Notify vendor
      tourismNamespace.to(`vendor:${booking.vendorId}`).emit('payment:confirmed', eventData);

      // Notify user
      if (booking.userId) {
        tourismNamespace.to(`user:${booking.userId}`).emit('payment:confirmed', eventData);
      }

      logger.info(`Emitted payment:confirmed event for booking ${booking.confirmationNumber}`);
    } catch (error) {
      logger.error('Error emitting payment confirmed event:', error);
    }
  }

  /**
   * Emit booking status changed event
   */
  emitBookingStatusChanged(booking, oldStatus, newStatus, updatedBy) {
    if (!this.io) return;

    try {
      const tourismNamespace = this.io.of('/tourism');
      
      const eventData = {
        type: 'booking_status_changed',
        booking: {
          _id: booking._id,
          confirmationNumber: booking.confirmationNumber,
          packageTitle: booking.packageTitle,
          customerName: booking.customerName,
          oldStatus,
          newStatus,
          updatedBy,
        },
        timestamp: new Date(),
      };

      // Notify admins
      tourismNamespace.to('admins').emit('booking:status_changed', eventData);

      // Notify vendor
      tourismNamespace.to(`vendor:${booking.vendorId}`).emit('booking:status_changed', eventData);

      // Notify user
      if (booking.userId) {
        tourismNamespace.to(`user:${booking.userId}`).emit('booking:status_changed', eventData);
      }

      logger.info(`Emitted booking:status_changed event: ${oldStatus} -> ${newStatus}`);
    } catch (error) {
      logger.error('Error emitting booking status changed event:', error);
    }
  }

  /**
   * Emit lead assigned event
   */
  emitLeadAssigned(lead, vendor) {
    if (!this.io) return;

    try {
      const tourismNamespace = this.io.of('/tourism');
      
      const eventData = {
        type: 'lead_assigned',
        lead: {
          _id: lead._id,
          travelerName: lead.travelerName,
          destination: lead.destination,
          budget: lead.budget,
          status: lead.status,
          priority: lead.priority,
        },
        vendor: {
          _id: vendor._id,
          name: vendor.name,
        },
        timestamp: new Date(),
      };

      // Notify vendor
      tourismNamespace.to(`vendor:${vendor._id}`).emit('lead:assigned', eventData);

      // Notify admins
      tourismNamespace.to('admins').emit('lead:assigned', eventData);

      logger.info(`Emitted lead:assigned event for vendor ${vendor.name}`);
    } catch (error) {
      logger.error('Error emitting lead assigned event:', error);
    }
  }

  /**
   * Emit lead status changed event
   */
  emitLeadStatusChanged(lead, oldStatus, newStatus) {
    if (!this.io) return;

    try {
      const tourismNamespace = this.io.of('/tourism');
      
      const eventData = {
        type: 'lead_status_changed',
        lead: {
          _id: lead._id,
          travelerName: lead.travelerName,
          destination: lead.destination,
          oldStatus,
          newStatus,
        },
        timestamp: new Date(),
      };

      // Notify vendor
      tourismNamespace.to(`vendor:${lead.vendorId}`).emit('lead:status_changed', eventData);

      // Notify admins
      tourismNamespace.to('admins').emit('lead:status_changed', eventData);

      logger.info(`Emitted lead:status_changed event: ${oldStatus} -> ${newStatus}`);
    } catch (error) {
      logger.error('Error emitting lead status changed event:', error);
    }
  }

  /**
   * Emit package approved event
   */
  emitPackageApproved(pkg, vendor) {
    if (!this.io) return;

    try {
      const tourismNamespace = this.io.of('/tourism');
      
      const eventData = {
        type: 'package_approved',
        package: {
          _id: pkg._id,
          title: pkg.title,
          destination: pkg.destination,
          startPrice: pkg.startPrice,
          approvalStatus: pkg.approvalStatus,
        },
        timestamp: new Date(),
      };

      // Notify vendor
      tourismNamespace.to(`vendor:${vendor._id}`).emit('package:approved', eventData);

      // Notify all clients for marketplace update
      tourismNamespace.emit('package:updated', eventData);

      logger.info(`Emitted package:approved event for ${pkg.title}`);
    } catch (error) {
      logger.error('Error emitting package approved event:', error);
    }
  }

  /**
   * Emit refund processed event
   */
  emitRefundProcessed(booking, refundAmount) {
    if (!this.io) return;

    try {
      const tourismNamespace = this.io.of('/tourism');
      
      const eventData = {
        type: 'refund_processed',
        booking: {
          _id: booking._id,
          confirmationNumber: booking.confirmationNumber,
          packageTitle: booking.packageTitle,
          refundAmount,
          refundStatus: booking.refundStatus,
        },
        timestamp: new Date(),
      };

      // Notify user
      if (booking.userId) {
        tourismNamespace.to(`user:${booking.userId}`).emit('refund:processed', eventData);
      }

      // Notify admins
      tourismNamespace.to('admins').emit('refund:processed', eventData);

      // Notify vendor
      tourismNamespace.to(`vendor:${booking.vendorId}`).emit('refund:processed', eventData);

      logger.info(`Emitted refund:processed event for booking ${booking.confirmationNumber}`);
    } catch (error) {
      logger.error('Error emitting refund processed event:', error);
    }
  }

  /**
   * Broadcast analytics update
   */
  broadcastAnalyticsUpdate(analyticsType, data) {
    if (!this.io) return;

    try {
      const tourismNamespace = this.io.of('/tourism');
      
      // Only send to admins and vendors
      tourismNamespace.to('admins').emit('analytics:update', {
        type: analyticsType,
        data,
        timestamp: new Date(),
      });

      tourismNamespace.to('vendors').emit('analytics:update', {
        type: analyticsType,
        data,
        timestamp: new Date(),
      });

      logger.info(`Broadcasted analytics update: ${analyticsType}`);
    } catch (error) {
      logger.error('Error broadcasting analytics update:', error);
    }
  }

  /**
   * Send notification to specific user
   */
  sendToUser(userId, event, data) {
    if (!this.io) return;

    try {
      const tourismNamespace = this.io.of('/tourism');
      tourismNamespace.to(`user:${userId}`).emit(event, {
        ...data,
        timestamp: new Date(),
      });

      logger.info(`Sent ${event} to user ${userId}`);
    } catch (error) {
      logger.error('Error sending to user:', error);
    }
  }

  /**
   * Send notification to specific vendor
   */
  sendToVendor(vendorId, event, data) {
    if (!this.io) return;

    try {
      const tourismNamespace = this.io.of('/tourism');
      tourismNamespace.to(`vendor:${vendorId}`).emit(event, {
        ...data,
        timestamp: new Date(),
      });

      logger.info(`Sent ${event} to vendor ${vendorId}`);
    } catch (error) {
      logger.error('Error sending to vendor:', error);
    }
  }

  /**
   * Broadcast to all admins
   */
  broadcastToAdmins(event, data) {
    if (!this.io) return;

    try {
      const tourismNamespace = this.io.of('/tourism');
      tourismNamespace.to('admins').emit(event, {
        ...data,
        timestamp: new Date(),
      });

      logger.info(`Broadcasted ${event} to all admins`);
    } catch (error) {
      logger.error('Error broadcasting to admins:', error);
    }
  }
}

// Export singleton instance
module.exports = new TourismWebSocketService();
