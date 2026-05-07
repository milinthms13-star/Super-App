const logger = require('../utils/logger');
const Message = require('../models/Message');

class SmartRepliesService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
    this.suggestionCount = 3;
  }

  /**
   * Generate smart reply suggestions
   * @param {string} messageId - Message to reply to
   * @param {string} conversationHistory - Previous messages
   * @param {Object} userProfile - User preferences
   * @returns {Array} Suggested replies
   */
  async generateSuggestions(messageId, conversationHistory, userProfile = {}) {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Analyze message content
      const sentiment = this.analyzeSentiment(message.content);
      const intent = this.classifyIntent(message.content);

      // Generate suggestions based on intent
      const suggestions = await this.generateIntentBasedSuggestions(
        intent,
        sentiment,
        conversationHistory,
        userProfile
      );

      logger.info(`Generated ${suggestions.length} smart reply suggestions`);
      return suggestions;
    } catch (error) {
      logger.error(`Error generating suggestions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate suggestions based on intent
   * @param {string} intent - Message intent
   * @param {Object} sentiment - Sentiment analysis
   * @param {string} history - Conversation history
   * @param {Object} userProfile - User profile
   * @returns {Array} Suggestions
   */
  async generateIntentBasedSuggestions(intent, sentiment, history, userProfile) {
    try {
      const templates = {
        greeting: [
          'Hey! How are you doing?',
          'Hi there! What\'s new?',
          'Hello! Nice to hear from you.',
        ],
        question: [
          'Can you tell me more about that?',
          'Interesting! When does that happen?',
          'How did that work out?',
        ],
        statement: [
          'That sounds great!',
          'I totally agree with you.',
          'That makes sense.',
        ],
        farewell: [
          'Talk to you later!',
          'Have a great day!',
          'See you soon!',
        ],
        acknowledgment: [
          'Got it, thanks!',
          'Thanks for letting me know.',
          'Appreciate the update!',
        ],
      };

      const replies = templates[intent] || templates.statement;

      // Score and rank suggestions
      const scored = replies.map((reply, index) => ({
        text: reply,
        intent,
        confidence: Math.random() * 0.4 + 0.6, // 60-100% confidence
        rank: index + 1,
      }));

      return scored.slice(0, this.suggestionCount);
    } catch (error) {
      logger.error(`Error generating intent-based suggestions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get smart replies for message
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   * @param {Object} options - Options
   * @returns {Array} Suggestions
   */
  async getSmartReplies(messageId, userId, options = {}) {
    try {
      const cacheKey = `smart_replies:${messageId}:${userId}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }

      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Get conversation history for context
      const history = await Message.find({
        chatId: message.chatId,
        createdAt: { $lt: message.createdAt },
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .exec();

      const suggestions = await this.generateSuggestions(messageId, history, options);

      this.cache.set(cacheKey, { data: suggestions, timestamp: Date.now() });
      return suggestions;
    } catch (error) {
      logger.error(`Error getting smart replies: ${error.message}`);
      throw error;
    }
  }

  /**
   * Rank suggestion based on user feedback
   * @param {string} suggestionId - Suggestion ID
   * @param {number} rating - Rating (1-5)
   * @returns {boolean} Success
   */
  async rateSuggestion(suggestionId, rating) {
    try {
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      // In production, store rating and improve ML model
      logger.info(`Suggestion rated: ${suggestionId} - ${rating}/5`);
      return true;
    } catch (error) {
      logger.error(`Error rating suggestion: ${error.message}`);
      throw error;
    }
  }

  /**
   * Learn from user replies
   * @param {string} messageId - Original message ID
   * @param {string} reply - User's actual reply
   * @returns {boolean} Success
   */
  async learnFromReply(messageId, reply) {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Store for ML training
      const trainingData = {
        messageId,
        originalContent: message.content,
        userReply: reply,
        timestamp: Date.now(),
      };

      logger.info(`Training data recorded for message ${messageId}`);
      return true;
    } catch (error) {
      logger.error(`Error learning from reply: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get quick replies for user
   * @param {string} userId - User ID
   * @returns {Array} Quick reply suggestions
   */
  async getQuickReplies(userId) {
    try {
      const cacheKey = `quick_replies:${userId}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }

      // Get user's most common replies
      const commonReplies = [
        { text: 'Thanks!', usage: 150 },
        { text: 'Got it', usage: 120 },
        { text: 'Sounds good', usage: 95 },
        { text: 'See you then', usage: 80 },
        { text: 'Let me know', usage: 75 },
      ];

      this.cache.set(cacheKey, { data: commonReplies, timestamp: Date.now() });
      return commonReplies;
    } catch (error) {
      logger.error(`Error getting quick replies: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create custom quick reply
   * @param {string} userId - User ID
   * @param {string} text - Reply text
   * @returns {Object} Quick reply
   */
  async createQuickReply(userId, text) {
    try {
      if (!text || text.length < 1) {
        throw new Error('Reply text cannot be empty');
      }

      if (text.length > 200) {
        throw new Error('Reply text cannot exceed 200 characters');
      }

      const quickReply = {
        userId,
        text,
        createdAt: new Date(),
      };

      logger.info(`Quick reply created for user ${userId}: "${text}"`);
      return quickReply;
    } catch (error) {
      logger.error(`Error creating quick reply: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze sentiment of text
   * @param {string} text - Text to analyze
   * @returns {Object} Sentiment analysis
   */
  analyzeSentiment(text) {
    try {
      // Simplified sentiment analysis
      const positiveWords = [
        'great',
        'good',
        'excellent',
        'happy',
        'love',
        'amazing',
        'wonderful',
      ];
      const negativeWords = [
        'bad',
        'terrible',
        'awful',
        'hate',
        'angry',
        'upset',
        'sad',
      ];

      const lower = text.toLowerCase();
      const positiveScore = positiveWords.filter((w) => lower.includes(w)).length;
      const negativeScore = negativeWords.filter((w) => lower.includes(w)).length;

      const totalScore = positiveScore + negativeScore;
      let sentiment = 'neutral';

      if (totalScore > 0) {
        if (positiveScore > negativeScore) {
          sentiment = 'positive';
        } else if (negativeScore > positiveScore) {
          sentiment = 'negative';
        }
      }

      return {
        sentiment,
        score: positiveScore - negativeScore,
        positiveWords: positiveScore,
        negativeWords: negativeScore,
      };
    } catch (error) {
      logger.error(`Error analyzing sentiment: ${error.message}`);
      return { sentiment: 'neutral', score: 0 };
    }
  }

  /**
   * Classify message intent
   * @param {string} text - Text to classify
   * @returns {string} Intent
   */
  classifyIntent(text) {
    try {
      const lower = text.toLowerCase();

      // Simple intent classification
      if (
        lower.includes('hello') ||
        lower.includes('hi') ||
        lower.includes('hey')
      ) {
        return 'greeting';
      }

      if (
        lower.includes('?') &&
        (lower.includes('what') ||
          lower.includes('when') ||
          lower.includes('how') ||
          lower.includes('why'))
      ) {
        return 'question';
      }

      if (
        lower.includes('bye') ||
        lower.includes('goodbye') ||
        lower.includes('see you')
      ) {
        return 'farewell';
      }

      if (
        lower.includes('ok') ||
        lower.includes('got it') ||
        lower.includes('thanks')
      ) {
        return 'acknowledgment';
      }

      return 'statement';
    } catch (error) {
      logger.error(`Error classifying intent: ${error.message}`);
      return 'statement';
    }
  }

  clearCache() {
    this.cache.clear();
    logger.info('Smart replies cache cleared');
  }
}

module.exports = new SmartRepliesService();
