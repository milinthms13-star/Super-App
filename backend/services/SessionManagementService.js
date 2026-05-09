/**
 * SessionManagementService
 * Manages user sessions across devices and provides device management
 */

const UserSession = require('../models/UserSession');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const geoip = require('geoip-lite');

class SessionManagementService {
  static instance;

  static getInstance() {
    if (!SessionManagementService.instance) {
      SessionManagementService.instance = new SessionManagementService();
    }
    return SessionManagementService.instance;
  }

  /**
   * Create new session
   */
  async createSession(userId, deviceInfo, authMethod, ipAddress = null, userAgent = null) {
    try {
      const location = ipAddress ? this.getLocationFromIP(ipAddress) : {};

      const session = await UserSession.createSession(
        userId,
        deviceInfo,
        authMethod,
        ipAddress,
        location
      );

      // Detect suspicious activity
      const suspiciousReason = await this.detectSuspiciousActivity(userId, session);

      if (suspiciousReason) {
        await session.markSuspicious(suspiciousReason);
        session.requiresMFA = true;
        await session.save();
      }

      return {
        sessionId: session.sessionId,
        requiresMFA: session.requiresMFA,
        suspiciousActivity: session.suspiciousActivity,
        suspiciousReason: session.suspiciousReason
      };
    } catch (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }
  }

  /**
   * Get active sessions for user
   */
  async getActiveSessions(userId) {
    try {
      const sessions = await UserSession.getActiveSessions(userId);

      return sessions.map(session => ({
        sessionId: session.sessionId,
        deviceName: session.deviceInfo.deviceName,
        deviceType: session.deviceInfo.deviceType,
        location: `${session.location.city}, ${session.location.country}`,
        loginTime: session.loginTime,
        lastActivityTime: session.lastActivityTime,
        isCurrentDevice: false, // Marked by API caller
        isTrustedDevice: session.isTrustedDevice,
        riskLevel: this.getRiskLevel(session.riskScore)
      }));
    } catch (error) {
      throw new Error(`Failed to get sessions: ${error.message}`);
    }
  }

  /**
   * Logout specific session
   */
  async logoutSession(sessionId, userId) {
    try {
      const session = await UserSession.findOne({ sessionId, userId });

      if (!session) {
        throw new Error('Session not found');
      }

      await session.logout();

      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      throw new Error(`Failed to logout: ${error.message}`);
    }
  }

  /**
   * Logout all sessions for user
   */
  async logoutAllSessions(userId) {
    try {
      const sessions = await UserSession.find({ userId, isActive: true });

      for (const session of sessions) {
        await session.logout();
      }

      return {
        success: true,
        message: `Logged out from ${sessions.length} device(s)`
      };
    } catch (error) {
      throw new Error(`Failed to logout all sessions: ${error.message}`);
    }
  }

  /**
   * Mark device as trusted
   */
  async markDeviceAsTrusted(sessionId, userId) {
    try {
      const session = await UserSession.findOne({ sessionId, userId });

      if (!session) {
        throw new Error('Session not found');
      }

      await session.markAsTrusted();

      return {
        success: true,
        message: 'Device marked as trusted',
        trustToken: session.trustToken
      };
    } catch (error) {
      throw new Error(`Failed to mark device as trusted: ${error.message}`);
    }
  }

  /**
   * Verify suspicious device with MFA
   */
  async verifySuspiciousDevice(sessionId, userId) {
    try {
      const session = await UserSession.findOne({ sessionId, userId });

      if (!session) {
        throw new Error('Session not found');
      }

      if (!session.suspiciousActivity) {
        throw new Error('Device is not flagged as suspicious');
      }

      await session.verifyMFA();

      return {
        success: true,
        message: 'Device verified successfully'
      };
    } catch (error) {
      throw new Error(`Failed to verify device: ${error.message}`);
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(sessionId, userId) {
    try {
      const session = await UserSession.findOne({
        sessionId,
        userId,
        isActive: true
      });

      if (!session) {
        throw new Error('Invalid session');
      }

      // Check if refresh token expired
      if (new Date() > session.refreshTokenExpiry) {
        await session.logout();
        throw new Error('Refresh token expired');
      }

      // Generate new access token
      const user = await User.findById(userId);
      const newAccessToken = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          sessionId
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      const newExpiry = await session.refreshAccessToken();

      return {
        accessToken: newAccessToken,
        expiresIn: 86400,
        refreshTokenExpiresAt: newExpiry
      };
    } catch (error) {
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }

  /**
   * Detect suspicious activity
   */
  async detectSuspiciousActivity(userId, newSession) {
    try {
      // Get previous sessions
      const previousSessions = await UserSession.find({
        userId,
        isActive: true,
        _id: { $ne: newSession._id }
      });

      if (previousSessions.length === 0) {
        return null; // First login, not suspicious
      }

      const lastSession = previousSessions[previousSessions.length - 1];

      // Check for impossible travel
      if (lastSession.location.coordinates && newSession.location.coordinates) {
        const distance = this.calculateDistance(
          lastSession.location.coordinates,
          newSession.location.coordinates
        );

        const timeDiffHours = (newSession.loginTime - lastSession.lastActivityTime) / (1000 * 60 * 60);
        const maxSpeed = 900; // km/h (commercial flight speed)
        const impossibleDistance = maxSpeed * timeDiffHours;

        if (distance > impossibleDistance) {
          return `Login from ${newSession.location.country} (impossible travel)`;
        }
      }

      // Check for new device type
      if (newSession.deviceInfo.deviceType !== lastSession.deviceInfo.deviceType) {
        return `Login from new device type: ${newSession.deviceInfo.deviceType}`;
      }

      // Check for unusual time
      const hour = new Date(newSession.loginTime).getHours();
      if (hour >= 0 && hour <= 4) {
        return 'Login at unusual time';
      }

      return null;
    } catch (error) {
      console.error('Suspicious activity detection error:', error);
      return null;
    }
  }

  /**
   * Get location from IP address
   */
  getLocationFromIP(ipAddress) {
    try {
      const geo = geoip.lookup(ipAddress);
      return {
        city: geo?.city || 'Unknown',
        country: geo?.country || 'Unknown',
        coordinates: geo ? [geo.ll[0], geo.ll[1]] : []
      };
    } catch (error) {
      return { city: 'Unknown', country: 'Unknown', coordinates: [] };
    }
  }

  /**
   * Calculate distance between coordinates
   */
  calculateDistance(coords1, coords2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((coords2[0] - coords1[0]) * Math.PI) / 180;
    const dLon = ((coords2[1] - coords1[1]) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coords1[0] * Math.PI) / 180) *
        Math.cos((coords2[0] * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get risk level from score
   */
  getRiskLevel(score) {
    if (score <= 20) return 'low';
    if (score <= 50) return 'medium';
    if (score <= 75) return 'high';
    return 'critical';
  }

  /**
   * Update activity timestamp
   */
  async updateActivity(sessionId) {
    try {
      const session = await UserSession.findOne({ sessionId });
      if (session) {
        await session.updateActivity();
      }
    } catch (error) {
      console.error('Failed to update activity:', error);
    }
  }
}

module.exports = SessionManagementService.getInstance();
