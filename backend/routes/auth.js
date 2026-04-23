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
    const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
    const sesClient = new SESClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    return sesClient;
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

// Generate a unique username for new user registration
const generateUniqueUsername = async (email) => {
  // Extract the local part of the email (before @)
  const baseUsername = email.split('@')[0].toLowerCase().trim();
  
  // Validate and sanitize the base username
  let username = baseUsername.replace(/[^a-z0-9_-]/g, '_').substring(0, 20);
  
  // If the sanitized username is empty or too short, use a prefixed version
  if (!username || username.length < 3) {
    username = 'user_' + Math.random().toString(36).substring(2, 8);
  }
  
  // Check if username already exists
  let counter = 0;
  let finalUsername = username;
  
  while (true) {
    const existingUser = await User.findOne({ username: finalUsername.toLowerCase() });
    
    if (!existingUser) {
      return finalUsername;
    }
    
    // If exists, append a number and try again
    counter++;
    finalUsername = `${username}_${counter}`;
    
    // Safety check to prevent infinite loops
    if (counter > 100) {
      // Fallback to random username
      finalUsername = 'user_' + Math.random().toString(36).substring(2, 12);
      break;
    }
  }
  
  return finalUsername;
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

      // Generate a unique username for the user at registration time
      const username = await generateUniqueUsername(email);

      user = await User.findOneAndUpdate(
        { email },
        {
          email,
          username,
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
          <h2>NilaHub One-Time Password</h2>
          <p>Use the following OTP to complete your login:</p>
          <p style="font-size: 24px; font-weight: 700; color: #d4af37;">${otpCode}</p>
          <p>This code is valid for 15 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `;

      if (process.env.EMAIL_SERVICE === 'gmail-api') {
        await sendEmailViaGmail(email, 'Your NilaHub OTP', htmlContent);
      } else if (process.env.EMAIL_SERVICE === 'ses') {
        const ses = getEmailService();
        await ses.sendEmail({
          Source: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          Destination: { ToAddresses: [email] },
          Message: {
            Subject: { Data: 'Your NilaHub OTP' },
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
          from: `NilaHub <${fromAddress}>`,
          to: email,
          subject: 'Your NilaHub OTP',
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

    // Check if username setup is needed (for first-time users)
    const needsUsernameSetup = !user.username;

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
      needsUsernameSetup,
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

// ============ DIAGNOSTIC ENDPOINT ============
// Check if email exists in database (for debugging sync issues)
router.get('/debug/user/:email', authenticate, async (req, res, next) => {
  try {
    const { email } = req.params;
    
    // Only allow in development or for admins
    if (process.env.NODE_ENV === 'production' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).lean();
    
    res.json({
      email,
      exists: !!user,
      user: user ? {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        registrationType: user.registrationType,
      } : null,
      message: user ? 'User found in database' : 'User NOT found in database',
    });
  } catch (error) {
    logger.error('Debug endpoint error:', error);
    res.status(500).json({ message: 'Error checking user', error: error.message });
  }
});

// Username availability check
router.get('/check-username', async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || username.length < 3 || username.length > 20) {
      return res.status(400).json({
        success: false,
        available: false,
        message: 'Username must be between 3 and 20 characters',
      });
    }

    // Username must be alphanumeric with optional underscores/dashes
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({
        success: false,
        available: false,
        message: 'Username can only contain letters, numbers, underscores, and dashes',
      });
    }

    const existingUser = await User.findOne({ username: username.toLowerCase() });

    res.json({
      success: true,
      available: !existingUser,
      username: username.toLowerCase(),
      message: existingUser ? 'Username is already taken' : 'Username is available',
    });
  } catch (error) {
    logger.error('Username check error:', error);
    res.status(500).json({
      success: false,
      available: false,
      message: 'Error checking username availability',
      error: error.message,
    });
  }
});

/**
 * Set Username for Current User (First-time setup)
 * POST /api/auth/set-username
 * Body: { username }
 */
router.post('/set-username', authenticate, async (req, res) => {
  try {
    const { username } = req.body;
    const userId = req.user._id;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'Username must be between 3 and 20 characters',
      });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username can only contain letters, numbers, underscores, and dashes',
      });
    }

    const normalizedUsername = username.toLowerCase().trim();

    // Check if username already exists
    const existingUser = await User.findOne({ 
      username: normalizedUsername,
      _id: { $ne: userId } // Exclude current user
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username is already taken',
      });
    }

    // Update user with username
    const user = useMemoryAuth()
      ? await devAuthStore.updateUserUsername(userId, normalizedUsername)
      : await User.findByIdAndUpdate(
          userId,
          { username: normalizedUsername },
          { new: true }
        );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    logger.info(`Username set for user ${userId}: ${normalizedUsername}`);

    res.json({
      success: true,
      message: 'Username set successfully',
      user: serializeUser(user),
    });
  } catch (error) {
    logger.error('Error setting username:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to set username',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * Set Chat-Specific Username
 * POST /api/auth/set-chat-username
 * Body: { chatUsername }
 */
router.post('/set-chat-username', authenticate, async (req, res) => {
  try {
    const { chatUsername } = req.body;
    const userId = req.user._id;

    // Allow empty chat username (to unset it)
    if (chatUsername && (chatUsername.length < 3 || chatUsername.length > 20)) {
      return res.status(400).json({
        success: false,
        message: 'Chat username must be between 3 and 20 characters',
      });
    }

    if (chatUsername && !/^[a-zA-Z0-9_-]+$/.test(chatUsername)) {
      return res.status(400).json({
        success: false,
        message: 'Chat username can only contain letters, numbers, underscores, and dashes',
      });
    }

    const normalizedChatUsername = chatUsername ? chatUsername.toLowerCase().trim() : null;

    // Check if chat username already exists (if setting, not unsetting)
    if (normalizedChatUsername) {
      const existingUser = await User.findOne({ 
        chatUsername: normalizedChatUsername,
        _id: { $ne: userId } // Exclude current user
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Chat username is already taken',
        });
      }
    }

    // Update user with chat username
    const user = useMemoryAuth()
      ? await devAuthStore.updateUserChatUsername(userId, normalizedChatUsername)
      : await User.findByIdAndUpdate(
          userId,
          { chatUsername: normalizedChatUsername },
          { new: true }
        );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    logger.info(`Chat username updated for user ${userId}: ${normalizedChatUsername || 'unset'}`);

    res.json({
      success: true,
      message: normalizedChatUsername ? 'Chat username set successfully' : 'Chat username removed',
      user: serializeUser(user),
    });
  } catch (error) {
    logger.error('Error setting chat username:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to set chat username',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * Check Chat Username Availability
 * GET /api/auth/check-chat-username
 * Query: { chatUsername }
 */
router.get('/check-chat-username', async (req, res) => {
  try {
    const { chatUsername } = req.query;

    if (!chatUsername || chatUsername.length < 3 || chatUsername.length > 20) {
      return res.status(400).json({
        success: false,
        available: false,
        message: 'Chat username must be between 3 and 20 characters',
      });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(chatUsername)) {
      return res.status(400).json({
        success: false,
        available: false,
        message: 'Chat username can only contain letters, numbers, underscores, and dashes',
      });
    }

    const existingUser = await User.findOne({ chatUsername: chatUsername.toLowerCase() });

    res.json({
      success: true,
      available: !existingUser,
      chatUsername: chatUsername.toLowerCase(),
      message: existingUser ? 'Chat username is already taken' : 'Chat username is available',
    });
  } catch (error) {
    logger.error('Chat username check error:', error);
    res.status(500).json({
      success: false,
      available: false,
      message: 'Error checking chat username availability',
      error: error.message,
    });
  }
});

/**
 * Get User Visibility Settings
 * GET /api/auth/visibility
 */
router.get('/visibility', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      visibility: user.visibility || {
        visibleViaPhone: true,
        visibleViaEmail: true,
        visibleViaUsername: true,
      },
    });
  } catch (error) {
    logger.error('Error fetching visibility settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching visibility settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * Update User Visibility Settings
 * POST /api/auth/visibility
 * Body: { visibleViaPhone, visibleViaEmail, visibleViaUsername }
 */
router.post('/visibility', authenticate, async (req, res) => {
  try {
    const { visibleViaPhone, visibleViaEmail, visibleViaUsername } = req.body;
    const userId = req.user._id;

    // Ensure at least one visibility method is enabled
    const enabledMethods = [visibleViaPhone, visibleViaEmail, visibleViaUsername].filter(v => v === true).length;
    if (enabledMethods === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one visibility method must be enabled',
      });
    }

    const updatedVisibility = {
      visibleViaPhone: visibleViaPhone === true,
      visibleViaEmail: visibleViaEmail === true,
      visibleViaUsername: visibleViaUsername === true,
    };

    const user = useMemoryAuth()
      ? await devAuthStore.updateUserVisibility(userId, updatedVisibility)
      : await User.findByIdAndUpdate(
          userId,
          { visibility: updatedVisibility },
          { new: true }
        );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    logger.info(`Visibility settings updated for user ${userId}:`, updatedVisibility);

    res.json({
      success: true,
      message: 'Visibility settings updated successfully',
      visibility: user.visibility,
    });
  } catch (error) {
    logger.error('Error updating visibility settings:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to update visibility settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * Get User Contact Means Preferences
 * GET /api/auth/contact-means
 */
router.get('/contact-means', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      contactMeans: user.contactMeans || {
        availableForChat: true,
        availableForVoiceCall: true,
        availableForVideoCall: true,
      },
    });
  } catch (error) {
    logger.error('Error fetching contact means settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contact means settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * Update User Contact Means Preferences
 * POST /api/auth/contact-means
 * Body: { availableForChat, availableForVoiceCall, availableForVideoCall }
 */
router.post('/contact-means', authenticate, async (req, res) => {
  try {
    const { availableForChat, availableForVoiceCall, availableForVideoCall } = req.body;
    const userId = req.user._id;

    // Ensure at least one contact means is enabled
    const enabledMeans = [availableForChat, availableForVoiceCall, availableForVideoCall].filter(v => v === true).length;
    if (enabledMeans === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one contact means must be enabled',
      });
    }

    const updatedContactMeans = {
      availableForChat: availableForChat === true,
      availableForVoiceCall: availableForVoiceCall === true,
      availableForVideoCall: availableForVideoCall === true,
    };

    const user = useMemoryAuth()
      ? await devAuthStore.updateUserContactMeans(userId, updatedContactMeans)
      : await User.findByIdAndUpdate(
          userId,
          { contactMeans: updatedContactMeans },
          { new: true }
        );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    logger.info(`Contact means settings updated for user ${userId}:`, updatedContactMeans);

    res.json({
      success: true,
      message: 'Contact means settings updated successfully',
      contactMeans: user.contactMeans,
    });
  } catch (error) {
    logger.error('Error updating contact means settings:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to update contact means settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;
