const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const devAuthStore = require('../utils/devAuthStore');

const getJwtSecret = () => {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }

  logger.warn('JWT_SECRET is not set. Using development-only fallback secret.');
  return 'malabarbazaar-development-only-secret';
};

const AUTH_COOKIE_NAME = 'mb_auth_token';

const getCookieValue = (cookieHeader = '', cookieName) => {
  const cookies = String(cookieHeader || '')
    .split(';')
    .map((cookie) => cookie.trim())
    .filter(Boolean);
  const matchedCookie = cookies.find((cookie) => cookie.startsWith(`${cookieName}=`));
  return matchedCookie ? decodeURIComponent(matchedCookie.slice(cookieName.length + 1)) : '';
};

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');
    const cookieToken = getCookieValue(req.headers.cookie, AUTH_COOKIE_NAME);
    const authToken = scheme === 'Bearer' && token ? token : cookieToken;

    if (!authToken) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const payload = jwt.verify(authToken, getJwtSecret(), {
      issuer: 'malabarbazaar-api',
      audience: 'malabarbazaar-web',
    });

    const useMemoryAuth = process.env.AUTH_STORAGE === 'memory' && process.env.NODE_ENV !== 'production';
    let user = useMemoryAuth
      ? await devAuthStore.findUserById(payload.sub)
      : await User.findById(payload.sub);

    if (!user && useMemoryAuth && payload.email) {
      user = await devAuthStore.findUserByEmail(payload.email);

      if (!user) {
        user = await devAuthStore.upsertUserByEmail(payload.email);
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    req.user = user;
    req.auth = payload;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session',
    });
  }
};

module.exports = {
  authenticate,
  getJwtSecret,
};
