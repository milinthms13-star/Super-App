/**
 * OTPAuthService
 * Handles OTP generation, sending, and verification
 * Supports SMS/WhatsApp via Twilio integration
 */

const OtpAuthSession = require('../models/OtpAuthSession');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

class OTPAuthService {
  static instance;

  static getInstance() {
    if (!OTPAuthService.instance) {
      OTPAuthService.instance = new OTPAuthService();
    }
    return OTPAuthService.instance;
  }

  /**
   * Request OTP - Generate and send via SMS/WhatsApp
   */
  async requestOTP(phoneNumber, medium = 'sms', deviceInfo = {}) {
    try {
      // Validate phone number
      if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
        throw new Error('Invalid Indian phone number');
      }

      // Check rate limiting (max 3 requests per hour)
      const recentSessions = await OtpAuthSession.find({
        phoneNumber,
        createdAt: { $gt: new Date(Date.now() - 3600000) }
      });

      if (recentSessions.length >= 3) {
        throw new Error('Too many OTP requests. Please try after 1 hour.');
      }

      // Create OTP session
      const { sessionId, expiresAt } = await OtpAuthSession.createSession(
        phoneNumber,
        medium,
        deviceInfo
      );

      // Get OTP from database
      const session = await OtpAuthSession.findOne({ sessionId }).select('+otpCode');
      const otpCode = session.otpCode;

      // Send via Twilio (in production, actually send)
      await this.sendOTPViaProvider(phoneNumber, otpCode, medium);

      return {
        success: true,
        sessionId,
        expiresAt,
        message: `OTP sent via ${medium}`,
        // In development, you can return OTP for testing
        ...(process.env.NODE_ENV === 'development' && { otpCode })
      };
    } catch (error) {
      throw new Error(`OTP request failed: ${error.message}`);
    }
  }

  /**
   * Verify OTP and create user session
   */
  async verifyOTPAndLogin(sessionId, otpCode, deviceInfo = {}) {
    try {
      // Find and validate session
      const session = await OtpAuthSession.findOne({ sessionId }).select('+otpCode');

      if (!session) {
        throw new Error('Invalid OTP session');
      }

      // Verify OTP
      await session.verifyOTP(otpCode);

      // Find or create user by phone number
      let user = await User.findOne({ phoneNumber: session.phoneNumber });

      if (!user) {
        // Create new user from phone number
        user = new User({
          phoneNumber: session.phoneNumber,
          isPhoneVerified: true,
          phoneVerifiedAt: new Date(),
          authMethod: 'otp',
          firstName: 'Mobile User',
          lastName: ''
        });
        await user.save();
      } else {
        // Update user verification
        user.isPhoneVerified = true;
        user.phoneVerifiedAt = new Date();
        await user.save();
      }

      // Mark session as verified
      await session.markVerified(user._id);

      // Create JWT tokens
      const tokens = this.generateTokens(user, deviceInfo, 'otp');

      return {
        success: true,
        user: {
          id: user._id,
          phoneNumber: user.phoneNumber,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        },
        ...tokens
      };
    } catch (error) {
      throw new Error(`OTP verification failed: ${error.message}`);
    }
  }

  /**
   * Resend OTP with rate limiting
   */
  async resendOTP(sessionId, medium = 'sms') {
    try {
      const session = await OtpAuthSession.findOne({ sessionId });

      if (!session) {
        throw new Error('Invalid OTP session');
      }

      if (!session.canResend()) {
        throw new Error('Please wait 30 seconds before requesting another OTP');
      }

      // Generate new OTP
      const newOtpCode = OtpAuthSession.generateOTP();
      session.otpCode = newOtpCode;
      session.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      session.attempts = 0;
      session.medium = medium;
      await session.save();

      // Send new OTP
      await this.sendOTPViaProvider(session.phoneNumber, newOtpCode, medium);

      return {
        success: true,
        message: `New OTP sent via ${medium}`,
        expiresAt: session.expiresAt,
        ...(process.env.NODE_ENV === 'development' && { otpCode: newOtpCode })
      };
    } catch (error) {
      throw new Error(`OTP resend failed: ${error.message}`);
    }
  }

  /**
   * Send OTP via SMS or WhatsApp
   */
  async sendOTPViaProvider(phoneNumber, otpCode, medium = 'sms') {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] ${medium.toUpperCase()} OTP to ${phoneNumber}: ${otpCode}`);
        return;
      }

      // In production, integrate with Twilio
      const twilio = require('twilio');
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      const message = `Your NilaHub OTP is: ${otpCode}. Valid for 5 minutes. Do not share with anyone.`;

      if (medium === 'sms') {
        await client.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: `+91${phoneNumber}`
        });
      } else if (medium === 'whatsapp') {
        await client.messages.create({
          body: message,
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
          to: `whatsapp:+91${phoneNumber}`
        });
      }
    } catch (error) {
      console.error(`Failed to send ${medium}:`, error);
      throw new Error(`Failed to send ${medium}`);
    }
  }

  /**
   * Generate JWT tokens
   */
  generateTokens(user, deviceInfo = {}, authMethod = 'otp') {
    const accessToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        authMethod
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      {
        userId: user._id,
        authMethod
      },
      process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
      { expiresIn: '30d' }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 86400 // 24 hours in seconds
    };
  }

  /**
   * Get OTP session status
   */
  async getSessionStatus(sessionId) {
    try {
      const session = await OtpAuthSession.findOne({ sessionId });

      if (!session) {
        throw new Error('Session not found');
      }

      return {
        phoneNumber: session.phoneNumber.replace(/(\d{2})(\d{4})(\d{4})/, '$1****$3'),
        isVerified: session.isVerified,
        isExpired: session.isExpired(),
        expiresAt: session.expiresAt,
        attempts: session.attempts,
        attemptsRemaining: 5 - session.attempts,
        medium: session.medium
      };
    } catch (error) {
      throw new Error(`Failed to get session status: ${error.message}`);
    }
  }

  /**
   * Cancel OTP session
   */
  async cancelSession(sessionId) {
    try {
      await OtpAuthSession.deleteOne({ sessionId });
      return { success: true, message: 'OTP session cancelled' };
    } catch (error) {
      throw new Error(`Failed to cancel session: ${error.message}`);
    }
  }
}

module.exports = OTPAuthService.getInstance();
