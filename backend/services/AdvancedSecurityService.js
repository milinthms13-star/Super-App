/**
 * AdvancedSecurityService.js
 * 2FA, API rate limiting, DDOS protection, compliance audits
 */

const logger = require('../config/logger');

class AdvancedSecurityService {
  /**
   * Enable 2FA for user
   */
  static async enable2FA(userId) {
    try {
      const User = require('../models/User');
      const speakeasy = require('speakeasy');

      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const secret = speakeasy.generateSecret({
        name: `MalaBarbazaar (${user.email})`,
        length: 32,
      });

      user.twoFactorEnabled = true;
      user.twoFactorSecret = secret.base32;
      user.twoFactorBackupCodes = this._generateBackupCodes(10);
      await user.save();

      logger.info(`2FA enabled for user ${userId}`);

      return {
        success: true,
        data: {
          secret: secret.base32,
          qrCode: secret.otpauth_url,
          backupCodes: user.twoFactorBackupCodes,
        },
        message: '2FA setup initiated',
      };
    } catch (error) {
      logger.error('Error enabling 2FA:', error);
      throw error;
    }
  }

  /**
   * Verify 2FA token
   */
  static async verify2FAToken(userId, token) {
    try {
      const User = require('../models/User');
      const speakeasy = require('speakeasy');

      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      if (!user.twoFactorEnabled) {
        throw new Error('2FA not enabled');
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token,
        window: 2,
      });

      if (!verified) {
        throw new Error('Invalid 2FA token');
      }

      logger.info(`2FA token verified for user ${userId}`);

      return {
        success: true,
        message: 'Token verified',
      };
    } catch (error) {
      logger.error('Error verifying 2FA token:', error);
      throw error;
    }
  }

  /**
   * Check API rate limit
   */
  static async checkRateLimit(userId, limit = 1000, window = 3600) {
    try {
      const redis = require('redis');
      const client = redis.createClient(process.env.REDIS_URL || {
        host: 'localhost',
        port: 6379,
      });

      const key = `rate_limit:${userId}`;
      const current = await client.incr(key);

      if (current === 1) {
        await client.expire(key, window);
      }

      const remaining = Math.max(0, limit - current);

      if (current > limit) {
        logger.warn(`Rate limit exceeded for user ${userId}`);
        throw new Error('Rate limit exceeded');
      }

      return {
        limit,
        current,
        remaining,
        resetIn: window,
      };
    } catch (error) {
      logger.error('Error checking rate limit:', error);
      throw error;
    }
  }

  /**
   * Log security event
   */
  static async logSecurityEvent(userId, eventType, details = {}) {
    try {
      const SecurityEvent = require('../models/SecurityEvent');

      const event = new SecurityEvent({
        userId,
        eventType, // 'login', 'logout', 'failed_login', 'password_change', 'suspicious_activity'
        details,
        ipAddress: details.ipAddress || 'unknown',
        userAgent: details.userAgent || 'unknown',
        timestamp: new Date(),
      });

      await event.save();

      logger.info(`Security event logged: ${eventType} for user ${userId}`);

      return {
        success: true,
        message: 'Event logged',
      };
    } catch (error) {
      logger.error('Error logging security event:', error);
      throw error;
    }
  }

  /**
   * Detect suspicious activity
   */
  static async detectSuspiciousActivity(userId) {
    try {
      const SecurityEvent = require('../models/SecurityEvent');

      // Check for multiple failed logins in short period
      const failedLogins = await SecurityEvent.countDocuments({
        userId,
        eventType: 'failed_login',
        timestamp: { $gte: new Date(Date.now() - 15 * 60 * 1000) }, // Last 15 min
      });

      if (failedLogins > 5) {
        await this.logSecurityEvent(userId, 'suspicious_activity', {
          reason: 'Multiple failed login attempts',
        });

        return {
          suspicious: true,
          reason: 'Multiple failed login attempts',
          threat_level: 'high',
        };
      }

      return {
        suspicious: false,
      };
    } catch (error) {
      logger.error('Error detecting suspicious activity:', error);
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  static async generateComplianceReport(period = '30') {
    try {
      const SecurityEvent = require('../models/SecurityEvent');

      const daysBack = parseInt(period);
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysBack);

      const events = await SecurityEvent.find({
        timestamp: { $gte: dateThreshold },
      });

      const report = {
        period: `${daysBack} days`,
        totalEvents: events.length,
        byType: {},
        threatLevel: this._assessThreatLevel(events),
        recommendations: this._getRecommendations(events),
      };

      // Group by event type
      events.forEach(e => {
        report.byType[e.eventType] = (report.byType[e.eventType] || 0) + 1;
      });

      logger.info(`Compliance report generated for ${daysBack} days`);

      return report;
    } catch (error) {
      logger.error('Error generating compliance report:', error);
      throw error;
    }
  }

  /**
   * Generate backup codes for 2FA
   */
  static _generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
  }

  /**
   * Assess threat level
   */
  static _assessThreatLevel(events) {
    const suspiciousCount = events.filter(
      e => e.eventType === 'suspicious_activity'
    ).length;
    const failedLogins = events.filter(
      e => e.eventType === 'failed_login'
    ).length;

    if (suspiciousCount > 5 || failedLogins > 20) {
      return 'critical';
    }
    if (suspiciousCount > 2 || failedLogins > 10) {
      return 'high';
    }
    if (suspiciousCount > 0 || failedLogins > 5) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Get recommendations
   */
  static _getRecommendations(events) {
    const recs = [];

    const failedLogins = events.filter(
      e => e.eventType === 'failed_login'
    ).length;
    if (failedLogins > 5) {
      recs.push('Enforce account lockout after repeated failed attempts');
    }

    const suspiciousCount = events.filter(
      e => e.eventType === 'suspicious_activity'
    ).length;
    if (suspiciousCount > 0) {
      recs.push('Review user locations and IPs for anomalies');
      recs.push('Consider mandatory password reset');
    }

    if (recs.length === 0) {
      recs.push('Security posture is healthy. Continue monitoring.');
    }

    return recs;
  }
}

module.exports = AdvancedSecurityService;
