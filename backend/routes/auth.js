const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');
const OtpToken = require('../models/OtpToken');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');
const { authenticate, getJwtSecret } = require('../middleware/auth');
const devAuthStore = require('../utils/devAuthStore');
const { initializeGmailAuth, sendEmailViaGmail } = require('../config/gmail');

const useMemoryAuth = () => {
  return process.env.AUTH_STORAGE === 'memory' && process.env.NODE_ENV !== 'production';
};

const hasRealEmailConfig = () => {
  // Check Gmail API
  if (process.env.EMAIL_SERVICE === 'gmail-api') {
    return !!process.env.GMAIL_USER;
  }
  // Check for SES
  if (process.env.EMAIL_SERVICE === 'ses') {
    return !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      !process.env.AWS_ACCESS_KEY_ID.includes('your-')
    );
  }
  // Check for SMTP
  const values = [
    process.env.EMAIL_USER,
    process.env.EMAIL_PASS,
    process.env.EMAIL_FROM,
  ];
  return values.every((value) => value && !value.includes('your-'));
};

// Dynamic email service based on environment
const getEmailService = () => {
  if (process.env.EMAIL_SERVICE === 'gmail-api') {
    return 'gmail-api'; // Will be handled separately
  }

  if (process.env.EMAIL_SERVICE === 'ses') {
    const AWS = require('aws-sdk');
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
    });
    return new AWS.SES({ apiVersion: '2010-12-01' });
  }

  // Default to nodemailer
  const nodemailer = require('nodemailer');
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const router = express.Router();
const AUTH_COOKIE_NAME = 'mb_auth_token';
const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Validation schemas
const emailSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim(),
});

const otpSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim(),
  otp: Joi.string().pattern(/^\d{6}$/).required(),
});

// Utility functions
const hashOtp = (code) => {
  return crypto.createHash('sha256').update(code).digest('hex');
};

const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const createAuthToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
    },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'malabarbazaar-api',
      audience: 'malabarbazaar-web',
    }
  );
};

const serializeUser = (user) => {
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    phone: user.phone || '',
    age: Number.isFinite(user.age) ? user.age : null,
    gender: user.gender || '',
    religion: user.religion || '',
    caste: user.caste || '',
    community: user.community || '',
    education: user.education || '',
    profession: user.profession || '',
    location: user.location || '',
    maritalStatus: user.maritalStatus || '',
    familyDetails: user.familyDetails || '',
    bio: user.bio || '',
    languages: Array.isArray(user.languages) ? user.languages : [],
    hobbies: Array.isArray(user.hobbies) ? user.hobbies : [],
    privacy: {
      hidePhone: Boolean(user.privacy?.hidePhone),
      hidePhotos: Boolean(user.privacy?.hidePhotos),
    },
    premiumOnlyContact: Boolean(user.premiumOnlyContact),
    businessName: user.businessName || '',
    registrationType: user.registrationType || 'user',
    role: user.role || 'user',
    roles: Array.isArray(user.roles) ? user.roles : [user.role || user.registrationType || 'user'],
    selectedBusinessCategories: Array.isArray(user.selectedBusinessCategories)
      ? user.selectedBusinessCategories
      : [],
    selectedCategoryDetails: Array.isArray(user.selectedCategoryDetails)
      ? user.selectedCategoryDetails
      : [],
    cart: Array.isArray(user.cart) ? user.cart : [],
    favorites: Array.isArray(user.favorites) ? user.favorites : [],
    savedAddresses: Array.isArray(user.savedAddresses) ? user.savedAddresses : [],
    preferences: {
      language: user.preferences?.language || 'en',
      soulmatchOnboardingSeen: Boolean(user.preferences?.soulmatchOnboardingSeen),
    },
  };
};

const getAuthCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: AUTH_COOKIE_MAX_AGE_MS,
  path: '/',
});

