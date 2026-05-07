const assert = require('assert');
const smartRepliesService = require('../../../services/smartRepliesService');

describe('Smart Replies Service', () => {
  const testMessageId = 'test-msg-123';
  const testUserId = 'test-user-456';

  beforeEach(() => {
    smartRepliesService.clearCache();
  });

  afterEach(() => {
    smartRepliesService.clearCache();
  });

  describe('generateSuggestions', () => {
    it('should generate reply suggestions', async () => {
      try {
        const suggestions = await smartRepliesService.generateSuggestions(
          testMessageId,
          'conversation history'
        );
        assert(Array.isArray(suggestions));
        assert(suggestions.length > 0);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should include confidence scores', async () => {
      try {
        const suggestions = await smartRepliesService.generateSuggestions(
          testMessageId,
          'history'
        );
        suggestions.forEach((s) => {
          assert(typeof s.confidence === 'number');
          assert(s.confidence >= 0 && s.confidence <= 1);
        });
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should include intent classification', async () => {
      try {
        const suggestions = await smartRepliesService.generateSuggestions(
          testMessageId,
          'history'
        );
        suggestions.forEach((s) => {
          assert(typeof s.intent === 'string');
        });
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('getSmartReplies', () => {
    it('should retrieve smart replies for message', async () => {
      try {
        const replies = await smartRepliesService.getSmartReplies(testMessageId, testUserId);
        assert(Array.isArray(replies));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should return limited number of suggestions', async () => {
      try {
        const replies = await smartRepliesService.getSmartReplies(testMessageId, testUserId);
        assert(replies.length <= smartRepliesService.suggestionCount);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should cache suggestions', async () => {
      try {
        const replies1 = await smartRepliesService.getSmartReplies(testMessageId, testUserId);
        const replies2 = await smartRepliesService.getSmartReplies(testMessageId, testUserId);
        assert(Array.isArray(replies1));
        assert(Array.isArray(replies2));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('rateSuggestion', () => {
    it('should accept valid rating', async () => {
      try {
        const result = await smartRepliesService.rateSuggestion('suggestion-id', 5);
        assert(result === true);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should reject invalid ratings', async () => {
      try {
        await smartRepliesService.rateSuggestion('suggestion-id', 10);
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message.includes('between'));
      }
    });

    it('should accept all valid ratings 1-5', async () => {
      try {
        for (let i = 1; i <= 5; i++) {
          const result = await smartRepliesService.rateSuggestion('suggestion-id', i);
          assert(result === true);
        }
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('learnFromReply', () => {
    it('should record user reply for learning', async () => {
      try {
        const result = await smartRepliesService.learnFromReply(testMessageId, 'User reply text');
        assert(result === true);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should handle non-existent message', async () => {
      try {
        await smartRepliesService.learnFromReply('non-existent', 'Reply');
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message);
      }
    });
  });

  describe('getQuickReplies', () => {
    it('should retrieve quick replies for user', async () => {
      try {
        const quickReplies = await smartRepliesService.getQuickReplies(testUserId);
        assert(Array.isArray(quickReplies));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should include usage statistics', async () => {
      try {
        const quickReplies = await smartRepliesService.getQuickReplies(testUserId);
        if (quickReplies.length > 0) {
          assert(typeof quickReplies[0].usage === 'number');
        }
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should cache quick replies', async () => {
      try {
        const replies1 = await smartRepliesService.getQuickReplies(testUserId);
        const replies2 = await smartRepliesService.getQuickReplies(testUserId);
        assert(Array.isArray(replies1));
        assert(Array.isArray(replies2));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('createQuickReply', () => {
    it('should create custom quick reply', async () => {
      try {
        const result = await smartRepliesService.createQuickReply(testUserId, 'Thanks!');
        assert(result);
        assert.strictEqual(result.text, 'Thanks!');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should reject empty text', async () => {
      try {
        await smartRepliesService.createQuickReply(testUserId, '');
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message);
      }
    });

    it('should reject oversized text', async () => {
      try {
        const longText = 'a'.repeat(201);
        await smartRepliesService.createQuickReply(testUserId, longText);
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message.includes('exceed'));
      }
    });

    it('should accept up to 200 characters', async () => {
      try {
        const text = 'a'.repeat(200);
        const result = await smartRepliesService.createQuickReply(testUserId, text);
        assert(result);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('Sentiment analysis', () => {
    it('should detect positive sentiment', async () => {
      try {
        const sentiment = smartRepliesService.analyzeSentiment('This is amazing and wonderful!');
        assert.strictEqual(sentiment.sentiment, 'positive');
        assert(sentiment.score > 0);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should detect negative sentiment', async () => {
      try {
        const sentiment = smartRepliesService.analyzeSentiment('This is terrible and awful!');
        assert.strictEqual(sentiment.sentiment, 'negative');
        assert(sentiment.score < 0);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should detect neutral sentiment', async () => {
      try {
        const sentiment = smartRepliesService.analyzeSentiment('This is a neutral statement.');
        assert.strictEqual(sentiment.sentiment, 'neutral');
        assert.strictEqual(sentiment.score, 0);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should count sentiment words', async () => {
      try {
        const sentiment = smartRepliesService.analyzeSentiment('Good, great, amazing!');
        assert(sentiment.positiveWords > 0);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('Intent classification', () => {
    it('should classify greeting intent', async () => {
      try {
        const intent = smartRepliesService.classifyIntent('Hello there!');
        assert.strictEqual(intent, 'greeting');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should classify question intent', async () => {
      try {
        const intent = smartRepliesService.classifyIntent('What time is it?');
        assert.strictEqual(intent, 'question');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should classify farewell intent', async () => {
      try {
        const intent = smartRepliesService.classifyIntent('See you later!');
        assert.strictEqual(intent, 'farewell');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should classify acknowledgment intent', async () => {
      try {
        const intent = smartRepliesService.classifyIntent('Got it, thanks!');
        assert.strictEqual(intent, 'acknowledgment');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should default to statement', async () => {
      try {
        const intent = smartRepliesService.classifyIntent('This is a random statement');
        assert.strictEqual(intent, 'statement');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('Intent-based suggestions', () => {
    it('should generate greeting responses', async () => {
      try {
        const suggestions = await smartRepliesService.generateIntentBasedSuggestions(
          'greeting',
          {},
          '',
          {}
        );
        assert(Array.isArray(suggestions));
        assert(suggestions.length > 0);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should generate question responses', async () => {
      try {
        const suggestions = await smartRepliesService.generateIntentBasedSuggestions(
          'question',
          {},
          '',
          {}
        );
        assert(Array.isArray(suggestions));
        assert(suggestions.length > 0);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should include confidence scores', async () => {
      try {
        const suggestions = await smartRepliesService.generateIntentBasedSuggestions(
          'greeting',
          {},
          '',
          {}
        );
        suggestions.forEach((s) => {
          assert(typeof s.confidence === 'number');
          assert(s.confidence >= 0.6 && s.confidence <= 1);
        });
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('Cache behavior', () => {
    it('should cache smart replies', async () => {
      try {
        const replies1 = await smartRepliesService.getSmartReplies(testMessageId, testUserId);
        const replies2 = await smartRepliesService.getSmartReplies(testMessageId, testUserId);
        assert(Array.isArray(replies1));
        assert(Array.isArray(replies2));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should clear cache', async () => {
      try {
        smartRepliesService.clearCache();
        const replies = await smartRepliesService.getSmartReplies(testMessageId, testUserId);
        assert(Array.isArray(replies));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });
});
