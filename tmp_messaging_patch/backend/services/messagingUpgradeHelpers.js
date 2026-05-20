const crypto = require('crypto');

const generateClientMessageId = () =>
  `srv_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

const normalizeClientMessageId = (value) => String(value || '').trim();

const validateMessagePayload = ({ chatId, content, messageType, clientMessageId }) => {
  const errors = [];

  if (!chatId) errors.push('chatId is required.');

  const normalizedType = messageType || 'text';
  const normalizedContent = String(content || '').trim();

  if (!['text', 'image', 'video', 'audio', 'file', 'voice', 'location', 'sticker'].includes(normalizedType)) {
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
    normalizedClientMessageId: normalizeClientMessageId(clientMessageId) || generateClientMessageId(),
  };
};

const buildSmartReplyPrompt = ({ language = 'en', recentMessages = [] }) => {
  const languageMap = {
    en: 'English',
    ml: 'Malayalam',
    hi: 'Hindi',
    ta: 'Tamil',
    te: 'Telugu',
    kn: 'Kannada',
  };

  const safeLanguage = languageMap[language] || 'English';
  const context = recentMessages
    .slice(-8)
    .map((message) => `${message.senderName || 'User'}: ${message.content || ''}`)
    .join('\n');

  return `Generate 3 short, natural chat replies in ${safeLanguage}.
Keep replies friendly, safe and under 14 words.
Do not include numbering.
Conversation:
${context}`;
};

const safeFallbackReplies = (language = 'en') => {
  const replies = {
    ml: ['ശരി, ഞാൻ നോക്കാം.', 'കുറച്ച് വിശദമായി പറയാമോ?', 'അതെ, നമുക്ക് സംസാരിക്കാം.'],
    hi: ['ठीक है, मैं देखती हूँ।', 'थोड़ा और बताइए।', 'हाँ, बात करते हैं।'],
    en: ['Okay, I will check.', 'Can you share more details?', 'Sure, let us discuss.'],
  };

  return (replies[language] || replies.en).map((text, index) => ({
    id: `fallback-${index + 1}`,
    text,
    tone: 'safe',
  }));
};

module.exports = {
  generateClientMessageId,
  normalizeClientMessageId,
  validateMessagePayload,
  buildSmartReplyPrompt,
  safeFallbackReplies,
};
