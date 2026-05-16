const crypto = require('crypto');
const { OpenAI } = require('openai');
const logger = require('../utils/logger');
const isFreeMode = ['1', 'true', 'yes', 'on'].includes(String(process.env.FREE_MODE || '').toLowerCase());

let openai = null;

const createOpenAIClient = () => {
  if (isFreeMode) {
    logger.info('VoiceFriendService running in FREE_MODE; OpenAI disabled.');
    return null;
  }
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

const normalizeUserName = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value).trim().replace(/\s+/g, ' ').slice(0, 40);
  return normalized || null;
};

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
  const displayName = session.friendCustomName || friend.name;
  const userName = session.userName || 'friend';
  const basePrompt = `You are ${displayName}, a caring AI voice companion with a ${friend.personality} personality. Speak like a close friend, not a robotic assistant. Keep your language warm, natural, emotionally intelligent, and easy to understand.`;
  const scenarioPrompt = session.scenario
    ? `This conversation takes place in a ${session.scenario} setting. Reflect that in your tone and imagery when it helps the user feel present.`
    : '';
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

  return `${basePrompt} ${scenarioPrompt} ${moodPrompt} ${personaPrompt}

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

const buildModelFallbackList = () => {
  const configured = String(process.env.OPENAI_VOICE_FRIEND_MODEL || 'gpt-4o-mini').trim();
  return Array.from(new Set([configured, 'gpt-4o-mini', 'gpt-4.1-mini']));
};

const buildLocalSupportReply = (session, userMessage) => {
  const message = String(userMessage || '').trim();
  const normalized = message.toLowerCase();
  const namePrefix = session?.userName ? `${session.userName}, ` : '';
  const favoritePlace = session?.favoritePlaces?.[0];
  const placeTip = favoritePlace
    ? ` Since you mentioned ${favoritePlace}, check weather and traffic before leaving.`
    : '';

  if (/(packing|pack|luggage|bag|suitcase)/i.test(normalized)) {
    return `${namePrefix}let us make packing easy: clothes by day count, charger, ID, medicines, water bottle, and one light jacket. Keep tickets and valuables in one quick-access pouch. Tell me trip length and I will make a simple checklist for you.`;
  }

  if (/(trip|travel|journey|vacation|holiday|plan)/i.test(normalized)) {
    return `${namePrefix}that sounds exciting. Quick plan: set departure time, confirm transport and stay, keep digital ID and ticket copies, and set food plus local travel budget.${placeTip} Share destination and number of days, and I will give you a practical step-by-step plan.`;
  }

  if (/(sad|lonely|cry|upset|down|hurt)/i.test(normalized)) {
    return `${namePrefix}I am with you. For the next 5 minutes, try this: drink water, take 6 slow breaths, and message one trusted person. If you want, tell me what happened in one line and we will handle it together, one step at a time.`;
  }

  if (/(anxious|anxiety|nervous|stress|stressed|overwhelm|overwhelmed)/i.test(normalized)) {
    return `${namePrefix}you are not alone. Let us reduce pressure right now: 4 slow breaths, then write the top 3 tasks, and do only the smallest first task for 10 minutes. I can help you pick that first task if you share your current situation.`;
  }

  if (/(work|job|study|exam|interview|deadline)/i.test(normalized)) {
    return `${namePrefix}let us make a small plan: what is due first, what can wait, and what can be delegated. If you share your top priority, I will break it into a realistic action list for today.`;
  }

  if (message.length <= 2) {
    return `${namePrefix}I am here with you. Tell me a little more, and I will give practical support.`;
  }

  const snippet = message.length > 90 ? `${message.slice(0, 87)}...` : message;
  return `${namePrefix}I hear you. You said: "${snippet}". I can help with a practical plan, emotional support, or both.`;
};

const createSession = ({ userId, persona = 'supportive', mood = 'neutral', language = 'en', friendId = 'nila', userName = null, friendCustomName = null, friendCustomAvatar = null, scenario = 'room' }) => {
  cleanOldSessions();
  const sessionId = crypto.randomUUID();
  const friend = buildFriendProfile(friendId);
  const session = {
    sessionId,
    userId: userId || null,
    userName: normalizeUserName(userName),
    friendId: friend.id,
    friendName: friend.name,
    friendCustomName: friendCustomName ? String(friendCustomName).trim() : null,
    friendCustomAvatar: friendCustomAvatar ? String(friendCustomAvatar).trim() : null,
    friendPersonality: friend.personality,
    friendVoice: friend.voice,
    scenario: scenario || 'room',
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
  if (isFreeMode) {
    return null;
  }

  if (!openai) {
    openai = createOpenAIClient();
    if (!openai) {
      return null;
    }
  }

  const modelsToTry = buildModelFallbackList();
  const errors = [];

  for (const model of modelsToTry) {
    try {
      const response = await openai.chat.completions.create({
        model,
        messages,
        max_tokens: 500,
        temperature: 0.85,
      });

      const text = response?.choices?.[0]?.message?.content?.trim();
      if (text) {
        return text;
      }

      errors.push({ model, reason: 'empty_response' });
    } catch (error) {
      const reason = error?.message || error?.code || 'unknown_error';
      logger.warn(`VoiceFriendService model ${model} failed: ${reason}`);
      errors.push({ model, reason });
    }
  }

  logger.error('VoiceFriendService AI response error: all chat models failed', { errors });
  return null;
};

const generateSpeech = async ({ text, friendId = 'nila', voice, language = 'en' }) => {
  if (isFreeMode) {
    return null;
  }

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

const sendMessage = async ({ sessionId, message, persona, mood, language, friendId, userName, friendCustomName, friendCustomAvatar, scenario }) => {
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
  if (userName !== undefined) {
    session.userName = normalizeUserName(userName);
  }
  if (friendCustomName !== undefined) {
    session.friendCustomName = String(friendCustomName || '').trim() || null;
  }
  if (friendCustomAvatar !== undefined) {
    session.friendCustomAvatar = String(friendCustomAvatar || '').trim() || null;
  }
  if (scenario) {
    session.scenario = scenario;
  }
  if (persona) session.persona = persona;
  if (mood) session.mood = mood;
  if (language) session.language = language;

  extractMemoryFromMessage(session, message);

  const messages = buildConversation(session, message);
  const aiText = await createAIResponse(messages);
  const finalText = aiText || buildLocalSupportReply(session, message);

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
