const User = require('../models/User');
const UserOTP = require('../models/UserOTP');
const jwt = require('jsonwebtoken');
const twilio = require('twilio');
const crypto = require('crypto');

/**
 * OTP Authentication Service
 * Handles mobile OTP login, phone verification, and OTP management
 * Integrated with Twilio SMS and WhatsApp
 */
class OTPAuthService {
  static twilioClient = null;

  /**
   * Initialize Twilio client
   */
  static initializeTwilio() {
    if (!this.twilioClient) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
    return this.twilioClient;
  }

  /**
   * Validate Indian phone number format
   * @param {String} phoneNumber - Phone number to validate
   * @returns {Boolean}
   */
  static validatePhoneNumber(phoneNumber) {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const indianPhoneRegex = /^91[6-9]\d{9}$/;
    return indianPhoneRegex.test(cleanPhone);
  }

  /**
   * Generate 6-digit OTP
   * @returns {String}
   */
  static generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Request OTP on phone number
   * Validates phone, generates OTP, sends via SMS/WhatsApp, stores in DB with TTL
   * @param {String} phoneNumber - E.164 format (+919876543210 or 919876543210)
   * @param {String} channel - 'sms' or 'whatsapp' (default: 'sms')
   * @returns {Object} {success, message, data}
   */
  static async requestOTP(phoneNumber, channel = 'sms') {
    try {
      // Validate phone format
      if (!this.validatePhoneNumber(phoneNumber)) {
        return {
          success: false,
          message: 'Invalid Indian phone number format',
          data: null
        };
      }

      // Normalize phone to E.164
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const formattedPhone = '+' + cleanPhone;

      // Check rate limiting - max 3 OTPs per hour
      const recentOTPs = await UserOTP.countDocuments({
        phoneNumber: formattedPhone,
        createdAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) }
      });

      if (recentOTPs >= 3) {
        return {
          success: false,
          message: 'Too many OTP requests. Please try after 1 hour',
          data: null
        };
      }

      // Check last request time - minimum 30 seconds between requests
      const lastOTP = await UserOTP.findOne({
        phoneNumber: formattedPhone,
        isUsed: false
      }).sort({ createdAt: -1 });

      if (lastOTP && Date.now() - lastOTP.createdAt.getTime() < 30000) {
        return {
          success: false,
          message: 'Please wait 30 seconds before requesting another OTP',
          data: null
        };
      }

      // Mark previous unused OTPs as expired
      await UserOTP.updateMany(
        { phoneNumber: formattedPhone, isUsed: false },
        { isUsed: true, usedReason: 'superseded_by_new_request' }
      );

      // Generate new OTP
      const otp = this.generateOTP();
      const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

      // Store OTP in database with TTL (5 minutes)
      const otpRecord = new UserOTP({
        phoneNumber: formattedPhone,
        otpHash: otpHash,
        channel: channel,
        attemptCount: 0,
        maxAttempts: 5,
        isUsed: false,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        createdAt: new Date()
      });

      await otpRecord.save();

      // Send OTP via Twilio
      const client = this.initializeTwilio();
      let sendResult;

      if (channel === 'whatsapp') {
        sendResult = await client.messages.create({
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
          to: `whatsapp:${formattedPhone}`,
          body: `Your verification code is: ${otp}\n\nValid for 5 minutes. Do not share with anyone.`
        });
      } else {
        // SMS
        sendResult = await client.messages.create({
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedPhone,
          body: `Your verification code is: ${otp}. Valid for 5 minutes. Do not share with anyone.`
        });
      }

      // Log OTP delivery
      await UserOTP.updateOne(
        { _id: otpRecord._id },
        {
          twilioSid: sendResult.sid,
          deliveryStatus: 'sent'
        }
      );

