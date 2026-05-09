/**
 * Food Delivery Authentication Service
 * Handles OTP, login, registration, password reset, etc.
 */

const jwt = require('jsonwebtoken');
const twilio = require('twilio');
const FoodDeliveryUser = require('../models/FoodDeliveryUser');
const { generateReferralCode } = require('../utils/helpers');
const { sendEmail } = require('../utils/sendEmail');

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

class FoodDeliveryAuthService {
  /**
   * Send OTP via SMS
   */
  static async sendOTP(phoneNumber) {
    try {
      // Validate phone number
      if (!phoneNumber.match(/^[0-9]{10}$/)) {
        throw new Error('Invalid phone number format');
      }

      // Find or create user
      let user = await FoodDeliveryUser.findOne({
        phoneNumber,
      });

      if (!user) {
        // Create temporary user record
        user = new FoodDeliveryUser({
          phoneNumber,
          email: `temp-${phoneNumber}@fooddelivery.local`, // Temporary email
          firstName: phoneNumber,
          password: null, // Will be set during signup
        });
      }

      // Check OTP rate limiting (max 3 OTPs per hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (
        user.otp &&
        user.otp.lastSentAt &&
        user.otp.lastSentAt > oneHourAgo
      ) {
        throw new Error('OTP sent recently. Please try again after some time.');
      }

      // Generate OTP
      const otp = user.generateOTP();

      // Send SMS via Twilio
      await twilioClient.messages.create({
        body: `Your FoodDelivery OTP is: ${otp}. Valid for 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: `+91${phoneNumber}`,
      });

      // Save user
      await user.save();

      return {
        success: true,
        message: 'OTP sent successfully',
        phoneNumber,
        expiresIn: 600, // 10 minutes in seconds
      };
    } catch (error) {
      throw new Error(`Failed to send OTP: ${error.message}`);
    }
  }

  /**
   * Verify OTP and register/login user
   */
  static async verifyOTPAndLogin(phoneNumber, otp, userData = {}) {
    try {
      // Find user by phone number
      const user = await FoodDeliveryUser.findOne({
        phoneNumber,
      });

      if (!user) {
        throw new Error('User not found. Please send OTP first.');
      }

      // Verify OTP
      const otpVerification = user.verifyOTP(otp);
      if (!otpVerification.success) {
        await user.save();
        throw new Error(otpVerification.message);
      }

      // Update user profile if this is first time signup
      if (userData && Object.keys(userData).length > 0) {
        user.firstName = userData.firstName || user.firstName;
        user.lastName = userData.lastName || '';
        user.email = userData.email || `${phoneNumber}@fooddelivery.local`;
        user.phoneVerified = true;

        // Generate referral code if new user
        if (!user.referralCode) {
          user.referralCode = generateReferralCode();
        }
      }

      // Reset failed login attempts
      user.resetFailedLoginAttempts();
      user.lastLoginAt = new Date();
      user.phoneVerified = true;

      // Add session
      const sessionToken = jwt.sign(
        {
          userId: user._id,
          phoneNumber: user.phoneNumber,
          role: 'customer',
        },
        process.env.JWT_SECRET,
        {
          expiresIn: '30d',
        }
      );

      const deviceInfo = userData.deviceInfo || {};
      user.addSessionToken(sessionToken, deviceInfo);

      await user.save();

      return {
        success: true,
        message: 'Login successful',
        user: user.toJSON(),
        token: sessionToken,
        refreshToken: this.generateRefreshToken(user._id),
      };
    } catch (error) {
      throw new Error(`OTP verification failed: ${error.message}`);
    }
  }

  /**
   * Email/Password login
   */
  static async emailPasswordLogin(email, password, deviceInfo = {}) {
    try {
      // Find user with password field
      const user = await FoodDeliveryUser.findOne({
        email,
      }).select('+password');

      if (!user || !user.password) {
        throw new Error('Invalid email or password');
      }

      // Check if account is locked
      if (user.isLocked()) {
        throw new Error('Account is temporarily locked. Try again later.');
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        user.incrementFailedLoginAttempts();
        await user.save();
        throw new Error('Invalid email or password');
      }

      // Reset failed attempts on successful login
      user.resetFailedLoginAttempts();
      user.lastLoginAt = new Date();

      // Create session token
      const sessionToken = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          role: 'customer',
        },
        process.env.JWT_SECRET,
        {
          expiresIn: '30d',
        }
      );

      user.addSessionToken(sessionToken, deviceInfo);
      await user.save();

      return {
        success: true,
        message: 'Login successful',
        user: user.toJSON(),
        token: sessionToken,
        refreshToken: this.generateRefreshToken(user._id),
      };
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  /**
   * Social login (Google/Apple/Facebook)
   */
  static async socialLogin(provider, socialData, deviceInfo = {}) {
    try {
      const validProviders = ['google', 'apple', 'facebook'];
      if (!validProviders.includes(provider)) {
        throw new Error('Invalid provider');
      }

      // Find user by social profile
      let user = await FoodDeliveryUser.findOne({
        [`socialProfiles.${provider}.id`]: socialData.id,
      });

      if (!user) {
        // Create new user from social data
        user = new FoodDeliveryUser({
          email: socialData.email,
          firstName: socialData.firstName || socialData.name || 'User',
          lastName: socialData.lastName || '',
          phoneNumber: `${Date.now()}`, // Temporary placeholder
          phoneVerified: false,
        });

        // Set social profile
        user.socialProfiles[provider] = {
          id: socialData.id,
          email: socialData.email,
          name: socialData.name,
          picture: socialData.picture,
        };

        user.emailVerified = true; // Email is verified by provider
        user.referralCode = generateReferralCode();
      } else {
        // Update social profile data
        user.socialProfiles[provider] = {
          id: socialData.id,
          email: socialData.email,
          name: socialData.name,
          picture: socialData.picture,
        };
      }

      // Update last login
      user.lastLoginAt = new Date();

      // Create session token
      const sessionToken = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          role: 'customer',
        },
        process.env.JWT_SECRET,
        {
          expiresIn: '30d',
        }
      );

      user.addSessionToken(sessionToken, deviceInfo);
      await user.save();

      return {
        success: true,
        message: 'Social login successful',
        user: user.toJSON(),
        token: sessionToken,
        refreshToken: this.generateRefreshToken(user._id),
        isNewUser: !user.phoneVerified,
      };
    } catch (error) {
      throw new Error(`Social login failed: ${error.message}`);
    }
  }

  /**
   * Register with email and password
   */
  static async registerWithEmail(email, password, firstName, lastName) {
    try {
      // Check if user already exists
      const existingUser = await FoodDeliveryUser.findOne({
        $or: [{ email }, { phoneNumber: email }],
      });

      if (existingUser) {
        throw new Error('User already exists');
      }

      // Validate password strength
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(password)) {
        throw new Error(
          'Password must be at least 8 characters with uppercase, lowercase, number and special character'
        );
      }

      // Create new user
      const user = new FoodDeliveryUser({
        email,
        firstName,
        lastName,
        phoneNumber: `${Date.now()}`, // Temporary placeholder
        password,
        referralCode: generateReferralCode(),
      });

      await user.save();

      // Send verification email
      await this.sendVerificationEmail(email, user._id);

      return {
        success: true,
        message: 'Registration successful. Please verify your email.',
        userId: user._id,
        email: user.email,
      };
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  /**
   * Send verification email
   */
  static async sendVerificationEmail(email, userId) {
    try {
      const verificationToken = jwt.sign(
        { userId, email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

      const result = await sendEmail(
        email,
        'Verify your FoodDelivery account',
        `
          <h2>Email Verification</h2>
          <p>Please click the link below to verify your email address:</p>
          <a href="${verificationLink}">${verificationLink}</a>
          <p>This link expires in 24 hours.</p>
        `,
        '',
        `fooddelivery-verify:${userId}`
      );

      if (!result.success) {
        throw new Error(result.error || 'Email service not configured');
      }

      return {
        success: true,
        message: 'Verification email sent',
      };
    } catch (error) {
      throw new Error(`Failed to send verification email: ${error.message}`);
    }
  }

  /**
   * Verify email token
   */
  static async verifyEmailToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await FoodDeliveryUser.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.emailVerified = true;
      await user.save();

      return {
        success: true,
        message: 'Email verified successfully',
        user: user.toJSON(),
      };
    } catch (error) {
      throw new Error(`Email verification failed: ${error.message}`);
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email) {
    try {
      const user = await FoodDeliveryUser.findOne({ email });
      if (!user) {
        // Don't reveal if email exists for security
        return {
          success: true,
          message: 'If email exists, password reset link will be sent',
        };
      }

      const resetToken = jwt.sign(
        { userId: user._id, email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      const result = await sendEmail(
        email,
        'FoodDelivery Password Reset',
        `
          <h2>Password Reset Request</h2>
          <p>Click the link below to reset your password:</p>
          <a href="${resetLink}">${resetLink}</a>
          <p>This link expires in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
        '',
        `fooddelivery-password-reset:${user._id}`
      );

      if (!result.success) {
        throw new Error(result.error || 'Email service not configured');
      }

      return {
        success: true,
        message: 'Password reset link sent to email',
      };
    } catch (error) {
      throw new Error(`Password reset request failed: ${error.message}`);
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token, newPassword) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await FoodDeliveryUser.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate password strength
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        throw new Error(
          'Password must be at least 8 characters with uppercase, lowercase, number and special character'
        );
      }

      user.password = newPassword;
      user.resetFailedLoginAttempts();
      await user.save();

      return {
        success: true,
        message: 'Password reset successful',
      };
    } catch (error) {
      throw new Error(`Password reset failed: ${error.message}`);
    }
  }

  /**
   * Change password (logged in user)
   */
  static async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await FoodDeliveryUser.findById(userId).select('+password');
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValid = await user.comparePassword(currentPassword);
      if (!isValid) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        throw new Error(
          'New password must be at least 8 characters with uppercase, lowercase, number and special character'
        );
      }

      user.password = newPassword;
      await user.save();

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      throw new Error(`Change password failed: ${error.message}`);
    }
  }

  /**
   * Logout (invalidate session)
   */
  static async logout(userId, token) {
    try {
      const user = await FoodDeliveryUser.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.removeSessionToken(token);
      await user.save();

      return {
        success: true,
        message: 'Logout successful',
      };
    } catch (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(userId) {
    return jwt.sign(
      { userId, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '90d' }
    );
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      const user = await FoodDeliveryUser.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      const newToken = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          role: 'customer',
        },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      return {
        success: true,
        token: newToken,
      };
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }
}

module.exports = FoodDeliveryAuthService;
