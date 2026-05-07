const OtpSession = require('../models/OtpSession');
const Device = require('../models/Device');
const User = require('../models/User');
const crypto = require('crypto');

/**
 * OTP Service
 * Handles OTP generation, sending, verification, and device trust management
 * 
 * Responsibilities:
 * - Generate OTP codes
 * - Send OTP via SMS/Email
 * - Verify OTP codes
 * - Manage device trust (30-day auto-trust after verification)
 * - Track failed attempts
 * - Clean up expired OTPs
 */

class OtpService {
  /**
   * Generate OTP and prepare for sending
   * @param {String} userId - User ID
   * @param {String} deviceId - Device ID
   * @param {Object} options - { otpType, medium, phoneNumber, email }
   * @returns {Promise<{session: Object, code: String, message: String}>}
   */
  async generateOtp(userId, deviceId, options = {}) {
    try {
      const {
        otpType = 'device_verification',
        medium = 'sms',
        phoneNumber = '',
        email = ''
      } = options;

      // Get user and device
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      const device = await Device.findById(deviceId);
      if (!device) {
        throw new Error('DEVICE_NOT_FOUND');
      }

      // Check if already have active unverified OTP
      const activeOtp = await OtpSession.getActiveOtp(userId, deviceId);
      if (activeOtp) {
        throw new Error('OTP_ALREADY_SENT', {
          expiresIn: activeOtp.getTimeUntilExpiration()
        });
      }

      // Prepare metadata
      const metadata = {
        phoneNumber: phoneNumber || user.phoneNumber,
        email: email || user.email,
        ip: options.ip || '',
        userAgent: options.userAgent || '',
        deviceFingerprint: device.deviceFingerprint,
        country: options.country || '',
        timezone: options.timezone || ''
      };

      // Create OTP session
      const otpSession = await OtpSession.generateOtp(userId, deviceId, {
        otpType,
        medium,
        metadata
      });

      console.log(`[OTP] Generated for user=${userId}, device=${deviceId}, type=${otpType}`);

      return {
        session: otpSession,
        code: otpSession.otpCode,
        message: `OTP generated successfully. Valid for 15 minutes.`
      };
    } catch (error) {
      console.error('[OtpService.generateOtp] Error:', error.message);
      throw error;
    }
  }

  /**
   * Send OTP via specified medium (SMS, Email, In-App)
   * In production, integrate with Twilio (SMS) or SendGrid (Email)
   * @param {String} otpSessionId - OTP Session ID
   * @param {Object} options - { notificationService }
   * @returns {Promise<{success: boolean, message: string, deliveryMethod: string}>}
   */
  async sendOtp(otpSessionId, options = {}) {
    try {
      const otpSession = await OtpSession.findById(otpSessionId).select('+otpCode');
      if (!otpSession) {
        throw new Error('OTP_SESSION_NOT_FOUND');
      }

      if (otpSession.isExpired()) {
        throw new Error('OTP_EXPIRED');
      }

      const { notificationService } = options;

      // Route by medium
      let result;
      switch (otpSession.medium) {
        case 'sms':
          result = await this.sendViaSms(otpSession, notificationService);
          break;
        case 'email':
          result = await this.sendViaEmail(otpSession, notificationService);
          break;
        case 'in-app':
          result = {
            success: true,
            message: 'OTP available in app',
            deliveryMethod: 'in-app'
          };
          break;
        default:
          throw new Error('INVALID_MEDIUM');
      }

      console.log(`[OTP] Sent via ${otpSession.medium} to user=${otpSession.userId}`);
      return result;
    } catch (error) {
      console.error('[OtpService.sendOtp] Error:', error.message);
      throw error;
    }
  }

  /**
   * Send OTP via SMS (Twilio integration in production)
   * @private
   */
  async sendViaSms(otpSession, notificationService) {
    try {
      // In production, use Twilio:
      // const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
      // await twilio.messages.create({
      //   body: `Your verification code is: ${otpSession.otpCode}`,
      //   from: process.env.TWILIO_PHONE,
      //   to: otpSession.metadata.phoneNumber
      // });

      // For now, mock the SMS sending
      console.log(`[SMS] OTP ${otpSession.otpCode} sent to ${otpSession.metadata.phoneNumber}`);

      return {
        success: true,
        message: `OTP sent to ${this.maskPhoneNumber(otpSession.metadata.phoneNumber)}`,
        deliveryMethod: 'sms'
      };
    } catch (error) {
      console.error('[OtpService.sendViaSms] Error:', error.message);
      throw error;
    }
  }

