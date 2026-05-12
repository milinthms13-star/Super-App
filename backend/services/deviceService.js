/**
 * Device Service
 * Handles device registration, session management, multi-device sync,
 * and device-level operations
 */

const Device = require('../models/Device');
const DeviceSession = require('../models/DeviceSession');
const crypto = require('crypto');
const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

class DeviceService {
  /**
   * Register a new device
   */
  async registerDevice(userId, deviceInfo, options = {}) {
    try {
      const deviceId = randomUUID();
      const deviceFingerprint = this.generateDeviceFingerprint(deviceInfo);

      // Check if similar device already exists (fingerprint matching)
      const existingDevice = await Device.findOne({
        userId,
        deviceFingerprint,
        isActive: true,
      });

      if (existingDevice) {
        logger.info(`Device already registered for user: ${userId}`);
        return {
          device: existingDevice,
          isNew: false,
        };
      }

      // Create new device
      const device = await Device.create({
        userId,
        deviceId,
        deviceName: deviceInfo.deviceName || 'Unknown Device',
        deviceType: deviceInfo.deviceType || 'mobile',
        osType: deviceInfo.osType || 'Android',
        osVersion: deviceInfo.osVersion || 'Unknown',
        browserType: deviceInfo.browserType,
        browserVersion: deviceInfo.browserVersion,
        appVersion: deviceInfo.appVersion || '1.0.0',
        deviceFingerprint,
        ipAddress: options.ipAddress || 'unknown',
        pushToken: options.pushToken,
        metadata: deviceInfo.metadata || {},
        loginHistory: [
          {
            loginAt: new Date(),
            ipAddress: options.ipAddress || 'unknown',
            status: 'success',
          },
        ],
      });

      logger.info(`Device registered: ${device._id} for user ${userId}`);

      return {
        device,
        isNew: true,
        verificationRequired: !options.skipVerification,
      };
    } catch (error) {
      logger.error('Error registering device:', error);
      throw error;
    }
  }

  /**
   * Generate device fingerprint
   */
  generateDeviceFingerprint(deviceInfo) {
    const fingerprint = `${deviceInfo.osType}|${deviceInfo.osVersion}|${deviceInfo.deviceType}|${deviceInfo.appVersion}`;
    return crypto
      .createHash('sha256')
      .update(fingerprint)
      .digest('hex');
  }

  /**
   * Verify device with OTP
   */
  async verifyDeviceWithOTP(deviceId, otp) {
    try {
      const device = await Device.findById(deviceId);
      if (!device) {
        throw new Error('Device not found');
      }

      // In production, verify OTP with auth service
      // This is a placeholder implementation
      if (!device.verificationToken) {
        throw new Error('No verification token sent for this device');
      }

      if (
        device.verificationTokenExpiresAt &&
        new Date() > device.verificationTokenExpiresAt
      ) {
        throw new Error('Verification token expired');
      }

      // Verify OTP (in real implementation, validate against sent OTP)
      device.isVerified = true;
      device.isTrusted = true;
      device.verificationToken = null;
      device.verificationTokenExpiresAt = null;
      device.trustTokenSentAt = new Date();

      await device.save();

      logger.info(`Device verified: ${deviceId}`);

      return {
        success: true,
        message: 'Device verified successfully',
      };
    } catch (error) {
      logger.error('Error verifying device:', error);
      throw error;
    }
  }

