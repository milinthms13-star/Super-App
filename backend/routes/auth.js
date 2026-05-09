const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const multer = require('multer');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const OtpToken = require('../models/OtpToken');
const { getRedisClient } = require('../config/redis');
const {
  sendEmailViaGmail,
  hasGmailClientConfig,
  hasGmailDeliveryConfig,
} = require('../config/gmail');
const logger = require('../utils/logger');
const { authenticate, getJwtSecret } = require('../middleware/auth');
const devAuthStore = require('../utils/devAuthStore');

const router = express.Router();
const upload = multer({ dest: 'uploads/kyc/' });
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ||
  `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`;

// Get profile completion score for current user
router.get('/profile/completion', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, score: user.profileCompletionScore });
  } catch (error) {
    logger.error('Profile completion score error:', error);
    res.status(500).json({ success: false, message: 'Failed to get profile completion score', error: error.message });
  }
});
// --- KYC Verification Endpoints ---

// Submit KYC documents (user)
router.post('/kyc/submit', authenticate, upload.array('documents', 5), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Accepts files and optional docType in body
    const docs = (req.files || []).map((file, idx) => ({
      type: req.body.docType?.[idx] || req.body.docType || 'other',
      url: `/uploads/kyc/${file.filename}`,
      originalName: file.originalname,
      uploadedAt: new Date(),
      status: 'pending',
      remarks: ''
    }));
    user.kycDocuments = [...(user.kycDocuments || []), ...docs];
    user.kycStatus = 'pending';
    user.kycHistory = [...(user.kycHistory || []), { status: 'pending', changedAt: new Date(), remarks: 'Submitted by user' }];
    await user.save();
    res.json({ success: true, message: 'KYC documents submitted', kycStatus: user.kycStatus, kycDocuments: user.kycDocuments });
  } catch (error) {
    logger.error('KYC submit error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit KYC', error: error.message });
  }
});

// Get KYC status (user)
router.get('/kyc/status', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, kycStatus: user.kycStatus, kycDocuments: user.kycDocuments });
  } catch (error) {
    logger.error('KYC status error:', error);
    res.status(500).json({ success: false, message: 'Failed to get KYC status', error: error.message });
  }
});

// Admin: Update KYC status
router.post('/kyc/admin/update', authenticate, async (req, res) => {
  try {
    // Only admin can update
    if (!req.user || (req.user.role !== 'admin' && !req.user.roles?.includes('admin'))) {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const { userId, status, remarks } = req.body;
    if (!userId || !status) return res.status(400).json({ success: false, message: 'userId and status required' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.kycStatus = status;
    user.kycLastChecked = new Date();
    user.kycHistory = [...(user.kycHistory || []), { status, changedAt: new Date(), remarks: remarks || '', adminId: req.user._id }];
    await user.save();
    res.json({ success: true, message: 'KYC status updated', kycStatus: user.kycStatus });
  } catch (error) {
    logger.error('KYC admin update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update KYC status', error: error.message });
  }
});
// Google OAuth2

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email'],
    passReqToCallback: true
  }, async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Find or create user
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        // Try by email
        const email = profile.emails && profile.emails[0] && profile.emails[0].value;
        user = await User.findOne({ email });
        if (user) {
          user.googleId = profile.id;
          user.googleEmails = Array.from(new Set([...(user.googleEmails || []), email]));
          await user.save();
        } else {
          // Create new user
          user = await User.create({
            email,
            username: await generateUniqueUsername(email),
            name: profile.displayName || email,
            avatar: profile.photos && profile.photos[0] && profile.photos[0].value,
            googleId: profile.id,
            googleEmails: [email],
            registrationType: 'user',
            role: 'user',
            roles: ['user'],
          });
        }
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));
}

router.use(passport.initialize());
// Google OAuth2 login endpoint
router.get('/google', (req, res, next) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ success: false, message: 'Google OAuth not configured' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

// Google OAuth2 callback endpoint
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user) => {
    if (err || !user) {
      return res.status(401).json({ success: false, message: 'Google login failed', error: err && err.message });
    }
    // Issue JWT and set cookie
    const token = createAuthToken(user);
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
    // Optionally redirect to frontend with token
    const redirectUrl = `${process.env.FRONTEND_URL || '/'}?social=google&token=${token}`;
    res.redirect(redirectUrl);
  })(req, res, next);
});

const useMemoryAuth = () => {
  return process.env.AUTH_STORAGE === 'memory' && process.env.NODE_ENV !== 'production';
};

