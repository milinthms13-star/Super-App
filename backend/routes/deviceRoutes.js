/**
 * Device Management API Routes
 * Handles device registration, session management, multi-device operations
 */

const express = require('express');
const router = express.Router();
const { randomUUID } = require('crypto');
const Device = require('../models/Device');
const DeviceSession = require('../models/DeviceSession');
const deviceService = require('../services/deviceService');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// Middleware to authenticate requests
router.use(authenticateToken);

/**
 * Register a new device
 * POST /api/messaging/devices/register
 */
router.post('/register', async (req, res) => {
  try {
    const { deviceName, deviceType, osType, osVersion, appVersion, metadata } =
      req.body;
    const userId = req.user.id;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');

    if (!deviceName || !deviceType || !osType || !osVersion) {
      return res.status(400).json({
        success: false,
        message: 'Missing required device information',
      });
    }

    const { device, isNew, verificationRequired } = await deviceService.registerDevice(
      userId,
      {
        deviceName,
        deviceType,
        osType,
        osVersion,
        appVersion,
        metadata,
      },
      {
        ipAddress,
        userAgent,
        skipVerification: false,
      }
    );

    if (verificationRequired && isNew) {
      await deviceService.sendVerificationOTP(device._id);
    }

    res.status(201).json({
      success: true,
      message: isNew
        ? 'Device registered successfully'
        : 'Device already registered',
      data: {
        device: {
          id: device._id,
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          isVerified: device.isVerified,
          verificationRequired: verificationRequired && isNew,
        },
        isNew,
      },
    });
  } catch (error) {
    logger.error('Error registering device:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering device',
      error: error.message,
    });
  }
});

/**
 * Get all active devices for current user
 * GET /api/messaging/devices
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const devices = await deviceService.getActiveDevices(userId);
    const stats = await deviceService.getDeviceStats(userId);

    res.json({
      success: true,
      data: {
        devices,
        stats,
      },
    });
  } catch (error) {
    logger.error('Error getting devices:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching devices',
      error: error.message,
    });
  }
});

/**
 * Get device by ID
 * GET /api/messaging/devices/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const device = await deviceService.getDeviceById(id, userId);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    res.json({
      success: true,
      data: { device },
    });
  } catch (error) {
    logger.error('Error getting device:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching device',
      error: error.message,
    });
  }
});

/**
 * Create session for device (login)
 * POST /api/messaging/devices/:id/session
 */
router.post('/:id/session', async (req, res) => {
  try {
    const { id: deviceId } = req.params;
    const userId = req.user.id;
    const { socketId } = req.body;

    const { sessionId, sessionToken, refreshToken, accessTokenExpiresIn, device } =
      await deviceService.createSession(userId, deviceId, {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        socketId,
      });

    res.status(201).json({
      success: true,
      message: 'Session created',
      data: {
        sessionId,
        sessionToken,
        refreshToken,
        accessTokenExpiresIn,
        device: {
          id: device._id,
          deviceName: device.deviceName,
          connectionStatus: device.connectionStatus,
        },
      },
    });
  } catch (error) {
    logger.error('Error creating device session:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating session',
      error: error.message,
    });
  }
});

/**
 * Logout single device
 * POST /api/messaging/devices/:id/logout
 */
router.post('/:id/logout', async (req, res) => {
  try {
    const { id: deviceId } = req.params;
    const userId = req.user.id;

    const result = await deviceService.logoutDevice(userId, deviceId);

    res.json({
      success: true,
      message: 'Device logged out successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Error logging out device:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out device',
      error: error.message,
    });
  }
});

/**
 * Logout all devices except current
 * POST /api/messaging/devices/logout-all-except/:id
 */
router.post('/logout-all-except/:id', async (req, res) => {
  try {
    const { id: currentDeviceId } = req.params;
    const userId = req.user.id;

    const result = await deviceService.logoutAllDevicesExcept(userId, currentDeviceId);

    res.json({
      success: true,
      message: 'Other devices logged out',
      data: result,
    });
  } catch (error) {
    logger.error('Error logging out other devices:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out other devices',
      error: error.message,
    });
  }
});

