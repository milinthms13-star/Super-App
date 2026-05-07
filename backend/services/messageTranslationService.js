const Message = require('../models/Message');
const logger = require('../utils/logger');

/**
 * Message Translation Service
 * Supports multilingual messaging with automatic translation
 * Singleton pattern
 */

class MessageTranslationService {
  constructor() {
    if (MessageTranslationService.instance) {
      return MessageTranslationService.instance;
    }
    this.translationCache = new Map();
    this.supportedLanguages = [
      'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'hi', 'ar', 'bn',
    ];
    MessageTranslationService.instance = this;
  }

  /**
   * Translate message
   * @param {string} messageId - Message ID
   * @param {string} targetLanguage - Target language code
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Translated message
   */
  async translateMessage(messageId, targetLanguage, options = {}) {
    try {
      // Validate language
      if (!this.supportedLanguages.includes(targetLanguage)) {
        throw new Error(`Unsupported language: ${targetLanguage}`);
      }

      // Check cache
      const cacheKey = `${messageId}_${targetLanguage}`;
      if (this.translationCache.has(cacheKey)) {
        return this.translationCache.get(cacheKey);
      }

      const message = await Message.findById(messageId).lean();
      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      // Mock translation (in production, use Google Translate, Azure, or similar)
      const translatedContent = await this.performTranslation(
        message.content,
        targetLanguage,
        options
      );

      // Store translation
      const messageWithTranslation = {
        ...message,
        translations: {
          ...message.translations,
          [targetLanguage]: {
            content: translatedContent,
            translatedAt: new Date(),
            language: targetLanguage,
          },
        },
      };

      // Cache for 24 hours
      this.translationCache.set(cacheKey, messageWithTranslation);
      setTimeout(() => this.translationCache.delete(cacheKey), 24 * 60 * 60 * 1000);

      logger.info(
        `Message ${messageId} translated to ${targetLanguage}`
      );

      return messageWithTranslation;
    } catch (error) {
      logger.error('Error translating message', { error });
      throw error;
    }
  }

  /**
   * Batch translate messages
   * @param {Array<string>} messageIds - Message IDs
   * @param {string} targetLanguage - Target language
   * @returns {Promise<Array>} Translated messages
   */
  async batchTranslateMessages(messageIds, targetLanguage) {
    try {
      const translated = [];

      for (const messageId of messageIds) {
        try {
          const result = await this.translateMessage(messageId, targetLanguage);
          translated.push(result);
        } catch (error) {
          logger.warn(`Failed to translate message ${messageId}`, { error });
        }
      }

      return translated;
    } catch (error) {
      logger.error('Error batch translating', { error });
      throw error;
    }
  }

  /**
   * Detect language of message
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Language detection result
   */
  async detectLanguage(messageId) {
    try {
      const message = await Message.findById(messageId)
        .select('content')
        .lean();

      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      // Mock language detection (in production, use proper NLP)
      const detectedLanguage = this.performLanguageDetection(message.content);

      return {
        messageId,
        content: message.content,
        detectedLanguage,
        confidence: 0.95, // Mock confidence score
      };
    } catch (error) {
      logger.error('Error detecting language', { error });
      throw error;
    }
  }

  /**
   * Get message in multiple languages
   * @param {string} messageId - Message ID
   * @param {Array<string>} languages - Target languages
   * @returns {Promise<Object>} Message with all translations
   */
  async getMessageInLanguages(messageId, languages) {
    try {
      let message = await Message.findById(messageId).lean();
      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      // Translate to each language
      for (const lang of languages) {
        if (!message.translations?.[lang]) {
          const translated = await this.translateMessage(messageId, lang);
          message = translated;
        }
      }

      return message;
    } catch (error) {
      logger.error('Error getting message in languages', { error });
      throw error;
    }
  }

  /**
   * Save translation to database
   * @param {string} messageId - Message ID
   * @param {string} language - Language code
   * @param {string} translatedContent - Translated text
   * @returns {Promise<Object>} Updated message
   */
  async saveTranslation(messageId, language, translatedContent) {
    try {
      const updated = await Message.findByIdAndUpdate(
        messageId,
        {
          $set: {
            [`translations.${language}`]: {
              content: translatedContent,
              translatedAt: new Date(),
            },
          },
        },
        { new: true }
      );

      this.translationCache.delete(`${messageId}_${language}`);

      logger.info(`Translation saved for message ${messageId} in ${language}`);
      return updated;
    } catch (error) {
      logger.error('Error saving translation', { error });
      throw error;
    }
  }

  /**
   * Get supported languages
   * @returns {Array<string>} List of supported language codes
   */
  getSupportedLanguages() {
    return this.supportedLanguages;
  }

  /**
   * Set user's preferred language
   * @param {string} userId - User ID
   * @param {string} language - Preferred language
   * @returns {Promise<void>}
   */
  async setUserPreferredLanguage(userId, language) {
    try {
      if (!this.supportedLanguages.includes(language)) {
        throw new Error(`Unsupported language: ${language}`);
      }

      // Store in user preferences (would need User model update)
      // This is a placeholder
      logger.info(`User ${userId} preferred language set to ${language}`);
    } catch (error) {
      logger.error('Error setting user language', { error });
      throw error;
    }
  }

  /**
   * Translate chat (all messages)
   * @param {string} chatId - Chat ID
   * @param {string} targetLanguage - Target language
   * @param {Object} options - Query options (limit, offset)
   * @returns {Promise<Array>} Translated messages
   */
  async translateChat(chatId, targetLanguage, options = {}) {
    try {
      const { limit = 100, offset = 0 } = options;

      const messages = await Message.find({
        chatId,
        isDeleted: { $ne: true },
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean();

      const translated = [];
      for (const msg of messages) {
        try {
          const result = await this.translateMessage(msg._id, targetLanguage);
          translated.push(result);
        } catch (error) {
          logger.warn(`Failed to translate message ${msg._id}`, { error });
        }
      }

      return translated;
    } catch (error) {
      logger.error('Error translating chat', { error });
      throw error;
    }
  }

  /**
   * Get translation quality metrics
   * @returns {Promise<Object>} Quality metrics
   */
  async getTranslationMetrics() {
    try {
      // Placeholder for translation metrics
      return {
        totalTranslations: this.translationCache.size,
        cacheSize: this.translationCache.size,
        supportedLanguages: this.supportedLanguages.length,
      };
    } catch (error) {
      logger.error('Error getting translation metrics', { error });
      throw error;
    }
  }

  /**
   * Mock translation function
   * @private
   * In production, integrate with Google Translate, Azure Translator, or similar
   */
  async performTranslation(text, targetLanguage, options = {}) {
    // Placeholder implementation
    // In real app, call external translation API
    return `[Translated to ${targetLanguage}]: ${text}`;
  }

  /**
   * Mock language detection
   * @private
   * In production, use language detection library or API
   */
  performLanguageDetection(text) {
    // Placeholder - detect language from text
    // In real app, use langdetect, textblob, or similar
    return 'en'; // Default to English
  }

  /**
   * Clear translation cache
   */
  clearCache() {
    this.translationCache.clear();
    logger.info('Translation cache cleared');
  }
}

module.exports = new MessageTranslationService();
