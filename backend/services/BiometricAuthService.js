/**
 * BiometricAuthService
 * Manages biometric authentication (fingerprint, face, iris)
 */

const BiometricDevice = require('../models/BiometricDevice');
const User = require('../models/User');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../middleware/auth');

class BiometricAuthService {
  static instance;

  static getInstance() {
    if (!BiometricAuthService.instance) {
      BiometricAuthService.instance = new BiometricAuthService();
    }
    return BiometricAuthService.instance;
  }

  /**
   * Register device for biometric authentication
   */
  async registerBiometricDevice(userId, deviceInfo) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Check if device already registered
      let device = await BiometricDevice.findOne({
        deviceId: deviceInfo.deviceId,
        userId
      });

      if (device) {
        throw new Error('Device already registered');
      }

      // Create new biometric device
      const normalizedDeviceInfo = {
        ...deviceInfo,
        deviceType: this.normalizeDeviceType(deviceInfo.deviceType),
      };
      device = await BiometricDevice.registerDevice(userId, deviceInfo.deviceId, normalizedDeviceInfo);

      return {
        success: true,
        deviceId: device.deviceId,
        message: 'Device registered successfully'
      };
    } catch (error) {
      throw new Error(`Failed to register device: ${error.message}`);
    }
  }

  /**
   * Enroll biometric on device
   */
  async enrollBiometric(deviceId, userId, biometricType, biometricData) {
    try {
      const device = await BiometricDevice.findOne({
        deviceId,
        userId,
        isActive: true
      });

      if (!device) {
        throw new Error('Device not found or inactive');
      }

      // Hash biometric data (in production, use secure biometric hashing)
      const templateHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(biometricData))
        .digest('hex');

      await device.enrollBiometric(biometricType, templateHash);

      return {
        success: true,
        message: `${biometricType} enrolled successfully`
      };
    } catch (error) {
      throw new Error(`Failed to enroll biometric: ${error.message}`);
    }
  }

  /**
   * Verify biometric for login
   */
  async verifyBiometricLogin(deviceId, biometricType) {
    try {
      const device = await BiometricDevice.findOne({
        deviceId,
        isActive: true
      });

      if (!device) {
        throw new Error('Device not found or inactive');
      }

      // Check if device is blocked
      if (
        device.loginAttempts.blockedUntil &&
        device.loginAttempts.blockedUntil > new Date()
      ) {
        throw new Error(
          `Device blocked. Try again after ${device.loginAttempts.blockedUntil}`
        );
      }

      // Verify biometric
      await device.verifyBiometric(biometricType);

      // Get user and generate tokens
      const user = await User.findById(device.userId);

      const tokens = this.generateTokens(user, 'biometric');

      return {
        success: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name || user.email,
          phone: user.phone || '',
          role: user.role || 'user',
          registrationType: user.registrationType || 'user',
          mpinEnabled: Boolean(user.mpinEnabled),
        },
        ...tokens,
        deviceTrusted: device.isTrustedDevice
      };
    } catch (error) {
      // Record failed attempt
      const device = await BiometricDevice.findOne({ deviceId });

      if (device) {
        await device.recordFailedBiometric(biometricType);
      }

      throw new Error(`Biometric verification failed: ${error.message}`);
    }
  }

  /**
   * Get challenge for biometric verification
   */
  async generateBiometricChallenge(userId, deviceId) {
    try {
      const device = await BiometricDevice.findOne({
        userId,
        deviceId,
        isActive: true
      });

      if (!device) {
        throw new Error('Device not found');
      }

      // Generate random challenge
      const challenge = crypto.randomBytes(32).toString('hex');

      // Store challenge temporarily (in production, use Redis with TTL)
      device.currentChallenge = challenge;
      device.challengeExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      await device.save();

      return {
        challenge,
        expiresIn: 300, // 5 minutes
        message: 'Biometric challenge generated'
      };
    } catch (error) {
      throw new Error(`Failed to generate challenge: ${error.message}`);
    }
  }

  /**
   * List user's registered biometric devices
   */
  async getUserBiometricDevices(userId) {
    try {
      const devices = await BiometricDevice.getUserDevices(userId);

      return devices.map(device => ({
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        biometricMethods: device.biometricMethods.map(method => ({
          type: method.type,
          isEnabled: method.isEnabled,
          enrolledAt: method.enrolledAt,
          lastVerifiedAt: method.lastVerifiedAt,
          isLocked: method.isLocked
        })),
        isActive: device.isActive,
        isTrustedDevice: device.isTrustedDevice,
        registeredAt: device.registeredAt
      }));
    } catch (error) {
      throw new Error(`Failed to get devices: ${error.message}`);
    }
  }

  /**
   * Remove biometric method from device
   */
  async removeBiometricMethod(userId, deviceId, biometricType) {
    try {
      const device = await BiometricDevice.findOne({ userId, deviceId });

      if (!device) {
        throw new Error('Device not found');
      }

      await device.removeBiometric(biometricType);

      return {
        success: true,
        message: `${biometricType} removed from device`
      };
    } catch (error) {
      throw new Error(`Failed to remove biometric: ${error.message}`);
    }
  }

  /**
   * Deactivate biometric device
   */
  async deactivateDevice(userId, deviceId) {
    try {
      const device = await BiometricDevice.findOne({ userId, deviceId });

      if (!device) {
        throw new Error('Device not found');
      }

      await device.deactivate();

      return {
        success: true,
        message: 'Device deactivated'
      };
    } catch (error) {
      throw new Error(`Failed to deactivate device: ${error.message}`);
    }
  }

  /**
   * Mark device as trusted
   */
  async markDeviceAsTrusted(userId, deviceId) {
    try {
      const device = await BiometricDevice.findOne({ userId, deviceId });

      if (!device) {
        throw new Error('Device not found');
      }

      await device.markAsTrusted();

      return {
        success: true,
        message: 'Device marked as trusted'
      };
    } catch (error) {
      throw new Error(`Failed to mark device as trusted: ${error.message}`);
    }
  }

  /**
   * Generate JWT tokens
   */
  generateTokens(user, authMethod = 'biometric') {
    const accessToken = jwt.sign(
      {
        sub: user._id.toString(),
        email: user.email,
        authMethod
      },
      getJwtSecret(),
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        issuer: 'malabarbazaar-api',
        audience: 'malabarbazaar-web',
      }
    );

    const refreshToken = jwt.sign(
      {
        sub: user._id.toString(),
        authMethod
      },
      getJwtSecret(),
      {
        expiresIn: '30d',
        issuer: 'malabarbazaar-api',
        audience: 'malabarbazaar-web',
      }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 86400
    };
  }

  normalizeDeviceType(deviceType = '') {
    const normalized = String(deviceType || '').trim().toLowerCase();
    if (normalized === 'ios' || normalized === 'iphone' || normalized === 'ipad') {
      return 'ios';
    }
    if (normalized === 'android') {
      return 'android';
    }
    if (normalized === 'desktop') {
      return 'desktop';
    }
    return 'web';
  }

  /**
   * Check device security status
   */
  async checkDeviceSecurity(deviceId) {
    try {
      const device = await BiometricDevice.findOne({ deviceId });

      if (!device) {
        throw new Error('Device not found');
      }

      const securityScore = this.calculateSecurityScore(device);

      return {
        deviceId,
        securityScore,
        risks: this.identifySecurityRisks(device),
        recommendations: this.getSecurityRecommendations(device)
      };
    } catch (error) {
      throw new Error(`Failed to check device security: ${error.message}`);
    }
  }

  /**
   * Calculate security score
   */
  calculateSecurityScore(device) {
    let score = 100;

    if (device.security.isRooted) score -= 30;
    if (device.security.malwareDetected) score -= 40;
    if (device.security.bootLoaderUnlocked) score -= 20;
    if (device.loginAttempts.failedAttempts > 5) score -= 15;
    if (!device.isTrustedDevice) score -= 10;

    return Math.max(0, score);
  }

  /**
   * Identify security risks
   */
  identifySecurityRisks(device) {
    const risks = [];

    if (device.security.isRooted) risks.push('Device is rooted/jailbroken');
    if (device.security.malwareDetected) risks.push('Malware detected');
    if (device.security.bootLoaderUnlocked) risks.push('Boot loader is unlocked');
    if (device.loginAttempts.blockedUntil > new Date()) {
      risks.push('Device temporarily blocked due to failed attempts');
    }

    return risks;
  }

  /**
   * Get security recommendations
   */
  getSecurityRecommendations(device) {
    const recommendations = [];

    if (device.security.isRooted) {
      recommendations.push('Consider using a non-rooted device for better security');
    }
    if (!device.isTrustedDevice) {
      recommendations.push('Mark this device as trusted if you recognize it');
    }
    if (device.biometricMethods.length === 0) {
      recommendations.push('Enroll biometric authentication for faster and safer login');
    }

    return recommendations;
  }
}

module.exports = BiometricAuthService.getInstance();
