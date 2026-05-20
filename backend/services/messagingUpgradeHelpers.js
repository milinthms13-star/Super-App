const crypto = require('crypto');

const ALLOWED_MESSAGE_TYPES = new Set([
  'text',
  'image',
  'video',
  'audio',
  'file',
  'voice',
  'location',
  'sticker',
]);

const generateClientMessageId = () =>
  `srv_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

const normalizeClientMessageId = (value) => String(value || '').trim();

const validateMessagePayload = ({ chatId, content, messageType, clientMessageId }) => {
  const errors = [];

  const normalizedType =
    typeof messageType === 'string' && messageType.trim()
      ? messageType.trim().toLowerCase()
      : 'text';
  const normalizedContent = String(content || '').trim();
  const normalizedClientMessageId =
    normalizeClientMessageId(clientMessageId) || generateClientMessageId();

  if (!chatId) {
    errors.push('chatId is required.');
  }

  if (!ALLOWED_MESSAGE_TYPES.has(normalizedType)) {
    errors.push('Invalid message type.');
  }

  if (normalizedType === 'text' && normalizedContent.length === 0) {
    errors.push('Message cannot be empty.');
  }

  if (normalizedContent.length > 4000) {
    errors.push('Message is too long. Maximum 4000 characters allowed.');
  }

  return {
    ok: errors.length === 0,
    errors,
    normalizedType,
    normalizedContent,
    normalizedClientMessageId,
  };
};

const safeFallbackReplies = (language = 'en') => {
  const replies = {
    ml: [
      'Shari, njan check cheythittu update cheyyam.',
      'Kurachu koodi details share cheyyamo?',
      'Athe, namukku discuss cheyyam.',
    ],
    hi: [
      'Thik hai, main check karke batata hu.',
      'Thoda aur details share kar sakte ho?',
      'Haan, is par baat karte hain.',
    ],
    en: [
      'Okay, I will check and update you.',
      'Can you share a few more details?',
      'Sure, let us discuss this.',
    ],
  };

  const normalizedLanguage = String(language || 'en').toLowerCase();
  const selectedReplies = replies[normalizedLanguage] || replies.en;

  return selectedReplies.map((text, index) => ({
    id: `fallback-${index + 1}`,
    text,
    tone: 'safe',
  }));
};

module.exports = {
  generateClientMessageId,
  normalizeClientMessageId,
  validateMessagePayload,
  safeFallbackReplies,
};
