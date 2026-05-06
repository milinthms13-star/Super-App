/**
 * Chat Moderation Service
 * Detects spam, abuse, and inappropriate content in matrimonial messages
 */

const INAPPROPRIATE_KEYWORDS = [
  'adult', 'xxx', 'porn', 'sex', 'nude', 'naked', 'weed', 'drugs', 'casino', 'lottery',
  'investment', 'money transfer', 'western union', 'bitcoin', 'crypto', 'scam', 'fraud',
  'dating', 'meet', 'hotel', 'room', 'night'
];

const SPAM_PATTERNS = [
  /click here|download now|limited offer|act now/gi,
  /invest \$\d+/gi,
  /(http|https):\/\/\S+/gi,  // URLs in messages
  /telegram|whatsapp|signal/gi,  // External contact info
  /\d{10,}/  // Phone numbers
];

/**
 * Detect spam in message
 */
const detectSpam = (message) => {
  const lowerMessage = message.toLowerCase();
  
  // Check for repeated characters
  if (/(.)\1{9,}/.test(message)) {
    return {
      isSpam: true,
      reason: 'Repeated characters detected',
      severity: 'low'
    };
  }

  // Check for excessive URLs
  const urlCount = (message.match(/https?:\/\//g) || []).length;
  if (urlCount > 2) {
    return {
      isSpam: true,
      reason: 'Too many URLs in message',
      severity: 'high'
    };
  }

  // Check spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(message)) {
      return {
        isSpam: true,
        reason: 'Spam pattern detected',
        severity: 'high'
      };
    }
  }

  return { isSpam: false };
};

/**
 * Detect inappropriate content
 */
const detectInappropriateContent = (message) => {
  const lowerMessage = message.toLowerCase();
  const foundKeywords = [];

  for (const keyword of INAPPROPRIATE_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      foundKeywords.push(keyword);
    }
  }

  if (foundKeywords.length > 0) {
    return {
      isInappropriate: true,
      keywords: foundKeywords,
      severity: foundKeywords.length === 1 ? 'low' : 'medium'
    };
  }

  return { isInappropriate: false };
};

/**
 * Check if user is rate-limited (too many messages in short time)
 */
const checkRateLimit = async (userId, messagesThisHour = 0) => {
  const maxMessagesPerHour = 50;
  
  if (messagesThisHour >= maxMessagesPerHour) {
    return {
      isRateLimited: true,
      reason: 'Too many messages in one hour',
      limit: maxMessagesPerHour,
      current: messagesThisHour
    };
  }

  return { isRateLimited: false };
};

/**
 * Calculate message moderation score (0-100)
 */
const calculateModerationScore = (message) => {
  let score = 100;
  
  const spam = detectSpam(message);
  if (spam.isSpam) {
    score -= spam.severity === 'high' ? 40 : 20;
  }

  const inappropriate = detectInappropriateContent(message);
  if (inappropriate.isInappropriate) {
    score -= inappropriate.severity === 'high' ? 30 : inappropriate.severity === 'medium' ? 20 : 10;
  }

  // Check message length (too short or too long)
  if (message.length < 2) score -= 5;
  if (message.length > 5000) score -= 10;

  // Check for mostly capital letters (shouting)
  const capitalLetters = (message.match(/[A-Z]/g) || []).length;
  if (message.length > 10 && capitalLetters / message.length > 0.7) {
    score -= 10;
  }

  return Math.max(0, score);
};

/**
 * Full message moderation check
 */
const moderateMessage = async (message, userId, lastHourMessageCount = 0) => {
  const moderation = {
    score: calculateModerationScore(message),
    spam: detectSpam(message),
    inappropriate: detectInappropriateContent(message),
    rateLimit: await checkRateLimit(userId, lastHourMessageCount),
    flagged: false,
    reason: null,
    actions: []
  };

  // Determine if message should be flagged
  if (moderation.spam.isSpam && moderation.spam.severity === 'high') {
    moderation.flagged = true;
    moderation.reason = 'High-severity spam detected';
    moderation.actions.push('quarantine', 'admin_review');
  }

  if (moderation.inappropriate.isInappropriate && moderation.inappropriate.severity === 'high') {
    moderation.flagged = true;
    moderation.reason = 'Inappropriate content detected';
    moderation.actions.push('block', 'report_user');
  }

  if (moderation.rateLimit.isRateLimited) {
    moderation.flagged = true;
    moderation.reason = 'Rate limit exceeded';
    moderation.actions.push('throttle');
  }

  if (moderation.score < 30) {
    moderation.flagged = true;
    moderation.reason = 'Low moderation score';
    moderation.actions.push('admin_review');
  }

  return moderation;
};

/**
 * Filter message content for display (remove sensitive info)
 */
const filterMessageDisplay = (message, options = {}) => {
  let filtered = message;

  // Remove phone numbers
  if (options.hidePhoneNumbers !== false) {
    filtered = filtered.replace(/\b\d{10,}\b/g, '[PHONE]');
  }

  // Remove URLs
  if (options.hideUrls !== false) {
    filtered = filtered.replace(/https?:\/\/\S+/gi, '[LINK]');
  }

  // Remove external contact info
  if (options.hideExternalContact !== false) {
    filtered = filtered.replace(/(?:telegram|whatsapp|signal)[\s:@]*\S+/gi, '[EXTERNAL_CONTACT]');
  }

  return filtered;
};

module.exports = {
  detectSpam,
  detectInappropriateContent,
  checkRateLimit,
  calculateModerationScore,
  moderateMessage,
  filterMessageDisplay
};
