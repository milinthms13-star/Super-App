const { v4: uuidv4 } = require('uuid');
const { OpenAI } = require('openai');
const logger = require('../utils/logger');

let openai;
try {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} catch (error) {
  logger.warn('OpenAI client not initialized for VoiceFriendService:', error.message);
  openai = null;
}

const sessions = new Map();
const SESSION_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

const cleanOldSessions = () => {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(sessionId);
    }
  }
};

const buildPersonaPrompt = ({ persona = 'supportive', mood = 'neutral', language = 'en' }) => {
  const basePrompt = `You are an empathetic AI voice companion named Nila Friend. Your personality should be warm, calming, supportive, and respectful. Use simple, friendly language and respond in the user's preferred language when possible.`;
  const moodPrompt = mood
    ? `The user says they are feeling ${mood}. Adapt your tone to be ${mood === 'sad' ? 'extra comforting and gentle' : mood === 'anxious' ? 'reassuring and steady' : mood === 'happy' ? 'cheerful and encouraging' : mood === 'neutral' ? 'balanced and supportive' : 'kind and understanding'}.`
    : '';
  const personaPrompt = persona === 'motivational'
    ? 'Add a motivational, uplifting style with gentle first-step suggestions and optimism.'
    : persona === 'mindful'
      ? 'Use mindful breathing cues, present-moment grounding, and emotional awareness language.'
      : persona === 'playful'
        ? 'Keep the tone warm, friendly, and lightly playful without sounding silly.'
        : 'Keep the tone calm, gentle, and encouraging.';

  return `${basePrompt} ${moodPrompt} ${personaPrompt}

Always avoid medical, legal, or safety-critical advice. If the user asks for help with self-harm, violence, or emergencies, acknowledge their feelings and encourage them to contact a trusted person or professional support. Use a safe, compassionate response style.`;
};

const createSession = ({ userId, persona = 'supportive', mood = 'neutral', language = 'en' }) => {
  cleanOldSessions();
  const sessionId = uuidv4();
  const session = {
    sessionId,
    userId: userId || null,
    persona: persona || 'supportive',
    mood: mood || 'neutral',
    language: language || 'en',
    messages: [],
    createdAt: Date.now(),
  };
  sessions.set(sessionId, session);
  return session;
};

const getSession = (sessionId) => {
  cleanOldSessions();
  return sessions.get(sessionId) || null;
};

const buildConversation = (session, userMessage) => {
  const history = (session.messages || []).slice(-10);
  return [
    {
      role: 'system',
      content: buildPersonaPrompt(session),
    },
    ...history,
    {
      role: 'user',
      content: userMessage,
    },
  ];
};

const createAIResponse = async (messages) => {
  if (!openai) {
    return 'I am here to listen, but the AI voice companion is not available right now. Please try again later.';
  }

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_VOICE_FRIEND_MODEL || 'gpt-4o-mini',
      messages,
      max_tokens: 500,
      temperature: 0.85,
    });

    return response?.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    logger.error('VoiceFriendService AI response error:', error);
    return null;
  }
};

const sendMessage = async ({ sessionId, message, persona, mood, language }) => {
  const session = getSession(sessionId);
  if (!session) {
    throw new Error('Voice friend session not found');
  }

  if (persona) session.persona = persona;
  if (mood) session.mood = mood;
  if (language) session.language = language;

  const messages = buildConversation(session, message);
  const aiText = await createAIResponse(messages);
  const finalText = aiText || 'I hear you, and I am here for you. Tell me more if you like.';

  session.messages.push({ role: 'user', content: message, timestamp: new Date() });
  session.messages.push({ role: 'assistant', content: finalText, timestamp: new Date() });

  if (session.messages.length > 20) {
    session.messages = session.messages.slice(-20);
  }

  return {
    sessionId: session.sessionId,
    persona: session.persona,
    mood: session.mood,
    language: session.language,
    response: finalText,
  };
};

module.exports = {
  createSession,
  getSession,
  sendMessage,
};