      return {
        success: true,
        message: `OTP sent via ${channel} to ${phoneNumber}`,
        data: {
          phoneNumber: phoneNumber,
          channel: channel,
          expiresIn: 300, // seconds
          requestId: otpRecord._id.toString()
        }
      };
    } catch (error) {
      console.error('OTP Request Error:', error);
      return {
        success: false,
        message: 'Failed to send OTP. Please try again.',
        data: null
      };
    }
  }

  /**
   * Verify OTP and login user
   * @param {String} phoneNumber - Phone number
   * @param {String} otp - 6-digit OTP entered by user
   * @returns {Object} {success, message, data: {token, user}}
   */
  static async verifyOTPAndLogin(phoneNumber, otp) {
    try {
      // Validate inputs
      if (!phoneNumber || !otp || otp.length !== 6) {
        return {
          success: false,
          message: 'Invalid phone number or OTP format',
          data: null
        };
      }

      // Normalize phone
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const formattedPhone = '+' + cleanPhone;

      // Find valid OTP record
      const otpRecord = await UserOTP.findOne({
        phoneNumber: formattedPhone,
        isUsed: false,
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 });

      if (!otpRecord) {
        return {
          success: false,
          message: 'OTP expired or not found. Please request a new OTP.',
          data: null
        };
      }

      // Check attempt count
      if (otpRecord.attemptCount >= otpRecord.maxAttempts) {
        await UserOTP.updateOne(
          { _id: otpRecord._id },
          { isUsed: true, usedReason: 'max_attempts_exceeded' }
        );
        return {
          success: false,
          message: 'Too many failed attempts. Please request a new OTP.',
          data: null
        };
      }

      // Verify OTP hash
      const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
      if (otpHash !== otpRecord.otpHash) {
        // Increment attempt count
        await UserOTP.updateOne(
          { _id: otpRecord._id },
          { $inc: { attemptCount: 1 } }
        );

        const remaining = otpRecord.maxAttempts - otpRecord.attemptCount - 1;
        return {
          success: false,
          message: `Invalid OTP. ${remaining} attempts remaining.`,
          data: null
        };
      }

      // OTP verified successfully
      await UserOTP.updateOne(
        { _id: otpRecord._id },
        {
          isUsed: true,
          usedReason: 'successful_login',
          verifiedAt: new Date()
        }
      );

      // Find or create user
      let user = await User.findOne({ phone: formattedPhone });

      if (!user) {
        // Create new user from phone
        user = new User({
          phone: formattedPhone,
          email: null,
          isPhoneVerified: true,
          phoneVerifiedAt: new Date(),
          loginMethod: 'otp',
          referralCode: this.generateReferralCode()
        });
        await user.save();
      } else {
        // Update existing user
        user.isPhoneVerified = true;
        user.phoneVerifiedAt = new Date();
        user.lastLoginAt = new Date();
        await user.save();
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          phone: user.phone,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        success: true,
        message: 'Login successful',
        data: {
          token: token,
          user: {
            id: user._id,
            phone: user.phone,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            role: user.role
          }
        }
      };
    } catch (error) {
      console.error('OTP Verification Error:', error);
      return {
        success: false,
        message: 'Failed to verify OTP. Please try again.',
        data: null
      };
    }
  }

  /**
   * Resend OTP with rate limiting
   * @param {String} phoneNumber - Phone number
   * @param {String} channel - 'sms' or 'whatsapp'
   * @returns {Object} {success, message, data}
   */
  static async resendOTP(phoneNumber, channel = 'sms') {
    try {
      // Normalize phone
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const formattedPhone = '+' + cleanPhone;

      // Check if last OTP is still valid and unused
      const lastOTP = await UserOTP.findOne({
        phoneNumber: formattedPhone,
        isUsed: false,
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 });

      if (lastOTP) {
        const secondsRemaining = Math.ceil((lastOTP.expiresAt - new Date()) / 1000);
        if (secondsRemaining > 240) {
          // Still valid for more than 4 minutes
          return {
            success: false,
            message: `Your current OTP is still valid for ${secondsRemaining} seconds. Please use it.`,
            data: null
          };
        }
      }

      // Request new OTP
      return await this.requestOTP(phoneNumber, channel);
    } catch (error) {
      console.error('Resend OTP Error:', error);
      return {
        success: false,
        message: 'Failed to resend OTP. Please try again.',
        data: null
      };
    }
  }

  /**
   * Verify phone and link to existing user
   * Used for adding phone to email-registered account
   * @param {String} userId - User ID
   * @param {String} phoneNumber - Phone number
   * @param {String} otp - OTP
   * @returns {Object} {success, message, data}
   */
  static async verifyPhoneForUser(userId, phoneNumber, otp) {
    try {
      // Normalize phone
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const formattedPhone = '+' + cleanPhone;

      // Verify OTP
      const otpRecord = await UserOTP.findOne({
        phoneNumber: formattedPhone,
        isUsed: false,
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 });

      if (!otpRecord) {
        return {
          success: false,
          message: 'OTP expired or not found',
          data: null
        };
      }

      // Verify OTP hash
      const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
      if (otpHash !== otpRecord.otpHash) {
        await UserOTP.updateOne(
          { _id: otpRecord._id },
          { $inc: { attemptCount: 1 } }
        );
        return {
          success: false,
          message: 'Invalid OTP',
          data: null
        };
      }

      // Mark OTP as used
      await UserOTP.updateOne(
        { _id: otpRecord._id },
        { isUsed: true, usedReason: 'phone_verified', verifiedAt: new Date() }
      );

      // Update user
      const user = await User.findByIdAndUpdate(
        userId,
        {
          phone: formattedPhone,
          isPhoneVerified: true,
          phoneVerifiedAt: new Date()
        },
        { new: true }
      );

      return {
        success: true,
        message: 'Phone verified successfully',
        data: {
          user: {
            id: user._id,
            email: user.email,
            phone: user.phone,
            name: user.name
          }
        }
      };
    } catch (error) {
      console.error('Phone Verification Error:', error);
      return {
        success: false,
        message: 'Failed to verify phone',
        data: null
      };
    }
  }

  /**
   * Unlink phone from user account
   * @param {String} userId - User ID
   * @returns {Object} {success, message, data}
   */
  static async unlinkPhoneFromUser(userId) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          phone: null,
          isPhoneVerified: false
        },
        { new: true }
      );

      return {
        success: true,
        message: 'Phone unlinked successfully',
        data: { user }
      };
    } catch (error) {
      console.error('Unlink Phone Error:', error);
      return {
        success: false,
        message: 'Failed to unlink phone',
        data: null
      };
    }
  }

  /**
   * Generate referral code
   * @returns {String}
   */
  static generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'REF_' + code;
  }

  /**
   * Get OTP delivery status
   * @param {String} requestId - OTP request ID
   * @returns {Object} {success, message, data}
   */
  static async getOTPStatus(requestId) {
    try {
      const otpRecord = await UserOTP.findById(requestId);

      if (!otpRecord) {
        return {
          success: false,
          message: 'OTP record not found',
          data: null
        };
      }

      return {
        success: true,
        message: 'OTP status retrieved',
        data: {
          status: otpRecord.deliveryStatus,
          channel: otpRecord.channel,
          attempts: otpRecord.attemptCount,
          isExpired: otpRecord.expiresAt < new Date(),
          isUsed: otpRecord.isUsed
        }
      };
    } catch (error) {
      console.error('Get OTP Status Error:', error);
      return {
        success: false,
        message: 'Failed to retrieve OTP status',
        data: null
      };
    }
  }
}

module.exports = OTPAuthService;
