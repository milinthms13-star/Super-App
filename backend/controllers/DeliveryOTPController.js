/**
 * Delivery OTP Controller - Phase 10 REST Endpoints
 * Handles OTP verification for delivery operations
 */

const { validationResult } = require('express-validator');
const DeliveryOTPService = require('../services/DeliveryOTPService');

class DeliveryOTPController {
  async generateOTP(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { orderId, userId, deliveryPartnerId, phoneNumber, method } = req.body;

      const result = await DeliveryOTPService.generateOTP(
        orderId,
        userId,
        deliveryPartnerId,
        phoneNumber,
        method || 'sms'
      );

      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'OTP generation failed',
        errors: [error.message],
      });
    }
  }

  async verifyOTP(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { verificationId, otpCode, deviceId, ipAddress } = req.body;

      const result = await DeliveryOTPService.verifyOTP(verificationId, otpCode, deviceId, ipAddress);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'OTP verification failed',
        errors: [error.message],
      });
    }
  }

  async resendOTP(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { verificationId, method } = req.body;

      const result = await DeliveryOTPService.resendOTP(verificationId, method || 'sms');

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'OTP resend failed',
        errors: [error.message],
      });
    }
  }

  async getVerificationStatus(req, res) {
    try {
      const { verificationId } = req.params;

      const result = await DeliveryOTPService.getVerificationStatus(verificationId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve verification status',
        errors: [error.message],
      });
    }
  }
}

module.exports = new DeliveryOTPController();