const patchUserSchema = Joi.object({
  name: Joi.string().allow('').trim().max(120),
  email: Joi.string().email().lowercase().trim().optional(),
  phone: Joi.string().allow('').trim().max(30),
  age: Joi.number().min(18).max(100).allow(null),
  gender: Joi.string().allow('').trim().max(30),
  religion: Joi.string().allow('').trim().max(60),
  caste: Joi.string().allow('').trim().max(60),
  community: Joi.string().allow('').trim().max(60),
  education: Joi.string().allow('').trim().max(120),
  profession: Joi.string().allow('').trim().max(120),
  location: Joi.string().allow('').trim().max(120),
  maritalStatus: Joi.string().allow('').trim().max(60),
  familyDetails: Joi.string().allow('').trim().max(500),
  bio: Joi.string().allow('').trim().max(500),
  languages: Joi.array().items(Joi.string().trim().max(40)).optional(),
  hobbies: Joi.array().items(Joi.string().trim().max(60)).optional(),
  privacy: Joi.object({
    hidePhone: Joi.boolean().default(false),
    hidePhotos: Joi.boolean().default(false),
  }).optional(),
  premiumOnlyContact: Joi.boolean().optional(),
  businessName: Joi.string().allow('').trim().max(120),
  registrationType: Joi.string().valid('user', 'entrepreneur', 'admin').optional(),
  role: Joi.string().valid('user', 'business', 'admin').optional(),
  roles: Joi.array().items(Joi.string().valid('user', 'entrepreneur', 'admin')).optional(),
  selectedBusinessCategories: Joi.array().items(Joi.object()).optional(),
  selectedCategoryDetails: Joi.array().items(Joi.object()).optional(),
  cart: Joi.array().items(Joi.object()).optional(),
  favorites: Joi.array().items(Joi.object()).optional(),
  savedAddresses: Joi.array().items(Joi.object()).optional(),
  preferences: Joi.object({
    language: Joi.string().trim().max(10).default('en'),
    soulmatchOnboardingSeen: Joi.boolean().optional(),
  }).optional(),
});

// Cache helpers
const getCacheKey = (email, type) => `auth:${type}:${email}`;

const setCache = async (key, value, ttl = 900) => { // 15 minutes default
  try {
    const redisClient = getRedisClient();
    if (redisClient) {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
    }
  } catch (error) {
    logger.warn('Redis cache set failed:', error);
  }
};

const getCache = async (key) => {
  try {
    const redisClient = getRedisClient();
    if (redisClient) {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    }
  } catch (error) {
    logger.warn('Redis cache get failed:', error);
  }
  return null;
};

