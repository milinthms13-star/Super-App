const express = require('express');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../middleware/auth');
const User = require('../models/User');
const devAuthStore = require('../utils/devAuthStore');
const logger = require('../utils/logger');
const { findGridFSFile, getGridFSBucket, toObjectId } = require('../utils/gridfs');
const { ADMIN_EMAIL } = require('../config/constants');

const router = express.Router();

const getAuthenticatedUser = async (req) => {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  const payload = jwt.verify(token, getJwtSecret(), {
    issuer: 'malabarbazaar-api',
    audience: 'malabarbazaar-web',
  });

  const useMemoryAuth = process.env.AUTH_STORAGE === 'memory' && process.env.NODE_ENV !== 'production';
  let user = useMemoryAuth
    ? await devAuthStore.findUserById(payload.sub)
    : await User.findById(payload.sub);

  if (!user && useMemoryAuth && payload.email) {
    user = await devAuthStore.findUserByEmail(payload.email);
  }

  return user || null;
};

const streamFile = async (req, res, isPublic) => {
  try {
    const file = await findGridFSFile(req.params.fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found.',
      });
    }

    const visibility = file.metadata?.visibility || 'private';
    if (isPublic && visibility !== 'public') {
      return res.status(403).json({
        success: false,
        message: 'This file is not public.',
      });
    }

    if (!isPublic) {
      const user = await getAuthenticatedUser(req);
      const ownerEmail = String(file.metadata?.ownerEmail || '').trim().toLowerCase();
      const requesterEmail = String(user?.email || '').trim().toLowerCase();
      const isAdmin = requesterEmail === ADMIN_EMAIL;
      const isOwner = ownerEmail && requesterEmail === ownerEmail;

      if (!user || (!isAdmin && !isOwner)) {
        return res.status(403).json({
          success: false,
          message: 'You are not allowed to access this file.',
        });
      }
    }

    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    res.setHeader('Cache-Control', isPublic ? 'public, max-age=31536000, immutable' : 'private, max-age=0');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.filename)}"`);

    const bucket = getGridFSBucket();
    return bucket.openDownloadStream(toObjectId(file._id)).pipe(res);
  } catch (error) {
    logger.error('file stream error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to load file.',
    });
  }
};

router.get('/public/:fileId', async (req, res) => streamFile(req, res, true));
router.get('/private/:fileId', async (req, res) => streamFile(req, res, false));

module.exports = router;