const getEmailMode = () => {
  const rawMode = String(
    process.env.EMAIL_SERVICE ||
      process.env.EMAIL_PROVIDER ||
      'smtp'
  )
    .trim()
    .toLowerCase();

  if (rawMode === 'gmail') {
    return 'smtp';
  }

  if (rawMode === 'sendgrid') {
    return 'smtp';
  }

  return rawMode;
};

const getSmtpConfig = () => {
  const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT) || 587;
  const secureFlag = process.env.EMAIL_SECURE ?? process.env.SMTP_SECURE;

  return {
    host: process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: secureFlag === 'true' || port === 465,
    user:
      process.env.EMAIL_USER ||
      process.env.SMTP_USER ||
      process.env.GMAIL_USER ||
      '',
    pass:
      process.env.EMAIL_PASS ||
      process.env.SMTP_PASSWORD ||
      process.env.GMAIL_APP_PASSWORD ||
      '',
    from:
      process.env.EMAIL_FROM ||
      process.env.SMTP_FROM_EMAIL ||
      process.env.SENDGRID_FROM_EMAIL ||
      process.env.EMAIL_USER ||
      process.env.SMTP_USER ||
      process.env.GMAIL_USER ||
      '',
  };
};

const EMAIL_OPERATION_TIMEOUT_MS = Number(process.env.EMAIL_OPERATION_TIMEOUT_MS) || 8000;
const RENDER_RESTRICTED_SMTP_PORTS = new Set([25, 465, 587]);

const isRenderEnvironment = () => String(process.env.RENDER || '').toLowerCase() === 'true';

const isRenderSmtpPortRestricted = (mode = getEmailMode(), smtpConfig = getSmtpConfig()) => {
  return (
    isRenderEnvironment() &&
    mode === 'smtp' &&
    RENDER_RESTRICTED_SMTP_PORTS.has(Number(smtpConfig.port))
  );
};

const withTimeout = async (promise, timeoutMs, message) => {
  let timerId;

  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timerId = setTimeout(() => {
          const timeoutError = new Error(message || 'Operation timed out');
          timeoutError.code = 'ETIMEDOUT';
          timeoutError.isOperationalTimeout = true;
          reject(timeoutError);
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timerId);
  }
};

const getProviderSpecificEmailFailureMessage = (error, mode = getEmailMode()) => {
  const errorCode = String(error?.name || error?.Code || error?.code || '').trim();
  const errorMessage = String(error?.message || '');

  if (mode === 'ses') {
    if (
      errorCode === 'MessageRejected' ||
      /email address is not verified|address not verified|mailbox simulator|sandbox/i.test(errorMessage)
    ) {
      return (
        'AWS SES rejected the email. Verify EMAIL_FROM in SES, and if the SES account is still in sandbox, ' +
        'you can only send to verified recipient addresses.'
      );
    }

    if (
      ['AccessDeniedException', 'InvalidClientTokenId', 'SignatureDoesNotMatch', 'UnrecognizedClientException', 'AuthFailure'].includes(errorCode) ||
      /security token|credential|access denied|signature/i.test(errorMessage)
    ) {
      return 'AWS SES credentials are invalid or missing send permissions. Check AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and IAM SES access.';
    }

    if (errorCode === 'ThrottlingException' || /throttl|rate exceeded|too many requests/i.test(errorMessage)) {
      return 'AWS SES rate limit reached. Please try again in a few minutes.';
    }
  }

  if (
    mode === 'smtp' &&
    (/invalid login|username and password not accepted|auth/i.test(errorMessage) ||
      ['EAUTH', 'EENVELOPE'].includes(errorCode))
  ) {
    return 'SMTP authentication failed. Check EMAIL_USER, EMAIL_PASS, and EMAIL_FROM. For Gmail, use an app password.';
  }

  return null;
};

const getEmailFailureMessage = (error, mode = getEmailMode(), smtpConfig = getSmtpConfig()) => {
  const providerSpecificMessage = getProviderSpecificEmailFailureMessage(error, mode);
  if (providerSpecificMessage) {
    return providerSpecificMessage;
  }

  if (isRenderSmtpPortRestricted(mode, smtpConfig)) {
    return (
      `SMTP email delivery on port ${smtpConfig.port} can fail on Render free web services. ` +
      'Switch EMAIL_SERVICE to gmail-api or ses, or upgrade the Render web service.'
    );
  }

  if (error?.code === 'ETIMEDOUT' || error?.isOperationalTimeout) {
    return 'Email delivery timed out. Please try again, or switch to a non-SMTP email provider.';
  }

  return 'Failed to send email. Please try again later.';
};

