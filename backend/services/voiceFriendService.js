const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
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
    voiceLabel: 'gentle tone',
    personality: 'Caring, emotional, and patient',
    style: 'calm and gentle',
  },
  arjun: {
    id: 'arjun',
    name: 'Arjun',
    avatar: '/avatars/arjun.png',
    voice: 'male-calm',
    voiceLabel: 'steady and warm tone',
    personality: 'Protective, motivating, and reassuring',
    style: 'warm and encouraging',
  },
  anya: {
    id: 'anya',
    name: 'Anya',
    avatar: '/avatars/anya.png',
    voice: 'female-warm',
    voiceLabel: 'soft conversational tone',
    personality: 'Empathetic, soothing, and supportive',
    style: 'soft and comforting',
  },
};

const sessions = new Map();
const SESSION_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const sessionsFilePath = path.join(__dirname, '../data/voiceFriendSessions.json');

const ensureSessionsFolder = () => {
  try {
    fs.mkdirSync(path.dirname(sessionsFilePath), { recursive: true });
  } catch (error) {
    logger.warn('Unable to create voice friend data folder:', error.message);
  }
};

const saveSessionsToDisk = () => {
  try {
    ensureSessionsFolder();
    const payload = Object.fromEntries(sessions.entries());
    fs.writeFileSync(sessionsFilePath, JSON.stringify(payload, null, 2), 'utf8');
  } catch (error) {
    logger.error('Failed to persist voice friend sessions:', error);
  }
};

const loadSessionsFromDisk = () => {
  try {
    if (!fs.existsSync(sessionsFilePath)) {
      return;
    }
    const raw = fs.readFileSync(sessionsFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      for (const [sessionId, session] of Object.entries(parsed)) {
        sessions.set(sessionId, session);
      }
    }
  } catch (error) {
    logger.warn('Unable to load voice friend sessions from disk:', error.message);
  }
};

const normalizeUserName = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value).trim().replace(/\s+/g, ' ').slice(0, 40);
  return normalized || null;
};

const cleanOldSessions = () => {
  const now = Date.now();
  let changed = false;
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(sessionId);
      changed = true;
    }
  }
  if (changed) {
    saveSessionsToDisk();
  }
};

const buildFriendProfile = (friendId) => {
  return AI_FRIENDS[friendId] || AI_FRIENDS.nila;
};

