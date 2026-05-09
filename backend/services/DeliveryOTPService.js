/**
 * Delivery OTP Service - Phase 10 Business Logic
 * Handles OTP generation, verification, and fraud prevention
 */

const DeliveryOTPVerification = require('../models/DeliveryOTPVerification');
const FraudDetection = require('../models/FraudDetection');

class DeliveryOTPService {
  async generateOTP(orderId, userId, deliveryPartnerId, phoneNumber, method = 'sms') {
    try {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiryTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      const verificationId = `OTP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const otpRecord = new DeliveryOTPVerification({
        verificationId,
        orderId,
        userId,
        deliveryPartnerId,
        phoneNumber,
        otpCode,
        otpExpiryTime,
        status: 'pending',
        verificationMethod: method,
        otpAttempts: 0,
        resendCount: 0,
      });

      await otpRecord.save();

      // TODO: Send OTP via SMS/Email/Voice Call
      // sendOTPViaSMS(phoneNumber, otpCode);

      return {
        success: true,
        data: { verificationId, expiryTime: otpExpiryTime, method },
        message: `OTP sent via ${method}`,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to generate OTP',
        errors: [error.message],
      };
    }
  }

  async verifyOTP(verificationId, otpCode, deviceId, ipAddress) {
    try {
      const otpRecord = await DeliveryOTPVerification.findOne({ verificationId });

      if (!otpRecord) {
        return { success: false, message: 'Invalid verification ID', statusCode: 404 };
      }

      // Check if already verified
      if (otpRecord.status === 'verified') {
        return { success: false, message: 'OTP already verified', statusCode: 400 };
      }

      // Check if expired
      if (otpRecord.isOtpExpired()) {
        otpRecord.status = 'expired';
        await otpRecord.save();
        return { success: false, message: 'OTP expired', statusCode: 400 };
      }

      // Check if blocked
      if (otpRecord.isBlocked()) {
        return { success: false, message: 'Too many attempts. Try again later.', statusCode: 429 };
      }

      // Verify OTP code
      if (otpRecord.otpCode !== otpCode) {
        otpRecord.otpAttempts += 1;

        if (otpRecord.otpAttempts >= 3) {
          otpRecord.status = 'blocked';
          otpRecord.blockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        }

        await otpRecord.save();

        // Log fraud attempt
        await this._logFraudAttempt(otpRecord.orderId, otpRecord.userId, 'delivery_fraud');

        return { success: false, message: 'Invalid OTP', statusCode: 400 };
      }

      // OTP verified successfully
      otpRecord.status = 'verified';
      otpRecord.isVerified = true;
      otpRecord.verificationTime = new Date();
      otpRecord.deviceId = deviceId;
      otpRecord.ipAddress = ipAddress;
      await otpRecord.save();

      return {
        success: true,
        data: { verificationId, orderId: otpRecord.orderId, status: 'verified' },
        message: 'OTP verified successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'OTP verification failed',
        errors: [error.message],
      };
    }
  }

  async resendOTP(verificationId, method = 'sms') {
    try {
      const otpRecord = await DeliveryOTPVerification.findOne({ verificationId });

      if (!otpRecord) {
        return { success: false, message: 'Invalid verification ID', statusCode: 404 };
      }

      if (!otpRecord.canResendOtp()) {
        return { success: false, message: 'Cannot resend OTP. Max resends reached or blocked.', statusCode: 429 };
      }

      // Generate new OTP
      const newOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const newExpiryTime = new Date(Date.now() + 5 * 60 * 1000);

      otpRecord.otpCode = newOtpCode;
      otpRecord.otpExpiryTime = newExpiryTime;
      otpRecord.otpAttempts = 0;
      otpRecord.resendCount += 1;
      otpRecord.verificationMethod = method;
      otpRecord.status = 'pending';

      await otpRecord.save();

      // TODO: Send new OTP
      // sendOTPViaSMS(otpRecord.phoneNumber, newOtpCode);

      return {
        success: true,
        data: { verificationId, expiryTime: newExpiryTime },
        message: `OTP resent via ${method}`,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to resend OTP',
        errors: [error.message],
      };
    }
  }

  async getVerificationStatus(verificationId) {
    try {
      const otpRecord = await DeliveryOTPVerification.findOne({ verificationId });

      if (!otpRecord) {
        return { success: false, message: 'Verification not found', statusCode: 404 };
      }

      return {
        success: true,
        data: {
          verificationId: otpRecord.verificationId,
          status: otpRecord.status,
          isVerified: otpRecord.isVerified,
          otpAttempts: otpRecord.otpAttempts,
          resendCount: otpRecord.resendCount,
          isBlocked: otpRecord.isBlocked(),
          blockedUntil: otpRecord.blockedUntil,
        },
        message: 'Verification status retrieved',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve verification status',
        errors: [error.message],
      };
    }
  }

  async _logFraudAttempt(orderId, userId, fraudType) {
    try {
      const fraudRecord = new FraudDetection({
        fraudId: `FRAUD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        orderId,
        userId,
        fraudType,
        riskLevel: 'medium',
        status: 'flagged',
      });
      await fraudRecord.save();
    } catch (error) {
      // Log but don't fail the OTP verification
      console.error('Failed to log fraud attempt:', error);
    }
  }
}

module.exports = new DeliveryOTPService();
