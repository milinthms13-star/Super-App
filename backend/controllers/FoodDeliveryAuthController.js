/**
 * Food Delivery Authentication Controller
 * Handles HTTP requests for authentication
 */

const FoodDeliveryAuthService = require('../services/FoodDeliveryAuthService');
const { validationResult } = require('express-validator');

class FoodDeliveryAuthController {
  /**
   * Send OTP to phone number
   * POST /api/fooddelivery/auth/send-otp
   */
  static async sendOTP(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { phoneNumber } = req.body;

      const result = await FoodDeliveryAuthService.sendOTP(phoneNumber);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Verify OTP and login
   * POST /api/fooddelivery/auth/verify-otp
   */
  static async verifyOTP(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { phoneNumber, otp, userData, deviceInfo } = req.body;

      const result = await FoodDeliveryAuthService.verifyOTPAndLogin(
        phoneNumber,
        otp,
        userData,
        deviceInfo
      );

      // Set HTTP-only cookie for refresh token
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
      });

      res.status(200).json({
        success: result.success,
        message: result.message,
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Email/Password Login
   * POST /api/fooddelivery/auth/login
   */
  static async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { email, password, deviceInfo } = req.body;

      const result = await FoodDeliveryAuthService.emailPasswordLogin(
        email,
        password,
        deviceInfo
      );

      // Set refresh token in HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 90 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: result.success,
        message: result.message,
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Social Login
   * POST /api/fooddelivery/auth/social-login
   */
  static async socialLogin(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { provider, socialData, deviceInfo } = req.body;

      const result = await FoodDeliveryAuthService.socialLogin(
        provider,
        socialData,
        deviceInfo
      );

      // Set refresh token in HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 90 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: result.success,
        message: result.message,
        user: result.user,
        token: result.token,
        isNewUser: result.isNewUser,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Register with Email and Password
   * POST /api/fooddelivery/auth/register
   */
  static async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { email, password, firstName, lastName } = req.body;

      const result = await FoodDeliveryAuthService.registerWithEmail(
        email,
        password,
        firstName,
        lastName
      );

      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Verify Email Token
   * POST /api/fooddelivery/auth/verify-email
   */
  static async verifyEmail(req, res) {
    try {
      const { token } = req.body;

      const result = await FoodDeliveryAuthService.verifyEmailToken(token);

      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Request Password Reset
   * POST /api/fooddelivery/auth/forgot-password
   */
  static async forgotPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { email } = req.body;

      const result = await FoodDeliveryAuthService.requestPasswordReset(email);

      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Reset Password with Token
   * POST /api/fooddelivery/auth/reset-password
   */
  static async resetPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { token, password } = req.body;

      const result = await FoodDeliveryAuthService.resetPassword(token, password);

      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Change Password (Logged In User)
   * POST /api/fooddelivery/auth/change-password
   */
  static async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user.userId;

      const result = await FoodDeliveryAuthService.changePassword(
        userId,
        currentPassword,
        newPassword
      );

      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Logout
   * POST /api/fooddelivery/auth/logout
   */
  static async logout(req, res) {
    try {
      const userId = req.user.userId;
      const token = req.headers.authorization?.split(' ')[1];

      const result = await FoodDeliveryAuthService.logout(userId, token);

      res.clearCookie('refreshToken');
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Refresh Access Token
   * POST /api/fooddelivery/auth/refresh-token
   */
  static async refreshToken(req, res) {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token not found',
        });
      }

      const result = await FoodDeliveryAuthService.refreshAccessToken(
        refreshToken
      );

      res.status(200).json(result);
    } catch (error) {
      res.clearCookie('refreshToken');
      res.status(401).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = FoodDeliveryAuthController;
