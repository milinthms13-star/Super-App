/**
 * Biometric Authentication Routes
 * POST /auth/biometric/register - Register device for biometric
 * POST /auth/biometric/enroll - Enroll biometric
 * POST /auth/biometric/verify - Verify biometric and login
 * GET /auth/biometric/devices - List user's biometric devices
 * DELETE /auth/biometric/remove/:biometricType - Remove biometric
 * POST /auth/biometric/trust - Mark device as trusted
 * DELETE /auth/biometric/deactivate - Deactivate device
 */

const express = require('express');
const router = express.Router();
const BiometricAuthService = require('../services/BiometricAuthService');
const { authenticate } = require('../middleware/auth');

/**
 * POST /auth/biometric/register
 * Register device for biometric authentication
 */
router.post('/register', authenticate, async (req, res) => {
  try {
    const { deviceInfo } = req.body;
    const userId = req.user._id;

    if (!deviceInfo || !deviceInfo.deviceId) {
      return res.status(400).json({
        success: false,
        error: 'deviceInfo with deviceId required'
      });
    }

    const result = await BiometricAuthService.registerBiometricDevice(
      userId,
      deviceInfo
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /auth/biometric/enroll
 * Enroll biometric on device
 */
router.post('/enroll', authenticate, async (req, res) => {
  try {
    const { deviceId, biometricType, biometricData } = req.body;
    const userId = req.user._id;

    if (!deviceId || !biometricType || !biometricData) {
      return res.status(400).json({
        success: false,
        error: 'deviceId, biometricType, and biometricData required'
      });
    }

    const result = await BiometricAuthService.enrollBiometric(
      deviceId,
      userId,
      biometricType,
      biometricData
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /auth/biometric/verify
 * Verify biometric and login
 */
router.post('/verify', async (req, res) => {
  try {
    const { deviceId, biometricType } = req.body;

    if (!deviceId || !biometricType) {
      return res.status(400).json({
        success: false,
        error: 'deviceId and biometricType required'
      });
    }

    const result = await BiometricAuthService.verifyBiometricLogin(
      deviceId,
      biometricType
    );

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      data: {
        ...result,
        refreshToken: undefined
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /auth/biometric/devices
 * Get user's registered biometric devices
 */
router.get('/devices', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    const devices = await BiometricAuthService.getUserBiometricDevices(userId);

    res.status(200).json({
      success: true,
      data: devices
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /auth/biometric/remove/:biometricType
 * Remove biometric method from device
 */
router.delete('/remove/:biometricType', authenticate, async (req, res) => {
  try {
    const { biometricType } = req.params;
    const { deviceId } = req.body;
    const userId = req.user._id;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'deviceId required'
      });
    }

    const result = await BiometricAuthService.removeBiometricMethod(
      userId,
      deviceId,
      biometricType
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /auth/biometric/trust
 * Mark device as trusted
 */
router.post('/trust', authenticate, async (req, res) => {
  try {
    const { deviceId } = req.body;
    const userId = req.user._id;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'deviceId required'
      });
    }

    const result = await BiometricAuthService.markDeviceAsTrusted(
      userId,
      deviceId
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /auth/biometric/deactivate
 * Deactivate biometric device
 */
router.delete('/deactivate', authenticate, async (req, res) => {
  try {
    const { deviceId } = req.body;
    const userId = req.user._id;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'deviceId required'
      });
    }

    const result = await BiometricAuthService.deactivateDevice(userId, deviceId);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
