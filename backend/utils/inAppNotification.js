/**
 * inAppNotification
 * Emits a real-time in-app notification to a user via Socket.IO.
 * Falls back to a no-op if socket.io is not initialised (e.g. in tests).
 *
 * Usage:
 *   const { emitInAppNotification } = require('../utils/inAppNotification');
 *   await emitInAppNotification(userId, { type, title, body, reminderId, priority });
 */

const logger = require('./logger');

/**
 * @param {string} userId   Target user's MongoDB ID (string)
 * @param {Object} payload
 * @param {string} payload.type       e.g. 'reminder'
 * @param {string} payload.title
 * @param {string} payload.body
 * @param {string} [payload.reminderId]
 * @param {string} [payload.priority]  'Low' | 'Medium' | 'High'
 */
const emitInAppNotification = async (userId, payload) => {
  try {
    // The Socket.IO instance is attached to the global app by server.js.
    // We read it lazily to avoid circular dependency issues.
    const io = global._socketio;
    if (!io) {
      logger.debug(`inAppNotification: socket.io not available, skipping for user ${userId}`);
      return { success: false, status: 'no-socket' };
    }

    // Emit to the user's private room (each user joins a room named after their ID).
    io.to(`user:${userId}`).emit('reminder:notification', {
      ...payload,
      userId,
      timestamp: new Date().toISOString(),
    });

    logger.info(`inAppNotification: emitted reminder:notification to user ${userId}`);
    return { success: true, status: 'emitted' };
  } catch (error) {
    logger.error(`inAppNotification error for user ${userId}:`, error.message);
    return { success: false, status: 'error', error: error.message };
  }
};

module.exports = { emitInAppNotification };
