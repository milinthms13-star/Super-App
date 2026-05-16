const express = require('express');
const logger = require('../utils/logger');
const voiceFriendService = require('../services/voiceFriendService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

router.post('/init', async (req, res) => {
  try {
    const {
      persona = 'supportive',
      mood = 'neutral',
      language = 'en',
      friendId = 'nila',
      userName,
    } = req.body || {};
    const session = voiceFriendService.createSession({
      persona,
      mood,
      language,
      friendId,
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
        persona: session.persona,
        mood: session.mood,
        language: session.language,
        friendId: session.friendId,
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

router.post('/message', async (req, res) => {
  try {
    const {
      sessionId,
      message,
      persona,
      mood,
      language = 'en',
      friendId,
      userName,
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
      userName: userName || req.user?.name || null,
      friendCustomName: req.body?.friendCustomName,
      friendCustomAvatar: req.body?.friendCustomAvatar,
      scenario: req.body?.scenario,
    });

    res.json({
      success: true,
      data: result,
      message: 'Voice Friend response generated',
    });
  } catch (error) {
    logger.error('Error sending Voice Friend message:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/speech', async (req, res) => {
  try {
    const { text, friendId = 'nila', voice, language = 'en' } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ success: false, message: 'Text is required to generate speech.' });
    }

    const audioBase64 = await voiceFriendService.generateSpeech({ text, friendId, voice, language });
    if (!audioBase64) {
      return res.status(500).json({ success: false, message: 'Speech generation failed.' });
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

// POST /api/ai-voice-friend/avatar - upload avatar image for friend
const avatarUploadRoot = path.join(__dirname, '../uploads/voicefriend');
try { fs.mkdirSync(avatarUploadRoot, { recursive: true }); } catch (e) { /* ignore */ }

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarUploadRoot),
  filename: (req, file, cb) => {
    const safe = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    cb(null, safe);
  }
});
const upload = multer({ storage, limits: { fileSize: 3 * 1024 * 1024 } });

router.post('/avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const fileName = req.file.filename;
    const publicUrl = `/uploads/voicefriend/${fileName}`;
    res.json({ success: true, data: { url: publicUrl } });
  } catch (error) {
    logger.error('Avatar upload failed:', error);
    res.status(500).json({ success: false, message: 'Avatar upload failed' });
  }
});

router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = voiceFriendService.getSession(sessionId);

    if (!session) {
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
