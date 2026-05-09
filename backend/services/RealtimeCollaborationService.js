/**
 * RealtimeCollaborationService.js
 * Real-time updates, presence tracking, collaborative editing
 */

const logger = require('../config/logger');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const CollaborationSession = require('../models/CollaborationSession');
const io = require('../config/socket'); // Socket.IO instance

class RealtimeCollaborationService {
  /**
   * Track user presence (online/offline/idle)
   */
  static async setUserPresence(userId, status, lastSeen = new Date()) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { presenceStatus: status, lastSeenAt: lastSeen },
        { new: true }
      );
      
      // Broadcast presence to all connected clients
      io.emit('user:presence', { userId, status, lastSeen });
      
      logger.info(`User ${userId} presence set to ${status}`);
      return { success: true, user };
    } catch (error) {
      logger.error(`Presence tracking error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get active users (online/recently online)
   */
  static async getActiveUsers(threshold = 5 * 60 * 1000) { // 5 minutes
    try {
      const fiveMinutesAgo = new Date(Date.now() - threshold);
      const activeUsers = await User.find({
        lastSeenAt: { $gte: fiveMinutesAgo },
        presenceStatus: { $in: ['online', 'idle'] }
      }).select('_id username email presenceStatus lastSeenAt');

      return {
        success: true,
        count: activeUsers.length,
        users: activeUsers
      };
    } catch (error) {
      logger.error(`Get active users error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create collaborative editing session for product
   */
  static async createEditingSession(productId, userId, expiresIn = 30 * 60 * 1000) {
    try {
      const session = await CollaborationSession.create({
        productId,
        initiatorId: userId,
        participants: [userId],
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + expiresIn),
        changeLog: []
      });

      io.emit('collaboration:session-created', {
        sessionId: session._id,
        productId,
        initiator: userId
      });

      logger.info(`Editing session created: ${session._id}`);
      return { success: true, session };
    } catch (error) {
      logger.error(`Create session error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Join collaborative editing session
   */
  static async joinEditingSession(sessionId, userId) {
    try {
      const session = await CollaborationSession.findByIdAndUpdate(
        sessionId,
        {
          $addToSet: { participants: userId },
          lastActivityAt: new Date()
        },
        { new: true }
      );

      if (!session) throw new Error('Session not found');

      io.emit('collaboration:user-joined', {
        sessionId,
        userId,
        participantCount: session.participants.length
      });

      return { success: true, session };
    } catch (error) {
      logger.error(`Join session error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Record collaborative edit (change tracking)
   */
  static async recordEdit(sessionId, userId, field, oldValue, newValue) {
    try {
      const change = {
        userId,
        timestamp: new Date(),
        field,
        oldValue,
        newValue
      };

      const session = await CollaborationSession.findByIdAndUpdate(
        sessionId,
        {
          $push: { changeLog: change },
          lastActivityAt: new Date()
        },
        { new: true }
      );

      if (!session) throw new Error('Session not found');

      // Broadcast change to all participants
      io.emit('collaboration:change', {
        sessionId,
        change,
        participants: session.participants
      });

      logger.info(`Edit recorded in session ${sessionId}`);
      return { success: true, change };
    } catch (error) {
      logger.error(`Record edit error: ${error.message}`);
      throw error;
    }
  }

  /**
   * End collaborative editing session
   */
  static async endEditingSession(sessionId, userId) {
    try {
      const session = await CollaborationSession.findByIdAndUpdate(
        sessionId,
        {
          $pull: { participants: userId },
          endedAt: session.participants.length === 1 ? new Date() : undefined
        },
        { new: true }
      );

      if (!session) throw new Error('Session not found');

      if (session.participants.length === 0) {
        io.emit('collaboration:session-ended', { sessionId });
      } else {
        io.emit('collaboration:user-left', {
          sessionId,
          userId,
          remainingParticipants: session.participants.length
        });
      }

      return { success: true, session };
    } catch (error) {
      logger.error(`End session error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get session change history (audit trail)
   */
  static async getSessionChangeHistory(sessionId) {
    try {
      const session = await CollaborationSession.findById(sessionId);
      if (!session) throw new Error('Session not found');

      return {
        success: true,
        sessionId,
        changeCount: session.changeLog.length,
        changes: session.changeLog,
        participants: session.participants,
        duration: session.endedAt 
          ? (session.endedAt - session.startedAt) / 1000 
          : (new Date() - session.startedAt) / 1000
      };
    } catch (error) {
      logger.error(`Get change history error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Broadcast order update in real-time
   */
  static async broadcastOrderUpdate(orderId, updateData) {
    try {
      const order = await Order.findByIdAndUpdate(
        orderId,
        updateData,
        { new: true }
      ).populate('buyerId vendorId');

      io.emit('order:updated', {
        orderId,
        update: updateData,
        timestamp: new Date(),
        order
      });

      logger.info(`Order ${orderId} update broadcasted`);
      return { success: true, order };
    } catch (error) {
      logger.error(`Broadcast order update error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Broadcast product update in real-time
   */
  static async broadcastProductUpdate(productId, updateData) {
    try {
      const product = await Product.findByIdAndUpdate(
        productId,
        updateData,
        { new: true }
      );

      io.emit('product:updated', {
        productId,
        update: updateData,
        timestamp: new Date(),
        product
      });

      logger.info(`Product ${productId} update broadcasted`);
      return { success: true, product };
    } catch (error) {
      logger.error(`Broadcast product update error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start typing indicator (real-time UX)
   */
  static async notifyTyping(sessionId, userId, field) {
    try {
      io.emit('collaboration:typing', {
        sessionId,
        userId,
        field,
        timestamp: new Date()
      });

      logger.debug(`Typing indicator: ${userId} in ${field}`);
      return { success: true };
    } catch (error) {
      logger.error(`Typing indicator error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Resolve collaborative conflicts (last-write-wins or custom)
   */
  static async resolveConflict(sessionId, field, resolutionStrategy = 'last-write-wins') {
    try {
      const session = await CollaborationSession.findById(sessionId);
      if (!session) throw new Error('Session not found');

      const fieldChanges = session.changeLog.filter(c => c.field === field);
      
      let resolution;
      if (resolutionStrategy === 'last-write-wins') {
        resolution = fieldChanges[fieldChanges.length - 1];
      } else if (resolutionStrategy === 'first-write-wins') {
        resolution = fieldChanges[0];
      }

      logger.info(`Conflict resolved for field ${field} using ${resolutionStrategy}`);
      return { success: true, resolution, strategy: resolutionStrategy };
    } catch (error) {
      logger.error(`Resolve conflict error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = RealtimeCollaborationService;
