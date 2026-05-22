const express = require('express');
const logger = require('../utils/logger');
const voiceFriendService = require('../services/voiceFriendService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const VOICE_FRIEND_SESSION_HEADER = 'x-voicefriend-session-token';
const sessionRateLimits = new Map();

const createRateLimiter = (maxRequests, windowMs) => {
  return (req, res, next) => {
    const key = req.voiceFriendSession?.sessionId || req.ip || 'anonymous';
    const now = Date.now();
    const timestamps = sessionRateLimits.get(key) || [];
    const active = timestamps.filter((ts) => now - ts < windowMs);
    if (active.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please wait and try again.',
      });
    }
    active.push(now);
    sessionRateLimits.set(key, active);
    next();
  };
};

const getSessionTokenFromRequest = (req) => {
  return (
    req.headers[VOICE_FRIEND_SESSION_HEADER] ||
    req.body?.sessionToken ||
    req.query?.sessionToken ||
    ''
  );
};

const validateVoiceFriendSession = (req, res, next) => {
  const sessionId = req.body?.sessionId || req.query?.sessionId || req.params?.sessionId;
  const sessionToken = String(getSessionTokenFromRequest(req) || '').trim();
  if (!sessionId || !sessionToken) {
    return res.status(401).json({ success: false, message: 'Session ID and session token are required.' });
  }

  const session = voiceFriendService.getSession(sessionId);
  if (!session) {
    return res.status(404).json({ success: false, message: 'Voice Friend session not found.' });
  }

  if (String(session.sessionToken || '').trim() !== sessionToken) {
    return res.status(403).json({ success: false, message: 'Invalid session token.' });
  }

  req.voiceFriendSession = session;
  next();
};

const initRateLimiter = createRateLimiter(10, 60 * 1000);
const messageRateLimiter = createRateLimiter(20, 60 * 1000);
const speechRateLimiter = createRateLimiter(10, 60 * 1000);

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const avatarUploadRoot = path.join(__dirname, '../uploads/voicefriend');
try { fs.mkdirSync(avatarUploadRoot, { recursive: true }); } catch (e) { /* ignore */ }

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarUploadRoot),
  filename: (req, file, cb) => {
    const safe = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    cb(null, safe);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_AVATAR_TYPES.includes(file.mimetype) || !['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      return cb(new Error('Unsupported avatar file type. Only JPG, PNG, and WEBP are allowed.'));
    }
    cb(null, true);
  },
});

const router = express.Router();

router.post('/init', initRateLimiter, async (req, res) => {
  try {
    const {
      persona = 'supportive',
      mood = 'neutral',
      language = 'en',
      friendId = 'nila',
      userName,
      voice,
    } = req.body || {};
    const session = voiceFriendService.createSession({
      persona,
      mood,
      language,
      friendId,
      voice,
      userName: userName || req.user?.name || null,
      userId: req.user?._id || null,
      friendCustomName: req.body?.friendCustomName,
      friendCustomAvatar: req.body?.friendCustomAvatar,
      scenario: req.body?.scenario,
    });

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        sessionToken: session.sessionToken,
        persona: session.persona,
        mood: session.mood,
        language: session.language,
        friendId: session.friendId,
        voice: session.voice,
        friendName: session.friendName,
        friendCustomName: session.friendCustomName,
        friendCustomAvatar: session.friendCustomAvatar,
        scenario: session.scenario,
      },
      message: 'Voice Friend session started',
    });
  } catch (error) {
    logger.error('Error initializing Voice Friend session:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/message', validateVoiceFriendSession, messageRateLimiter, async (req, res) => {
  try {
    const {
      sessionId,
      message,
      persona,
      mood,
      language = 'en',
      friendId,
      userName,
      voice,
    } = req.body || {};

    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        message: 'sessionId and message are required',
      });
    }

    const result = await voiceFriendService.sendMessage({
      sessionId,
      message,
      persona,
      mood,
      language,
      friendId,
      voice,
      userName: userName || req.user?.name || null,
      friendCustomName: req.body?.friendCustomName,
      friendCustomAvatar: req.body?.friendCustomAvatar,
      scenario: req.body?.scenario,
    });

    const reply =
      result?.reply ||
      result?.response ||
      result?.message ||
      result?.text ||
      'I am listening. Tell me more about what happened.';

    res.json({
      success: true,
      data: {
        ...result,
        reply,
        safetyResponse: result?.safetyResponse || false,
      },
      message: 'Voice Friend response generated',
    });
  } catch (error) {
    logger.error('Error sending Voice Friend message:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/speech', validateVoiceFriendSession, speechRateLimiter, async (req, res) => {
  try {
    const { sessionId, text, friendId = 'nila', voice, language = 'en' } = req.body || {};
    if (!sessionId || !text || !String(text).trim()) {
      return res.status(400).json({ success: false, message: 'sessionId and text are required to generate speech.' });
    }

    const audioBase64 = await voiceFriendService.generateSpeech({ text, friendId, voice, language });
    if (!audioBase64) {
      return res.json({
        success: true,
        data: { audio: null, mimeType: null, message: 'Text-to-speech unavailable. Falling back to browser voice playback.' },
      });
    }

    res.json({
      success: true,
      data: {
        audio: audioBase64,
        mimeType: 'audio/mpeg',
      },
    });
  } catch (error) {
    logger.error('Error generating Voice Friend speech:', error);
    res.status(500).json({ success: false, message: 'Unable to generate speech at this time.' });
  }
});

router.post('/avatar', validateVoiceFriendSession, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Avatar image is required.' });
    }

    const relativeUrl = `/uploads/voicefriend/${req.file.filename}`;
    req.voiceFriendSession.friendCustomAvatar = relativeUrl;
    voiceFriendService.updateSession(req.voiceFriendSession.sessionId, {
      friendCustomAvatar: relativeUrl,
    });

    res.json({
      success: true,
      data: {
        url: relativeUrl,
        fileName: req.file.filename,
        friendCustomAvatar: relativeUrl,
      },
      message: 'Avatar uploaded successfully.',
    });
  } catch (error) {
    logger.error('Error uploading Voice Friend avatar:', error);
    res.status(500).json({ success: false, message: 'Unable to upload avatar right now.' });
  }
});

router.get('/history/:sessionId', validateVoiceFriendSession, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = req.voiceFriendSession;

    if (!session || session.sessionId !== sessionId) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        persona: session.persona,
        mood: session.mood,
        language: session.language,
        friendId: session.friendId,
        friendName: session.friendName,
        friendCustomName: session.friendCustomName,
        friendCustomAvatar: session.friendCustomAvatar,
        friendPersonality: session.friendPersonality,
        scenario: session.scenario,
        messages: session.messages,
      },
    });
  } catch (error) {
    logger.error('Error fetching Voice Friend history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
