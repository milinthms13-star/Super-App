const axios = require('axios');
const logger = require('./logger');

const isFreeMode = ['1', 'true', 'yes', 'on'].includes(String(process.env.FREE_MODE || '').toLowerCase());
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MESSAGING_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const parseSuggestions = (text, tone) => {
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      return null;
    }
    return parsed.map((item, index) => ({
      id: String(item?.id || index + 1),
      text: String(item?.text || '').trim(),
      confidence: Number(item?.confidence || 0.8),
      tone,
    })).filter((item) => item.text);
  } catch (_error) {
    return null;
  }
};

async function generateAISuggestions(recentMessages, tone = 'casual') {
  if (isFreeMode) {
    return fallbackSuggestions(tone);
  }

  if (!GEMINI_API_KEY) {
    logger.warn('GEMINI_API_KEY/GOOGLE_API_KEY not set, using fallback suggestions');
    return fallbackSuggestions(tone);
  }

  try {
    const context = recentMessages
      .slice(-6)
      .reverse()
      .map((msg) => `${msg.senderId?.name || 'User'}: ${String(msg.content || '').substring(0, 200)}`)
      .join('\n');

    const prompt = `Generate 3 helpful reply suggestions for this conversation (${tone} tone):
Conversation:
${context}

Provide exactly 3 short suggestions in strict JSON:
[{"id":"1","text":"Suggestion 1","confidence":0.9},{"id":"2","text":"Suggestion 2","confidence":0.85},{"id":"3","text":"Suggestion 3","confidence":0.8}]`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`,
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 220,
          responseMimeType: 'application/json',
        },
      },
      {
        headers: {
          'x-goog-api-key': GEMINI_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );

    const rawText = response?.data?.candidates?.[0]?.content?.parts
      ?.map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('\n')
      .trim();

    const parsed = parseSuggestions(rawText, tone);
    if (parsed && parsed.length) {
      return parsed.slice(0, 3);
    }
    return fallbackSuggestions(tone);
  } catch (error) {
    logger.error('AI suggestions failed:', error.message);
    return fallbackSuggestions(tone);
  }
}

function fallbackSuggestions(tone) {
  const casual = [
    { id: '1', text: 'Thanks for sharing!', confidence: 0.85 },
    { id: '2', text: 'That sounds interesting!', confidence: 0.8 },
    { id: '3', text: 'Tell me more about that.', confidence: 0.75 },
  ];

  const professional = [
    { id: '1', text: 'Thank you for the information.', confidence: 0.9 },
    { id: '2', text: 'Could you elaborate?', confidence: 0.85 },
    { id: '3', text: 'I understand your point.', confidence: 0.8 },
  ];

  return tone === 'professional' ? professional : casual;
}

module.exports = {
  generateAISuggestions,
};
