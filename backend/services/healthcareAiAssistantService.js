const axios = require('axios');

const DEFAULT_MODEL = process.env.HEALTHCARE_AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';

const buildFallbackResponse = ({ question = '', context = {} } = {}) => {
  const upcomingCount = Number(context?.upcomingAppointments || 0);
  const refillCount = Number(context?.activeRefills || 0);
  const openIncidents = Number(context?.openIncidents || 0);
  const summary = [
    `Question received: ${String(question || 'General healthcare planning').trim() || 'General healthcare planning'}.`,
    `You currently have ${upcomingCount} upcoming appointment(s), ${refillCount} active refill reminder(s), and ${openIncidents} open emergency incident(s).`,
    'This assistant does not provide diagnosis. For urgent symptoms, contact emergency services and a licensed clinician immediately.',
  ].join(' ');

  return {
    answer: summary,
    carePlan: [
      'Verify medication schedule and refill dates.',
      'Review the latest reports before consultations.',
      'Keep one family contact and emergency numbers updated.',
    ],
    riskFlags: openIncidents > 0 ? ['open_emergency_incident'] : [],
    disclaimer: 'Informational support only. Not a substitute for professional medical advice, diagnosis, or treatment.',
    provider: 'fallback',
    model: 'fallback',
  };
};

const generateHealthcareAssistantResponse = async ({ question = '', context = {} } = {}) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return buildFallbackResponse({ question, context });
  }

  const systemPrompt = [
    'You are a healthcare operations copilot for patients and caregivers.',
    'Return strictly valid JSON with keys: answer, carePlan, riskFlags, disclaimer, provider, model.',
    'Keep guidance practical and safety-first.',
    'Never provide diagnosis, dosage changes, or treatment claims.',
    'Escalate urgent concerns to emergency services and licensed clinicians.',
  ].join(' ');

  const userPrompt = JSON.stringify({
    question: String(question || '').trim(),
    context,
    requestedOutput: 'Concise 360 support guidance with clear next steps.',
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
      carePlan: Array.isArray(parsed?.carePlan) ? parsed.carePlan.slice(0, 6) : [],
      riskFlags: Array.isArray(parsed?.riskFlags) ? parsed.riskFlags.slice(0, 8) : [],
      disclaimer: String(parsed?.disclaimer || '').trim() || 'Informational support only. Consult licensed clinicians.',
      provider: 'openai',
      model: DEFAULT_MODEL,
    };
  } catch (_error) {
    return buildFallbackResponse({ question, context });
  }
};

module.exports = {
  generateHealthcareAssistantResponse,
};