const mapSpeechVoice = (voiceKey) => {
  const voiceMap = {
    'female-soft': 'alloy',
    'male-calm': 'verse',
    'female-warm': 'aria',
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
  if (session.favoriteActivities?.length) {
    pieces.push(`They like ${session.favoriteActivities.join(', ')}.`);
  }
  if (session.favoriteFoods?.length) {
    pieces.push(`Foods they enjoy include ${session.favoriteFoods.join(', ')}.`);
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
    ? `This conversation takes place in a ${session.scenario} setting. Use gentle imagery from that scene when it helps the user feel grounded.`
    : '';
  const moodPrompt = session.mood
    ? `The user says they are feeling ${session.mood}. Match your response to their emotional state and be gentle when they feel sad, anxious, or overwhelmed.`
    : '';
  const personaPrompt = session.persona === 'motivational'
    ? 'Offer motivating, practical next steps and encouragement while staying warm and personal.'
    : session.persona === 'mindful'
      ? 'Encourage calm presence, grounding, and self-awareness with gentle wording.'
      : session.persona === 'playful'
        ? 'Keep the tone friendly, light, and caring while staying emotionally present.'
        : 'Keep the tone supportive, loving, and reassuring.';
  const languagePrompt = session.language && session.language !== 'en'
    ? `Answer naturally in ${session.language} when appropriate, while keeping the tone supportive and easy to understand.`
    : 'Answer naturally in English with a warm, conversational rhythm.';

  return `${basePrompt} ${scenarioPrompt} ${moodPrompt} ${personaPrompt} ${languagePrompt}

Rules:
- Use the user's name (${userName}) naturally when it feels appropriate.
- Remember the user's preferences, favorite places, activities, and conversation topics from memory.
- Give emotionally intelligent, context-aware replies.
- If the user speaks about travel, suggest a gentle plan with local details.
- If the user speaks about work, stress, or planning, offer one small, doable next step.
- Avoid repeating the same sentence structure.
- If the user shares sadness, comfort them and offer small next steps.
- Never give medical, legal, or emergency advice. If there is danger, encourage professional help or trusted people.
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
  const scenarioHint = session.scenario ? `In this ${session.scenario} moment, ` : '';
  const mood = session.mood || 'neutral';
  const tone = session.persona === 'motivational'
    ? 'Stay caring while offering a focused next step.'
    : session.persona === 'mindful'
      ? 'Stay calm and present in every sentence.'
      : session.persona === 'playful'
        ? 'Stay light and warm while still being thoughtful.'
        : 'Stay reassuring and supportive.';
  const placeTip = favoritePlace
    ? ` Since you mentioned ${favoritePlace}, I also suggest checking the weather and keeping a little flexibility in your plan.`
    : '';

  if (/(packing|pack|luggage|bag|suitcase)/i.test(normalized)) {
    return `${namePrefix}let's keep packing simple: choose clothes by day, pack chargers and documents together, and keep one easy-access pouch for essentials.${placeTip}`;
  }

  if (/(trip|travel|journey|vacation|holiday|plan)/i.test(normalized)) {
    return `${namePrefix}${scenarioHint}this sounds exciting. Start with these three things: set the travel date, confirm transport and stay, and pack a small comfort item. Share your destination and I will help you make it feel easy.`;
  }

  if (/(sad|lonely|cry|upset|down|hurt|broken)/i.test(normalized)) {
    return `${namePrefix}${scenarioHint}I am here with you. Take a moment to breathe slowly, notice one comforting detail around you, and if you'd like, tell me one thing that would help you feel a bit steadier right now.`;
  }

  if (/(anxious|anxiety|nervous|stress|stressed|overwhelm|overwhelmed)/i.test(normalized)) {
    return `${namePrefix}${scenarioHint}you are not alone. Breathe in for four, out for six, and then choose one small task you can finish in ten minutes. I can help you break it down if you share what feels most urgent.`;
  }

  if (/(work|job|study|exam|interview|deadline|project)/i.test(normalized)) {
    return `${namePrefix}${scenarioHint}let's make a simple plan: name the one thing that matters most today, then break it into a tiny first step. I can help you name that first step in a friendly and realistic way.`;
  }

  if (/(family|mom|dad|sister|brother|friend|relationship|partner)/i.test(normalized)) {
    return `${namePrefix}${scenarioHint}relationships can feel heavy. Start by naming one thing you need or want from the people around you, and I will help you shape the kindest next move.`;
  }

  if (/(tired|sleep|rest|health|sick|wellness|exercise)/i.test(normalized)) {
    return `${namePrefix}${scenarioHint}your body matters. Notice one simple support you can give it today: sleep, water, movement, or a quiet pause. I can help you build that into the rest of your day.`;
  }

  if (message.length <= 2) {
    return `${namePrefix}${scenarioHint}I am here with you. Tell me a little more, and I will offer support or a practical next step.`;
  }

  const snippet = message.length > 90 ? `${message.slice(0, 87)}...` : message;
  return `${namePrefix}${scenarioHint}I hear you. You said: "${snippet}". ${tone}`;
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
    favoriteActivities: [],
    favoriteFoods: [],
    preferences: [],
    topics: [],
    messages: [],
    createdAt: Date.now(),
  };
  sessions.set(sessionId, session);
  saveSessionsToDisk();
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

  const activityMatches = Array.from(new Set(
    ['reading', 'music', 'cooking', 'walking', 'yoga', 'photography', 'painting', 'dancing', 'writing', 'gardening', 'running']
      .filter((activity) => normalized.includes(activity))
  ));
  if (activityMatches.length) {
    session.favoriteActivities = Array.from(new Set([...(session.favoriteActivities || []), ...activityMatches]));
  }

  const foodMatches = Array.from(new Set(
    ['tea', 'coffee', 'dosa', 'rice', 'fish', 'idli', 'vada', 'cake', 'chocolate', 'salad', 'pasta']
      .filter((food) => normalized.includes(food))
  ));
  if (foodMatches.length) {
    session.favoriteFoods = Array.from(new Set([...(session.favoriteFoods || []), ...foodMatches]));
  }

  if (/(trip|travel|journey|vacation|holiday|plan)/i.test(normalized)) {
    session.preferences = Array.from(new Set([...(session.preferences || []), 'travel']));
  }

  if (/(birthday|anniversary|celebrate|festival|party)/i.test(normalized)) {
    session.preferences = Array.from(new Set([...(session.preferences || []), 'celebration']));
  }

  if (/(sad|cry|lonely|upset|hurt|heartbroken|down)/i.test(normalized)) {
    session.topics = Array.from(new Set([...(session.topics || []), 'emotional support']));
    session.mood = 'sad';
  }

  if (/(anxious|anxiety|nervous|stress|stressed|overwhelm|overwhelmed)/i.test(normalized)) {
    session.topics = Array.from(new Set([...(session.topics || []), 'stress support']));
    session.mood = 'anxious';
  }

  if (/(work|job|study|exam|interview|deadline|project)/i.test(normalized)) {
    session.topics = Array.from(new Set([...(session.topics || []), 'life balance']));
  }

  if (/(family|mom|dad|brother|sister|friend|partner|relationship)/i.test(normalized)) {
    session.topics = Array.from(new Set([...(session.topics || []), 'relationships']));
  }

  if (/(tired|sleep|rest|health|sick|wellness|exercise|energy)/i.test(normalized)) {
    session.topics = Array.from(new Set([...(session.topics || []), 'wellness']));
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

  saveSessionsToDisk();

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
