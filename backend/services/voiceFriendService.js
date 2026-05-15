const crypto = require('crypto');
const { OpenAI } = require('openai');
const logger = require('../utils/logger');

let openai = null;

const createOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    logger.warn('OpenAI API key missing for VoiceFriendService');
    return null;
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

openai = createOpenAIClient();

const setOpenAIClient = (client) => {
  openai = client;
};

const AI_FRIENDS = {
  nila: {
    id: 'nila',
    name: 'Nila',
    avatar: '/avatars/nila.png',
    voice: 'female-soft',
    personality: 'Caring, emotional, and patient',
    style: 'calm and gentle',
  },
  arjun: {
    id: 'arjun',
    name: 'Arjun',
    avatar: '/avatars/arjun.png',
    voice: 'male-calm',
    personality: 'Protective, motivating, and reassuring',
    style: 'warm and encouraging',
  },
  anya: {
    id: 'anya',
    name: 'Anya',
    avatar: '/avatars/anya.png',
    voice: 'female-warm',
    personality: 'Empathetic, soothing, and supportive',
    style: 'soft and comforting',
  },
};

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

const buildFriendProfile = (friendId) => {
  return AI_FRIENDS[friendId] || AI_FRIENDS.nila;
};

const mapSpeechVoice = (voiceKey) => {
  const voiceMap = {
    'female-soft': 'alloy',
    'male-calm': 'alloy',
    'female-warm': 'alloy',
    'default': 'alloy',
  };
  return voiceMap[voiceKey] || voiceMap.default;
};

const getSpeechVoice = (friendId, overrideVoice) => {
  if (process.env.OPENAI_VOICE_FRIEND_TTS_VOICE) {
    return process.env.OPENAI_VOICE_FRIEND_TTS_VOICE;
  }
  const friend = buildFriendProfile(friendId);
  return mapSpeechVoice(overrideVoice || friend.voice || 'default');
};

const normalizeAudioResponse = async (audioResponse) => {
  if (Buffer.isBuffer(audioResponse)) {
    return audioResponse;
  }

  if (audioResponse instanceof ArrayBuffer) {
    return Buffer.from(audioResponse);
  }

  if (typeof audioResponse?.arrayBuffer === 'function') {
    return Buffer.from(await audioResponse.arrayBuffer());
  }

  if (typeof audioResponse?.buffer === 'function') {
    return Buffer.from(await audioResponse.buffer());
  }

  throw new Error('Unsupported audio response format');
};

const buildMemoryPrompt = (session) => {
  const pieces = [];
  if (session.userName) {
    pieces.push(`The user's name is ${session.userName}.`);
  }
  if (session.favoritePlaces?.length) {
    pieces.push(`They enjoy places like ${session.favoritePlaces.join(', ')}.`);
  }
  if (session.preferences?.length) {
    pieces.push(`Their preferences include ${session.preferences.join(', ')}.`);
  }
  if (session.topics?.length) {
    pieces.push(`Topics we have discussed before: ${session.topics.join(', ')}.`);
  }
  if (session.mood) {
    pieces.push(`They are currently feeling ${session.mood}.`);
  }

  return pieces.length
    ? `Memory: ${pieces.join(' ')} Use this information naturally as a friend.`
    : 'Memory: The user is a close friend. Remember personal context and respond warmly.';
};

const buildPersonaPrompt = (session) => {
  const friend = buildFriendProfile(session.friendId);
  const name = friend.name;
  const userName = session.userName || 'friend';
  const basePrompt = `You are ${name}, a caring AI voice companion with a ${friend.personality} personality. Speak like a close friend, not a robotic assistant. Keep your language warm, natural, emotionally intelligent, and easy to understand.`;
  const moodPrompt = session.mood
    ? `The user says they are feeling ${session.mood}. Match your response to their emotional state and be gentle when they feel sad or anxious.`
    : '';
  const personaPrompt = session.persona === 'motivational'
    ? 'Offer motivating, practical next-steps and encouragement.'
    : session.persona === 'mindful'
      ? 'Encourage calm presence, grounding, and self-awareness.'
      : session.persona === 'playful'
        ? 'Keep the tone friendly, light, and caring.'
        : 'Keep the tone supportive, loving, and reassuring.';

  return `${basePrompt} ${moodPrompt} ${personaPrompt}

Rules:
- Use the user's name (${userName}) naturally when it feels appropriate.
- Remember the user's preferences and past topics from memory.
- Give emotionally intelligent and context-aware replies.
- If the user speaks about travel, suggest a gentle plan with local details.
- Avoid repeating the same sentence structure.
- If the user shares sadness, comfort and offer small next steps.
- Do not give medical, legal, or emergency advice. If there is danger, encourage them to seek professional help or contact someone they trust.
${buildMemoryPrompt(session)}
`; 
};

