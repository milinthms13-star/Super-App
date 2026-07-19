const User = require('../models/User.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const redis = require('../config/redis');

class AuthService {
  generateToken(user) {
    return jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
  }

  generateRefreshToken(user) {
    return jwt.sign(
      { userId: user._id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
    );
  }

  async register(userData) {
    const { email, name, phone, authMethod = 'email_otp' } = userData;
    
    const existingUser = await User.findOne({ $or: [{ email }, { phone: phone || '' }] });
    if (existingUser) {
      throw new Error('User already exists');
    }

    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    const user = await User.create({
      email,
      name,
      phone,
      username,
      authMethod,
    });

    logger.info(`User registered: ${email}`);

    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return { user: user.toJSON(), token, refreshToken };
  }

  async loginWithMpin(email, mpin) {
    const user = await User.findOne({ email }).select('+mpinHash');
    if (!user || !user.mpinEnabled) {
      throw new Error('Invalid credentials');
    }

    if (user.mpinBlockedUntil && user.mpinBlockedUntil > new Date()) {
      throw new Error('MPIN blocked. Try again later');
    }

    const isValid = await bcrypt.compare(mpin, user.mpinHash);
    if (!isValid) {
      user.mpinFailedAttempts += 1;
      if (user.mpinFailedAttempts >= 3) {
        user.mpinBlockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save();
      throw new Error('Invalid MPIN');
    }

    user.mpinFailedAttempts = 0;
    user.mpinBlockedUntil = null;
    await user.save();

    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);

    logger.info(`User logged in: ${email}`);
    return { user: user.toJSON(), token, refreshToken };
  }

  async setMpin(userId, mpin) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    user.mpinHash = await bcrypt.hash(mpin, 10);
    user.mpinEnabled = true;
    user.mpinFailedAttempts = 0;
    await user.save();

    logger.info(`MPIN set for user: ${user.email}`);
    return { success: true, message: 'MPIN set successfully' };
  }

  async logout(token) {
    const decoded = jwt.decode(token);
    if (!decoded) throw new Error('Invalid token');

    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
    if (expiresIn > 0) {
      await redis.set(`blacklist:${token}`, 'true', 'EX', expiresIn);
    }

    return { success: true, message: 'Logged out successfully' };
  }

  async verifyToken(token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const isBlacklisted = await redis.exists(`blacklist:${token}`);
    if (isBlacklisted) throw new Error('Token revoked');

    const user = await User.findById(decoded.userId);
    if (!user) throw new Error('User not found');

    return user;
  }
}

module.exports = new AuthService();