  /**
   * Send OTP via Email (SendGrid integration in production)
   * @private
   */
  async sendViaEmail(otpSession, notificationService) {
    try {
      // In production, use SendGrid:
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      // await sgMail.send({
      //   to: otpSession.metadata.email,
      //   from: process.env.SENDER_EMAIL,
      //   subject: 'Your Malabarbazaar Verification Code',
      //   html: `<p>Your verification code is: <strong>${otpSession.otpCode}</strong></p>`
      // });

      // For now, mock the email sending
      console.log(`[EMAIL] OTP ${otpSession.otpCode} sent to ${otpSession.metadata.email}`);

      return {
        success: true,
        message: `OTP sent to ${this.maskEmail(otpSession.metadata.email)}`,
        deliveryMethod: 'email'
      };
    } catch (error) {
      console.error('[OtpService.sendViaEmail] Error:', error.message);
      throw error;
    }
  }

  /**
   * Verify OTP code
   * @param {String} userId - User ID
   * @param {String} deviceId - Device ID
   * @param {String} code - OTP code to verify
   * @returns {Promise<{success: boolean, device: Object, message: string}>}
   */
  async verifyOtp(userId, deviceId, code) {
    try {
      const result = await OtpSession.verifyOtp(userId, deviceId, code);

      if (!result.success) {
        if (result.error === 'OTP_ATTEMPTS_EXCEEDED') {
          // Lock device temporarily
          await Device.updateOne(
            { _id: deviceId },
            { 
              isVerified: false,
              verificationStatus: 'locked',
              lockedUntil: new Date(Date.now() + 15 * 60 * 1000) // 15 min lockout
            }
          );
        }

        throw new Error(result.error);
      }

      // Mark device as verified and set trust
      const device = await Device.findByIdAndUpdate(
        deviceId,
        {
          isVerified: true,
          isTrusted: true,
          verificationStatus: 'verified',
          verifiedAt: new Date(),
          trustedUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        },
        { new: true }
      );

      console.log(`[OTP] Verified for device=${deviceId}, user=${userId}`);

      return {
        success: true,
        device,
        message: 'Device verified successfully. This device is trusted for 30 days.'
      };
    } catch (error) {
      console.error('[OtpService.verifyOtp] Error:', error.message);
      throw error;
    }
  }

  /**
   * Resend OTP (invalidate old, create new)
   * @param {String} userId - User ID
   * @param {String} deviceId - Device ID
   * @returns {Promise<{session: Object, message: string}>}
   */
  async resendOtp(userId, deviceId) {
    try {
      const otpSession = await OtpSession.resendOtp(userId, deviceId);

      console.log(`[OTP] Resent for user=${userId}, device=${deviceId}`);

      return {
        session: otpSession,
        message: 'New OTP sent successfully'
      };
    } catch (error) {
      console.error('[OtpService.resendOtp] Error:', error.message);
      throw error;
    }
  }

  /**
   * Get OTP status (for checking validity)
   * @param {String} userId - User ID
   * @param {String} deviceId - Device ID
   * @returns {Promise<{status: string, timeRemaining: number, attemptsRemaining: number}>}
   */
  async getOtpStatus(userId, deviceId) {
    try {
      const otpSession = await OtpSession.getActiveOtp(userId, deviceId);

      if (!otpSession) {
        return {
          status: 'no_active_otp',
          timeRemaining: 0,
          attemptsRemaining: 0
        };
      }

      return {
        status: otpSession.isExpired() ? 'expired' : 'active',
        timeRemaining: otpSession.getTimeUntilExpiration(),
        attemptsRemaining: otpSession.getRemainingAttempts(),
        medium: otpSession.medium
      };
    } catch (error) {
      console.error('[OtpService.getOtpStatus] Error:', error.message);
      throw error;
    }
  }

