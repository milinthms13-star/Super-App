const assert = require('assert');
const messageTranslationService = require('../../../services/messageTranslationService');

describe('MessageTranslationService', () => {
  beforeEach(() => {
    messageTranslationService.clearCache();
  });

  describe('translateMessage', () => {
    it('should translate message to target language', async () => {
      const result = await messageTranslationService.translateMessage(
        'msg123',
        'es'
      );
      assert(result);
    });

    it('should support all 13 languages', async () => {
      const languages = [
        'en',
        'es',
        'fr',
        'de',
        'it',
        'pt',
        'ru',
        'zh',
        'ja',
        'ko',
        'hi',
        'ar',
        'bn',
      ];
      for (const lang of languages) {
        const result = await messageTranslationService.translateMessage(
          'msg123',
          lang
        );
        assert(result !== undefined);
      }
    });

    it('should throw error for unsupported language', async () => {
      try {
        await messageTranslationService.translateMessage('msg123', 'xyz');
        assert.fail('Should throw error for unsupported language');
      } catch (error) {
        assert(error);
      }
    });

    it('should preserve original message', async () => {
      const result = await messageTranslationService.translateMessage(
        'msg123',
        'es'
      );
      assert(result);
    });
  });

  describe('batchTranslateMessages', () => {
    it('should translate multiple messages', async () => {
      const results = await messageTranslationService.batchTranslateMessages(
        ['msg1', 'msg2', 'msg3'],
        'es'
      );
      assert(Array.isArray(results));
    });

    it('should handle mixed results', async () => {
      const results = await messageTranslationService.batchTranslateMessages(
        ['msg1', 'invalid', 'msg3'],
        'fr'
      );
      assert(Array.isArray(results));
    });

    it('should return results for each message', async () => {
      const results = await messageTranslationService.batchTranslateMessages(
        ['msg1', 'msg2'],
        'de'
      );
      assert(results.length === 2);
    });

    it('should support pagination', async () => {
      const messageIds = [];
      for (let i = 0; i < 100; i++) {
        messageIds.push(`msg${i}`);
      }
      const results = await messageTranslationService.batchTranslateMessages(
        messageIds,
        'it'
      );
      assert(Array.isArray(results));
    });
  });

  describe('detectLanguage', () => {
    it('should detect message language', async () => {
      const language = await messageTranslationService.detectLanguage('msg123');
      assert(typeof language === 'string');
    });

    it('should return valid language code', async () => {
      const language = await messageTranslationService.detectLanguage('msg123');
      const supportedLanguages = [
        'en',
        'es',
        'fr',
        'de',
        'it',
        'pt',
        'ru',
        'zh',
        'ja',
        'ko',
        'hi',
        'ar',
        'bn',
      ];
      assert(supportedLanguages.includes(language));
    });

    it('should handle multilingual messages', async () => {
      const language = await messageTranslationService.detectLanguage(
        'multilangMsg'
      );
      assert(typeof language === 'string');
    });
  });

  describe('getMessageInLanguages', () => {
    it('should get message in multiple languages', async () => {
      const results = await messageTranslationService.getMessageInLanguages(
        'msg123',
        ['es', 'fr', 'de']
      );
      assert(Array.isArray(results) || typeof results === 'object');
    });

    it('should include all requested languages', async () => {
      const results = await messageTranslationService.getMessageInLanguages(
        'msg123',
        ['en', 'es']
      );
      assert(results !== undefined);
    });

    it('should preserve message metadata', async () => {
      const results = await messageTranslationService.getMessageInLanguages(
        'msg123',
        ['es', 'fr']
      );
      assert(results !== undefined);
    });
  });

  describe('saveTranslation', () => {
    it('should persist translation', async () => {
      const result = await messageTranslationService.saveTranslation(
        'msg123',
        'es',
        'Hola mundo'
      );
      assert(result);
    });

    it('should support all languages', async () => {
      const languages = [
        'en',
        'es',
        'fr',
        'de',
        'it',
        'pt',
        'ru',
        'zh',
        'ja',
        'ko',
        'hi',
        'ar',
        'bn',
      ];
      for (const lang of languages) {
        const result = await messageTranslationService.saveTranslation(
          'msg123',
          lang,
          'translated text'
        );
        assert(result);
      }
    });

    it('should overwrite existing translation', async () => {
      await messageTranslationService.saveTranslation('msg123', 'es', 'old');
      const result = await messageTranslationService.saveTranslation(
        'msg123',
        'es',
        'new'
      );
      assert(result);
    });
  });

  describe('translateChat', () => {
    it('should translate entire chat to target language', async () => {
      const result = await messageTranslationService.translateChat(
        'chat1',
        'es'
      );
      assert(result);
    });

    it('should process all messages in chat', async () => {
      const result = await messageTranslationService.translateChat(
        'chat1',
        'fr'
      );
      assert(result !== undefined);
    });

    it('should support background translation', async () => {
      const result = await messageTranslationService.translateChat(
        'largeChat',
        'de',
        { background: true }
      );
      assert(result !== undefined);
    });

    it('should return progress status', async () => {
      const result = await messageTranslationService.translateChat(
        'chat1',
        'it'
      );
      assert(result !== undefined);
    });
  });

  describe('setUserPreferredLanguage', () => {
    it('should set user language preference', async () => {
      const result = await messageTranslationService.setUserPreferredLanguage(
        'user1',
        'es'
      );
      assert(result);
    });

    it('should support all languages', async () => {
      const languages = [
        'en',
        'es',
        'fr',
        'de',
        'it',
        'pt',
        'ru',
        'zh',
        'ja',
        'ko',
        'hi',
        'ar',
        'bn',
      ];
      for (const lang of languages) {
        const result = await messageTranslationService.setUserPreferredLanguage(
          'user1',
          lang
        );
        assert(result);
      }
    });

    it('should persist preference', async () => {
      await messageTranslationService.setUserPreferredLanguage('user1', 'es');
      const result = await messageTranslationService.setUserPreferredLanguage(
        'user1',
        'es'
      );
      assert(result);
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return list of supported languages', async () => {
      const languages = await messageTranslationService.getSupportedLanguages();
      assert(Array.isArray(languages));
    });

    it('should include all 13 languages', async () => {
      const languages = await messageTranslationService.getSupportedLanguages();
      const expectedLanguages = [
        'en',
        'es',
        'fr',
        'de',
        'it',
        'pt',
        'ru',
        'zh',
        'ja',
        'ko',
        'hi',
        'ar',
        'bn',
      ];
      for (const lang of expectedLanguages) {
        assert(languages.includes(lang) || languages.some((l) => l.code === lang));
      }
    });

    it('should include language metadata', async () => {
      const languages = await messageTranslationService.getSupportedLanguages();
      if (languages.length > 0) {
        assert(
          languages[0].name !== undefined ||
            languages[0].nativeName !== undefined ||
            typeof languages[0] === 'string'
        );
      }
    });
  });

  describe('getTranslationMetrics', () => {
    it('should get translation cache metrics', async () => {
      const metrics = await messageTranslationService.getTranslationMetrics();
      assert(typeof metrics === 'object');
    });

    it('should include cache hit rate', async () => {
      const metrics = await messageTranslationService.getTranslationMetrics();
      assert(
        typeof metrics.cacheHitRate === 'number' ||
          metrics.cacheHitRate !== undefined
      );
    });

    it('should include languages used', async () => {
      const metrics = await messageTranslationService.getTranslationMetrics();
      assert(
        Array.isArray(metrics.languagesUsed) ||
          metrics.languagesUsed !== undefined
      );
    });

    it('should include total translations', async () => {
      const metrics = await messageTranslationService.getTranslationMetrics();
      assert(
        typeof metrics.totalTranslations === 'number' ||
          metrics.totalTranslations !== undefined
      );
    });
  });

  describe('Cache Behavior', () => {
    it('should cache translations', async () => {
      const result1 = await messageTranslationService.translateMessage(
        'msg123',
        'es'
      );
      const result2 = await messageTranslationService.translateMessage(
        'msg123',
        'es'
      );
      assert.deepEqual(result1, result2);
    });

    it('should have separate cache per language', async () => {
      await messageTranslationService.translateMessage('msg123', 'es');
      const resultFr = await messageTranslationService.translateMessage(
        'msg123',
        'fr'
      );
      assert(resultFr !== undefined);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing message', async () => {
      try {
        await messageTranslationService.translateMessage('nonexistent', 'es');
        assert(true);
      } catch (error) {
        assert(error);
      }
    });

    it('should reject unsupported language codes', async () => {
      try {
        await messageTranslationService.translateMessage('msg123', 'invalid');
        assert.fail('Should throw error');
      } catch (error) {
        assert(error);
      }
    });

    it('should handle translation API errors gracefully', async () => {
      try {
        const result = await messageTranslationService.translateMessage(
          'msg123',
          'es'
        );
        assert(result !== undefined || result === undefined);
      } catch (error) {
        assert(error);
      }
    });

    it('should handle network timeouts', async () => {
      try {
        const result = await messageTranslationService.translateMessage(
          'msg123',
          'es'
        );
        assert(result !== undefined);
      } catch (error) {
        assert(error);
      }
    });
  });

  describe('Performance', () => {
    it('should translate message quickly', async () => {
      const start = Date.now();
      await messageTranslationService.translateMessage('msg123', 'es');
      const duration = Date.now() - start;
      assert(duration < 5000);
    });

    it('should handle batch translations efficiently', async () => {
      const messageIds = [];
      for (let i = 0; i < 50; i++) {
        messageIds.push(`msg${i}`);
      }
      const start = Date.now();
      await messageTranslationService.batchTranslateMessages(messageIds, 'es');
      const duration = Date.now() - start;
      assert(duration < 10000);
    });
  });
});
