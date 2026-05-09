/**
 * OTPAuthService
 * Handles OTP generation, sending, and verification for phone login.
 */

const jwt = require('jsonwebtoken');
const OtpAuthSession = require('../models/OtpAuthSession');
const User = require('../models/User');
const { getJwtSecret } = require('../middleware/auth');

class OTPAuthService {
  static instance;

  static getInstance() {
    if (!OTPAuthService.instance) {
      OTPAuthService.instance = new OTPAuthService();
    }
    return OTPAuthService.instance;
  }

  async requestOTP(phoneNumber, medium = 'sms', deviceInfo = {}) {
    try {
      const normalizedPhone = String(phoneNumber || '').trim();
      if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
        throw new Error('Invalid Indian phone number');
      }

      const recentSessions = await OtpAuthSession.find({
        phoneNumber: normalizedPhone,
        createdAt: { $gt: new Date(Date.now() - 3600000) },
      });

      if (recentSessions.length >= 3) {
        throw new Error('Too many OTP requests. Please try after 1 hour.');
      }

      const { sessionId, expiresAt } = await OtpAuthSession.createSession(
        normalizedPhone,
        medium,
        deviceInfo
      );

      const session = await OtpAuthSession.findOne({ sessionId }).select('+otpCode');
      const otpCode = session.otpCode;

      await this.sendOTPViaProvider(normalizedPhone, otpCode, medium);

      return {
        success: true,
        sessionId,
        expiresAt,
        message: `OTP sent via ${medium}`,
        ...(process.env.NODE_ENV === 'development' && { otpCode }),
      };
    } catch (error) {
      throw new Error(`OTP request failed: ${error.message}`);
    }
  }

  async verifyOTPAndLogin(sessionId, otpCode, deviceInfo = {}) {
    try {
      const session = await OtpAuthSession.findOne({ sessionId }).select('+otpCode');
      if (!session) {
        throw new Error('Invalid OTP session');
      }

      await session.verifyOTP(otpCode);

      const phone = String(session.phoneNumber || '').trim();
      const placeholderEmail = this.getPhonePlaceholderEmail(phone);
      let user = await User.findOne({ phone });

      if (!user) {
        user = await User.findOne({ email: placeholderEmail });
      }

      if (!user) {
        const username = await this.generateUniquePhoneUsername(phone);
        user = await User.create({
          email: placeholderEmail,
          username,
          name: `User ${phone.slice(-4)}`,
          phone,
          role: 'user',
          roles: ['user'],
          registrationType: 'user',
          isPhoneVerified: true,
          phoneVerifiedAt: new Date(),
          authMethod: 'phone_otp',
        });
      } else {
        user.phone = phone;
        user.isPhoneVerified = true;
        user.phoneVerifiedAt = new Date();
        user.authMethod = 'phone_otp';
        await user.save();
      }

      await session.markVerified(user._id);
      const tokens = this.generateTokens(user, deviceInfo, 'phone_otp');

      return {
        success: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          phone: user.phone || phone,
          role: user.role || 'user',
          registrationType: user.registrationType || 'user',
          mpinEnabled: Boolean(user.mpinEnabled),
        },
        ...tokens,
      };
    } catch (error) {
      throw new Error(`OTP verification failed: ${error.message}`);
    }
  }

  async resendOTP(sessionId, medium = 'sms') {
    try {
      const session = await OtpAuthSession.findOne({ sessionId });
      if (!session) {
        throw new Error('Invalid OTP session');
      }

      if (!session.canResend()) {
        throw new Error('Please wait 30 seconds before requesting another OTP');
      }

      const newOtpCode = OtpAuthSession.generateOTP();
      session.otpCode = newOtpCode;
      session.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      session.attempts = 0;
      session.medium = medium;
      await session.save();

      await this.sendOTPViaProvider(session.phoneNumber, newOtpCode, medium);

      return {
        success: true,
        message: `New OTP sent via ${medium}`,
        expiresAt: session.expiresAt,
        ...(process.env.NODE_ENV === 'development' && { otpCode: newOtpCode }),
      };
    } catch (error) {
      throw new Error(`OTP resend failed: ${error.message}`);
    }
  }

  async sendOTPViaProvider(phoneNumber, otpCode, medium = 'sms') {
    try {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log(`[DEV] ${medium.toUpperCase()} OTP to ${phoneNumber}: ${otpCode}`);
        return;
      }

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
          to: `+91${phoneNumber}`,
        });
      } else if (medium === 'whatsapp') {
        await client.messages.create({
          body: message,
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
          to: `whatsapp:+91${phoneNumber}`,
        });
      }
    } catch (error) {
      throw new Error(`Failed to send ${medium}`);
    }
  }

  generateTokens(user, _deviceInfo = {}, authMethod = 'phone_otp') {
    const accessToken = jwt.sign(
      {
        sub: user._id.toString(),
        email: user.email,
        phone: user.phone || '',
        authMethod,
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
        authMethod,
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
      expiresIn: 86400,
    };
  }

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
        medium: session.medium,
      };
    } catch (error) {
      throw new Error(`Failed to get session status: ${error.message}`);
    }
  }

  async cancelSession(sessionId) {
    try {
      await OtpAuthSession.deleteOne({ sessionId });
      return { success: true, message: 'OTP session cancelled' };
    } catch (error) {
      throw new Error(`Failed to cancel session: ${error.message}`);
    }
  }

  getPhonePlaceholderEmail(phone) {
    return `mobile${phone}@nilahub.local`;
  }

  async generateUniquePhoneUsername(phone) {
    const base = `user${String(phone || '').slice(-6) || Date.now()}`;
    const normalizedBase = base.replace(/[^a-z0-9_-]/gi, '').toLowerCase().slice(0, 16);
    let candidate = normalizedBase || `user${Date.now().toString().slice(-6)}`;
    let counter = 0;

    while (counter < 100) {
      // eslint-disable-next-line no-await-in-loop
      const existing = await User.findOne({ username: candidate });
      if (!existing) {
        return candidate;
      }
      counter += 1;
      candidate = `${normalizedBase.slice(0, 12)}${counter}`.toLowerCase();
    }

    return `user${Date.now().toString().slice(-8)}`;
  }
}

module.exports = OTPAuthService.getInstance();