const createSession = ({ userId, persona = 'supportive', mood = 'neutral', language = 'en', friendId = 'nila', userName = null }) => {
  cleanOldSessions();
  const sessionId = crypto.randomUUID();
  const friend = buildFriendProfile(friendId);
  const session = {
    sessionId,
    userId: userId || null,
    userName: userName || null,
    friendId: friend.id,
    friendName: friend.name,
    friendPersonality: friend.personality,
    friendVoice: friend.voice,
    persona: persona || 'supportive',
    mood: mood || 'neutral',
    language: language || 'en',
    favoritePlaces: [],
    preferences: [],
    topics: [],
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

const extractMemoryFromMessage = (session, message) => {
  const normalized = message.toLowerCase();

  const placeMatches = Array.from(new Set(
    ['kollam', 'thangassery', 'ashtamudi', 'munroe island', 'varkala', 'alappuzha', 'kochi', 'trivandrum', 'kumarakom']
      .filter((place) => normalized.includes(place))
  ));

  if (placeMatches.length) {
    session.favoritePlaces = Array.from(new Set([...(session.favoritePlaces || []), ...placeMatches]));
  }

  if (normalized.includes('trip') || normalized.includes('travel') || normalized.includes('plan')) {
    session.preferences = Array.from(new Set([...(session.preferences || []), 'travel']));
  }

  if (normalized.includes('birthday') || normalized.includes('anniversary') || normalized.includes('celebrate')) {
    session.preferences = Array.from(new Set([...(session.preferences || []), 'celebration']));
  }

  if (normalized.includes('sad') || normalized.includes('cry') || normalized.includes('lonely') || normalized.includes('low')) {
    session.topics = Array.from(new Set([...(session.topics || []), 'emotional support']));
  }

  if (normalized.includes('work') || normalized.includes('job') || normalized.includes('study')) {
    session.topics = Array.from(new Set([...(session.topics || []), 'life balance']));
  }
};

const buildConversation = (session, userMessage) => {
  const history = (session.messages || []).slice(-12);
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

const generateSpeech = async ({ text, friendId = 'nila', voice, language = 'en' }) => {
  if (!openai) {
    return null;
  }

  try {
    const speechResponse = await openai.audio.speech.create({
      model: process.env.OPENAI_VOICE_FRIEND_TTS_MODEL || 'gpt-4o-mini',
      voice: getSpeechVoice(friendId, voice),
      input: text,
      format: 'mp3',
    });

    const buffer = await normalizeAudioResponse(speechResponse);
    return buffer.toString('base64');
  } catch (error) {
    logger.error('VoiceFriendService speech generation error:', error);
    return null;
  }
};

const sendMessage = async ({ sessionId, message, persona, mood, language, friendId, userName }) => {
  const session = getSession(sessionId);
  if (!session) {
    throw new Error('Voice friend session not found');
  }

  if (friendId) {
    session.friendId = friendId;
    const friend = buildFriendProfile(friendId);
    session.friendName = friend.name;
    session.friendPersonality = friend.personality;
    session.friendVoice = friend.voice;
  }
  if (userName) {
    session.userName = userName;
  }
  if (persona) session.persona = persona;
  if (mood) session.mood = mood;
  if (language) session.language = language;

  extractMemoryFromMessage(session, message);

  const messages = buildConversation(session, message);
  const aiText = await createAIResponse(messages);
  const finalText = aiText || `I hear you${session.userName ? `, ${session.userName}` : ''}. I'm here with you — tell me more, or tell me how I can help.`;

  session.messages.push({ role: 'user', content: message, timestamp: new Date() });
  session.messages.push({ role: 'assistant', content: finalText, timestamp: new Date() });

  if (session.messages.length > 24) {
    session.messages = session.messages.slice(-24);
  }

  return {
    sessionId: session.sessionId,
    persona: session.persona,
    mood: session.mood,
    language: session.language,
    friendId: session.friendId,
    friendName: session.friendName,
    response: finalText,
  };
};

module.exports = {
  createSession,
  getSession,
  sendMessage,
  generateSpeech,
  setOpenAIClient,
};
