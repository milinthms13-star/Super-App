const express = require('express');
const logger = require('../utils/logger');
const voiceFriendService = require('../services/voiceFriendService');

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
        friendPersonality: session.friendPersonality,
        messages: session.messages,
      },
    });
  } catch (error) {
    logger.error('Error fetching Voice Friend history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
