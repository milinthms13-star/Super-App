const axios = require('axios');
const logger = require('./logger');

// Real AI Chat Suggestions using Groq API
// Replace GROQ_API_KEY with your key in .env
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

async function generateAISuggestions(recentMessages, tone = 'casual') {
  if (!GROQ_API_KEY) {
    logger.warn('GROQ_API_KEY not set, using fallback suggestions');
    return fallbackSuggestions(tone);
  }

  try {
    // Build conversation context
    const context = recentMessages.slice(-6).reverse().map(msg => 
      `${msg.senderId?.name || 'User'}: ${msg.content.substring(0, 200)}`
    ).join('\\n');

    const prompt = `Generate 3 helpful reply suggestions for this conversation (${tone} tone):
Conversation:
${context}

Provide exactly 3 short suggestions in JSON:
[{"id":"1","text":"Suggestion 1","confidence":0.9},{"id":"2","text":"Suggestion 2","confidence":0.85},{"id":"3","text":"Suggestion 3","confidence":0.8}]`;

    const response = await axios.post(`${GROQ_BASE_URL}/chat/completions`, {
      model: 'llama3-8b-8192', // Fast & cheap
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 200,
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    });

    const suggestions = JSON.parse(response.data.choices[0].message.content);
    return suggestions.map(s => ({
      id: s.id,
      text: s.text.trim(),
      confidence: s.confidence || 0.8,
      tone,
    }));

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