const hasRealEmailConfig = () => {
  const mode = getEmailMode();

  if (mode === 'gmail-api') {
    return hasGmailDeliveryConfig();
  }

  if (mode === 'ses') {
    return !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.EMAIL_FROM &&
      !process.env.AWS_ACCESS_KEY_ID.includes('your-')
    );
  }

  const smtpConfig = getSmtpConfig();
  return [smtpConfig.user, smtpConfig.pass, smtpConfig.from].every(
    (value) => value && !String(value).includes('your-')
  );
};

// Dynamic email service based on environment
const getEmailService = () => {
  const mode = getEmailMode();

  if (mode === 'gmail-api') {
    return 'gmail-api'; // Will be handled separately
  }

  if (mode === 'ses') {
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
  const smtpConfig = getSmtpConfig();
  return nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass,
    },
    connectionTimeout: 4000,
    greetingTimeout: 4000,
    socketTimeout: 8000,
    dnsTimeout: 4000,
  });
};

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

const mpinSchema = Joi.object({
  mpin: Joi.string().pattern(/^\d{4,6}$/).required(),
});

const mpinLoginSchema = Joi.object({
  identifier: Joi.string().trim().required(),
  mpin: Joi.string().pattern(/^\d{4,6}$/).required(),
});

const mpinChangeSchema = Joi.object({
  currentMpin: Joi.string().pattern(/^\d{4,6}$/).required(),
  newMpin: Joi.string().pattern(/^\d{4,6}$/).required(),
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
    ecommerceSavedSearches: Array.isArray(user.ecommerceSavedSearches)
      ? user.ecommerceSavedSearches
      : [],
    ecommerceRecentlyViewed: Array.isArray(user.ecommerceRecentlyViewed)
      ? user.ecommerceRecentlyViewed
      : [],
    ecommerceSearchHistory: Array.isArray(user.ecommerceSearchHistory)
      ? user.ecommerceSearchHistory
      : [],
    ecommerceRefillReminders: Array.isArray(user.ecommerceRefillReminders)
      ? user.ecommerceRefillReminders
      : [],
    savedAddresses: Array.isArray(user.savedAddresses) ? user.savedAddresses : [],
    preferences: {
      language: user.preferences?.language || 'en',
      soulmatchOnboardingSeen: Boolean(user.preferences?.soulmatchOnboardingSeen),
    },
    mpinEnabled: Boolean(user.mpinEnabled),
    isPhoneVerified: Boolean(user.isPhoneVerified),
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
  ecommerceSavedSearches: Joi.array().items(Joi.object()).optional(),
  ecommerceRecentlyViewed: Joi.array().items(Joi.object()).optional(),
  ecommerceSearchHistory: Joi.array().items(Joi.alternatives().try(Joi.string(), Joi.object())).optional(),
  ecommerceRefillReminders: Joi.array().items(Joi.object()).optional(),
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

const normalizePhone = (value = '') => String(value || '').replace(/\D/g, '');

const findUserForMpinLogin = async (identifier = '') => {
  const normalizedIdentifier = String(identifier || '').trim().toLowerCase();
  const normalizedPhone = normalizePhone(identifier);
  const localPhone = normalizedPhone.length > 10 ? normalizedPhone.slice(-10) : normalizedPhone;

  const filters = [];
  if (normalizedIdentifier.includes('@')) {
    filters.push({ email: normalizedIdentifier });
  }
  if (normalizedPhone.length >= 10) {
    filters.push({ phone: normalizedPhone });
    if (localPhone !== normalizedPhone) {
      filters.push({ phone: localPhone });
    }
  }

  if (filters.length === 0) {
    return null;
  }

  return User.findOne({ $or: filters }).select('+mpinHash');
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

      const emailMode = getEmailMode();
      const smtpConfig = getSmtpConfig();

      if (!hasRealEmailConfig()) {
        logger.error('OTP email delivery is not configured for production use');
        return res.status(503).json({
          success: false,
          message: 'OTP email service is not configured. Please contact support.',
        });
      }

      if (emailMode === 'gmail-api') {
        await withTimeout(
          sendEmailViaGmail(email, 'Your NilaHub OTP', htmlContent),
          EMAIL_OPERATION_TIMEOUT_MS,
          'Gmail API request timed out'
        );
      } else if (emailMode === 'ses') {
        const { SendEmailCommand } = require('@aws-sdk/client-ses');
        const ses = getEmailService();
        await withTimeout(
          ses.send(new SendEmailCommand({
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
          })),
          EMAIL_OPERATION_TIMEOUT_MS,
          'SES email request timed out'
        );
      } else {
        const transporter = getEmailService();
        const fromAddress = smtpConfig.from;
        await withTimeout(
          transporter.sendMail({
            from: `NilaHub <${fromAddress}>`,
            to: email,
            subject: 'Your NilaHub OTP',
            html: htmlContent,
          }),
          EMAIL_OPERATION_TIMEOUT_MS,
          'SMTP email request timed out'
        );
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
      const smtpConfig = getSmtpConfig();
      logger.error(
        `OTP email send failed via ${getEmailMode()} for ${email} ` +
        `(host=${smtpConfig.host}, port=${smtpConfig.port}, secure=${smtpConfig.secure}): ` +
        `${emailError.code || 'NO_CODE'} ${emailError.message}`
      );
      const failureMessage = getEmailFailureMessage(emailError, getEmailMode(), smtpConfig);
      const statusCode = failureMessage.includes('Render free web services') ? 503 : 500;

      return res.status(statusCode).json({
        success: false,
        message: failureMessage,
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

router.get('/mpin/status', authenticate, async (req, res) => {
  return res.json({
    success: true,
    mpinEnabled: Boolean(req.user?.mpinEnabled),
  });
});

router.post('/mpin/setup', authenticate, async (req, res) => {
  try {
    const { error, value } = mpinSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const mpinHash = await bcrypt.hash(value.mpin, 10);
    const now = new Date();

    const nextUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        mpinHash,
        mpinEnabled: true,
        mpinFailedAttempts: 0,
        mpinBlockedUntil: null,
        mpinUpdatedAt: now,
      },
      { new: true, runValidators: true }
    );

    return res.json({
      success: true,
      message: 'MPIN is set successfully.',
      user: serializeUser(nextUser),
    });
  } catch (error) {
    logger.error('mpin setup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to set MPIN.',
    });
  }
});

router.post('/mpin/change', authenticate, async (req, res) => {
  try {
    const { error, value } = mpinChangeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const user = await User.findById(req.user._id).select('+mpinHash');
    if (!user || !user.mpinEnabled || !user.mpinHash) {
      return res.status(400).json({
        success: false,
        message: 'MPIN is not enabled for this account.',
      });
    }

    const isCurrentMpinValid = await bcrypt.compare(value.currentMpin, user.mpinHash);
    if (!isCurrentMpinValid) {
      return res.status(400).json({
        success: false,
        message: 'Current MPIN is incorrect.',
      });
    }

    user.mpinHash = await bcrypt.hash(value.newMpin, 10);
    user.mpinFailedAttempts = 0;
    user.mpinBlockedUntil = null;
    user.mpinUpdatedAt = new Date();
    await user.save();

    return res.json({
      success: true,
      message: 'MPIN updated successfully.',
      user: serializeUser(user),
    });
  } catch (error) {
    logger.error('mpin change error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to change MPIN.',
    });
  }
});

router.post('/mpin/login', async (req, res) => {
  try {
    const { error, value } = mpinLoginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const user = await findUserForMpinLogin(value.identifier);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Account not found.',
      });
    }

    if (!user.mpinEnabled || !user.mpinHash) {
      return res.status(400).json({
        success: false,
        message: 'MPIN is not enabled. Login with OTP once and set MPIN.',
      });
    }

    if (user.mpinBlockedUntil && user.mpinBlockedUntil > new Date()) {
      return res.status(429).json({
        success: false,
        message: `MPIN is temporarily blocked until ${user.mpinBlockedUntil.toISOString()}.`,
      });
    }

    const isMpinValid = await bcrypt.compare(value.mpin, user.mpinHash);
    if (!isMpinValid) {
      const nextFailedAttempts = Number(user.mpinFailedAttempts || 0) + 1;
      const shouldBlock = nextFailedAttempts >= 5;
      user.mpinFailedAttempts = nextFailedAttempts;
      user.mpinBlockedUntil = shouldBlock ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await user.save();

      return res.status(400).json({
        success: false,
        message: shouldBlock
          ? 'Too many invalid MPIN attempts. MPIN is blocked for 15 minutes.'
          : 'Invalid MPIN.',
      });
    }

    user.mpinFailedAttempts = 0;
    user.mpinBlockedUntil = null;
    user.authMethod = 'mpin';
    await user.save();

    const token = createAuthToken(user);
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    return res.json({
      success: true,
      message: 'MPIN login successful.',
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    logger.error('mpin login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to login with MPIN.',
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

    if (!hasGmailClientConfig()) {
      return res.status(500).json({
        success: false,
        message: 'Gmail credentials are not configured. Set GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET or place credentials.json in backend/.',
      });
    }

    const authUrl = getAuthUrl();
    
    if (!authUrl) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate Gmail authorization URL.',
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
