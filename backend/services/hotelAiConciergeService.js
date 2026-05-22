const axios = require('axios');

const DEFAULT_MODEL = process.env.HOTEL_AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';

const buildFallbackResponse = ({ question = '', context = {} } = {}) => {
  const destination = String(context?.destination || context?.location || '').trim() || 'your destination';
  const guests = Number(context?.guests || 1);
  const budget = Number(context?.budget || 0);
  const checkIn = String(context?.checkInDate || '').trim();
  const checkOut = String(context?.checkOutDate || '').trim();

  const summary = [
    `Question received: ${String(question || 'Find the best stay options').trim()}.`,
    `For ${destination}, prioritize verified properties with flexible cancellation and guest rating above 4.0.`,
    budget > 0 ? `Keep room price within INR ${Math.round(budget)} per night.` : 'Compare options by total stay value.',
    `Trip profile: ${guests} guest(s)${checkIn ? `, check-in ${checkIn}` : ''}${checkOut ? `, check-out ${checkOut}` : ''}.`,
  ].join(' ');

  return {
    answer: summary,
    recommendations: [
      'Shortlist 3 properties and compare room amenities and cancellation policy.',
      'Confirm room inventory before payment for selected dates.',
      'Use guest reviews from recent stays to validate service quality.',
    ],
    warnings: [],
    disclaimer: 'Informational trip planning support only. Confirm final pricing and policies with the property.',
    provider: 'fallback',
    model: 'fallback',
  };
};

const generateHotelConciergeResponse = async ({ question = '', context = {} } = {}) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return buildFallbackResponse({ question, context });
  }

  const systemPrompt = [
    'You are a hotel booking concierge for Kerala travel and stays.',
    'Return strictly valid JSON with keys: answer, recommendations, warnings, disclaimer, provider, model.',
    'Give practical and concise planning guidance.',
    'Do not fabricate room availability or pricing certainty.',
  ].join(' ');

  const userPrompt = JSON.stringify({
    question: String(question || '').trim(),
    context,
    requestedOutput: '360 booking guidance with actionable next steps.',
  });

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: DEFAULT_MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const raw = response?.data?.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);
    return {
      answer: String(parsed?.answer || '').trim() || buildFallbackResponse({ question, context }).answer,
      recommendations: Array.isArray(parsed?.recommendations) ? parsed.recommendations.slice(0, 6) : [],
      warnings: Array.isArray(parsed?.warnings) ? parsed.warnings.slice(0, 6) : [],
      disclaimer:
        String(parsed?.disclaimer || '').trim() ||
        'Informational trip planning support only. Confirm final pricing and policies with the property.',
      provider: 'openai',
      model: DEFAULT_MODEL,
    };
  } catch (_error) {
    return buildFallbackResponse({ question, context });
  }
};

module.exports = {
  generateHotelConciergeResponse,
};
