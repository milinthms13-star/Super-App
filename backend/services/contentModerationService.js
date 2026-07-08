const axios = require('axios');
const { cacheService } = require('./cacheService');
const { errorTrackingService } = require('./errorTrackingService');

// Profanity word list (basic - can be extended)
const PROFANITY_LIST = [
  'profanity1', 'profanity2', 'profanity3', // Replace with actual words
  // Add more words as needed
];

// Spam patterns
const SPAM_PATTERNS = [
  /\b(http|https):\/\/[^\s]+/gi, // URLs
  /\b\d{10,}\b/g, // Long numbers (phone numbers)
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, // Email addresses
  /\b(whatsapp|telegram|signal|viber|wechat)\b/gi, // Messaging app names
  /\b(call|text|dm|message)\s+(me|now)\b/gi, // Direct contact requests
  /\b(click|visit|check)\s+(here|now|this|link)\b/gi, // Clickbait
  /\$\$|\bfree\b|\bwin\b|\bprize\b/gi, // Common spam keywords
  /\b(buy|sell|purchase|order|discount)\s+(now|today)\b/gi, // Commercial spam
];

// Suspicious patterns for fake profiles
const FAKE_PROFILE_INDICATORS = [
  /\b(model|actor|actress|celebrity)\b/gi,
  /\b(millionaire|billionaire|ceo|business owner)\b/gi,
  /\b(urgent|immediately|asap)\b/gi,
  /\b(lonely|looking for love|need someone)\b/gi,
];

class ContentModerationService {
  constructor() {
    this.perspectiveApiKey = process.env.PERSPECTIVE_API_KEY;
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.moderationEnabled = process.env.CONTENT_MODERATION_ENABLED !== 'false';
    this.autoBlockThreshold = parseFloat(process.env.AUTO_BLOCK_THRESHOLD || '0.8');
    this.flagThreshold = parseFloat(process.env.FLAG_THRESHOLD || '0.6');
  }

  /**
   * Moderate text content
   * @param {string} text - Text to moderate
   * @param {string} context - Context of the content (profile, message, bio)
   * @returns {Promise<Object>} Moderation result
   */
  async moderateText(text, context = 'general') {
    if (!text || typeof text !== 'string') {
      return { clean: true, score: 0, flags: [] };
    }

    try {
      const results = await Promise.all([
        this.checkProfanity(text),
        this.checkSpam(text),
        this.checkSentiment(text),
        this.checkWithAI(text, context)
      ]);

      const [profanityResult, spamResult, sentimentResult, aiResult] = results;

      const aggregatedScore = Math.max(
        profanityResult.score,
        spamResult.score,
        sentimentResult.score,
        aiResult.score
      );

      const flags = [
        ...profanityResult.flags,
        ...spamResult.flags,
        ...sentimentResult.flags,
        ...aiResult.flags
      ];

      const action = this.determineAction(aggregatedScore);

      const result = {
        clean: aggregatedScore < this.flagThreshold,
        score: aggregatedScore,
        flags,
        action,
        details: {
          profanity: profanityResult,
          spam: spamResult,
          sentiment: sentimentResult,
          ai: aiResult
        }
      };

      // Log moderation result
      await errorTrackingService.logAudit('content_moderation', {
        context,
        score: aggregatedScore,
        action,
        flags: flags.length
      });

      return result;
    } catch (error) {
      errorTrackingService.captureError(error, { text: text.substring(0, 100), context });
      // Fail-safe: allow content but flag for manual review
      return {
        clean: false,
        score: 0.5,
        flags: ['moderation_error'],
        action: 'flag',
        error: error.message
      };
    }
  }

