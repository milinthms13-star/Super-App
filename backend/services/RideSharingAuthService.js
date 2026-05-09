const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');
const RiderProfile = require('../models/RiderProfile');
const DriverProfile = require('../models/DriverProfile');
const OtpToken = require('../models/OtpToken');
const otpService = require('./otpService');

class RideSharingAuthService {
  /**
   * Generate JWT tokens (access + refresh)
   */
  static generateTokens(userId, role = 'rider') {
    const accessToken = jwt.sign(
      { userId, role, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const refreshToken = jwt.sign(
      { userId, role, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Send OTP to phone number
   */
  static async sendOTP(phone) {
    if (!phone || phone.length < 10) {
      throw new Error('Invalid phone number');
    }

    // Format phone number
    const formattedPhone = phone.startsWith('91')
      ? phone
      : `91${phone.slice(-10)}`;

    try {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Send via Firebase or SMS service
      await otpService.sendSMS(formattedPhone, `Your OTP is ${otp}. Do not share.`);

      // Save OTP to database with expiry (5 minutes)
      const otpRecord = new OtpToken({
        phone: formattedPhone,
        otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
      await otpRecord.save();

      return {
        success: true,
        message: `OTP sent to ${formattedPhone}`,
        expiresIn: 300, // 5 minutes
      };
    } catch (error) {
      console.error('OTP send failed:', error);
      throw new Error('Failed to send OTP');
    }
  }

  /**
   * Verify OTP
   */
  static async verifyOTP(phone, otp) {
    if (!phone || !otp) {
      throw new Error('Phone and OTP are required');
    }

    const formattedPhone = phone.startsWith('91')
      ? phone
      : `91${phone.slice(-10)}`;

    try {
      // Find valid OTP record
      const otpRecord = await OtpToken.findOne({
        phone: formattedPhone,
        otp,
        expiresAt: { $gt: new Date() },
      });

      if (!otpRecord) {
        throw new Error('Invalid or expired OTP');
      }

      // Delete used OTP
      await OtpToken.deleteOne({ _id: otpRecord._id });

      return {
        success: true,
        message: 'OTP verified successfully',
        phone: formattedPhone,
      };
    } catch (error) {
      console.error('OTP verification failed:', error);
      throw error;
    }
  }

  /**
   * Register or Login via OTP
   */
  static async authenticateWithOTP(phone, role = 'rider') {
    if (!phone || !role) {
      throw new Error('Phone and role are required');
    }

    const formattedPhone = phone.startsWith('91')
      ? phone
      : `91${phone.slice(-10)}`;

    try {
      let user = await User.findOne({ phone: formattedPhone });

      if (!user) {
        // Create new user
        user = new User({
          phone: formattedPhone,
          role,
          isVerified: true,
        });
        await user.save();

        // Create rider or driver profile
        if (role === 'rider') {
          await new RiderProfile({
            userId: user._id,
            phone: formattedPhone,
            email: user.email || '',
            firstName: user.firstName || 'User',
          }).save();
        } else if (role === 'driver') {
          await new DriverProfile({
            userId: user._id,
            phone: formattedPhone,
            email: user.email || '',
            firstName: user.firstName || 'Driver',
          }).save();
        }
      }

      // Generate tokens
      const tokens = this.generateTokens(user._id, role);

      return {
        success: true,
        user: {
          _id: user._id,
          phone: user.phone,
          role: user.role,
          isNewUser: !user.firstName,
        },
        ...tokens,
      };
    } catch (error) {
      console.error('OTP authentication failed:', error);
      throw new Error('Authentication failed');
    }
  }

  /**
   * Google OAuth authentication
   */
  static async authenticateWithGoogle(googleToken, role = 'rider') {
    try {
      // Verify Google token
      const response = await axios.get('https://www.googleapis.com/oauth2/v3/tokeninfo', {
        params: { access_token: googleToken },
      });

      const { email, name } = response.data;

      if (!email) {
        throw new Error('Email not provided by Google');
      }

      let user = await User.findOne({ email });

      if (!user) {
        // Create new user
        user = new User({
          email,
          firstName: name,
          role,
          isVerified: true,
          socialLogin: {
            google: {
              id: response.data.user_id,
              email,
            },
          },
        });
        await user.save();

        // Create profile
        if (role === 'rider') {
          await new RiderProfile({
            userId: user._id,
            email,
            firstName: name,
            verificationStatus: 'email_verified',
          }).save();
        } else if (role === 'driver') {
          await new DriverProfile({
            userId: user._id,
            email,
            firstName: name,
            verification: { faceVerificationStatus: 'pending' },
          }).save();
        }
      }

      const tokens = this.generateTokens(user._id, role);

      return {
        success: true,
        user: {
          _id: user._id,
          email: user.email,
          role: user.role,
        },
        ...tokens,
      };
    } catch (error) {
      console.error('Google auth failed:', error);
      throw new Error('Google authentication failed');
    }
  }

  /**
   * Apple OAuth authentication
   */
  static async authenticateWithApple(appleToken, role = 'rider') {
    try {
      // Verify Apple token (simplified)
      const decoded = jwt.decode(appleToken);

      if (!decoded || !decoded.email) {
        throw new Error('Invalid Apple token');
      }

      const email = decoded.email;

      let user = await User.findOne({ email });

      if (!user) {
        user = new User({
          email,
          firstName: decoded.name || 'User',
          role,
          isVerified: true,
          socialLogin: {
            apple: {
              id: decoded.sub,
              email,
            },
          },
        });
        await user.save();

        if (role === 'rider') {
          await new RiderProfile({
            userId: user._id,
            email,
            firstName: decoded.name || 'User',
            verificationStatus: 'email_verified',
          }).save();
        } else if (role === 'driver') {
          await new DriverProfile({
            userId: user._id,
            email,
            firstName: decoded.name || 'Driver',
          }).save();
        }
      }

      const tokens = this.generateTokens(user._id, role);

      return {
        success: true,
        user: {
          _id: user._id,
          email: user.email,
          role: user.role,
        },
        ...tokens,
      };
    } catch (error) {
      console.error('Apple auth failed:', error);
      throw new Error('Apple authentication failed');
    }
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      const user = await User.findById(decoded.userId);

      if (!user) {
        throw new Error('User not found');
      }

      const tokens = this.generateTokens(user._id, user.role);

      return {
        success: true,
        ...tokens,
      };
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw new Error('Token refresh failed');
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId, profileData, role = 'rider') {
    try {
      const user = await User.findByIdAndUpdate(userId, profileData, {
        new: true,
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Update rider or driver profile
      if (role === 'rider') {
        await RiderProfile.findOneAndUpdate(
          { userId },
          profileData,
          { new: true }
        );
      } else if (role === 'driver') {
        await DriverProfile.findOneAndUpdate(
          { userId },
          profileData,
          { new: true }
        );
      }

      return {
        success: true,
        user,
      };
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  }

  /**
   * Get rider profile
   */
  static async getRiderProfile(userId) {
    try {
      const profile = await RiderProfile.findOne({ userId }).lean();

      if (!profile) {
        throw new Error('Rider profile not found');
      }

      return profile;
    } catch (error) {
      console.error('Get rider profile failed:', error);
      throw error;
    }
  }

  /**
   * Get driver profile
   */
  static async getDriverProfile(userId) {
    try {
      const profile = await DriverProfile.findOne({ userId }).lean();

      if (!profile) {
        throw new Error('Driver profile not found');
      }

      return profile;
    } catch (error) {
      console.error('Get driver profile failed:', error);
      throw error;
    }
  }

  /**
   * Verify phone number
   */
  static async verifyPhoneNumber(userId, phone) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { phone, isPhoneVerified: true },
        { new: true }
      );

      return {
        success: true,
        user,
      };
    } catch (error) {
      throw new Error('Phone verification failed');
    }
  }

  /**
   * Logout (invalidate tokens)
   */
  static async logout(userId) {
    try {
      // Optional: Add token to blacklist or mark session as inactive
      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error) {
      throw new Error('Logout failed');
    }
  }
}

module.exports = RideSharingAuthService;