// Send OTP endpoint
router.post('/send-otp', async (req, res) => {
  try {
    const { error, value } = emailSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { email } = value;

    // Check rate limiting in Redis
    const cacheKey = getCacheKey(email, 'otp_attempts');
    const attempts = await getCache(cacheKey) || 0;

    if (attempts >= 5) { // Max 5 attempts per 15 minutes
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please try again later.'
      });
    }

    // Generate and hash OTP
    const otpCode = generateOTP();
    const otpHash = hashOtp(otpCode);

    let user;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    if (useMemoryAuth()) {
      await devAuthStore.invalidateOtpsByEmail(email);
      await devAuthStore.createOtpToken({ email, otpHash, expiresAt });
      user = await devAuthStore.upsertUserByEmail(email);
    } else {
      await OtpToken.updateMany({ email, used: false }, { used: true });
      const otpToken = new OtpToken({ email, otpHash, expiresAt });
      await otpToken.save();

      user = await User.findOneAndUpdate(
        { email },
        {
          email,
          name: email.split('@')[0],
          avatar: 'User',
          registrationType: 'user',
          role: 'user',
          roles: ['user'],
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    // Send email
    try {
      if (useMemoryAuth() && !hasRealEmailConfig()) {
        logger.warn(`Development OTP for ${email}: ${otpCode}`);
        await setCache(cacheKey, attempts + 1, 900);

        return res.json({
          success: true,
          message: 'Development OTP generated. Configure email for production delivery.',
          devOtp: otpCode,
          user: serializeUser(user),
        });
      }

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #1a2332;">
          <h2>MalabarBazaar One-Time Password</h2>
          <p>Use the following OTP to complete your login:</p>
          <p style="font-size: 24px; font-weight: 700; color: #d4af37;">${otpCode}</p>
          <p>This code is valid for 15 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `;

      if (process.env.EMAIL_SERVICE === 'gmail-api') {
        await sendEmailViaGmail(email, 'Your MalabarBazaar OTP', htmlContent);
      } else if (process.env.EMAIL_SERVICE === 'ses') {
        const ses = getEmailService();
        await ses.sendEmail({
          Source: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          Destination: { ToAddresses: [email] },
          Message: {
            Subject: { Data: 'Your MalabarBazaar OTP' },
            Body: {
              Html: {
                Data: htmlContent,
              },
            },
          },
        }).promise();
      } else {
        const transporter = getEmailService();
        const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER;
        await transporter.sendMail({
          from: `MalabarBazaar <${fromAddress}>`,
          to: email,
          subject: 'Your MalabarBazaar OTP',
          html: htmlContent,
        });
      }

      // Update rate limiting
      await setCache(cacheKey, attempts + 1, 900); // 15 minutes

      logger.info(`OTP sent successfully to ${email}`);
      return res.json({
        success: true,
        message: 'OTP sent to your email',
        user: serializeUser(user),
      });

    } catch (emailError) {
      logger.error('Email send failed:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send email. Please try again later.',
      });
    }

  } catch (error) {
    logger.error('send-otp error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to send OTP. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Verify OTP endpoint
router.post('/verify-otp', async (req, res) => {
  try {
    const { error, value } = otpSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { email, otp } = value;

    // Find valid OTP token
    const otpToken = useMemoryAuth()
      ? await devAuthStore.findLatestValidOtp(email)
      : await OtpToken.findOne({
        email,
        used: false,
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });

    if (!otpToken) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or not found'
      });
    }

    // Verify OTP
    if (hashOtp(otp) !== otpToken.otpHash) {
      const failedKey = getCacheKey(email, 'otp_verify_failures');
      const failedAttempts = await getCache(failedKey) || 0;
      await setCache(failedKey, failedAttempts + 1, 900);

      if (failedAttempts + 1 >= 5) {
        otpToken.used = true;
        await otpToken.save();
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Mark OTP as used
    otpToken.used = true;
    await otpToken.save();

    // Get user
    const user = useMemoryAuth()
      ? await devAuthStore.findUserByEmail(email)
      : await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User record not found'
      });
    }

    // Clear rate limiting on successful verification
    await setCache(getCacheKey(email, 'otp_attempts'), 0, 900);
    await setCache(getCacheKey(email, 'otp_verify_failures'), 0, 900);

    const token = createAuthToken(user);
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    logger.info(`OTP verified successfully for ${email}`);
    return res.json({
      success: true,
      message: 'OTP verified successfully',
      token,
      user: serializeUser(user),
    });

  } catch (error) {
    logger.error('verify-otp error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to verify OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

router.post('/login-email', (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Direct email login has been disabled. Please use OTP verification.',
  });
});

router.get('/me', authenticate, (req, res) => {
  return res.json({
    success: true,
    user: serializeUser(req.user),
  });
});

router.patch('/me', authenticate, async (req, res) => {
  try {
    const { error, value } = patchUserSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    let nextRoles = Array.isArray(req.user.roles) && req.user.roles.length > 0
      ? [...req.user.roles]
      : [req.user.role || req.user.registrationType || 'user'];

    if (Array.isArray(value.roles) && value.roles.length > 0) {
      nextRoles = [...new Set(value.roles)];
    } else if (value.registrationType) {
      nextRoles = [...new Set([...nextRoles, value.registrationType])];
    }

    const updates = {
      ...value,
      roles: nextRoles,
      preferences: {
        ...(req.user.preferences || {}),
        ...(value.preferences || {}),
      },
    };

    const nextUser = useMemoryAuth()
      ? await devAuthStore.updateUserById(req.user._id, updates)
      : await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });

    return res.json({
      success: true,
      user: serializeUser(nextUser),
    });
  } catch (error) {
    logger.error('patch me error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to update profile.',
    });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// Gmail OAuth Authorization - First time setup
router.get('/authorize-gmail', async (req, res) => {
  try {
    const { getAuthUrl } = require('../config/gmail');
    const authUrl = getAuthUrl();
    
    if (!authUrl) {
      return res.status(500).json({
        success: false,
        message: 'Gmail credentials not configured. Download credentials.json from Google Cloud Console and place in backend folder.'
      });
    }

    res.json({
      success: true,
      message: 'Visit this URL to authorize Gmail',
      authUrl: authUrl
    });
  } catch (error) {
    logger.error('Gmail auth URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate authorization URL'
    });
  }
});

// Gmail OAuth Callback
router.post('/authorize-gmail-callback', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code is required'
      });
    }

    const { handleAuthCallback } = require('../config/gmail');
    const success = await handleAuthCallback(code);

    if (success) {
      return res.json({
        success: true,
        message: 'Gmail authorized successfully!'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Failed to authorize Gmail'
      });
    }
  } catch (error) {
    logger.error('Gmail callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization failed'
    });
  }
});

module.exports = router;