  /**
   * Check for profanity
   * @param {string} text - Text to check
   * @returns {Object} Profanity check result
   */
  async checkProfanity(text) {
    const lowerText = text.toLowerCase();
    const foundWords = [];
    let profanityCount = 0;

    for (const word of PROFANITY_LIST) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        foundWords.push(word);
        profanityCount += matches.length;
      }
    }

    // Check for masked profanity (e.g., "f**k", "sh1t")
    const maskedProfanity = /[*@#$%]{2,}|[a-z]\d[a-z]/gi;
    if (maskedProfanity.test(text)) {
      foundWords.push('masked_profanity');
      profanityCount += 1;
    }

    const score = Math.min(profanityCount * 0.3, 1.0);
    const flags = foundWords.length > 0 ? ['profanity'] : [];

    return { score, flags, details: { foundWords, count: profanityCount } };
  }

  /**
   * Check for spam content
   * @param {string} text - Text to check
   * @returns {Object} Spam check result
   */
  async checkSpam(text) {
    const flags = [];
    let spamScore = 0;

    for (const pattern of SPAM_PATTERNS) {
      if (pattern.test(text)) {
        flags.push(`spam_pattern_${pattern.source.substring(0, 20)}`);
        spamScore += 0.2;
      }
    }

    // Check for excessive capitalization
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.5 && text.length > 20) {
      flags.push('excessive_caps');
      spamScore += 0.2;
    }

    // Check for repeated characters
    if (/(.)\1{4,}/.test(text)) {
      flags.push('repeated_chars');
      spamScore += 0.1;
    }

    // Check for excessive punctuation
    const punctuationRatio = (text.match(/[!?.,;:]{2,}/g) || []).length;
    if (punctuationRatio > 3) {
      flags.push('excessive_punctuation');
      spamScore += 0.1;
    }

    const score = Math.min(spamScore, 1.0);

    return { score, flags, details: { patterns: flags.length } };
  }

  /**
   * Check sentiment and toxicity
   * @param {string} text - Text to check
   * @returns {Object} Sentiment check result
   */
  async checkSentiment(text) {
    // If Perspective API is available, use it
    if (this.perspectiveApiKey) {
      return await this.checkWithPerspectiveAPI(text);
    }

    // Fallback: basic sentiment analysis
    const negativeWords = [
      'hate', 'angry', 'terrible', 'awful', 'horrible',
      'disgusting', 'pathetic', 'loser', 'stupid', 'idiot'
    ];

    const lowerText = text.toLowerCase();
    let negativeCount = 0;

    for (const word of negativeWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        negativeCount += matches.length;
      }
    }

    const score = Math.min(negativeCount * 0.2, 1.0);
    const flags = negativeCount > 2 ? ['negative_sentiment'] : [];

    return { score, flags, details: { negativeWords: negativeCount } };
  }

  /**
   * Check with Google Perspective API
   * @param {string} text - Text to check
   * @returns {Object} Perspective API result
   */
  async checkWithPerspectiveAPI(text) {
    try {
      const response = await axios.post(
        `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${this.perspectiveApiKey}`,
        {
          comment: { text },
          languages: ['en'],
          requestedAttributes: {
            TOXICITY: {},
            SEVERE_TOXICITY: {},
            INSULT: {},
            PROFANITY: {},
            THREAT: {}
          }
        }
      );

      const scores = response.data.attributeScores;
      const maxScore = Math.max(
        scores.TOXICITY?.summaryScore?.value || 0,
        scores.SEVERE_TOXICITY?.summaryScore?.value || 0,
        scores.INSULT?.summaryScore?.value || 0,
        scores.PROFANITY?.summaryScore?.value || 0,
        scores.THREAT?.summaryScore?.value || 0
      );

      const flags = [];
      if (scores.TOXICITY?.summaryScore?.value > 0.7) flags.push('toxic');
      if (scores.SEVERE_TOXICITY?.summaryScore?.value > 0.5) flags.push('severe_toxic');
      if (scores.INSULT?.summaryScore?.value > 0.7) flags.push('insulting');
      if (scores.THREAT?.summaryScore?.value > 0.7) flags.push('threatening');

      return { score: maxScore, flags, details: { perspectiveScores: scores } };
    } catch (error) {
      errorTrackingService.captureError(error, { context: 'perspective-api' });
      return { score: 0, flags: [], details: { error: 'perspective_api_failed' } };
    }
  }

  /**
   * Check with OpenAI Moderation API
   * @param {string} text - Text to check
   * @param {string} context - Context of the content
   * @returns {Object} AI moderation result
   */
  async checkWithAI(text, context) {
    if (!this.openaiApiKey) {
      return { score: 0, flags: [], details: { aiEnabled: false } };
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/moderations',
        { input: text },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openaiApiKey}`
          }
        }
      );

      const result = response.data.results[0];
      const categories = result.categories;
      const scores = result.category_scores;

      const flags = [];
      let maxScore = 0;

      if (categories.hate) { flags.push('hate'); maxScore = Math.max(maxScore, scores.hate); }
      if (categories.harassment) { flags.push('harassment'); maxScore = Math.max(maxScore, scores.harassment); }
      if (categories.sexual) { flags.push('sexual'); maxScore = Math.max(maxScore, scores.sexual); }
      if (categories.violence) { flags.push('violence'); maxScore = Math.max(maxScore, scores.violence); }
      if (categories['self-harm']) { flags.push('self-harm'); maxScore = Math.max(maxScore, scores['self-harm']); }

      return { score: maxScore, flags, details: { openaiCategories: categories } };
    } catch (error) {
      errorTrackingService.captureError(error, { context: 'openai-moderation' });
      return { score: 0, flags: [], details: { error: 'openai_failed' } };
    }
  }

  /**
   * Moderate profile content
   * @param {Object} profile - Profile data to moderate
   * @returns {Promise<Object>} Moderation result
   */
  async moderateProfile(profile) {
    const textsToCheck = [
      { field: 'bio', text: profile.bio },
      { field: 'familyDetails', text: profile.familyDetails },
      { field: 'profession', text: profile.profession }
    ].filter(item => item.text);

    const results = await Promise.all(
      textsToCheck.map(item => this.moderateText(item.text, 'profile'))
    );

    // Check for fake profile indicators
    const combinedText = textsToCheck.map(item => item.text).join(' ');
    const fakeProfileScore = this.checkFakeProfileIndicators(combinedText);

    const maxScore = Math.max(...results.map(r => r.score), fakeProfileScore);
    const allFlags = results.flatMap(r => r.flags);
    if (fakeProfileScore > 0.5) allFlags.push('potential_fake_profile');

    const action = this.determineAction(maxScore);

    return {
      clean: maxScore < this.flagThreshold,
      score: maxScore,
      flags: allFlags,
      action,
      fieldResults: results.map((result, index) => ({
        field: textsToCheck[index].field,
        ...result
      }))
    };
  }

  /**
   * Check for fake profile indicators
   * @param {string} text - Combined profile text
   * @returns {number} Fake profile score
   */
  checkFakeProfileIndicators(text) {
    let score = 0;

    for (const pattern of FAKE_PROFILE_INDICATORS) {
      if (pattern.test(text)) {
        score += 0.2;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Moderate message content
   * @param {string} message - Message text
   * @param {Object} metadata - Additional metadata (senderId, receiverId)
   * @returns {Promise<Object>} Moderation result
   */
  async moderateMessage(message, metadata = {}) {
    const result = await this.moderateText(message, 'message');

    // Check for contact information exchange
    const hasContactInfo = this.checkContactInformation(message);
    if (hasContactInfo) {
      result.flags.push('contact_info_exchange');
      result.score = Math.max(result.score, 0.7);
      result.action = 'flag';
    }

    return result;
  }

  /**
   * Check for contact information
   * @param {string} text - Text to check
   * @returns {boolean}
   */
  checkContactInformation(text) {
    const contactPatterns = [
      /\b\d{10}\b/, // 10-digit phone number
      /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, // Formatted phone
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, // Email
      /@\w+/, // Social media handles
      /\b(whatsapp|telegram|signal|viber|wechat|instagram|facebook|snapchat)\b/gi
    ];

    return contactPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Moderate image (placeholder for image moderation)
   * @param {string} imageUrl - URL of image to moderate
   * @returns {Promise<Object>} Moderation result
   */
  async moderateImage(imageUrl) {
    // This would integrate with AWS Rekognition or Google Vision API
    // For now, return a basic result
    try {
      // TODO: Implement actual image moderation
      // - Check for nudity/explicit content
      // - Check for offensive symbols
      // - Verify it's a real person (not celebrity/stock photo)

      return {
        clean: true,
        score: 0,
        flags: [],
        action: 'allow',
        details: { message: 'Image moderation not yet implemented' }
      };
    } catch (error) {
      errorTrackingService.captureError(error, { imageUrl, context: 'image-moderation' });
      return {
        clean: false,
        score: 0.5,
        flags: ['moderation_error'],
        action: 'flag'
      };
    }
  }

  /**
   * Determine action based on score
   * @param {number} score - Moderation score (0-1)
   * @returns {string} Action to take
   */
  determineAction(score) {
    if (score >= this.autoBlockThreshold) {
      return 'block'; // Automatically block content
    } else if (score >= this.flagThreshold) {
      return 'flag'; // Flag for manual review
    } else {
      return 'allow'; // Allow content
    }
  }

  /**
   * Get moderation statistics
   * @param {Date} startDate - Start date for stats
   * @param {Date} endDate - End date for stats
   * @returns {Promise<Object>} Moderation statistics
   */
  async getModerationStats(startDate, endDate) {
    // This would query the database for moderation logs
    // For now, return a placeholder
    return {
      totalChecks: 0,
      blocked: 0,
      flagged: 0,
      allowed: 0,
      topFlags: [],
      averageScore: 0
    };
  }

  /**
   * Batch moderate multiple texts
   * @param {Array<string>} texts - Array of texts to moderate
   * @param {string} context - Context of the content
   * @returns {Promise<Array>} Array of moderation results
   */
  async batchModerate(texts, context = 'general') {
    return await Promise.all(
      texts.map(text => this.moderateText(text, context))
    );
  }

  /**
   * Check if user is spamming (rate limiting check)
   * @param {string} userId - User ID
   * @param {string} action - Action type (message, profile_update, interest)
   * @returns {Promise<boolean>} True if user is spamming
   */
  async checkSpamRate(userId, action) {
    const key = `spam_rate:${userId}:${action}`;
    const count = await cacheService.get(key) || 0;

    const limits = {
      message: { count: 50, window: 3600 }, // 50 messages per hour
      profile_update: { count: 10, window: 3600 }, // 10 updates per hour
      interest: { count: 20, window: 3600 } // 20 interests per hour
    };

    const limit = limits[action] || { count: 100, window: 3600 };

    if (count >= limit.count) {
      return true; // User is spamming
    }

    // Increment counter
    await cacheService.set(key, count + 1, limit.window);
    return false;
  }
}

// Singleton instance
const contentModerationService = new ContentModerationService();

module.exports = { contentModerationService, ContentModerationService };