  /**
   * Create session for device
   */
  async createSession(userId, deviceId, options = {}) {
    try {
      const device = await Device.findById(deviceId);
      if (!device || device.userId.toString() !== userId.toString()) {
        throw new Error('Invalid device for user');
      }

      // Create device session
      const { session, sessionToken, refreshToken, accessTokenExpiresIn } =
        await DeviceSession.createSession(userId, deviceId, {
          ipAddress: options.ipAddress,
          userAgent: options.userAgent,
          loginMethod: options.loginMethod,
          geoLocation: options.geoLocation,
          metadata: options.metadata,
        });

      // Update device with session info
      device.socketId = options.socketId;
      device.connectionStatus = 'online';
      device.lastActivityAt = new Date();
      device.lastSyncAt = new Date();

      await device.save();

      logger.info(`Session created for device: ${deviceId}`);

      return {
        sessionId: session._id,
        sessionToken,
        refreshToken,
        accessTokenExpiresIn,
        device,
      };
    } catch (error) {
      logger.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Get all active devices for user
   */
  async getActiveDevices(userId) {
    try {
      const devices = await Device.find({
        userId,
        isActive: true,
        logoutAt: null,
      })
        .select(
          'deviceId deviceName deviceType osType connectionStatus lastActivityAt isVerified isTrusted'
        )
        .sort({ lastActivityAt: -1 });

      return devices;
    } catch (error) {
      logger.error('Error getting active devices:', error);
      throw error;
    }
  }

  /**
   * Get all sessions for user
   */
  async getActiveSessions(userId) {
    try {
      const sessions = await DeviceSession.find({
        userId,
        status: 'active',
        isBlacklisted: false,
      })
        .populate('deviceId', 'deviceName deviceType osType')
        .sort({ lastActivityAt: -1 });

      return sessions;
    } catch (error) {
      logger.error('Error getting active sessions:', error);
      throw error;
    }
  }

  /**
   * Logout device
   */
  async logoutDevice(userId, deviceId) {
    try {
      // Logout all sessions for this device
      await DeviceSession.updateMany(
        {
          userId,
          deviceId,
          status: 'active',
        },
        {
          status: 'revoked',
          revokedAt: new Date(),
          revokedReason: 'user_logout',
          isBlacklisted: true,
        }
      );

      // Update device
      await Device.findByIdAndUpdate(deviceId, {
        isActive: false,
        connectionStatus: 'offline',
        socketId: null,
        logoutAt: new Date(),
      });

      logger.info(`Device logged out: ${deviceId} for user ${userId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error logging out device:', error);
      throw error;
    }
  }

  /**
   * Logout all devices except current
   */
  async logoutAllDevicesExcept(userId, currentDeviceId) {
    try {
      // Get all active devices
      const devices = await Device.find({
        userId,
        isActive: true,
        _id: { $ne: currentDeviceId },
      });

      // Revoke sessions for all other devices
      await DeviceSession.updateMany(
        {
          userId,
          deviceId: { $ne: currentDeviceId },
          status: 'active',
        },
        {
          status: 'revoked',
          revokedAt: new Date(),
          revokedReason: 'user_logout',
          isBlacklisted: true,
        }
      );

      // Update devices
      await Device.updateMany(
        { userId, _id: { $ne: currentDeviceId }, isActive: true },
        {
          isActive: false,
          connectionStatus: 'offline',
          socketId: null,
          logoutAt: new Date(),
        }
      );

      logger.info(
        `All devices logged out for user ${userId} except ${currentDeviceId}`
      );

      return {
        success: true,
        loggedOutCount: devices.length,
      };
    } catch (error) {
      logger.error('Error logging out all devices:', error);
      throw error;
    }
  }

  /**
   * Update device push token
   */
  async updatePushToken(deviceId, pushToken) {
    try {
      const device = await Device.findByIdAndUpdate(
        deviceId,
        { pushToken },
        { new: true }
      );

      logger.info(`Push token updated for device: ${deviceId}`);

      return device;
    } catch (error) {
      logger.error('Error updating push token:', error);
      throw error;
    }
  }

  /**
   * Update device connection status
   */
  async updateConnectionStatus(deviceId, status, socketId = null) {
    try {
      const update = {
        connectionStatus: status,
        lastActivityAt: new Date(),
      };

      if (socketId) {
        update.socketId = socketId;
      }

      const device = await Device.findByIdAndUpdate(deviceId, update, {
        new: true,
      });

      logger.info(`Connection status updated for device ${deviceId}: ${status}`);

      return device;
    } catch (error) {
      logger.error('Error updating connection status:', error);
      throw error;
    }
  }

  /**
   * Mark device as idle
   */
  async markDeviceIdle(deviceId) {
    try {
      const device = await Device.findByIdAndUpdate(
        deviceId,
        { connectionStatus: 'idle' },
        { new: true }
      );

      return device;
    } catch (error) {
      logger.error('Error marking device idle:', error);
      throw error;
    }
  }

  /**
   * Sync messages to device
   */
  async syncMessagesToDevice(userId, deviceId, fromMessageId = null) {
    try {
      const device = await Device.findById(deviceId);
      if (!device || device.userId.toString() !== userId.toString()) {
        throw new Error('Invalid device');
      }

      // Get device's last synced message
      const lastSyncedId = device.maxMessageSyncId || fromMessageId;

      // In production, this would fetch messages and sync them
      // For now, update sync timestamp
      device.lastSyncAt = new Date();
      device.syncState = 'synced';
      await device.save();

      logger.info(`Device synced: ${deviceId}, lastSyncedId: ${lastSyncedId}`);

      return {
        success: true,
        lastSyncedId,
        syncedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error syncing messages to device:', error);
      throw error;
    }
  }

  /**
   * Remove device
   */
  async removeDevice(userId, deviceId) {
    try {
      const device = await Device.findById(deviceId);
      if (!device || device.userId.toString() !== userId.toString()) {
        throw new Error('Device not found');
      }

      // Logout device first
      await this.logoutDevice(userId, deviceId);

      // Delete device
      await Device.findByIdAndDelete(deviceId);

      logger.info(`Device removed: ${deviceId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error removing device:', error);
      throw error;
    }
  }

  /**
   * Get device by ID
   */
  async getDeviceById(deviceId, userId = null) {
    try {
      const query = { _id: deviceId };
      if (userId) {
        query.userId = userId;
      }

      const device = await Device.findOne(query);
      return device;
    } catch (error) {
      logger.error('Error getting device by ID:', error);
      throw error;
    }
  }

  /**
   * Send verification OTP to device
   */
  async sendVerificationOTP(deviceId) {
    try {
      const device = await Device.findById(deviceId);
      if (!device) {
        throw new Error('Device not found');
      }

      const verificationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      device.verificationToken = verificationToken;
      device.verificationTokenExpiresAt = expiresAt;

      await device.save();

      logger.info(`Verification OTP sent to device: ${deviceId}`);

      return {
        success: true,
        expiresIn: 15 * 60, // seconds
      };
    } catch (error) {
      logger.error('Error sending verification OTP:', error);
      throw error;
    }
  }

  /**
   * Get device usage statistics
   */
  async getDeviceStats(userId) {
    try {
      const devices = await Device.find({ userId });
      const sessions = await DeviceSession.find({ userId, status: 'active' });

      const stats = {
        totalDevices: devices.length,
        activeDevices: devices.filter((d) => d.isActive).length,
        activeSessions: sessions.length,
        deviceTypes: this.groupByProperty(devices, 'deviceType'),
        osTypes: this.groupByProperty(devices, 'osType'),
        connectionStatus: this.groupByProperty(devices, 'connectionStatus'),
        recentlyActive: devices.filter((d) => d.isRecentlyActive).length,
      };

      return stats;
    } catch (error) {
      logger.error('Error getting device stats:', error);
      throw error;
    }
  }

  /**
   * Helper: group array by property
   */
  groupByProperty(array, property) {
    return array.reduce((acc, item) => {
      const key = item[property];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Mark suspicious activity on device
   */
  async markSuspiciousActivity(deviceId, reason) {
    try {
      const device = await Device.findById(deviceId);
      if (!device) return;

      // Get active session for this device
      const session = await DeviceSession.findOne({
        deviceId,
        status: 'active',
      });

      if (session) {
        session.suspiciousActivityCount += 1;

        // Suspend session if too many suspicious activities
        if (session.suspiciousActivityCount >= 3) {
          session.status = 'suspended';
          session.blockedUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        }

        await session.save();
      }

      logger.warn(`Suspicious activity on device ${deviceId}: ${reason}`);

      return { success: true };
    } catch (error) {
      logger.error('Error marking suspicious activity:', error);
      throw error;
    }
  }

  /**
   * Clean up offline devices (inactive for 30+ days)
   */
  async cleanupOfflineDevices(inactiveDays = 30) {
    try {
      const cutoffDate = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000);

      const result = await Device.deleteMany({
        isActive: false,
        lastActivityAt: { $lte: cutoffDate },
      });

      logger.info(`Cleaned up ${result.deletedCount} offline devices`);

      return result.deletedCount;
    } catch (error) {
      logger.error('Error cleaning up offline devices:', error);
      throw error;
    }
  }
}

module.exports = new DeviceService();