/**
 * Delete/remove device
 * DELETE /api/messaging/devices/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id: deviceId } = req.params;
    const userId = req.user.id;

    const result = await deviceService.removeDevice(userId, deviceId);

    res.json({
      success: true,
      message: 'Device removed successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Error removing device:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing device',
      error: error.message,
    });
  }
});

/**
 * Update push token for device
 * POST /api/messaging/devices/:id/push-token
 */
router.post('/:id/push-token', async (req, res) => {
  try {
    const { id: deviceId } = req.params;
    const { pushToken } = req.body;

    if (!pushToken) {
      return res.status(400).json({
        success: false,
        message: 'Push token is required',
      });
    }

    const device = await deviceService.updatePushToken(deviceId, pushToken);

    res.json({
      success: true,
      message: 'Push token updated',
      data: { device },
    });
  } catch (error) {
    logger.error('Error updating push token:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating push token',
      error: error.message,
    });
  }
});

/**
 * Verify device with OTP
 * POST /api/messaging/devices/:id/verify
 */
router.post('/:id/verify', async (req, res) => {
  try {
    const { id: deviceId } = req.params;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP is required',
      });
    }

    const result = await deviceService.verifyDeviceWithOTP(deviceId, otp);

    res.json({
      success: true,
      message: 'Device verified',
      data: result,
    });
  } catch (error) {
    logger.error('Error verifying device:', error);
    res.status(400).json({
      success: false,
      message: 'Error verifying device',
      error: error.message,
    });
  }
});

/**
 * Send verification OTP to device
 * POST /api/messaging/devices/:id/send-verification-otp
 */
router.post('/:id/send-verification-otp', async (req, res) => {
  try {
    const { id: deviceId } = req.params;

    const result = await deviceService.sendVerificationOTP(deviceId);

    res.json({
      success: true,
      message: 'OTP sent to device',
      data: result,
    });
  } catch (error) {
    logger.error('Error sending OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending OTP',
      error: error.message,
    });
  }
});

/**
 * Get all active sessions
 * GET /api/messaging/devices/sessions/active
 */
router.get('/sessions/active', async (req, res) => {
  try {
    const userId = req.user.id;

    const sessions = await deviceService.getActiveSessions(userId);

    res.json({
      success: true,
      data: { sessions },
    });
  } catch (error) {
    logger.error('Error getting sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sessions',
      error: error.message,
    });
  }
});

/**
 * Sync messages to device
 * POST /api/messaging/devices/:id/sync
 */
router.post('/:id/sync', async (req, res) => {
  try {
    const { id: deviceId } = req.params;
    const userId = req.user.id;
    const { fromMessageId } = req.body;

    const result = await deviceService.syncMessagesToDevice(
      userId,
      deviceId,
      fromMessageId
    );

    res.json({
      success: true,
      message: 'Device synced',
      data: result,
    });
  } catch (error) {
    logger.error('Error syncing device:', error);
    res.status(500).json({
      success: false,
      message: 'Error syncing device',
      error: error.message,
    });
  }
});

/**
 * Update device connection status (used by Socket.IO)
 * POST /api/messaging/devices/:id/connection-status
 * @internal (called by Socket.IO handlers)
 */
router.post('/:id/connection-status', async (req, res) => {
  try {
    const { id: deviceId } = req.params;
    const { status, socketId } = req.body;

    if (!status || !['online', 'offline', 'idle'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid connection status',
      });
    }

    const device = await deviceService.updateConnectionStatus(
      deviceId,
      status,
      socketId
    );

    res.json({
      success: true,
      message: 'Connection status updated',
      data: { device },
    });
  } catch (error) {
    logger.error('Error updating connection status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating connection status',
      error: error.message,
    });
  }
});

/**
 * Get device statistics
 * GET /api/messaging/devices/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await deviceService.getDeviceStats(userId);

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    logger.error('Error getting device stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message,
    });
  }
});

module.exports = router;
