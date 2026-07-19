/**
 * Auth Service
 * Business logic for authentication
 */

const User = require('../models/User.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../../../shared/utils/logger');
const redis = require('../../../shared/config/redis');

class AuthService {
  /**
   * Generate JWT token
   */
  generateToken(user) {
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      roles: user.roles,
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(user) {
    const payload = {
      userId: user._id,
      type: 'refresh',
    };

    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
    });
  }

  /**
   * Verify token
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if token is blacklisted
      const isBlacklisted = await redis.exists(`blacklist:${token}`);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      const user = await User.findById(decoded.userId).select('-mpinHash');
      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Register new user with OTP
   */
  async register(userData) {
    try {
      const { email, name, phone, authMethod = 'email_otp' } = userData;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { phone: phone || '' }],
      });

      if (existingUser) {
        throw new Error('User already exists with this email or phone');
      }

      // Create user
      const user = await User.create({
        email,
        name,
        phone,
        authMethod,
        role: 'user',
        roles: ['user'],
      });

      logger.info(`User registered: ${email}`);

      // Generate tokens
      const token = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);

      return {
        user: user.toJSON(),
        token,
        refreshToken,
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login with MPIN
   */
  async loginWithMpin(email, mpin) {
    try {
      // Find user with mpin hash selected
      const user = await User.findOne({ email }).select('+mpinHash');

      if (!user) {
        throw new Error('Invalid credentials');
      }

      if (!user.mpinEnabled || !user.mpinHash) {
        throw new Error('MPIN not set for this account');
      }

      // Check if MPIN is blocked
      if (user.mpinBlockedUntil && user.mpinBlockedUntil > new Date()) {
        const remainingMinutes = Math.ceil(
          (user.mpinBlockedUntil - new Date()) / 60000
        );
        throw new Error(
          `MPIN blocked. Try again in ${remainingMinutes} minutes`
        );
      }

      // Verify MPIN
      const isValid = await bcrypt.compare(mpin, user.mpinHash);

      if (!isValid) {
        // Increment failed attempts
        user.mpinFailedAttempts += 1;

        // Block after 3 failed attempts
        if (user.mpinFailedAttempts >= 3) {
          user.mpinBlockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
          await user.save();
          throw new Error('Too many failed attempts. MPIN blocked for 15 minutes');
        }

        await user.save();
        throw new Error('Invalid MPIN');
      }

      // Reset failed attempts on successful login
      user.mpinFailedAttempts = 0;
      user.mpinBlockedUntil = null;
      await user.save();

      logger.info(`User logged in with MPIN: ${email}`);

      // Generate tokens
      const token = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);

      return {
        user: user.toJSON(),
        token,
        refreshToken,
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Set/Update MPIN
   */
  async setMpin(userId, mpin) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Hash MPIN
      const mpinHash = await bcrypt.hash(mpin, 10);

      user.mpinHash = mpinHash;
      user.mpinEnabled = true;
      user.mpinFailedAttempts = 0;
      user.mpinBlockedUntil = null;
      user.mpinUpdatedAt = new Date();

      await user.save();

      logger.info(`MPIN set for user: ${user.email}`);

      return { success: true, message: 'MPIN set successfully' };
    } catch (error) {
      logger.error('Set MPIN error:', error);
      throw error;
    }
  }

  /**
   * Logout - Blacklist token
   */
  async logout(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded) {
        throw new Error('Invalid token');
      }

      // Calculate TTL (time until token expires)
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

      if (expiresIn > 0) {
        // Add token to blacklist in Redis
        await redis.set(`blacklist:${token}`, 'true', expiresIn);
      }

      logger.info(`User logged out`);

      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new access token
      const token = this.generateToken(user);

      return { token };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Verify phone number
   */
  async verifyPhone(userId) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      user.isPhoneVerified = true;
      user.phoneVerifiedAt = new Date();
      await user.save();

      logger.info(`Phone verified for user: ${user.email}`);

      return { success: true, message: 'Phone verified successfully' };
    } catch (error) {
      logger.error('Phone verification error:', error);
      throw error;
    }
  }

  /**
   * Get user profile
   */
  async getProfile(userId) {
    try {
      const user = await User.findById(userId).select('-mpinHash');

      if (!user) {
        throw new Error('User not found');
      }

      return user.toJSON();
    } catch (error) {
      logger.error('Get profile error:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();
