/**
 * Spam detection and phishing prevention for classified listings
 */

const SPAM_KEYWORDS = [
  'click here',
  'bit.ly',
  'tinyurl',
  'earn money',
  'work from home',
  'no experience',
  'guaranteed income',
  'crypto',
  'bitcoin',
  'forex',
  'nigerian prince',
  'inheritance',
  'lottery',
  'prize',
  'click bait',
];

const PHISHING_PATTERNS = [
  /https?:\/\/[a-z0-9-]+\.(tk|ml|ga|cf)\//i, // Free domains
  /mailto:[^@]+@[^@]+\.[^@]+/i, // Email links
  /(?:pay|verify|confirm|update).*(?:account|details|info)/i,
];

/**
 * Calculate spam score for a listing (0-100)
 */
const calculateSpamScore = (listing = {}) => {
  let score = 0;
  const { title = '', description = '', tags = [], category = '', location = '' } = listing;
  
  const fullText = `${title} ${description} ${tags.join(' ')}`.toLowerCase();

  // Check for spam keywords
  SPAM_KEYWORDS.forEach((keyword) => {
    if (fullText.includes(keyword.toLowerCase())) {
      score += 10;
    }
  });

  // Check for phishing patterns
  PHISHING_PATTERNS.forEach((pattern) => {
    if (pattern.test(fullText)) {
      score += 25;
    }
  });

  // Check for excessive URLs
  const urlCount = (fullText.match(/https?:\/\//g) || []).length;
  if (urlCount > 2) {
    score += urlCount * 5;
  }

  // Check for repeated characters
  if (/(.)(\1{4,})/g.test(fullText)) {
    score += 15;
  }

  // Check for ALL CAPS abuse
  const capsWords = (fullText.match(/\b[A-Z]{3,}\b/g) || []).length;
  if (capsWords > 5) {
    score += Math.min(20, capsWords);
  }

  // Check for suspicious category/location mismatch
  const suspiciousPatterns = /(?:bank|paypal|amazon|apple|microsoft)/i;
  if (suspiciousPatterns.test(fullText) && !['Services', 'Digital'].includes(category)) {
    score += 20;
  }

  // Check title too short
  if (title.length < 5) {
    score += 5;
  }

  // Check description too short for suspicious content
  if (description.length < 20 && SPAM_KEYWORDS.some(kw => fullText.includes(kw))) {
    score += 10;
  }

  return Math.min(100, score);
};

/**
 * Flag suspicious patterns in listing
 */
const detectSuspiciousFlags = (listing = {}) => {
  const flags = [];
  const { title = '', description = '', price = 0, sellerEmail = '' } = listing;

  if (price === 0 || price < 1) {
    flags.push('unusual-price');
  }

  if (sellerEmail && /^[a-z0-9]{10,}@/i.test(sellerEmail)) {
    flags.push('suspicious-email');
  }

  const fullText = `${title} ${description}`.toLowerCase();

  if (/(whatsapp|telegram|viber|wechat)/i.test(fullText)) {
    flags.push('external-communication');
  }

  if (/pay\s*(before|first|upfront)/i.test(fullText)) {
    flags.push('advance-payment');
  }

  if (/(clearance|discount|special offer).*\d{2,3}%/i.test(fullText)) {
    flags.push('unrealistic-deal');
  }

  return flags;
};

/**
 * Validate listing content quality
 */
const validateContentQuality = (listing = {}) => {
  const errors = [];
  const { title = '', description = '' } = listing;

  if (!title || title.trim().length < 5) {
    errors.push('Title too short (minimum 5 characters)');
  }

  if (title.length > 140) {
    errors.push('Title too long (maximum 140 characters)');
  }

  if (!description || description.trim().length < 20) {
    errors.push('Description too short (minimum 20 characters)');
  }

  if (description.length > 1500) {
    errors.push('Description too long (maximum 1500 characters)');
  }

  // Check for minimum quality (not all numbers or special chars)
  if (!/[a-z]/i.test(title)) {
    errors.push('Title must contain at least some letters');
  }

  return errors;
};

module.exports = {
  calculateSpamScore,
  detectSuspiciousFlags,
  validateContentQuality,
  SPAM_KEYWORDS,
  PHISHING_PATTERNS,
};
