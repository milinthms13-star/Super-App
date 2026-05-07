const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const messageTranslationService = require('../services/messageTranslationService');
const logger = require('../utils/logger');

/**
 * Message Translation Routes
 * Multilingual messaging with automatic translation
 * All routes require authentication
 */

// Middleware
router.use(authMiddleware);

/**
 * POST /:messageId/:language
 * Translate message to target language
 * Supported languages: en, es, fr, de, it, pt, ru, zh, ja, ko, hi, ar, bn
 */
router.post('/:messageId/:language', async (req, res) => {
  try {
    const { messageId, language } = req.params;

    const translated = await messageTranslationService.translateMessage(
      messageId,
      language
    );

    res.status(201).json({
      status: 'success',
      message: 'Message translated',
      data: translated,
      targetLanguage: language,
    });
  } catch (error) {
    logger.error('Error translating message', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to translate message',
      error: error.message,
    });
  }
});

/**
 * POST /batch
 * Batch translate messages to language
 * Body: { messageIds[], language }
 */
router.post('/batch', async (req, res) => {
  try {
    const { messageIds, language } = req.body;

    if (!messageIds || !Array.isArray(messageIds) || !language) {
      return res.status(400).json({
        status: 'error',
        message: 'messageIds (array) and language are required',
      });
    }

    const results = await messageTranslationService.batchTranslateMessages(
      messageIds,
      language
    );

    res.status(201).json({
      status: 'success',
      message: 'Messages translated',
      data: results,
      targetLanguage: language,
      count: results.length,
    });
  } catch (error) {
    logger.error('Error batch translating', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to batch translate messages',
      error: error.message,
    });
  }
});

/**
 * GET /detect/:messageId
 * Detect language of message
 */
router.get('/detect/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    const detection = await messageTranslationService.detectLanguage(messageId);

    res.status(200).json({
      status: 'success',
      data: detection,
      messageId,
    });
  } catch (error) {
    logger.error('Error detecting language', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to detect language',
      error: error.message,
    });
  }
});

/**
 * GET /languages
 * Get list of supported languages
 */
router.get('/languages', async (req, res) => {
  try {
    const languages = messageTranslationService.getSupportedLanguages();

    res.status(200).json({
      status: 'success',
      data: languages,
      count: languages.length,
    });
  } catch (error) {
    logger.error('Error getting supported languages', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get supported languages',
      error: error.message,
    });
  }
});

/**
 * GET /:messageId/languages
 * Get message in multiple languages
 * Query: languages[] (comma separated or array)
 */
router.get('/:messageId/languages', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { languages } = req.query;

    if (!languages) {
      return res.status(400).json({
        status: 'error',
        message: 'languages query parameter is required',
      });
    }

    const langArray = Array.isArray(languages)
      ? languages
      : languages.split(',');

    const result = await messageTranslationService.getMessageInLanguages(
      messageId,
      langArray
    );

    res.status(200).json({
      status: 'success',
      data: result,
      messageId,
      languages: langArray,
    });
  } catch (error) {
    logger.error('Error getting message in languages', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get message in languages',
      error: error.message,
    });
  }
});

/**
 * POST /save/:messageId/:language
 * Save translation to database
 * Body: { translatedContent }
 */
router.post('/save/:messageId/:language', async (req, res) => {
  try {
    const { messageId, language } = req.params;
    const { translatedContent } = req.body;

    if (!translatedContent) {
      return res.status(400).json({
        status: 'error',
        message: 'translatedContent is required',
      });
    }

    const updated = await messageTranslationService.saveTranslation(
      messageId,
      language,
      translatedContent
    );

    res.status(200).json({
      status: 'success',
      message: 'Translation saved',
      data: updated,
    });
  } catch (error) {
    logger.error('Error saving translation', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to save translation',
      error: error.message,
    });
  }
});

/**
 * POST /user/preference
 * Set user's preferred language
 * Body: { language }
 */
router.post('/user/preference', async (req, res) => {
  try {
    const userId = req.user._id;
    const { language } = req.body;

    if (!language) {
      return res.status(400).json({
        status: 'error',
        message: 'language is required',
      });
    }

    await messageTranslationService.setUserPreferredLanguage(userId, language);

    res.status(200).json({
      status: 'success',
      message: 'Preferred language set',
      userId,
      language,
    });
  } catch (error) {
    logger.error('Error setting user preference', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to set preferred language',
      error: error.message,
    });
  }
});

/**
 * POST /chat/:chatId/:language
 * Translate entire chat to language
 * Query: limit, offset
 */
router.post('/chat/:chatId/:language', async (req, res) => {
  try {
    const { chatId, language } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    const translated = await messageTranslationService.translateChat(
      chatId,
      language,
      { limit, offset }
    );

    res.status(201).json({
      status: 'success',
      message: 'Chat translated',
      data: translated,
      chatId,
      targetLanguage: language,
      count: translated.length,
    });
  } catch (error) {
    logger.error('Error translating chat', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to translate chat',
      error: error.message,
    });
  }
});

/**
 * GET /metrics
 * Get translation metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await messageTranslationService.getTranslationMetrics();

    res.status(200).json({
      status: 'success',
      data: metrics,
    });
  } catch (error) {
    logger.error('Error getting translation metrics', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get translation metrics',
      error: error.message,
    });
  }
});

module.exports = router;