  /**
   * Cancel OTP verification (user can cancel)
   * @param {String} userId - User ID
   * @param {String} deviceId - Device ID
   * @returns {Promise<boolean>}
   */
  async cancelOtp(userId, deviceId) {
    try {
      const result = await OtpSession.deleteMany({
        userId,
        deviceId,
        verified: false
      });

      console.log(`[OTP] Cancelled for user=${userId}, device=${deviceId}`);

      return result.deletedCount > 0;
    } catch (error) {
      console.error('[OtpService.cancelOtp] Error:', error.message);
      throw error;
    }
  }

  /**
   * Check if device is verified (within 30-day trust window)
   * @param {String} userId - User ID
   * @param {String} deviceId - Device ID
   * @returns {Promise<boolean>}
   */
  async isDeviceTrusted(userId, deviceId) {
    try {
      const device = await Device.findById(deviceId);
      if (!device) {
        return false;
      }

      // Check if verified and trust hasn't expired
      return device.isVerified && 
             device.isTrusted && 
             (!device.trustedUntil || new Date() < device.trustedUntil);
    } catch (error) {
      console.error('[OtpService.isDeviceTrusted] Error:', error.message);
      return false;
    }
  }

  /**
   * Mark device as no longer trusted (force re-verification)
   * @param {String} deviceId - Device ID
   * @returns {Promise<Device>}
   */
  async revokeTrust(deviceId) {
    try {
      const device = await Device.findByIdAndUpdate(
        deviceId,
        {
          isTrusted: false,
          trustedUntil: null
        },
        { new: true }
      );

      console.log(`[OTP] Trust revoked for device=${deviceId}`);

      return device;
    } catch (error) {
      console.error('[OtpService.revokeTrust] Error:', error.message);
      throw error;
    }
  }

  /**
   * Clean up expired OTP sessions
   * Note: MongoDB TTL Index should handle this automatically,
   * but this provides manual cleanup option
   * @returns {Promise<{deletedCount: number}>}
   */
  async cleanupExpiredOtps() {
    try {
      const result = await OtpSession.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      console.log(`[OTP] Cleanup: deleted ${result.deletedCount} expired OTPs`);

      return {
        deletedCount: result.deletedCount
      };
    } catch (error) {
      console.error('[OtpService.cleanupExpiredOtps] Error:', error.message);
      throw error;
    }
  }

  /**
   * Utility: Mask phone number for display
   * @private
   */
  maskPhoneNumber(phone) {
    if (!phone) return 'unknown';
    const masked = phone.slice(-4).padStart(phone.length, '*');
    return masked;
  }

  /**
   * Utility: Mask email for display
   * @private
   */
  maskEmail(email) {
    if (!email) return 'unknown';
    const [localPart, domain] = email.split('@');
    const maskedLocal = localPart.charAt(0) + '*'.repeat(localPart.length - 2) + localPart.charAt(localPart.length - 1);
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Get OTP statistics (for monitoring/analytics)
   * @param {Object} options - { hours: 24 }
   * @returns {Promise<Object>}
   */
  async getOtpStats(options = {}) {
    try {
      const { hours = 24 } = options;
      const fromTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      const stats = await OtpSession.aggregate([
        {
          $match: {
            createdAt: { $gte: fromTime }
          }
        },
        {
          $group: {
            _id: '$otpType',
            count: { $sum: 1 },
            verifiedCount: {
              $sum: { $cond: ['$verified', 1, 0] }
            }
          }
        }
      ]);

      const totalAttempts = await OtpSession.countDocuments({
        createdAt: { $gte: fromTime }
      });

      return {
        period: `Last ${hours} hours`,
        totalGenerated: totalAttempts,
        byType: stats,
        verificationRate: stats.reduce((acc, s) => ({
          ...acc,
          [s._id]: ((s.verifiedCount / s.count) * 100).toFixed(2) + '%'
        }), {})
      };
    } catch (error) {
      console.error('[OtpService.getOtpStats] Error:', error.message);
      throw error;
    }
  }
}

// Export singleton
module.exports = new OtpService();
