const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { promisify } = require('util');
const textToSpeech = require('@google-cloud/text-to-speech');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const ffmpegPath = require('ffmpeg-static');
const logger = require('../utils/logger');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);
const stat = promisify(fs.stat);

const uploadsRoot = path.join(__dirname, '..', 'uploads', 'video-studio');
const projectStoreRoot = path.join(uploadsRoot, 'projects');
const isFreeMode = ['1', 'true', 'yes', 'on'].includes(String(process.env.FREE_MODE || '').toLowerCase());
const allowAiInFreeMode = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.VIDEO_STUDIO_ALLOW_AI_IN_FREE || '1').toLowerCase()
);
const freeAiProvider = String(process.env.FREE_AI_PROVIDER || 'pollinations').trim().toLowerCase();
const freeAiEnabled = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.AI_PROVIDER_ENABLED || 'true').toLowerCase()
);
const aiProviderEnabled = freeAiEnabled && (!isFreeMode || allowAiInFreeMode);
const isLowMemoryMode = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.VIDEO_STUDIO_LOW_MEMORY_MODE || (isFreeMode ? '1' : '0')).toLowerCase()
);
const useRealCartoonImages = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.VIDEO_STUDIO_REAL_CARTOON_MODE || (aiProviderEnabled ? '1' : '0')).toLowerCase()
);
const freeTextModel = String(process.env.FREE_TEXT_MODEL || process.env.POLLINATIONS_TEXT_MODEL || 'openai').trim();
const freeImageModel = String(
  process.env.FREE_IMAGE_MODEL || process.env.POLLINATIONS_IMAGE_MODEL || 'flux'
).trim();
const huggingFaceApiKey = String(
  process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || process.env.HF_API_KEY || ''
).trim();
const huggingFaceApiBaseUrl = String(process.env.HUGGINGFACE_API_BASE_URL || 'https://api-inference.huggingface.co/models')
  .replace(/\/+$/, '');
const huggingFaceImageModel = String(
  process.env.HUGGINGFACE_IMAGE_MODEL || process.env.HF_IMAGE_MODEL || 'black-forest-labs/FLUX.1-dev'
).trim();
const freeImageModelCandidates = Array.from(new Set(
  [
    process.env.FREE_IMAGE_MODEL,
    process.env.POLLINATIONS_IMAGE_MODEL,
    process.env.VIDEO_STUDIO_IMAGE_MODEL,
    freeImageModel,
    'flux',
    'flux-realism',
  ]
    .map((value) => String(value || '').replace(/\u0000/g, '').trim())
    .filter(Boolean)
));
const pollinationsApiBaseUrl = String(process.env.POLLINATIONS_API_BASE_URL || 'https://gen.pollinations.ai')
  .replace(/\/+$/, '');
const pollinationsApiKey = String(process.env.POLLINATIONS_API_KEY || process.env.FREE_AI_API_KEY || '').trim();
const huggingFaceImageModelCandidates = Array.from(new Set(
  [
    process.env.HUGGINGFACE_IMAGE_MODEL,
    process.env.HF_IMAGE_MODEL,
    huggingFaceImageModel,
    'black-forest-labs/FLUX.1-dev',
    'stabilityai/stable-diffusion-xl-base-1.0',
  ]
    .map((value) => String(value || '').replace(/\u0000/g, '').trim())
    .filter(Boolean)
));

if (isLowMemoryMode) {
  // Keep native image processing predictable on low-memory instances.
  sharp.cache({ memory: 20, files: 0, items: 64 });
  sharp.concurrency(1);
}

let googleTtsClient;
const enableGoogleCloudTts = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.VIDEO_STUDIO_ENABLE_GOOGLE_TTS || '').toLowerCase()
);

if (enableGoogleCloudTts) {
  try {
    googleTtsClient = new textToSpeech.TextToSpeechClient();
  } catch (error) {
    googleTtsClient = null;
  }
} else {
  googleTtsClient = null;
}

const MAX_STORY_LENGTH = 7000;
const UNSAFE_THEME_RULES = [
  { code: 'self_harm', reason: 'self-harm or suicide', pattern: /suicide|self[-\s]?harm/i },
  { code: 'weapons', reason: 'weapons', pattern: /weapon/i },
  { code: 'graphic_violence', reason: 'graphic violence', pattern: /gore|kill|terror/i },
  { code: 'abuse', reason: 'abuse', pattern: /abuse/i },
  { code: 'adult', reason: 'adult content', pattern: /explicit|adult content/i },
];

const ensureUploadsRoot = async () => {
  try {
    await access(uploadsRoot);
  } catch (_) {
    await mkdir(uploadsRoot, { recursive: true });
  }
};

const ensureProjectStoreRoot = async () => {
  await ensureUploadsRoot();
  try {
    await access(projectStoreRoot);
  } catch (_) {
    await mkdir(projectStoreRoot, { recursive: true });
  }
};

const extractJson = (text) => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (error) {
    return null;
  }
};

const sanitizeText = (value = '') => String(value).replace(/\u0000/g, '').trim();
const normalizeAiProvider = (value = '') => {
  const normalized = sanitizeText(value).toLowerCase();
  if (normalized === 'hf') return 'huggingface';
  if (normalized === 'huggingface') return 'huggingface';
  return 'pollinations';
};
const resolveProjectAiProvider = (project = null) =>
  normalizeAiProvider(project?.aiProvider || freeAiProvider || 'pollinations');
const escapeXml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const wrapText = (value = '', maxCharsPerLine = 42, maxLines = 4) => {
  const words = sanitizeText(value).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= maxCharsPerLine) {
      line = next;
      continue;
    }
    if (line) {
      lines.push(line);
    }
    line = word;
    if (lines.length >= maxLines - 1) {
      break;
    }
  }
  if (line && lines.length < maxLines) {
    lines.push(line);
  }
  if (!lines.length) {
    return [''];
  }
  if (words.join(' ').length > lines.join(' ').length) {
    const lastIndex = lines.length - 1;
    lines[lastIndex] = `${lines[lastIndex].slice(0, Math.max(0, maxCharsPerLine - 3))}...`;
  }
  return lines;
};

const getSafetyAssessment = (value = '') => {
  const cleanValue = sanitizeText(value);
  const reasons = UNSAFE_THEME_RULES
    .filter((rule) => rule.pattern.test(cleanValue))
    .map((rule) => ({ code: rule.code, reason: rule.reason }));

  return {
    blocked: reasons.length > 0,
    reasons,
  };
};

const createSafetyError = (context, assessment) => {
  const error = new Error(`Safe mode blocked this ${context} due to unsafe themes.`);
  error.code = 'SAFETY_FAILED';
  error.status = 422;
  error.safety = {
    context,
    reasons: assessment?.reasons || [],
  };
  return error;
};

const buildSafetyReasonLabel = (categoryKey = '') =>
  String(categoryKey || '')
    .replace(/[\/_.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const flattenMessageContent = (content) => {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part.text === 'string') return part.text;
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  if (content && typeof content === 'object' && typeof content.text === 'string') {
    return content.text;
  }
  return '';
};

const messagesToPrompt = (messages = []) =>
  messages
    .map((message) => {
      const role = sanitizeText(message?.role || 'user').toUpperCase();
      const content = sanitizeText(flattenMessageContent(message?.content || ''));
      if (!content) return '';
      return `${role}:\n${content}`;
    })
    .filter(Boolean)
    .join('\n\n');

const normalizeFreeAiTextResponse = (response) => {
  if (!response) return null;
  if (typeof response.text === 'string' && response.text.trim()) {
    return response.text.trim();
  }
  const choices = Array.isArray(response?.choices) ? response.choices : [];
  for (const choice of choices) {
    const message = choice?.message?.content;
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }
  }
  return null;
};

const buildPollinationsHeaders = () => {
  const headers = {
    'content-type': 'application/json',
  };
  if (pollinationsApiKey) {
    headers.authorization = `Bearer ${pollinationsApiKey}`;
  }
  return headers;
};

const callFreeTextModel = async ({
  prompt = '',
  systemInstruction = '',
  maxTokens = 1100,
  timeoutMs = 8000,
  temperature = 0.7,
  model = freeTextModel,
}) => {
  if (!aiProviderEnabled) {
    return null;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1000, Number(timeoutMs) || 8000));
  try {
    const response = await fetch(`${pollinationsApiBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: buildPollinationsHeaders(),
      body: JSON.stringify({
        model: sanitizeText(model || freeTextModel || 'openai'),
        temperature,
        max_tokens: Math.max(128, Number(maxTokens) || 1100),
        messages: [
          ...(sanitizeText(systemInstruction)
            ? [{ role: 'system', content: sanitizeText(systemInstruction) }]
            : []),
          { role: 'user', content: sanitizeText(prompt) },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    const payload = await response.json();
    return normalizeFreeAiTextResponse(payload);
  } catch (_error) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const safeGoogleGenerateContent = async ({
  prompt = '',
  systemInstruction = '',
  maxTokens = 1100,
  timeoutMs = 8000,
  temperature = 0.7,
  model = freeTextModel,
  jsonMode = false,
}) => {
  const cleanPrompt = sanitizeText(prompt);
  if (!cleanPrompt) return null;

  const aiCall = callFreeTextModel({
    prompt: cleanPrompt,
    systemInstruction,
    maxTokens,
    timeoutMs,
    temperature,
    model,
  });

  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));
  try {
    const responseText = await Promise.race([aiCall, timeout]);
    if (!responseText) return null;
    if (!jsonMode) return responseText;
    const parsed = extractJson(responseText);
    return parsed ? JSON.stringify(parsed) : responseText;
  } catch (_error) {
    return null;
  }
};

const getModerationSafetyAssessment = async (value = '') => {
  const cleanValue = sanitizeText(value);
  if (!aiProviderEnabled || !cleanValue) {
    return { blocked: false, reasons: [] };
  }

  try {
    const prompt = `Classify the following text for child-safety.
Return strict JSON:
{"blocked": boolean, "reasons": [{"code":"string","reason":"string"}]}
If safe, return {"blocked":false,"reasons":[]}.

Text:
${cleanValue.slice(0, 12000)}`;

    const moderationText = await safeGoogleGenerateContent({
      prompt,
      systemInstruction: 'You are a strict content safety classifier for children content moderation.',
      maxTokens: 300,
      timeoutMs: 7000,
      temperature: 0.1,
      model: freeTextModel,
      jsonMode: true,
    });

    const parsed = moderationText ? extractJson(moderationText) : null;
    if (!parsed || !parsed.blocked) {
      return { blocked: false, reasons: [] };
    }

    const parsedReasons = Array.isArray(parsed?.reasons) ? parsed.reasons : [];
    const reasons = parsedReasons
      .map((reason) => ({
        code: sanitizeText(reason?.code || 'model_flagged').replace(/[^\w/.-]/g, '_'),
        reason: sanitizeText(reason?.reason || buildSafetyReasonLabel(reason?.code || 'unsafe content')),
      }))
      .filter((reason) => reason.code || reason.reason);

    if (!reasons.length) {
      reasons.push({
        code: 'model_flagged',
        reason: 'unsafe content',
      });
    }

    return { blocked: true, reasons };
  } catch (_error) {
    // Fallback safely to keyword checks when moderation endpoint is unavailable.
    return { blocked: false, reasons: [] };
  }
};

const getCombinedSafetyAssessment = async (value = '') => {
  const keywordAssessment = getSafetyAssessment(value);
  const moderationAssessment = await getModerationSafetyAssessment(value);

  const reasons = [];
  const seen = new Set();
  [...keywordAssessment.reasons, ...moderationAssessment.reasons].forEach((reason) => {
    const key = `${reason.code}:${reason.reason}`;
    if (!seen.has(key)) {
      seen.add(key);
      reasons.push(reason);
    }
  });

  return {
    blocked: reasons.length > 0,
    reasons,
  };
};

const safeGoogleAI = async (messages, maxTokens = 1100, timeoutMs = 8000) => {
  if (!aiProviderEnabled) return null;
  const normalizedMessages = Array.isArray(messages) ? messages : [];
  const systemInstruction = sanitizeText(
    normalizedMessages
      .filter((message) => sanitizeText(message?.role).toLowerCase() === 'system')
      .map((message) => flattenMessageContent(message?.content || ''))
      .join('\n\n')
  );
  const prompt = messagesToPrompt(
    normalizedMessages.filter((message) => sanitizeText(message?.role).toLowerCase() !== 'system')
  );
  return safeGoogleGenerateContent({
    prompt,
    systemInstruction,
    maxTokens,
    timeoutMs,
    temperature: 0.7,
    model: freeTextModel,
  });
};

const CHARACTER_ROLE_PRESETS = [
  {
    key: 'rabbit',
    pattern: /\b(rabbit|hare|bunny)\b/i,
    id: 'char-rabbit',
    name: 'Rabbit',
    role: 'Fast Challenger',
    appearance: 'white rabbit with long ears, expressive eyes, and a red scarf',
    emotionStyle: 'energetic and expressive',
    colorPalette: ['sunny yellow', 'white', 'coral'],
    defaultVoice: 'kid-female',
  },
  {
    key: 'tortoise',
    pattern: /\b(tortoise|turtle)\b/i,
    id: 'char-tortoise',
    name: 'Tortoise',
    role: 'Steady Hero',
    appearance: 'green tortoise with a patterned shell and calm smile',
    emotionStyle: 'calm and determined',
    colorPalette: ['green', 'olive', 'teal'],
    defaultVoice: 'warm-male',
  },
  {
    key: 'rama',
    pattern: /\bram(a)?\b/i,
    id: 'char-rama',
    name: 'Rama',
    role: 'Prince Hero',
    appearance: 'young prince with traditional dhoti, shoulder cloth, and royal ornaments',
    emotionStyle: 'calm and courageous',
    colorPalette: ['royal blue', 'gold', 'forest green'],
    defaultVoice: 'warm-male',
  },
  {
    key: 'sita',
    pattern: /\bsita\b/i,
    id: 'char-sita',
    name: 'Sita',
    role: 'Princess Heroine',
    appearance: 'graceful princess in sari-style attire with floral ornaments and warm smile',
    emotionStyle: 'gentle and wise',
    colorPalette: ['saffron', 'rose', 'gold'],
    defaultVoice: 'soft-female',
  },
  {
    key: 'doctor',
    pattern: /\b(doctor|dr\.)\b/i,
    id: 'char-doctor',
    name: 'Dr. Asha',
    role: 'Doctor',
    appearance: 'doctor in white coat with stethoscope and kind smile',
    emotionStyle: 'caring and confident',
    colorPalette: ['white', 'sky blue', 'silver'],
    defaultVoice: 'soft-female',
  },
  {
    key: 'farmer',
    pattern: /\bfarmer\b/i,
    id: 'char-farmer',
    name: 'Farmer Kiran',
    role: 'Farmer',
    appearance: 'farmer with straw hat, earthy clothes, and warm smile',
    emotionStyle: 'hardworking and friendly',
    colorPalette: ['earth brown', 'leaf green', 'sunflower yellow'],
    defaultVoice: 'warm-male',
  },
  {
    key: 'lawyer',
    pattern: /\b(lawyer|advocate)\b/i,
    id: 'char-lawyer',
    name: 'Lawyer Neel',
    role: 'Lawyer',
    appearance: 'lawyer in formal black coat with files and confident posture',
    emotionStyle: 'thoughtful and fair',
    colorPalette: ['black', 'navy', 'white'],
    defaultVoice: 'warm-male',
  },
  {
    key: 'teacher',
    pattern: /\bteacher\b/i,
    id: 'char-teacher',
    name: 'Teacher Meera',
    role: 'Teacher',
    appearance: 'teacher with books, neat attire, and encouraging smile',
    emotionStyle: 'wise and kind',
    colorPalette: ['maroon', 'cream', 'teal'],
    defaultVoice: 'soft-female',
  },
  {
    key: 'police',
    pattern: /\b(police|officer|constable)\b/i,
    id: 'char-police',
    name: 'Officer Arjun',
    role: 'Police Officer',
    appearance: 'police officer in uniform with badge and calm stance',
    emotionStyle: 'brave and protective',
    colorPalette: ['khaki', 'brown', 'gold'],
    defaultVoice: 'warm-male',
  },
];

const inferPresetCharactersFromText = (text = '', voiceType = '') => {
  const normalized = sanitizeText(text).toLowerCase();
  if (!normalized) {
    return [];
  }

  const matches = CHARACTER_ROLE_PRESETS.filter((preset) => preset.pattern.test(normalized));
  const uniqueByName = new Map();
  matches.forEach((preset) => {
    uniqueByName.set(preset.name, {
      id: preset.id,
      name: preset.name,
      role: preset.role,
      appearance: preset.appearance,
      emotionStyle: preset.emotionStyle,
      voiceProfile: voiceType || preset.defaultVoice || 'kid-female',
      colorPalette: preset.colorPalette || [],
      locked: true,
    });
  });

  return Array.from(uniqueByName.values());
};

const FALLBACK_NAME_PAIRS = [
  ['Ari', 'Milo'],
  ['Nova', 'Kian'],
  ['Ira', 'Rian'],
  ['Tara', 'Vihaan'],
  ['Maya', 'Arin'],
  ['Zara', 'Rey'],
];

const FALLBACK_ROLE_PAIRS = [
  ['Explorer', 'Guide'],
  ['Inventor', 'Navigator'],
  ['Dreamer', 'Protector'],
  ['Detective', 'Helper'],
];

const FALLBACK_LOOK_PAIRS = [
  [
    'curious young explorer with a bright backpack and star badge',
    'friendly companion with expressive eyes and a warm smile',
  ],
  [
    'creative kid inventor with colorful gadgets and confident pose',
    'steady teammate with practical tools and calm expressions',
  ],
  [
    'brave learner with adventurous outfit and determined look',
    'wise sidekick with playful style and kind gestures',
  ],
];

const buildTextSeed = (value = '') => {
  const text = String(value || '').toLowerCase();
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const toTitleCaseWord = (word = '') => {
  const clean = sanitizeText(word).toLowerCase();
  if (!clean) return '';
  return `${clean[0].toUpperCase()}${clean.slice(1)}`;
};

const buildSeededFallbackCharacters = ({ sourceText = '', voiceType = '' }) => {
  const cleanSource = sanitizeText(sourceText);
  const seed = buildTextSeed(cleanSource || 'kids-story');
  const stopWords = new Set([
    'about', 'after', 'again', 'also', 'and', 'back', 'before', 'being', 'between', 'bring',
    'could', 'every', 'from', 'have', 'into', 'just', 'like', 'make', 'more', 'most', 'need',
    'only', 'over', 'real', 'scene', 'story', 'that', 'their', 'there', 'these', 'they', 'this',
    'those', 'with', 'your',
  ]);

  const wordCandidates = (cleanSource.match(/[A-Za-z][A-Za-z'-]{2,}/g) || [])
    .map((entry) => toTitleCaseWord(entry))
    .filter((entry) => entry && !stopWords.has(entry.toLowerCase()) && entry.length <= 12);
  const uniqueCandidates = Array.from(new Set(wordCandidates));

  const pickedNames = FALLBACK_NAME_PAIRS[seed % FALLBACK_NAME_PAIRS.length];
  const pickedRoles = FALLBACK_ROLE_PAIRS[seed % FALLBACK_ROLE_PAIRS.length];
  const pickedLooks = FALLBACK_LOOK_PAIRS[seed % FALLBACK_LOOK_PAIRS.length];

  const nameA = uniqueCandidates[0] || pickedNames[0];
  const nameB = uniqueCandidates[1] || pickedNames[1];

  return [
    {
      id: `char-${nameA.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'lead'}`,
      name: nameA,
      role: pickedRoles[0],
      appearance: pickedLooks[0],
      emotionStyle: 'curious and brave',
      voiceProfile: voiceType || 'kid-female',
      colorPalette: ['sky blue', 'sunny yellow', 'mint'],
      locked: true,
    },
    {
      id: `char-${nameB.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'friend'}`,
      name: nameB,
      role: pickedRoles[1],
      appearance: pickedLooks[1],
      emotionStyle: 'supportive and warm',
      voiceProfile: voiceType || 'soft-female',
      colorPalette: ['peach', 'teal', 'cream'],
      locked: true,
    },
  ];
};

const fallbackParseStory = ({ story, storyMode, voiceType, language, storyTitle }) => {
  const lines = story
    .split(/[\.\?\!]+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rawScenes = lines.length ? lines.slice(0, 5) : ['A child discovers a magical secret.'];
  const characters = inferPresetCharactersFromText(story, voiceType).map((char) => ({
    ...char,
    locked: true,
  }));
  if (!characters.length) {
    characters.push(...buildSeededFallbackCharacters({ sourceText: story, voiceType }));
  }
  const primaryA = characters[0]?.name || 'Hero';
  const primaryB = characters[1]?.name || 'Friend';
  const primaryC = characters[2]?.name || '';

  const scenes = rawScenes.map((text, index) => ({
    id: index + 1,
    title: ['Beginning', 'Adventure', 'Challenge', 'Magic', 'Daydream'][index] || `Scene ${index + 1}`,
    description: text,
    emotion: index === 0 ? 'curious' : index === 2 ? 'brave' : index === 4 ? 'joyful' : 'wonder',
    characters: characters.map((character) => ({
      name: character.name,
      role: character.role,
      voice: character.voiceProfile || voiceType,
    })),
    cameraActions: ['soft zoom', 'gentle pan', 'wide exposure', 'close-up', 'dolly in'][index] || 'subtle move',
    dialogue: [
      `${primaryA}: ${text}`,
      `${primaryB}: We can do this together.`,
      primaryC ? `${primaryC}: Let us help each other and finish the mission.` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  }));

  const subtitles = scenes.map((scene, index) => ({
    start: index * 4,
    end: index * 4 + 4,
    text: `${scene.title}: ${scene.description}`,
  }));

  return {
    title: storyTitle || `AI Kids Animation Studio: ${storiesToTitle(story)}`,
    mode: storyMode || 'bedtime',
    themes: [storyMode || 'magical storytelling'],
    language,
    voiceType,
    characters,
    scenes,
    subtitles,
    promptHints: scenes.map((scene) => ({
      imagePrompt: `Child-safe ${storyMode} scene with ${scene.characters.map((c) => c.name).join(', ')} and ${scene.emotion} emotion`,
      animationPrompt: `Zoom, pan, blink, lip sync, smooth transitions, gentle movement`,
      backgroundPrompt: `Soft ${storyMode} environment with warm tones and playful props`,
    })),
  };
};

const storiesToTitle = (story) => {
  const firstSentence = story.split(/[\.\?\!]+/).find(Boolean) || 'Magical Story';
  const cleaned = firstSentence.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  return cleaned.length > 30 ? `${cleaned.slice(0, 30)}...` : cleaned;
};

const clampSceneCount = (value) => {
  const count = Number(value) || 5;
  return Math.max(3, Math.min(12, count));
};

const normalizeStorySubject = (subject = '') => {
  const cleaned = sanitizeText(subject)
    .replace(/\b(moral\s+story|story\s+for\s+kids|for\s+kids|kids\s+story|kids|story)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || sanitizeText(subject || 'Magical friendship');
};

const buildKnownStoryTemplate = ({ subject, languageId, ageFilter, storyMode }) => {
  const normalizedSubject = normalizeStorySubject(subject).toLowerCase();
  const hasRabbit = /\b(rabbit|hare|bunny)\b/.test(normalizedSubject);
  const hasTortoise = /\b(tortoise|turtle)\b/.test(normalizedSubject);

  if (hasRabbit && hasTortoise) {
    return {
      title: 'The Rabbit and the Tortoise',
      synopsis: 'A speedy rabbit mocks a calm tortoise and challenges him to a race, but steady effort and focus win the day.',
      moral: 'Slow and steady wins the race.',
      language: languageId,
      audience: ageFilter,
      sceneBeats: [
        { beat: 'Opening', summary: 'Rabbit boasts about speed while Tortoise stays calm and polite.' },
        { beat: 'Challenge', summary: 'The forest friends announce a race between Rabbit and Tortoise.' },
        { beat: 'Journey', summary: 'Rabbit sprints ahead, then rests proudly while Tortoise keeps moving step by step.' },
        { beat: 'Climax', summary: 'Rabbit wakes up too late and rushes, but Tortoise reaches the finish line first.' },
        { beat: 'Ending', summary: 'Rabbit admits his mistake and learns to respect patience and consistency.' },
      ],
      narration: 'Rabbit laughed at Tortoise for being slow. But in the race, Rabbit stopped and slept while Tortoise kept walking. In the end, Tortoise won because he never gave up. Slow and steady wins the race.',
    };
  }

  return null;
};

const buildFallbackScript = ({ subject, languageId, storyMode, ageFilter }) => {
  const knownTemplate = buildKnownStoryTemplate({ subject, languageId, ageFilter, storyMode });
  if (knownTemplate) {
    return knownTemplate;
  }

  const cleanSubject = normalizeStorySubject(subject || 'Magical friendship story');
  const title = `Story of ${cleanSubject}`;
  const synopsis = `A child-safe ${storyMode} story about ${cleanSubject}, with teamwork, curiosity, and kindness.`;
  const moral = 'Kindness, patience, and smart effort help us succeed.';

  const scenes = [
    { beat: 'Opening', summary: `Introduce ${cleanSubject} in a warm, playful setting.` },
    { beat: 'Challenge', summary: 'A challenge appears and characters react with different emotions.' },
    { beat: 'Journey', summary: 'Characters try, fail, learn, and support each other.' },
    { beat: 'Climax', summary: 'The key moment proves the main lesson with clear action.' },
    { beat: 'Ending', summary: `Celebrate growth with the moral: ${moral}` },
  ];

  return {
    title,
    synopsis,
    moral,
    language: languageId,
    audience: ageFilter,
    sceneBeats: scenes,
    narration: `${title}. ${synopsis} ${moral}`,
  };
};

const buildScriptFromSubject = async ({ subject, languageId, storyMode, ageFilter }) => {
  const cleanSubject = sanitizeText(subject || '');
  if (!cleanSubject) {
    throw new Error('Subject is required.');
  }

  const systemPrompt = 'You are an expert kids screenplay writer. Output strict JSON only.';
  const userPrompt = `Create a safe kids screenplay for topic: "${cleanSubject}".
Language: ${languageId}
Mode: ${storyMode}
Age group: ${ageFilter}
Return JSON with keys:
title, synopsis, moral, narration, sceneBeats[] where each beat has beat and summary.
Keep language simple and family-friendly.`;

  const response = await safeGoogleAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], 900);

  const parsed = response ? extractJson(response) : null;
  if (!parsed || !Array.isArray(parsed.sceneBeats) || !parsed.sceneBeats.length) {
    return buildFallbackScript({ subject: cleanSubject, languageId, storyMode, ageFilter });
  }

  return {
    title: sanitizeText(parsed.title) || `Story of ${cleanSubject}`,
    synopsis: sanitizeText(parsed.synopsis) || buildFallbackScript({ subject: cleanSubject, languageId, storyMode, ageFilter }).synopsis,
    moral: sanitizeText(parsed.moral) || 'Kindness and effort always matter.',
    narration: sanitizeText(parsed.narration) || '',
    language: languageId,
    audience: ageFilter,
    sceneBeats: parsed.sceneBeats
      .map((beat, index) => ({
        beat: sanitizeText(beat?.beat) || `Scene ${index + 1}`,
        summary: sanitizeText(beat?.summary) || '',
      }))
      .filter((beat) => beat.summary),
  };
};

const buildCharactersFromScript = ({ script, subject, voiceType }) => {
  const text = `${script?.title || ''} ${script?.synopsis || ''} ${subject || ''}`;
  const baseCharacters = inferPresetCharactersFromText(text, voiceType);

  if (!baseCharacters.length) {
    baseCharacters.push(...buildSeededFallbackCharacters({ sourceText: text, voiceType }));
  }

  return baseCharacters;
};

const buildScenesFromScript = ({ script, characters, styleId, storyMode, sceneCount = 5 }) => {
  const targetCount = clampSceneCount(sceneCount);
  const beats = Array.isArray(script?.sceneBeats) && script.sceneBeats.length
    ? script.sceneBeats
    : buildFallbackScript({ subject: script?.title || 'Story', languageId: script?.language, storyMode, ageFilter: script?.audience }).sceneBeats;

  const primaryNames = (characters || []).map((char) => char.name).join(', ') || 'Story characters';
  const primaryA = characters?.[0]?.name || 'Hero';
  const primaryB = characters?.[1]?.name || 'Friend';
  const primaryC = characters?.[2]?.name || '';
  const coreTopic = sanitizeText(script?.title || script?.synopsis || 'our mission');
  const readableTopic = coreTopic
    .replace(/^story of\s+/i, '')
    .replace(/^the\s+/i, '')
    .trim() || 'mission';
  const moralLine = sanitizeText(script?.moral || 'teamwork and patience matter');
  const weatherOptions = ['sunny', 'golden evening', 'soft cloudy', 'gentle rain', 'starlit night'];
  const sceneDialogueTemplates = [
    `${primaryA}: Let's begin this ${readableTopic} adventure.\n${primaryB}: Yes, we can solve this together.${primaryC ? `\n${primaryC}: I will join and support this plan.` : ''}`,
    `${primaryA}: This challenge is bigger than I expected.\n${primaryB}: We can break it into small steps.${primaryC ? `\n${primaryC}: I can handle one key part carefully.` : ''}`,
    `${primaryA}: I found a new clue.\n${primaryB}: Great, let us keep exploring and stay brave.${primaryC ? `\n${primaryC}: Teamwork makes this easier for everyone.` : ''}`,
    `${primaryA}: We are close now.\n${primaryB}: One more good decision and we can finish it.${primaryC ? `\n${primaryC}: Let us stay focused and kind.` : ''}`,
    `${primaryA}: We did it and learned something important.\n${primaryB}: ${moralLine}${primaryC ? `\n${primaryC}: Together we achieved our goal.` : ''}`,
  ];

  return Array.from({ length: targetCount }).map((_, index) => {
    const beat = beats[index % beats.length];
    return normalizeSceneForCinematicPipeline({
      id: index + 1,
      title: beat.beat || `Scene ${index + 1}`,
      description: beat.summary || 'Story progression scene',
      dialogue: sceneDialogueTemplates[index % sceneDialogueTemplates.length],
      emotion: index === targetCount - 1 ? 'joyful' : index === 2 ? 'brave' : 'wonder',
      background: `${storyMode || 'bedtime'} world with child-safe ${styleId || 'cartoon'} art`,
      weather: weatherOptions[index % weatherOptions.length],
      timeOfDay: index < 2 ? 'Morning' : index < targetCount - 1 ? 'Afternoon' : 'Evening',
      cameraActions: ['wide shot', 'medium shot', 'close-up', 'tracking shot', 'crane reveal'][index % 5],
      animationPrompt: `Animate ${primaryNames} with smooth family-friendly motion, lip sync, and expressive faces.`,
      characters: (characters || []).map((char) => ({ name: char.name, role: char.role })),
      durationSeconds: 4,
      cameraMotion: ['slow-zoom', 'push-in', 'orbit', 'tracking-left', 'crane-up'][index % 5],
      transitionType: index === 0 ? 'fade-in' : (index === targetCount - 1 ? 'fade-out' : 'cross-dissolve'),
      shotType: ['wide', 'medium', 'close-up', 'over-shoulder', 'wide'][index % 5],
      backgroundMusicMood: index === targetCount - 1 ? 'victory' : 'curious',
      soundEffects: ['wind', 'footsteps'],
      characterPose: index === 0 ? 'introduce-characters' : 'action-pose',
      mouthMovement: 'auto',
      sceneLighting: index === targetCount - 1 ? 'golden-hour' : 'soft-cinematic',
      animationStyle: '2d-cartoon',
    }, index);
  });
};

const buildVoicePlan = ({ script, characters, languageId, voiceType }) => ({
  narrator: {
    voice: voiceType || 'kid-female',
    language: languageId || 'english',
    text: sanitizeText(script?.narration || script?.synopsis || ''),
  },
  characterVoices: (characters || []).map((char) => ({
    characterId: char.id,
    name: char.name,
    voice: char.voiceProfile || voiceType || 'kid-female',
    emotionStyle: char.emotionStyle || 'neutral',
  })),
  lipSyncEngine: 'wav2lip-ready',
});

const buildMusicPlan = ({ storyMode }) => ({
  backgroundTrack: `${storyMode || 'bedtime'}-friendly soundtrack`,
  sfx: ['footsteps', 'birds', 'wind', 'crowd-cheer'],
  mixStyle: 'soft-dynamic-kids-mix',
});

const buildAnimationPlan = ({ scenes }) => ({
  engine: 'anim-diff-ready',
  timeline: (scenes || []).map((scene) => ({
    sceneId: scene.id,
    action: scene.animationPrompt || 'gentle movement',
    durationSeconds: scene.durationSeconds || 4,
  })),
});

const buildEditableOptions = () => ({
  script: ['title', 'synopsis', 'moral', 'narration', 'sceneBeats'],
  characters: ['name', 'role', 'appearance', 'voiceProfile', 'emotionStyle', 'colorPalette'],
  scenes: ['title', 'description', 'dialogue', 'emotion', 'background', 'weather', 'timeOfDay', 'cameraActions', 'durationSeconds', 'characters'],
  voice: ['narrator.voice', 'narrator.language', 'narrator.text', 'characterVoices'],
  music: ['backgroundTrack', 'sfx', 'mixStyle'],
  timeline: ['subtitles', 'animationPlan.timeline', 'sceneOrder'],
});

const buildSubtitlesFromScenes = (scenes = []) => {
  let cursor = 0;
  return scenes.map((scene) => {
    const duration = Math.max(2, Math.min(15, Number(scene?.durationSeconds) || 4));
    const subtitle = {
      start: cursor,
      end: cursor + duration,
      text: sanitizeText(`${scene?.title || 'Scene'}: ${scene?.description || ''}`),
    };
    cursor += duration;
    return subtitle;
  });
};

const getProjectFilePath = (projectId) => path.join(projectStoreRoot, `${safeFileName(projectId)}.json`);

const saveStudioProject = async (project) => {
  await ensureProjectStoreRoot();
  const safeProjectId = sanitizeText(project?.projectId || uuidv4());
  const payload = {
    ...project,
    projectId: safeProjectId,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(getProjectFilePath(safeProjectId), JSON.stringify(payload, null, 2), 'utf-8');
  return payload;
};

const getStudioProject = async (projectId) => {
  await ensureProjectStoreRoot();
  const safeProjectId = sanitizeText(projectId);
  if (!safeProjectId) {
    throw new Error('Project ID is required.');
  }
  const filePath = getProjectFilePath(safeProjectId);
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }

    // Legacy/fallback metadata path used after render.
    const fallbackMetadataPath = path.join(uploadsRoot, safeFileName(safeProjectId), 'project.json');
    try {
      const fallbackContent = await readFile(fallbackMetadataPath, 'utf-8');
      const fallbackProject = JSON.parse(fallbackContent);
      return {
        ...fallbackProject,
        projectId: sanitizeText(fallbackProject?.projectId || safeProjectId),
      };
    } catch (fallbackError) {
      if (fallbackError?.code !== 'ENOENT') {
        throw fallbackError;
      }
    }

    const notFoundError = new Error(`Project "${safeProjectId}" not found.`);
    notFoundError.code = 'ENOENT';
    notFoundError.status = 404;
    throw notFoundError;
  }
};

const createAutopilotProject = async ({
  subject,
  languageId,
  styleId,
  voiceType,
  videoSizeId,
  storyMode,
  safeMode,
  ageFilter,
  sceneCount,
  aiProvider,
}) => {
  const cleanSubject = sanitizeText(subject || '');
  if (!cleanSubject) {
    throw new Error('Subject is required.');
  }
  if (safeMode) {
    const assessment = await getCombinedSafetyAssessment(cleanSubject);
    if (assessment.blocked) {
      throw createSafetyError('subject', assessment);
    }
  }

  const script = await buildScriptFromSubject({ subject: cleanSubject, languageId, storyMode, ageFilter });
  const characters = buildCharactersFromScript({ script, subject: cleanSubject, voiceType });
  const scenes = buildScenesFromScript({ script, characters, styleId, storyMode, sceneCount });
  const voicePlan = buildVoicePlan({ script, characters, languageId, voiceType });
  const musicPlan = buildMusicPlan({ storyMode });
  const animationPlan = buildAnimationPlan({ scenes });

  const project = {
    projectId: uuidv4(),
    createdAt: new Date().toISOString(),
    workflowType: 'autonomous-story-to-animation',
    subject: cleanSubject,
    storyTitle: script.title,
    storyPrompt: script.synopsis,
    language: languageId,
    style: styleId,
    videoSize: videoSizeId,
    voiceType,
    storyMode,
    safeMode: Boolean(safeMode),
    ageFilter,
    premiumExport: false,
    aiProvider: normalizeAiProvider(aiProvider || freeAiProvider),
    script,
    characters,
    scenes,
    subtitles: buildSubtitlesFromScenes(scenes),
    narration: script.narration || voicePlan.narrator.text,
    voicePlan,
    musicPlan,
    animationPlan,
    editCapabilities: [
      'script',
      'characters',
      'scenes',
      'voice',
      'music',
      'timeline',
    ],
    editableOptions: buildEditableOptions(),
    freeMode: isFreeMode,
    aiProviderEnabled,
  };

  return saveStudioProject(project);
};

const regenerateProjectStage = async (projectId, stage, options = {}) => {
  const project = await getStudioProject(projectId);
  const normalizedStage = sanitizeText(stage).toLowerCase();

  if (normalizedStage === 'script') {
    const safeSubject = sanitizeText(options.subject || project.subject || project.storyTitle);
    if (project.safeMode) {
      const assessment = await getCombinedSafetyAssessment(safeSubject);
      if (assessment.blocked) {
        throw createSafetyError('subject', assessment);
      }
    }
    const script = await buildScriptFromSubject({
      subject: safeSubject,
      languageId: project.language,
      storyMode: project.storyMode,
      ageFilter: project.ageFilter,
    });
    project.script = script;
    project.storyTitle = script.title;
    project.storyPrompt = script.synopsis;
    project.narration = script.narration || project.narration;
  } else if (normalizedStage === 'characters') {
    project.characters = buildCharactersFromScript({
      script: project.script,
      subject: project.subject,
      voiceType: project.voiceType,
    });
  } else if (normalizedStage === 'scenes') {
    project.scenes = buildScenesFromScript({
      script: project.script,
      characters: project.characters,
      styleId: project.style,
      storyMode: project.storyMode,
      sceneCount: options.sceneCount || project.scenes?.length || 5,
    });
    project.subtitles = buildSubtitlesFromScenes(project.scenes);
    project.animationPlan = buildAnimationPlan({ scenes: project.scenes });
  } else if (normalizedStage === 'voice') {
    project.voicePlan = buildVoicePlan({
      script: project.script,
      characters: project.characters,
      languageId: project.language,
      voiceType: project.voiceType,
    });
    project.narration = project.script?.narration || project.voicePlan?.narrator?.text || project.narration;
  } else if (normalizedStage === 'music') {
    project.musicPlan = buildMusicPlan({ storyMode: project.storyMode });
  } else if (normalizedStage === 'animation') {
    project.animationPlan = buildAnimationPlan({ scenes: project.scenes });
  } else {
    throw new Error(`Unsupported stage "${stage}".`);
  }

  return saveStudioProject(project);
};

const resolveSceneIndex = (scenes = [], sceneId) => {
  const numericSceneId = Number(sceneId);
  if (Number.isFinite(numericSceneId)) {
    return scenes.findIndex((scene, index) => Number(scene?.id || index + 1) === numericSceneId);
  }
  const normalized = sanitizeText(sceneId);
  return scenes.findIndex((scene, index) => sanitizeText(scene?.id || String(index + 1)) === normalized);
};

const buildFallbackSceneDialogue = (scene, project, sceneIndex = 0) => {
  const sceneCharacters = normalizeSceneCharacterList(scene, project);
  const primaryA = sceneCharacters[0]?.name || 'Hero';
  const primaryB = sceneCharacters[1]?.name || 'Friend';
  const summary = sanitizeText(scene?.description || 'Our story moves forward.');
  const mood = sanitizeText(scene?.emotion || 'wonder');
  return `${primaryA}: ${summary}\n${primaryB}: We can do this together with ${mood}.`;
};

const regenerateProjectScene = async (projectId, sceneId, options = {}) => {
  const project = await getStudioProject(projectId);
  const scenes = Array.isArray(project?.scenes) ? project.scenes : [];
  const sceneIndex = resolveSceneIndex(scenes, sceneId);
  if (sceneIndex < 0) {
    throw new Error('Scene not found.');
  }

  const existingScene = scenes[sceneIndex];
  const previousScene = sceneIndex > 0 ? scenes[sceneIndex - 1] : null;
  const nextScene = sceneIndex < scenes.length - 1 ? scenes[sceneIndex + 1] : null;
  const sceneCharacters = normalizeSceneCharacterList(existingScene, project);
  const customDirection = sanitizeText(options?.direction || options?.prompt || '');

  let regeneratedCandidate = null;
  if (aiProviderEnabled) {
    const systemPrompt = 'You are an expert kids animation writer. Return strict JSON only.';
    const userPrompt = `Regenerate one storyboard scene while preserving story continuity.
Project title: ${sanitizeText(project?.storyTitle || project?.title || 'Kids story')}
Story mode: ${sanitizeText(project?.storyMode || 'bedtime')}
Scene index: ${sceneIndex + 1} of ${scenes.length}
Current scene title: ${sanitizeText(existingScene?.title || '')}
Current scene description: ${sanitizeText(existingScene?.description || '')}
Current scene dialogue: ${sanitizeText(existingScene?.dialogue || '')}
Characters in this scene: ${sceneCharacters.map((char) => `${char.name} (${char.role})`).join(', ') || 'Hero, Friend'}
Previous scene context: ${sanitizeText(previousScene?.description || 'none')}
Next scene context: ${sanitizeText(nextScene?.description || 'none')}
Creative direction: ${customDirection || 'Keep it playful and emotionally clear.'}

Return JSON with keys:
title, description, dialogue, emotion, background, weather, timeOfDay, cameraActions, durationSeconds.
Dialogue must be 2-4 short lines and child-safe.`;
    const response = await safeGoogleAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], 700);
    regeneratedCandidate = response ? extractJson(response) : null;
  }

  const fallbackScene = {
    ...existingScene,
    title: sanitizeText(existingScene?.title || `Scene ${sceneIndex + 1}`),
    description: sanitizeText(existingScene?.description || existingScene?.summary || 'Story progression scene'),
    dialogue: buildFallbackSceneDialogue(existingScene, project, sceneIndex),
    emotion: sanitizeText(existingScene?.emotion || 'wonder'),
    background: sanitizeText(existingScene?.background || `${project?.storyMode || 'bedtime'} cartoon world`),
    weather: sanitizeText(existingScene?.weather || 'sunny'),
    timeOfDay: sanitizeText(existingScene?.timeOfDay || 'Afternoon'),
    cameraActions: sanitizeText(existingScene?.cameraActions || 'soft pan'),
    durationSeconds: Math.max(2, Math.min(15, Number(existingScene?.durationSeconds) || 4)),
    characters: sceneCharacters,
  };

  const mergedScene = normalizeSceneForCinematicPipeline({
    ...fallbackScene,
    ...(regeneratedCandidate && typeof regeneratedCandidate === 'object' ? regeneratedCandidate : {}),
    id: sceneIndex + 1,
    title: sanitizeText(
      regeneratedCandidate?.title
      || fallbackScene.title
      || `Scene ${sceneIndex + 1}`
    ),
    description: sanitizeText(
      regeneratedCandidate?.description
      || fallbackScene.description
      || ''
    ),
    dialogue: sanitizeText(
      regeneratedCandidate?.dialogue
      || fallbackScene.dialogue
      || ''
    ),
    emotion: sanitizeText(
      regeneratedCandidate?.emotion
      || fallbackScene.emotion
      || 'wonder'
    ),
    background: sanitizeText(
      regeneratedCandidate?.background
      || fallbackScene.background
      || ''
    ),
    weather: sanitizeText(
      regeneratedCandidate?.weather
      || fallbackScene.weather
      || ''
    ),
    timeOfDay: sanitizeText(
      regeneratedCandidate?.timeOfDay
      || fallbackScene.timeOfDay
      || ''
    ),
    cameraActions: sanitizeText(
      regeneratedCandidate?.cameraActions
      || fallbackScene.cameraActions
      || ''
    ),
    durationSeconds: Math.max(
      2,
      Math.min(15, Number(regeneratedCandidate?.durationSeconds) || Number(fallbackScene.durationSeconds) || 4)
    ),
    characters: Array.isArray(existingScene?.characters) && existingScene.characters.length
      ? existingScene.characters
      : sceneCharacters,
  }, sceneIndex);

  if (project.safeMode) {
    const safetyInput = [
      mergedScene.title,
      mergedScene.description,
      mergedScene.dialogue,
    ]
      .map((value) => sanitizeText(value))
      .filter(Boolean)
      .join(' ');
    const assessment = await getCombinedSafetyAssessment(safetyInput);
    if (assessment.blocked) {
      throw createSafetyError('scene_regeneration', assessment);
    }
  }

  const updatedScenes = [...scenes];
  updatedScenes[sceneIndex] = mergedScene;
  project.scenes = updatedScenes;
  project.subtitles = buildSubtitlesFromScenes(updatedScenes);
  project.animationPlan = buildAnimationPlan({ scenes: updatedScenes });

  const savedProject = await saveStudioProject(project);
  return {
    project: savedProject,
    scene: mergedScene,
    sceneId: Number(mergedScene.id || sceneIndex + 1),
  };
};

const regenerateProjectSceneDialogue = async (projectId, sceneId, options = {}) => {
  const project = await getStudioProject(projectId);
  const scenes = Array.isArray(project?.scenes) ? project.scenes : [];
  const sceneIndex = resolveSceneIndex(scenes, sceneId);
  if (sceneIndex < 0) {
    throw new Error('Scene not found.');
  }

  const scene = scenes[sceneIndex];
  const sceneCharacters = normalizeSceneCharacterList(scene, project);
  const customDirection = sanitizeText(options?.direction || options?.prompt || '');
  let regeneratedDialogue = '';

  if (aiProviderEnabled) {
    const systemPrompt = 'You are an expert kids dialogue writer. Output only plain dialogue text.';
    const userPrompt = `Rewrite dialogue for one kids animation scene.
Scene title: ${sanitizeText(scene?.title || '')}
Scene description: ${sanitizeText(scene?.description || '')}
Emotion: ${sanitizeText(scene?.emotion || 'wonder')}
Characters: ${sceneCharacters.map((char) => `${char.name} (${char.role})`).join(', ') || 'Hero, Friend'}
Current dialogue: ${sanitizeText(scene?.dialogue || '')}
Direction: ${customDirection || 'Make it playful, short, and child-safe.'}

Write 2-4 short lines in the format "Name: line".`;
    const response = await safeGoogleAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], 350);
    regeneratedDialogue = sanitizeText(response || '');
  }

  if (!regeneratedDialogue) {
    regeneratedDialogue = buildFallbackSceneDialogue(scene, project, sceneIndex);
  }

  if (project.safeMode) {
    const assessment = await getCombinedSafetyAssessment(regeneratedDialogue);
    if (assessment.blocked) {
      throw createSafetyError('scene_dialogue_regeneration', assessment);
    }
  }

  const updatedScene = normalizeSceneForCinematicPipeline({
    ...scene,
    id: sceneIndex + 1,
    dialogue: regeneratedDialogue,
  }, sceneIndex);

  const updatedScenes = [...scenes];
  updatedScenes[sceneIndex] = updatedScene;
  project.scenes = updatedScenes;
  project.subtitles = buildSubtitlesFromScenes(updatedScenes);

  const savedProject = await saveStudioProject(project);
  return {
    project: savedProject,
    scene: updatedScene,
    sceneId: Number(updatedScene.id || sceneIndex + 1),
  };
};

const patchStudioProject = async (projectId, patch = {}) => {
  let project;
  try {
    project = await getStudioProject(projectId);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }

    // Cloud Run instances can lose local ephemeral files between requests.
    // When a project json is missing, upsert from patch payload instead of failing render.
    const fallbackProjectId = sanitizeText(projectId) || sanitizeText(patch?.projectId) || uuidv4();
    project = {
      projectId: fallbackProjectId,
      createdAt: new Date().toISOString(),
      storyTitle: sanitizeText(patch?.storyTitle || patch?.script?.title || ''),
      storyPrompt: sanitizeText(patch?.storyPrompt || patch?.script?.synopsis || ''),
      language: sanitizeText(patch?.language || 'english'),
      style: sanitizeText(patch?.style || 'cartoon'),
      videoSize: sanitizeText(patch?.videoSize || 'youtube'),
      voiceType: sanitizeText(patch?.voiceType || 'kid-female'),
      storyMode: sanitizeText(patch?.storyMode || 'bedtime'),
      safeMode: Boolean(patch?.safeMode),
      ageFilter: sanitizeText(patch?.ageFilter || '5-8'),
      premiumExport: Boolean(patch?.premiumExport),
      aiProvider: normalizeAiProvider(patch?.aiProvider || freeAiProvider),
      freeMode: isFreeMode,
      aiProviderEnabled,
      scenes: Array.isArray(patch?.scenes) ? patch.scenes : [],
      subtitles: Array.isArray(patch?.subtitles) ? patch.subtitles : [],
      characters: Array.isArray(patch?.characters) ? patch.characters : [],
      editCapabilities: Array.isArray(patch?.editCapabilities) && patch.editCapabilities.length
        ? patch.editCapabilities
        : ['script', 'characters', 'scenes', 'voice', 'music', 'timeline'],
      editableOptions: patch?.editableOptions || buildEditableOptions(),
    };
  }

  const updatedProject = {
    ...project,
    ...patch,
    script: typeof patch.script === 'object' && patch.script
      ? { ...project.script, ...patch.script }
      : project.script,
    voicePlan: typeof patch.voicePlan === 'object' && patch.voicePlan
      ? { ...project.voicePlan, ...patch.voicePlan }
      : project.voicePlan,
    musicPlan: typeof patch.musicPlan === 'object' && patch.musicPlan
      ? { ...project.musicPlan, ...patch.musicPlan }
      : project.musicPlan,
    animationPlan: typeof patch.animationPlan === 'object' && patch.animationPlan
      ? { ...project.animationPlan, ...patch.animationPlan }
      : project.animationPlan,
    editableOptions: typeof patch.editableOptions === 'object' && patch.editableOptions
      ? { ...(project.editableOptions || buildEditableOptions()), ...patch.editableOptions }
      : (project.editableOptions || buildEditableOptions()),
  };

  if (Array.isArray(patch.characters)) {
    updatedProject.characters = patch.characters.map((character, index) => ({
      ...character,
      id: sanitizeText(character?.id || `char-${index + 1}`),
      name: sanitizeText(character?.name || `Character ${index + 1}`),
      role: sanitizeText(character?.role || 'Story role'),
      appearance: sanitizeText(character?.appearance || ''),
      voiceProfile: sanitizeText(character?.voiceProfile || updatedProject.voiceType || 'kid-female'),
      emotionStyle: sanitizeText(character?.emotionStyle || 'friendly'),
      locked: character?.locked !== false,
    }));
  }
  if (Array.isArray(patch.scenes)) {
    const normalizedScenes = patch.scenes.map((scene, index) => normalizeSceneForCinematicPipeline({
      ...scene,
      id: index + 1,
      title: sanitizeText(scene?.title || `Scene ${index + 1}`),
      description: sanitizeText(scene?.description || ''),
      dialogue: sanitizeText(scene?.dialogue || ''),
      emotion: sanitizeText(scene?.emotion || 'wonder'),
      background: sanitizeText(scene?.background || ''),
      weather: sanitizeText(scene?.weather || ''),
      timeOfDay: sanitizeText(scene?.timeOfDay || ''),
      cameraActions: sanitizeText(scene?.cameraActions || ''),
      durationSeconds: Math.max(2, Math.min(15, Number(scene?.durationSeconds) || 4)),
      characters: Array.isArray(scene?.characters) ? scene.characters : [],
    }, index));
    updatedProject.scenes = normalizedScenes;
    updatedProject.subtitles = buildSubtitlesFromScenes(normalizedScenes);
    updatedProject.animationPlan = buildAnimationPlan({ scenes: normalizedScenes });
  }
  if (Array.isArray(patch.subtitles)) {
    updatedProject.subtitles = patch.subtitles
      .map((subtitle, index) => ({
        start: Number(subtitle?.start),
        end: Number(subtitle?.end),
        text: sanitizeText(subtitle?.text || `Scene ${index + 1}`),
      }))
      .filter((subtitle) => Number.isFinite(subtitle.start) && Number.isFinite(subtitle.end) && subtitle.end > subtitle.start);
  }
  if (Array.isArray(patch.editCapabilities) && patch.editCapabilities.length) {
    updatedProject.editCapabilities = patch.editCapabilities.map((entry) => sanitizeText(entry)).filter(Boolean);
  }

  updatedProject.storyTitle = sanitizeText(updatedProject.storyTitle || updatedProject.script?.title || project.storyTitle);
  updatedProject.storyPrompt = sanitizeText(updatedProject.storyPrompt || updatedProject.script?.synopsis || project.storyPrompt);
  updatedProject.aiProvider = normalizeAiProvider(updatedProject.aiProvider || project.aiProvider || freeAiProvider);
  updatedProject.narration = sanitizeText(
    updatedProject?.voicePlan?.narrator?.text
    || updatedProject.narration
    || updatedProject.script?.narration
    || project.narration
  );

  if (updatedProject.safeMode) {
    const safetyInput = [
      updatedProject.storyPrompt,
      updatedProject.script?.synopsis,
      updatedProject.narration,
    ]
      .map((value) => sanitizeText(value))
      .filter(Boolean)
      .join(' ');
    const assessment = await getCombinedSafetyAssessment(safetyInput);
    if (assessment.blocked) {
      throw createSafetyError('project_patch', assessment);
    }
  }

  return saveStudioProject(updatedProject);
};

const createStudioProject = async ({
  storyTitle,
  storyPrompt,
  languageId,
  styleId,
  voiceType,
  videoSizeId,
  storyMode,
  safeMode,
  ageFilter,
  storySource,
  aiProvider,
}) => {
  const normalizedStoryPrompt = sanitizeText(storyPrompt);
  const normalizedStoryTitle = sanitizeText(storyTitle);

  if (!normalizedStoryPrompt) {
    throw new Error('Story prompt is required.');
  }
  if (normalizedStoryPrompt.length > MAX_STORY_LENGTH) {
    throw new Error(`Story prompt exceeds ${MAX_STORY_LENGTH} characters.`);
  }
  if (safeMode) {
    const assessment = await getCombinedSafetyAssessment(normalizedStoryPrompt);
    if (assessment.blocked) {
      throw createSafetyError('story_prompt', assessment);
    }
  }

  const project = {
    projectId: uuidv4(),
    createdAt: new Date().toISOString(),
    storyPrompt: normalizedStoryPrompt,
    storySource,
    language: languageId,
    style: styleId,
    videoSize: videoSizeId,
    voiceType,
    storyMode,
    safeMode,
    ageFilter,
    premiumExport: false,
    aiProvider: normalizeAiProvider(aiProvider || freeAiProvider),
    freeMode: isFreeMode,
    aiProviderEnabled,
  };

  const systemPrompt = `You are a children-friendly animation production engine for an AI Kids Animation Studio. Parse the user story into scenes, characters, emotions, camera actions, and safe multimedia prompts.`;
  const userPrompt = `Story:
${normalizedStoryPrompt}

Mode: ${storyMode}
Language: ${languageId}
Voice type: ${voiceType}
Produce valid JSON with: title, mode, themes, characters, scenes, subtitles, promptHints.
Each scene must include id, title, description, emotion, characters, cameraActions, dialogue.
Characters must include consistent face, costume, colorPalette, and voiceProfile.`;

  let parsed = null;
  try {
    const aiResponse = await safeGoogleAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], 1100);
    parsed = aiResponse ? extractJson(aiResponse) : null;
  } catch (error) {
    parsed = null;
  }

  let projectBody;
  if (parsed && Array.isArray(parsed.scenes) && Array.isArray(parsed.characters)) {
    projectBody = {
      ...project,
      ...parsed,
      title: normalizedStoryTitle || sanitizeText(parsed.title) || `AI Kids Animation Studio: ${storiesToTitle(normalizedStoryPrompt)}`,
      promptHints: parsed.promptHints || [],
    };
  } else {
    projectBody = {
      ...project,
      ...fallbackParseStory({
        story: normalizedStoryPrompt,
        storyMode,
        voiceType,
        language: languageId,
        storyTitle: normalizedStoryTitle,
      }),
    };
  }

  projectBody.scenes = Array.isArray(projectBody.scenes) ? projectBody.scenes.slice(0, 20) : [];
  if (!projectBody.scenes.length) {
    projectBody.scenes = fallbackParseStory({
      story: normalizedStoryPrompt,
      storyMode,
      voiceType,
      language: languageId,
      storyTitle: normalizedStoryTitle,
    }).scenes;
  }

  if (!Array.isArray(projectBody.characters) || !projectBody.characters.length) {
    projectBody.characters = buildCharactersFromScript({
      script: {
        title: projectBody.title || normalizedStoryTitle,
        synopsis: normalizedStoryPrompt,
      },
      subject: normalizedStoryPrompt,
      voiceType,
    });
  }

  projectBody.scenes = projectBody.scenes.map((scene, index) => {
    const fallbackDialogue = `${projectBody.characters?.[0]?.name || 'Hero'}: ${scene.description || 'Let us continue our story.'}`;
    return normalizeSceneForCinematicPipeline({
      ...scene,
      id: index + 1,
      title: sanitizeText(scene?.title || `Scene ${index + 1}`),
      description: sanitizeText(scene?.description || ''),
      dialogue: sanitizeText(scene?.dialogue || fallbackDialogue),
      emotion: sanitizeText(scene?.emotion || 'wonder'),
      durationSeconds: Math.max(2, Math.min(15, Number(scene?.durationSeconds) || 4)),
      characters: Array.isArray(scene?.characters) && scene.characters.length
        ? scene.characters
        : projectBody.characters.map((char) => ({ name: char.name, role: char.role })),
    }, index);
  });

  projectBody.promptHints = projectBody.promptHints || projectBody.scenes.map((scene) => ({
    imagePrompt: `A child-safe ${projectBody.style} scene of ${scene.description}`,
    animationPrompt: `Slow zoom, slight pan, blink, gentle movement`,
    backgroundPrompt: `Soft pastel ${projectBody.mode} background with props and warm lighting`,
  }));

  projectBody.subtitles = buildSubtitlesFromScenes(projectBody.scenes);

  projectBody.editCapabilities = Array.isArray(projectBody.editCapabilities) && projectBody.editCapabilities.length
    ? projectBody.editCapabilities
    : ['script', 'characters', 'scenes', 'voice', 'music', 'timeline'];
  projectBody.editableOptions = projectBody.editableOptions || buildEditableOptions();

  const narrationScript = await buildNarration(projectBody);
  projectBody.narration = narrationScript;
  projectBody.voicePlan = buildVoicePlan({
    script: { narration: narrationScript, synopsis: projectBody.storyPrompt },
    characters: projectBody.characters,
    languageId,
    voiceType,
  });
  projectBody.musicPlan = projectBody.musicPlan || buildMusicPlan({ storyMode });
  projectBody.animationPlan = projectBody.animationPlan || buildAnimationPlan({ scenes: projectBody.scenes });

  return saveStudioProject(projectBody);
};

const buildNarration = async (project) => {
  const fallback = `${project.title}. ${project.scenes.map((scene) => `${scene.title}: ${scene.description} `).join(' ')}`;
  if (!aiProviderEnabled) return fallback;

  try {
    const systemPrompt = `You are a warm bedtime storyteller for kids. Create a gentle narration script in ${project.language} using the scenes and emotions provided.`;
    const userPrompt = `Story title: ${project.title}
Scenes:
${project.scenes.map((scene) => `- ${scene.title}: ${scene.description} [${scene.emotion}]`).join('\n')}
Generate a single narration text for the entire video with kid-safe phrasing.`;
    const response = await safeGoogleAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], 800);
    return response || fallback;
  } catch (error) {
    return fallback;
  }
};

const getResolution = (videoSize) => {
  if (isLowMemoryMode) {
    switch (videoSize) {
      case 'shorts':
        return { width: 540, height: 960 };
      case 'whatsapp':
        return { width: 720, height: 720 };
      default:
        return { width: 854, height: 480 };
    }
  }

  switch (videoSize) {
    case 'shorts':
      return { width: 720, height: 1280 };
    case 'whatsapp':
      return { width: 1080, height: 1080 };
    default:
      return { width: 1280, height: 720 };
  }
};

const fetchPollinationsImage = async ({ prompt = '', model = '', width = 1280, height = 720, timeoutMs = 20000 }) => {
  if (!aiProviderEnabled) {
    return null;
  }
  const cleanPrompt = sanitizeText(prompt).slice(0, 1400);
  if (!cleanPrompt) {
    return null;
  }
  const encodedPrompt = encodeURIComponent(cleanPrompt);
  const query = new URLSearchParams({
    width: String(Math.max(320, Number(width) || 1280)),
    height: String(Math.max(320, Number(height) || 720)),
    model: sanitizeText(model || freeImageModel || 'flux'),
    nologo: 'true',
    private: 'true',
    safe: 'true',
  });
  if (pollinationsApiKey) {
    query.set('key', pollinationsApiKey);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(2000, Number(timeoutMs) || 20000));
  try {
    const url = `${pollinationsApiBaseUrl}/image/${encodedPrompt}?${query.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    const contentType = sanitizeText(response.headers.get('content-type') || '');
    if (!contentType.startsWith('image/')) {
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.length ? buffer : null;
  } catch (_error) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const fetchHuggingFaceImage = async ({ prompt = '', model = '', width = 1280, height = 720, timeoutMs = 35000 }) => {
  if (!aiProviderEnabled) {
    return null;
  }
  const cleanPrompt = sanitizeText(prompt).slice(0, 1800);
  if (!cleanPrompt) {
    return null;
  }
  const selectedModel = sanitizeText(model || huggingFaceImageModel || 'black-forest-labs/FLUX.1-dev').replace(/\s+/g, '');
  if (!selectedModel) {
    return null;
  }
  const headers = {
    'content-type': 'application/json',
    accept: 'image/*',
  };
  if (huggingFaceApiKey) {
    headers.authorization = `Bearer ${huggingFaceApiKey}`;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(3000, Number(timeoutMs) || 35000));
  try {
    const response = await fetch(`${huggingFaceApiBaseUrl}/${selectedModel}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        inputs: cleanPrompt,
        parameters: {
          width: Math.max(320, Number(width) || 1280),
          height: Math.max(320, Number(height) || 720),
        },
        options: {
          wait_for_model: true,
          use_cache: false,
        },
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    const contentType = sanitizeText(response.headers.get('content-type') || '');
    if (!contentType.startsWith('image/')) {
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.length ? buffer : null;
  } catch (_error) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const fetchFreeAiImage = async ({
  project = null,
  provider = '',
  prompt = '',
  model = '',
  width = 1280,
  height = 720,
  timeoutMs = 20000,
}) => {
  const resolvedProvider = normalizeAiProvider(provider || resolveProjectAiProvider(project));
  if (resolvedProvider === 'huggingface') {
    return fetchHuggingFaceImage({ prompt, model, width, height, timeoutMs });
  }
  return fetchPollinationsImage({ prompt, model, width, height, timeoutMs });
};

const diagnoseImageGeneration = async (options = {}) => {
  const samplePrompt = sanitizeText(
    options.prompt
    || 'A cheerful 2D cartoon rabbit and tortoise in a colorful park, child-safe, no text, no logos.'
  );
  const modelAttempts = [];
  const project = options?.project || null;
  const provider = resolveProjectAiProvider(project);
  const providers = getImageProviderOrder(project);
  const configuredModel = provider === 'huggingface' ? huggingFaceImageModel : freeImageModel;
  const candidateModels = providers.flatMap((entry) =>
    (entry === 'huggingface' ? huggingFaceImageModelCandidates : freeImageModelCandidates).map((model) => `${entry}:${model}`)
  );

  if (!aiProviderEnabled) {
    return {
      ok: false,
      reason: 'Free AI provider disabled.',
      provider,
      aiProviderEnabled,
      useRealCartoonImages,
      configuredImageModel: configuredModel,
      candidateModels,
      modelAttempts,
    };
  }

  for (const activeProvider of providers) {
    const activeModels = activeProvider === 'huggingface'
      ? huggingFaceImageModelCandidates
      : freeImageModelCandidates;

    for (const model of activeModels) {
      try {
        const imageBuffer = await fetchFreeAiImage({
          project,
          provider: activeProvider,
          prompt: samplePrompt,
          model,
          width: 960,
          height: 540,
          timeoutMs: 15000,
        });
        const hasImage = Boolean(imageBuffer?.length);
        modelAttempts.push({
          provider: activeProvider,
          model,
          success: hasImage,
          bytes: hasImage ? imageBuffer.length : 0,
        });
        if (hasImage) {
          return {
            ok: true,
            provider,
            aiProviderEnabled,
            useRealCartoonImages,
            configuredImageModel: configuredModel,
            workingProvider: activeProvider,
            workingModel: model,
            candidateModels,
            modelAttempts,
          };
        }
      } catch (error) {
        modelAttempts.push({
          provider: activeProvider,
          model,
          success: false,
          error: sanitizeText(error?.message || 'unknown error'),
        });
      }
    }
  }

  return {
    ok: false,
    reason: 'No image output returned by any candidate free image model.',
    provider,
    aiProviderEnabled,
    useRealCartoonImages,
    configuredImageModel: configuredModel,
    candidateModels,
    modelAttempts,
  };
};

const safeFileName = (value) => value.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
const parseList = (value) => String(value || '')
  .split(',')
  .map((entry) => sanitizeText(entry))
  .filter(Boolean);

const normalizeSceneForCinematicPipeline = (scene = {}, index = 0) => ({
  ...scene,
  characterPose: sanitizeText(scene?.characterPose || (index === 0 ? 'introduce-characters' : 'action-pose')),
  mouthMovement: sanitizeText(scene?.mouthMovement || 'auto'),
  sceneLighting: sanitizeText(scene?.sceneLighting || 'soft-cinematic'),
  animationStyle: sanitizeText(scene?.animationStyle || '2d-cartoon'),
  backgroundMusicMood: sanitizeText(scene?.backgroundMusicMood || 'warm-adventure'),
  soundEffects: Array.isArray(scene?.soundEffects)
    ? scene.soundEffects.map((entry) => sanitizeText(entry)).filter(Boolean)
    : parseList(scene?.soundEffects || ''),
  cameraMotion: sanitizeText(scene?.cameraMotion || 'slow-zoom'),
  transitionType: sanitizeText(scene?.transitionType || 'cross-dissolve'),
  shotType: sanitizeText(scene?.shotType || 'medium'),
});

const colorFromText = (value = '') => {
  let hash = 0;
  const text = String(value || 'character');
  for (let index = 0; index < text.length; index += 1) {
    hash = text.charCodeAt(index) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 68%, 78%)`;
};

const normalizeSceneCharacterList = (scene, project) => {
  const sceneCharacters = Array.isArray(scene?.characters) && scene.characters.length
    ? scene.characters
    : (project?.characters || []).map((char) => ({ name: char.name, role: char.role }));

  return sceneCharacters
    .map((char, index) => ({
      name: sanitizeText(char?.name || `Character ${index + 1}`),
      role: sanitizeText(char?.role || 'Story role'),
    }))
    .slice(0, 3);
};

const buildRealCartoonPrompt = (scene, project) => {
  const customPrompt = sanitizeText(scene?.visualPrompt || '');
  if (customPrompt) {
    return customPrompt;
  }

  const title = sanitizeText(scene?.title || 'Story scene');
  const description = sanitizeText(scene?.description || 'A family-friendly story moment.');
  const mood = sanitizeText(scene?.emotion || 'wonder');
  const artStyle = sanitizeText(project?.style || 'cartoon');
  const sceneCharacters = normalizeSceneCharacterList(scene, project);
  const characterDetails = sceneCharacters
    .map((char) => {
      const full = (project?.characters || []).find(
        (item) => sanitizeText(item?.name).toLowerCase() === sanitizeText(char.name).toLowerCase()
      );
      const appearance = sanitizeText(full?.appearance || `${char.name} as a cute cartoon character`);
      return `${char.name} (${char.role}) - ${appearance}`;
    })
    .join('; ');

  return [
    'Create a single-frame 2D kids cartoon illustration for a video scene.',
    `Scene title: ${title}.`,
    `Description: ${description}.`,
    `Mood: ${mood}.`,
    `Art style: ${artStyle}, colorful, child-safe, friendly expressions, clean outlines.`,
    `Characters: ${characterDetails || 'Main hero and supportive friend.'}`,
    'No text, no subtitles, no watermarks, no logos.',
    'Cinematic composition, high readability for children, warm lighting.',
  ].join(' ');
};

const buildCompactRealCartoonPrompt = (scene, project) => {
  const sceneCharacters = normalizeSceneCharacterList(scene, project);
  const names = sceneCharacters.map((char) => sanitizeText(char.name)).filter(Boolean).join(', ');
  return [
    '2D kids cartoon frame',
    `title ${sanitizeText(scene?.title || 'story scene')}`,
    `mood ${sanitizeText(scene?.emotion || 'wonder')}`,
    `scene ${sanitizeText(scene?.description || '')}`,
    `characters ${names || 'hero and friend'}`,
    'colorful child-safe cinematic no text no logo',
  ].join('. ').slice(0, 420);
};

const getImageProviderOrder = (project) => {
  const preferred = resolveProjectAiProvider(project);
  if (!imageProviderFallbackEnabled) {
    return [preferred];
  }
  return preferred === 'huggingface'
    ? ['huggingface', 'pollinations']
    : ['pollinations', 'huggingface'];
};

const generateRealCartoonSceneImage = async (scene, project, imagePath, resolution) => {
  if (!aiProviderEnabled || !useRealCartoonImages) {
    imageGenerationErrorsByPath.set(
      imagePath,
      `provider_disabled: aiProviderEnabled=${aiProviderEnabled} useRealCartoonImages=${useRealCartoonImages}`
    );
    return false;
  }

  const providers = getImageProviderOrder(project);
  const primaryPrompt = buildRealCartoonPrompt(scene, project);
  const compactPrompt = buildCompactRealCartoonPrompt(scene, project);
  const promptVariants = Array.from(
    new Set([primaryPrompt, compactPrompt].map((entry) => sanitizeText(entry)).filter(Boolean))
  );
  const errors = [];
  for (const provider of providers) {
    const candidateModels = provider === 'huggingface'
      ? huggingFaceImageModelCandidates
      : freeImageModelCandidates;

    for (const model of candidateModels) {
      for (let promptIndex = 0; promptIndex < promptVariants.length; promptIndex += 1) {
        const prompt = promptVariants[promptIndex];
        const timeoutMs = provider === 'huggingface' ? 35000 : 22000;
        try {
          const imageBuffer = await fetchFreeAiImage({
            project,
            provider,
            prompt,
            model,
            width: resolution.width,
            height: resolution.height,
            timeoutMs,
          });
          if (!imageBuffer?.length) {
            errors.push(`${provider}/${model}/p${promptIndex + 1}: no image bytes`);
            continue;
          }
          await sharp(imageBuffer)
            .resize(resolution.width, resolution.height, {
              fit: 'cover',
            })
            .png({
              compressionLevel: isLowMemoryMode ? 9 : 6,
              palette: Boolean(isLowMemoryMode),
            })
            .toFile(imagePath);
          imageGenerationErrorsByPath.delete(imagePath);
          return true;
        } catch (error) {
          errors.push(`${provider}/${model}/p${promptIndex + 1}: ${sanitizeText(error?.message || 'unknown error')}`);
        }
      }
    }
  }

  const errorSummary = errors.join(' | ');
  imageGenerationErrorsByPath.set(imagePath, errorSummary);
  logger.warn(
    `Video studio image generation failed for scene "${sanitizeText(scene?.title || scene?.id || 'unknown')}" (providers=${providers.join(',')}). Attempts: ${errorSummary}`
  );
  return false;
};

const buildSceneSvg = (scene, project, width, height) => {
  const background = scene.emotion === 'joyful' ? '#FFF0F7' : scene.emotion === 'brave' ? '#E5F8FF' : '#F7F3FF';
  const title = sanitizeText(scene.title || `Scene ${scene.id}`);
  const description = sanitizeText(scene.description || '');
  const dialogue = sanitizeText(scene.dialogue || '');
  const characters = normalizeSceneCharacterList(scene, project);
  const titleEscaped = escapeXml(title);
  const descriptionLines = wrapText(description, 46, 4);
  const dialogueLines = wrapText(dialogue, 40, 3);
  const characterText = characters.map((char) => `${char.name} (${char.role})`).join(', ') || 'Friendly characters';
  const characterEscaped = escapeXml(characterText);
  const artStyle = escapeXml(`${sanitizeText(project?.style || 'cartoon')} style`);

  const characterCards = characters.map((char, index) => {
    const cardWidth = Math.min(320, Math.floor((width - 120) / Math.max(1, characters.length)) - 16);
    const cardHeight = 120;
    const cardX = 60 + index * (cardWidth + 16);
    const cardY = height - 180;
    const avatarColor = colorFromText(char.name);
    const initial = escapeXml((char.name[0] || 'C').toUpperCase());
    return `
  <g>
    <rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="18" fill="rgba(255,255,255,0.95)" stroke="#dbeafe" stroke-width="2" />
    <circle cx="${cardX + 44}" cy="${cardY + 60}" r="30" fill="${avatarColor}" />
    <text x="${cardX + 44}" y="${cardY + 70}" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#1f2937">${initial}</text>
    <text x="${cardX + 84}" y="${cardY + 52}" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#1f2937">${escapeXml(char.name)}</text>
    <text x="${cardX + 84}" y="${cardY + 82}" font-family="Arial, sans-serif" font-size="16" fill="#475569">${escapeXml(char.role)}</text>
  </g>`;
  }).join('\n');

  const descriptionSvgLines = descriptionLines
    .map((line, index) => `<text x="74" y="${248 + index * 34}" font-family="Arial, sans-serif" font-size="28" fill="#334155">${escapeXml(line)}</text>`)
    .join('\n');
  const dialogueSvgLines = dialogueLines
    .map((line, index) => `<text x="${width - 430}" y="${228 + index * 30}" font-family="Arial, sans-serif" font-size="20" fill="#0f172a">${escapeXml(line)}</text>`)
    .join('\n');

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${background}" />
      <stop offset="100%" stop-color="#ffffff" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#g)" rx="40" />
  <rect x="30" y="${height - 280}" width="${width - 60}" height="260" fill="rgba(255,255,255,0.48)" />
  <rect x="40" y="40" width="${width - 80}" height="${height - 240}" fill="rgba(255,255,255,0.95)" rx="32" />
  <text x="70" y="110" font-family="Arial, sans-serif" font-size="48" font-weight="700" fill="#1f3a8a">${titleEscaped}</text>
  <text x="70" y="156" font-family="Arial, sans-serif" font-size="20" fill="#334155">${characterEscaped}</text>
  <text x="70" y="188" font-family="Arial, sans-serif" font-size="17" fill="#64748b">${artStyle}</text>
  ${descriptionSvgLines}
  <rect x="${width - 450}" y="170" width="380" height="130" rx="18" fill="rgba(224,242,254,0.88)" stroke="#7dd3fc" stroke-width="2" />
  <text x="${width - 430}" y="198" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#0369a1">Dialogue</text>
  ${dialogueSvgLines}
  ${characterCards}
  <circle cx="${width - 100}" cy="100" r="54" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2" />
  <text x="${width - 100}" y="96" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#475569">Mood</text>
  <text x="${width - 100}" y="118" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#1e293b">${escapeXml(sanitizeText(scene.emotion || 'wonder'))}</text>
</svg>`;
};

const createSceneImages = async (project, directory) => {
  const resolution = getResolution(project.videoSize);
  const sceneFiles = [];
  let totalDuration = 0;

  for (const scene of project.scenes) {
    const imagePath = path.join(directory, `scene-${scene.id}.png`);
    const generatedByAi = await generateRealCartoonSceneImage(scene, project, imagePath, resolution);
    if (!generatedByAi) {
      const svg = buildSceneSvg(scene, project, resolution.width, resolution.height);
      const pngOptions = isLowMemoryMode
        ? { compressionLevel: 9, palette: true, effort: 4 }
        : {};
      await sharp(Buffer.from(svg)).png(pngOptions).toFile(imagePath);
    }
    const sceneDuration = Math.max(2, Math.min(15, Number(scene.durationSeconds) || 4));
    totalDuration += sceneDuration;
    sceneFiles.push({ path: imagePath, duration: sceneDuration });
  }

  return {
    sceneFiles,
    totalDurationSeconds: totalDuration,
  };
};

const buildSubtitleFile = async (project, directory) => {
  const srtPath = path.join(directory, 'story-subtitles.srt');
  const normalizedSubtitles = Array.isArray(project?.subtitles) && project.subtitles.length
    ? project.subtitles
    : buildSubtitlesFromScenes(project?.scenes || []);

  const lines = normalizedSubtitles.map((subtitle, index) => {
    const start = new Date(subtitle.start * 1000).toISOString().substr(11, 12).replace('.', ',');
    const end = new Date(subtitle.end * 1000).toISOString().substr(11, 12).replace('.', ',');
    return `${index + 1}\n${start} --> ${end}\n${sanitizeText(subtitle.text)}\n`;
  });
  await writeFile(srtPath, lines.join('\n'), 'utf-8');
  return srtPath;
};

const resolveNarrationVoice = (voiceCandidate = '') => {
  const normalized = sanitizeText(voiceCandidate).toLowerCase();
  const map = {
    'kid-female': 'en-IN-Standard-A',
    'kid-male': 'en-IN-Standard-B',
    'female-soft': 'en-IN-Standard-A',
    'female-warm': 'en-US-Standard-E',
    'male-calm': 'en-US-Standard-I',
    'warm-male': 'en-US-Standard-D',
    'soft-female': 'en-US-Standard-F',
    nova: 'en-IN-Standard-A',
    shimmer: 'en-US-Standard-E',
    alloy: 'en-US-Standard-D',
    echo: 'en-IN-Standard-B',
    fable: 'en-US-Standard-I',
    onyx: 'en-US-Standard-J',
  };

  if (map[normalized]) {
    return map[normalized];
  }
  if (/^[a-z]{2}-[A-Z]{2}-(Standard|Neural2|Wavenet)-[A-Z0-9]+$/.test(voiceCandidate)) {
    return voiceCandidate;
  }
  if (/male|deep|baritone|boy|prince|father/.test(normalized)) {
    return 'en-US-Standard-I';
  }
  if (/female|girl|mother|princess|soft|gentle/.test(normalized)) {
    return 'en-US-Standard-F';
  }
  return 'en-IN-Standard-A';
};

const voiceCatalog = [
  'en-IN-Standard-A',
  'en-IN-Standard-B',
  'en-IN-Standard-C',
  'en-IN-Standard-D',
  'en-US-Standard-D',
  'en-US-Standard-E',
  'en-US-Standard-F',
  'en-US-Standard-I',
  'en-US-Standard-J',
];

const normalizeTtsAudioBuffer = (response) => {
  const content = response?.audioContent;
  if (!content) return null;
  if (Buffer.isBuffer(content)) return content;
  if (typeof content === 'string') return Buffer.from(content, 'base64');
  if (content instanceof Uint8Array) return Buffer.from(content);
  return null;
};

const ttsProviderByOutputPath = new Map();
const imageGenerationErrorsByPath = new Map();
const imageProviderFallbackEnabled = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.VIDEO_STUDIO_ALLOW_PROVIDER_FALLBACK || '1').toLowerCase()
);

const windowsTtsEnabled = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.VIDEO_STUDIO_ENABLE_WINDOWS_TTS || '1').toLowerCase()
);

const resolveWindowsVoiceName = (voiceCandidate = '') => {
  const normalized = sanitizeText(voiceCandidate).toLowerCase();
  if (/male|david|mark|guy|onyx|echo|alloy/.test(normalized)) {
    return 'Microsoft David Desktop';
  }
  return 'Microsoft Zira Desktop';
};

const runPowerShellScript = async (scriptContent, cwd) => {
  const encodedScript = Buffer.from(String(scriptContent || ''), 'utf16le').toString('base64');
  return new Promise((resolve, reject) => {
    const command = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encodedScript], {
      cwd,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    command.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    command.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`PowerShell TTS failed with code ${code}: ${stderr}`));
      }
      resolve();
    });
  });
};

const getPythonCommandCandidates = () => {
  const preferred = sanitizeText(process.env.PYTHON_BIN || process.env.PYTHON_PATH || '');
  return Array.from(
    new Set(
      [preferred, 'python3', 'python', 'py']
        .map((candidate) => sanitizeText(candidate))
        .filter(Boolean)
    )
  );
};

const runSceneTtsPythonFallback = async ({ text, voiceCandidate, outputPath }) => {
  const content = sanitizeText(text).slice(0, 4096);
  if (!content) return null;

  const voiceName = resolveNarrationVoice(voiceCandidate);
  const languageCode = sanitizeText(voiceName).split('-')[0].toLowerCase() || 'en';
  const scriptPath = path.join(__dirname, '..', 'scripts', 'scene_tts.py');
  if (!fs.existsSync(scriptPath)) {
    return null;
  }

  const candidates = getPythonCommandCandidates();
  let lastErrorMessage = '';
  for (const command of candidates) {
    try {
      await new Promise((resolve, reject) => {
        const proc = spawn(command, [
          scriptPath,
          '--text', content,
          '--output', outputPath,
          '--lang', languageCode,
        ], {
          cwd: path.join(__dirname, '..'),
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        let stderr = '';
        proc.stderr.on('data', (chunk) => {
          stderr += String(chunk || '');
          if (stderr.length > 120000) {
            stderr = stderr.slice(-120000);
          }
        });

        proc.on('error', (error) => reject(error));
        proc.on('close', (code) => {
          if (code !== 0) {
            return reject(new Error(sanitizeText(stderr) || `scene_tts.py exited with code ${code}`));
          }
          return resolve();
        });
      });

      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        return outputPath;
      }
    } catch (error) {
      lastErrorMessage = sanitizeText(error?.message || '');
    }
  }

  if (lastErrorMessage) {
    logger.warn(`Python scene_tts fallback failed: ${lastErrorMessage}`);
  }
  return null;
};

const synthesizeSpeechWithWindowsTts = async ({ text, voiceCandidate, outputPath }) => {
  if (process.platform !== 'win32' || !windowsTtsEnabled) {
    return null;
  }

  const content = sanitizeText(text).slice(0, 4096);
  if (!content) {
    return null;
  }

  const outputDir = path.dirname(outputPath);
  const outputBase = path.basename(outputPath, path.extname(outputPath));
  const wavePath = path.join(outputDir, `${outputBase}-windows-tts.wav`);
  const voiceName = resolveWindowsVoiceName(voiceCandidate);
  const script = [
    "$ErrorActionPreference = 'Stop'",
    'Add-Type -AssemblyName System.Speech',
    '$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer',
    'try {',
    `  $voiceName = '${String(voiceName).replace(/'/g, "''")}'`,
    '  if ($voiceName) {',
    '    try { $synth.SelectVoice($voiceName) } catch {}',
    '  }',
    '  $synth.Rate = 0',
    '  $synth.Volume = 100',
    `  $synth.SetOutputToWaveFile('${wavePath.replace(/'/g, "''")}')`,
    `  $synth.Speak('${content.replace(/'/g, "''")}')`,
    '} finally {',
    '  $synth.Dispose()',
    '}',
  ].join('\n');

  try {
    await runPowerShellScript(script, outputDir);
    if (!fs.existsSync(wavePath)) {
      return null;
    }
    await runFfmpeg([
      '-y',
      '-i', wavePath,
      '-c:a', 'libmp3lame',
      '-b:a', '128k',
      outputPath,
    ], outputDir);
    try {
      fs.unlinkSync(wavePath);
    } catch (_error) {
      // Ignore cleanup failures for temporary speech files.
    }
    return outputPath;
  } catch (_error) {
    return null;
  }
};

const synthesizeSpeechToFile = async ({ text, voiceCandidate, outputPath }) => {
  const content = sanitizeText(text).slice(0, 4096);
  if (!content) {
    return null;
  }

  const voiceName = resolveNarrationVoice(voiceCandidate);
  if (googleTtsClient) {
    try {
      const inferredLanguageCode = sanitizeText(voiceName.split('-').slice(0, 2).join('-') || 'en-US');
      const ssmlGender = /-([A-FH])$/i.test(voiceName) ? 'FEMALE' : 'MALE';
      const [response] = await googleTtsClient.synthesizeSpeech({
        input: { text: content },
        voice: {
          languageCode: inferredLanguageCode || 'en-US',
          name: voiceName,
          ssmlGender,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.0,
          pitch: 0.0,
          volumeGainDb: 2.0,
          sampleRateHertz: 24000,
        },
      });
      const audioBuffer = normalizeTtsAudioBuffer(response);
      if (audioBuffer?.length) {
        await writeFile(outputPath, audioBuffer);
        ttsProviderByOutputPath.set(outputPath, 'google-cloud-tts');
        return outputPath;
      }
    } catch (_error) {
      // Fall back to Windows voice synthesis if Google Cloud TTS is unavailable.
    }
  }

  const windowsSpeechPath = await synthesizeSpeechWithWindowsTts({
    text: content,
    voiceCandidate,
    outputPath,
  });
  if (windowsSpeechPath) {
    ttsProviderByOutputPath.set(outputPath, 'windows-offline-tts');
    return windowsSpeechPath;
  }

  const pythonSpeechPath = await runSceneTtsPythonFallback({
    text: content,
    voiceCandidate,
    outputPath,
  });
  if (pythonSpeechPath) {
    ttsProviderByOutputPath.set(outputPath, 'python-scene-tts');
    return pythonSpeechPath;
  }

  return null;
};

const findCharacterBySpeakerName = (project, speakerName) => {
  const normalized = sanitizeText(speakerName).toLowerCase();
  if (!normalized) return null;
  return (project?.characters || []).find((char) => sanitizeText(char?.name).toLowerCase() === normalized) || null;
};

const resolveSpeakerVoice = (project, speakerName) => {
  const normalizedSpeaker = sanitizeText(speakerName).toLowerCase();
  const voicePlanVoices = Array.isArray(project?.voicePlan?.characterVoices) ? project.voicePlan.characterVoices : [];
  const characterMatch = findCharacterBySpeakerName(project, speakerName);

  const fromPlan = voicePlanVoices.find((voice) =>
    sanitizeText(voice?.name).toLowerCase() === normalizedSpeaker
    || (characterMatch && sanitizeText(voice?.characterId).toLowerCase() === sanitizeText(characterMatch?.id).toLowerCase())
  );

  const candidate = sanitizeText(
    fromPlan?.voice
    || characterMatch?.voiceProfile
    || project?.voicePlan?.narrator?.voice
    || project?.voiceType
    || 'kid-female'
  );

  const mapped = resolveNarrationVoice(candidate);
  return voiceCatalog.includes(mapped) ? mapped : 'en-IN-Standard-A';
};

const extractSceneDialogueTurns = (scene, project) => {
  const spokenLineEntries = Array.isArray(scene?.spokenLines) ? scene.spokenLines : [];
  if (spokenLineEntries.length) {
    const normalizedTurns = spokenLineEntries
      .map((entry, index) => {
        if (typeof entry === 'string') {
          const text = sanitizeText(entry);
          if (!text) return null;
          return {
            speaker: index === 0 ? 'Narrator' : `Character ${index + 1}`,
            text,
          };
        }

        const speaker = sanitizeText(entry?.speaker || entry?.character || 'Narrator');
        const text = sanitizeText(entry?.text || entry?.line || entry?.dialogue || '');
        if (!text) {
          return null;
        }
        return {
          speaker: speaker || 'Narrator',
          text,
        };
      })
      .filter(Boolean)
      .slice(0, 8);

    if (normalizedTurns.length) {
      return normalizedTurns.map((turn) => ({
        speaker: sanitizeText(turn.speaker || 'Narrator').slice(0, 40),
        text: sanitizeText(turn.text).slice(0, 240),
      }));
    }
  }

  const rawDialogue = sanitizeText(scene?.dialogue || '');
  const fallbackText = sanitizeText(scene?.description || '');
  const sceneCharacters = normalizeSceneCharacterList(scene, project);
  const characterNames = sceneCharacters.map((char) => char.name);
  const turns = [];

  if (rawDialogue.includes(':')) {
    const lines = rawDialogue
      .split(/\n+/)
      .map((line) => sanitizeText(line))
      .filter(Boolean);

    lines.forEach((line) => {
      const match = line.match(/^([^:]{1,40}):\s*(.+)$/);
      if (match) {
        turns.push({ speaker: sanitizeText(match[1]), text: sanitizeText(match[2]) });
      } else if (line) {
        turns.push({ speaker: characterNames[0] || 'Narrator', text: line });
      }
    });
  } else if (rawDialogue) {
    const sentences = rawDialogue
      .split(/(?<=[.!?])\s+/)
      .map((line) => sanitizeText(line))
      .filter(Boolean)
      .slice(0, 3);
    sentences.forEach((line, index) => {
      turns.push({
        speaker: characterNames[index % Math.max(1, characterNames.length)] || 'Narrator',
        text: line,
      });
    });
  }

  if (!turns.length && fallbackText) {
    turns.push({
      speaker: 'Narrator',
      text: fallbackText,
    });
  }

  return turns
    .map((turn) => ({
      speaker: sanitizeText(turn.speaker || 'Narrator').slice(0, 40),
      text: sanitizeText(turn.text).slice(0, 240),
    }))
    .filter((turn) => turn.text);
};

const buildCharacterDialogueAudio = async (project, outputDir, totalDurationSeconds) => {
  if (!Array.isArray(project?.scenes) || !project.scenes.length) {
    return null;
  }

  const speechSegments = [];
  let segmentIndex = 0;
  const maxSegments = 32;

  for (const scene of project.scenes) {
    const turns = extractSceneDialogueTurns(scene, project);
    for (const turn of turns) {
      if (speechSegments.length >= maxSegments) {
        break;
      }

      const voice = resolveSpeakerVoice(project, turn.speaker);
      const segmentPath = path.join(outputDir, `dialogue-segment-${segmentIndex + 1}.mp3`);
      const generatedPath = await synthesizeSpeechToFile({
        text: turn.text,
        voiceCandidate: voice,
        outputPath: segmentPath,
      });

      if (generatedPath) {
        speechSegments.push(generatedPath);
      }
      segmentIndex += 1;
    }
    if (speechSegments.length >= maxSegments) {
      break;
    }
  }

  if (!speechSegments.length) {
    return null;
  }

  const concatListPath = path.join(outputDir, 'dialogue-track-list.txt');
  const concatList = speechSegments.map((segmentPath) => `file '${segmentPath.replace(/\\/g, '/')}'`).join('\n');
  await writeFile(concatListPath, `${concatList}\n`, 'utf-8');

  const mergedTrackPath = path.join(outputDir, 'dialogue-track-raw.mp3');
  await runFfmpeg([
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatListPath,
    '-c:a', 'libmp3lame',
    '-b:a', '128k',
    mergedTrackPath,
  ], outputDir);

  const paddedTrackPath = path.join(outputDir, 'dialogue-track.mp3');
  const targetDuration = Math.max(2, Number(totalDurationSeconds) || 10);
  await runFfmpeg([
    '-y',
    '-i', mergedTrackPath,
    '-af', 'apad',
    '-t', `${targetDuration}`,
    '-c:a', 'libmp3lame',
    '-b:a', '128k',
    paddedTrackPath,
  ], outputDir);

  return paddedTrackPath;
};

const buildNarrationAudio = async (project, outputDir) => {
  const narrationText = sanitizeText(
    project?.voicePlan?.narrator?.text
    || project?.narration
    || project?.script?.narration
    || ''
  );

  if (!narrationText) {
    return null;
  }
  return synthesizeSpeechToFile({
    text: narrationText,
    voiceCandidate: project?.voicePlan?.narrator?.voice || project?.voiceType,
    outputPath: path.join(outputDir, 'narration.mp3'),
  });
};

const runFfmpeg = async (args, cwd) => {
  const resolvedFfmpegPath = String(process.env.FFMPEG_PATH || ffmpegPath || 'ffmpeg').trim();
  if (!resolvedFfmpegPath) {
    throw new Error('FFmpeg binary is not available. Set FFMPEG_PATH or install ffmpeg in the runtime image.');
  }

  return new Promise((resolve, reject) => {
    const ffmpegArgs = ['-hide_banner', '-loglevel', 'error', '-nostdin', ...args];
    const ffmpeg = spawn(resolvedFfmpegPath, ffmpegArgs, { cwd, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    const stderrLimit = 200000;
    let spawnError = '';

    ffmpeg.stderr.on('data', (chunk) => {
      if (stderr.length >= stderrLimit) {
        return;
      }
      const next = chunk.toString();
      stderr = `${stderr}${next}`.slice(-stderrLimit);
    });

    ffmpeg.on('error', (error) => {
      spawnError = sanitizeText(error?.message || 'failed to spawn ffmpeg');
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        const errorDetails = spawnError || stderr || `exit code ${code}`;
        return reject(new Error(
          `FFmpeg failed with code ${code}: ${errorDetails}. Install ffmpeg (apt-get install -y ffmpeg) or set FFMPEG_PATH.`
        ));
      }
      resolve();
    });
  });
};

const normalizeScenesForCartoonRenderer = (project = {}) => {
  const rawScenes = Array.isArray(project?.scenes) ? project.scenes : [];
  return rawScenes
    .slice(0, 12)
    .map((scene, index) => {
      const sceneCharacters = normalizeSceneCharacterList(scene, project);
      const lines = extractSceneDialogueTurns(scene, project);
      const fallbackLine = sanitizeText(scene?.description || scene?.title || 'The story continues.');
      return {
        id: Number(scene?.id || index + 1),
        title: sanitizeText(scene?.title || `Scene ${index + 1}`),
        description: sanitizeText(scene?.description || ''),
        emotion: sanitizeText(scene?.emotion || 'happy'),
        duration: Math.max(4, Math.min(12, Number(scene?.durationSeconds) || 6)),
        characters: sceneCharacters.length ? sceneCharacters : [{ name: 'Hero', role: 'Main Character' }, { name: 'Friend', role: 'Guide' }],
        lines: lines.length
          ? lines
          : [{ speaker: sceneCharacters[0]?.name || 'Narrator', text: fallbackLine }],
      };
    });
};

const buildDeterministicSeed = (...parts) => {
  const combined = parts
    .map((part) => sanitizeText(part))
    .filter(Boolean)
    .join('|');
  if (!combined) return 1;

  let hash = 2166136261;
  for (let index = 0; index < combined.length; index += 1) {
    hash ^= combined.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) || 1;
};

const pickPaletteColor = (palette = [], seed = 1, fallback = '0x9ee7ff') => {
  if (!Array.isArray(palette) || !palette.length) return fallback;
  const index = Math.abs(Number(seed) || 0) % palette.length;
  return palette[index] || fallback;
};

const buildCartoonSceneFilter = (scene, resolution) => {
  const width = Number(resolution?.width || 1280);
  const height = Number(resolution?.height || 720);
  const characterText = Array.isArray(scene?.characters)
    ? scene.characters.map((char) => `${sanitizeText(char?.name)} ${sanitizeText(char?.role)}`).join(' ')
    : '';
  const sceneText = [scene?.title, scene?.description, characterText, scene?.lines?.map((line) => line?.text).join(' ')]
    .map((value) => sanitizeText(value))
    .join(' ')
    .toLowerCase();
  const hasRabbit = /(rabbit|hare|bunny)/i.test(sceneText);
  const hasTortoise = /(tortoise|turtle)/i.test(sceneText);
  const hasRama = /\bram(a)?\b/i.test(sceneText);
  const hasSita = /\bsita\b/i.test(sceneText);
  const hasDoctor = /\b(doctor|dr\.)\b/i.test(sceneText);
  const hasFarmer = /\bfarmer\b/i.test(sceneText);
  const hasLawyer = /\b(lawyer|advocate)\b/i.test(sceneText);
  const sceneSeed = buildDeterministicSeed(scene?.title, scene?.description, scene?.emotion, scene?.lines?.map((line) => line?.text).join(' '));
  const skyPalette = scene.emotion === 'joyful'
    ? ['0xfff1a9', '0xffe8b8', '0xffefc7', '0xfbe6a2']
    : scene.emotion === 'brave'
      ? ['0xbce5ff', '0xb8ddff', '0xcde8ff', '0xadd7f7']
      : ['0x9ee7ff', '0xa9ebf8', '0xb6ebff', '0x95ddf2'];
  const groundPalette = scene.emotion === 'joyful'
    ? ['0x7dd95f', '0x85d86e', '0x74cf58']
    : ['0x8fd36a', '0x84c761', '0x97da72'];
  const accentPalette = scene.emotion === 'brave'
    ? ['0xd8f5ff', '0xd0efff', '0xe0f8ff']
    : ['0xe8f6ff', '0xeef8e3', '0xf1fbef'];
  const skyColor = pickPaletteColor(skyPalette, sceneSeed, '0x9ee7ff');
  const groundColor = pickPaletteColor(groundPalette, sceneSeed >> 2, '0x8fd36a');
  const accentOne = pickPaletteColor(accentPalette, sceneSeed >> 4, '0xe8f6ff');
  const accentTwo = pickPaletteColor(accentPalette, sceneSeed >> 6, '0xeef8e3');
  const bubbleY = Math.max(0, height - 140 - (sceneSeed % 16));
  const bubbleWidth = Math.max(300, width - 240 - (sceneSeed % 120));
  const bubbleTailX = Math.max(180, Math.floor(width * (0.28 + ((sceneSeed % 35) / 100))));
  const characterTwoBodyX = Math.max(520, width - 500);
  const characterTwoHeadX = Math.max(490, width - 530);
  const characterTwoLeftEyeX = Math.max(532, width - 488);
  const characterTwoRightEyeX = Math.max(628, width - 392);
  const characterTwoMouthX = Math.max(560, width - 460);
  const characterOneOutfit = pickPaletteColor(['0xff8ab3', '0xf7a9ff', '0xff9f8a', '0xffb36d'], sceneSeed >> 1, '0xff8ab3');
  const characterTwoOutfit = pickPaletteColor(['0x6cc4ff', '0x73d8ff', '0x6eb8ff', '0x84c7ff'], sceneSeed >> 3, '0x6cc4ff');
  const phaseA = (sceneSeed % 17) / 10;
  const phaseB = (sceneSeed % 23) / 9;
  const motionA = (22 + (sceneSeed % 10)) / 10;
  const motionB = (23 + ((sceneSeed >> 2) % 12)) / 10;
  const blinkPeriodA = (95 + (sceneSeed % 35)) / 100;
  const blinkPeriodB = (102 + ((sceneSeed >> 1) % 30)) / 100;
  const rabbitEarColor = pickPaletteColor(['0xfff8f0', '0xfff0e8', '0xfff6ea'], sceneSeed >> 5, '0xfff8f0');
  const rabbitInnerEarColor = pickPaletteColor(['0xffc9d9', '0xffb9d0', '0xffd3df'], sceneSeed >> 7, '0xffc9d9');
  const tortoiseShellColor = pickPaletteColor(['0x6f9f44', '0x5f8f3d', '0x799b55'], sceneSeed >> 9, '0x6f9f44');
  const tortoiseShellPattern = pickPaletteColor(['0x4f7030', '0x45682a', '0x567a36'], sceneSeed >> 11, '0x4f7030');

  const rabbitEars = hasRabbit
    ? [
        `drawbox=x='252+18*sin(t*${motionA}+${phaseA})':y='132+6*sin(t*3+${phaseA})':w=38:h=78:color=${rabbitEarColor}@1:t=fill`,
        `drawbox=x='346+18*sin(t*${motionA}+${phaseA})':y='132+6*sin(t*3+${phaseA})':w=38:h=78:color=${rabbitEarColor}@1:t=fill`,
        `drawbox=x='262+18*sin(t*${motionA}+${phaseA})':y='146+6*sin(t*3+${phaseA})':w=18:h=54:color=${rabbitInnerEarColor}@1:t=fill`,
        `drawbox=x='356+18*sin(t*${motionA}+${phaseA})':y='146+6*sin(t*3+${phaseA})':w=18:h=54:color=${rabbitInnerEarColor}@1:t=fill`,
      ]
    : [];
  const tortoiseShell = hasTortoise
    ? [
        `drawbox=x='${characterTwoBodyX - 26}+16*sin(t*${motionB}+${phaseB})':y='336+8*sin(t*4.6+${phaseB})':w=204:h=132:color=${tortoiseShellColor}@0.95:t=fill`,
        `drawbox=x='${characterTwoBodyX + 12}+16*sin(t*${motionB}+${phaseB})':y='364+8*sin(t*4.6+${phaseB})':w=48:h=38:color=${tortoiseShellPattern}@0.9:t=fill`,
        `drawbox=x='${characterTwoBodyX + 78}+16*sin(t*${motionB}+${phaseB})':y='364+8*sin(t*4.6+${phaseB})':w=48:h=38:color=${tortoiseShellPattern}@0.9:t=fill`,
        `drawbox=x='${characterTwoBodyX + 44}+16*sin(t*${motionB}+${phaseB})':y='410+8*sin(t*4.6+${phaseB})':w=48:h=38:color=${tortoiseShellPattern}@0.9:t=fill`,
      ]
    : [];
  const ramaCrown = hasRama
    ? [
        `drawbox=x='272+18*sin(t*${motionA}+${phaseA})':y='168+6*sin(t*3+${phaseA})':w=108:h=24:color=0xe4b84f@1:t=fill`,
        `drawbox=x='300+18*sin(t*${motionA}+${phaseA})':y='144+6*sin(t*3+${phaseA})':w=52:h=26:color=0xf2cf66@1:t=fill`,
      ]
    : [];
  const sitaVeil = hasSita
    ? [
        `drawbox=x='${characterTwoHeadX - 6}+16*sin(t*${motionB}+${phaseB})':y='188+7*sin(t*4.6+${phaseB})':w=228:h=172:color=0xffb3c7@0.35:t=fill`,
        `drawbox=x='${characterTwoBodyX + 8}+16*sin(t*${motionB}+${phaseB})':y='320+9*sin(t*4.6+${phaseB})':w=166:h=188:color=0xff8fb3@0.78:t=fill`,
      ]
    : [];
  const doctorProps = hasDoctor
    ? [
        `drawbox=x='286+18*sin(t*${motionA}+${phaseA})':y='356+9*sin(t*4.6+${phaseA})':w=66:h=54:color=0xffffff@0.98:t=fill`,
        `drawbox=x='309+18*sin(t*${motionA}+${phaseA})':y='346+9*sin(t*4.6+${phaseA})':w=20:h=10:color=0xcfd8dc@1:t=fill`,
      ]
    : [];
  const farmerProps = hasFarmer
    ? [
        `drawbox=x='${characterTwoHeadX + 14}+16*sin(t*${motionB}+${phaseB})':y='182+7*sin(t*4.6+${phaseB})':w=176:h=22:color=0xc79b58@1:t=fill`,
        `drawbox=x='${characterTwoHeadX + 44}+16*sin(t*${motionB}+${phaseB})':y='156+7*sin(t*4.6+${phaseB})':w=116:h=30:color=0xd9b06f@1:t=fill`,
      ]
    : [];
  const lawyerProps = hasLawyer
    ? [
        `drawbox=x='${characterTwoBodyX + 12}+16*sin(t*${motionB}+${phaseB})':y='332+9*sin(t*4.6+${phaseB})':w=126:h=170:color=0x1e1e1e@0.94:t=fill`,
        `drawbox=x='${characterTwoBodyX + 60}+16*sin(t*${motionB}+${phaseB})':y='352+9*sin(t*4.6+${phaseB})':w=30:h=134:color=0xffffff@0.72:t=fill`,
      ]
    : [];

  return [
    `drawbox=x=0:y=0:w=${width}:h=${height}:color=${skyColor}@1:t=fill`,
    `drawbox=x=0:y=${Math.max(0, height - 220)}:w=${width}:h=220:color=${groundColor}@1:t=fill`,
    `drawbox=x=55:y=45:w=${Math.max(240, width - 110)}:h=110:color=white@0.68:t=fill`,
    `drawbox=x=70:y=62:w=${Math.max(80, width - 820)}:h=20:color=0x24508a@0.88:t=fill`,
    `drawbox=x=70:y=92:w=${Math.max(120, width - 680)}:h=14:color=0x24508a@0.6:t=fill`,
    `drawbox=x=${Math.max(100, width - 230)}:y=70:w=90:h=90:color=0xffdd55@1:t=fill`,
    `drawbox=x=120:y=125:w=160:h=35:color=white@0.85:t=fill`,
    `drawbox=x=${Math.max(300, width - 500)}:y=115:w=190:h=35:color=white@0.85:t=fill`,
    `drawbox=x=90:y=182:w=${Math.max(240, width - 590)}:h=22:color=0x31475e@0.3:t=fill`,
    `drawbox=x=90:y=214:w=${Math.max(180, width - 760)}:h=18:color=0x31475e@0.22:t=fill`,
    `drawbox=x='250+18*sin(t*${motionA}+${phaseA})':y='310+10*sin(t*5+${phaseA})':w=150:h=190:color=${characterOneOutfit}@1:t=fill`,
    `drawbox=x='220+18*sin(t*${motionA}+${phaseA})':y='195+8*sin(t*5+${phaseA})':w=210:h=150:color=0xffd2a6@1:t=fill`,
    `drawbox=x='262+18*sin(t*${motionA}+${phaseA})':y='245+if(lt(mod(t\\,${blinkPeriodA})\\,0.12)\\,8\\,0)':w=28:h=28:color=black@1:t=fill`,
    `drawbox=x='358+18*sin(t*${motionA}+${phaseA})':y='245+if(lt(mod(t\\,${blinkPeriodA})\\,0.12)\\,8\\,0)':w=28:h=28:color=black@1:t=fill`,
    `drawbox=x='290+18*sin(t*2.8)':y='300+6*sin(t*12)':w=72:h='12+18*abs(sin(t*10))':color=0x7a1c1c@1:t=fill`,
    `drawbox=x='250+18*sin(t*${motionA}+${phaseA})':y='515+6*sin(t*${motionA}+${phaseA})':w=150:h=34:color=0x17356b@0.85:t=fill`,
    `drawbox=x='${characterTwoBodyX}+16*sin(t*${motionB}+${phaseB})':y='320+9*sin(t*4.6+${phaseB})':w=150:h=180:color=${characterTwoOutfit}@1:t=fill`,
    `drawbox=x='${characterTwoHeadX}+16*sin(t*${motionB}+${phaseB})':y='205+7*sin(t*4.6+${phaseB})':w=210:h=150:color=0xffd2a6@1:t=fill`,
    `drawbox=x='${characterTwoLeftEyeX}+16*sin(t*${motionB}+${phaseB})':y='255+if(lt(mod(t\\,${blinkPeriodB})\\,0.1)\\,8\\,0)':w=28:h=28:color=black@1:t=fill`,
    `drawbox=x='${characterTwoRightEyeX}+16*sin(t*${motionB}+${phaseB})':y='255+if(lt(mod(t\\,${blinkPeriodB})\\,0.1)\\,8\\,0)':w=28:h=28:color=black@1:t=fill`,
    `drawbox=x='${characterTwoMouthX}+16*sin(t*${motionB}+${phaseB})':y='310+6*sin(t*11+${phaseB})':w=72:h='12+18*abs(sin(t*9.5))':color=0x7a1c1c@1:t=fill`,
    `drawbox=x='${characterTwoBodyX}+16*sin(t*${motionB}+${phaseB})':y='515+5*sin(t*${motionB}+${phaseB})':w=150:h=34:color=0x17356b@0.85:t=fill`,
    ...rabbitEars,
    ...tortoiseShell,
    ...ramaCrown,
    ...sitaVeil,
    ...doctorProps,
    ...farmerProps,
    ...lawyerProps,
    `drawbox=x=120:y=${bubbleY}:w=${bubbleWidth}:h=95:color=white@0.92:t=fill`,
    `drawbox=x=${bubbleTailX}:y=${bubbleY + 80}:w=26:h=30:color=white@0.92:t=fill`,
    `drawbox=x=145:y=${bubbleY + 24}:w=${Math.max(150, bubbleWidth - 120)}:h=12:color=0x111111@0.55:t=fill`,
    `drawbox=x=145:y=${bubbleY + 46}:w=${Math.max(180, bubbleWidth - 180)}:h=10:color=0x111111@0.42:t=fill`,
    `drawbox=x=145:y=${bubbleY + 64}:w=${Math.max(130, bubbleWidth - 240)}:h=10:color=0x111111@0.32:t=fill`,
    `drawbox=x=88:y=168:w=${Math.max(220, width - 620)}:h=66:color=${accentOne}@0.44:t=fill`,
    `drawbox=x=98:y=176:w=${Math.max(180, width - 700)}:h=48:color=${accentTwo}@0.42:t=fill`,
  ].join(',');
};

const renderCartoonSceneClip = async ({ scene, sceneIndex, outputDir, resolution, project }) => {
  const clipPath = path.join(outputDir, `scene-${String(sceneIndex).padStart(2, '0')}-cartoon.mp4`);
  const ttsPath = path.join(outputDir, `scene-${String(sceneIndex).padStart(2, '0')}-voice.mp3`);
  const stillPath = path.join(outputDir, `scene-${String(sceneIndex).padStart(2, '0')}-still.png`);
  const dialogueForVoice = scene.lines.map((line) => `${line.speaker}: ${line.text}`).join(' ').slice(0, 4096);
  const synthesizedPath = await synthesizeSpeechToFile({
    text: dialogueForVoice,
    voiceCandidate: project?.voiceType,
    outputPath: ttsPath,
  });
  if (!synthesizedPath && project?.requireDialogueVoice) {
    throw new Error(
      'Dialogue voice generation failed for a scene. Real story render requires spoken character voice; fallback tone audio is disabled.'
    );
  }
  const generatedByAi = await generateRealCartoonSceneImage(scene, project, stillPath, resolution);
  if (!generatedByAi && project?.requireSceneImages) {
    const attemptSummary = sanitizeText(imageGenerationErrorsByPath.get(stillPath) || '');
    throw new Error(
      `AI character visuals are required for this render, but free image generation failed.${attemptSummary ? ` Attempts: ${attemptSummary}` : ''} Check FREE_AI_PROVIDER, AI_PROVIDER_ENABLED, VIDEO_STUDIO_REAL_CARTOON_MODE, and image model access before retrying.`
    );
  }
  if (!generatedByAi) {
    const svg = buildSceneSvg(scene, project, resolution.width, resolution.height);
    const pngOptions = isLowMemoryMode
      ? { compressionLevel: 9, palette: true, effort: 4 }
      : { compressionLevel: 6 };
    await sharp(Buffer.from(svg)).png(pngOptions).toFile(stillPath);
  }
  const duration = Math.max(2, Number(scene.duration) || 6);
  const fps = 24;
  const frames = Math.max(1, Math.floor(duration * fps));
  const sceneAudioSeed = buildDeterministicSeed(scene?.title, scene?.description, scene?.lines?.map((line) => line?.text).join(' '), sceneIndex);
  const baseFrequency = 320 + (sceneAudioSeed % 220);
  const overtoneFrequency = baseFrequency + 140 + (sceneAudioSeed % 90);

  const args = ['-y'];
  args.push('-loop', '1', '-i', stillPath);

  if (synthesizedPath) {
    args.push('-i', synthesizedPath);
  } else {
    args.push(
      '-f',
      'lavfi',
      '-i',
      `aevalsrc=(0.02*sin(2*PI*${baseFrequency}*t)+0.012*sin(2*PI*${overtoneFrequency}*t)):s=44100:d=${duration}`
    );
  }
  const audioFilter = synthesizedPath
    ? 'loudnorm=I=-16:TP=-1.5:LRA=11,volume=1.8,aresample=48000'
    : 'volume=0.10,aresample=48000';

  const zoomFilter = [
    `zoompan=z='min(1.18,1+0.0022*on)'`,
    `x='iw/2-(iw/zoom/2)+18*sin(on/18)'`,
    `y='ih/2-(ih/zoom/2)+10*cos(on/20)'`,
    `d=${frames}:s=${resolution.width}x${resolution.height}:fps=${fps}`,
  ].join(':');
  const fadeOutStart = Math.max(0, duration - 0.35);
  args.push(
    '-t', `${duration}`,
    '-vf', `${zoomFilter},fade=t=in:st=0:d=0.2,fade=t=out:st=${fadeOutStart}:d=0.3`,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-r', `${fps}`,
    '-c:a', 'aac',
    '-af', audioFilter,
    '-ar', '48000',
    '-ac', '2',
    '-b:a', '160k',
    '-shortest',
    clipPath
  );

  await runFfmpeg(args, outputDir);
  return {
    path: clipPath,
    duration,
    usedTts: Boolean(synthesizedPath),
    usedAiImage: Boolean(generatedByAi),
  };
};

const renderCartoonVideo = async (project, premiumHD = false) => {
  if (project?.safeMode) {
    const safetyInput = [
      project?.title,
      project?.storyPrompt,
      project?.narration,
      ...(Array.isArray(project?.scenes)
        ? project.scenes.flatMap((scene) => [scene?.title, scene?.description, scene?.dialogue])
        : []),
    ]
      .map((value) => sanitizeText(value))
      .filter(Boolean)
      .join(' ');

    const assessment = await getCombinedSafetyAssessment(safetyInput);
    if (assessment.blocked) {
      throw createSafetyError('render_project', assessment);
    }
  }

  await ensureUploadsRoot();
  const safeProjectId = safeFileName(project.projectId || uuidv4());
  const outputDir = path.join(uploadsRoot, safeProjectId);
  await mkdir(outputDir, { recursive: true });

  const resolution = getResolution(project.videoSize);
  const scenes = normalizeScenesForCartoonRenderer(project);
  if (!scenes.length) {
    throw new Error('No scenes supplied for cartoon render.');
  }

  const clipResults = [];
  for (let index = 0; index < scenes.length; index += 1) {
    const clipResult = await renderCartoonSceneClip({
      scene: scenes[index],
      sceneIndex: index + 1,
      outputDir,
      resolution,
      project,
    });
    clipResults.push(clipResult);
  }

  const concatListPath = path.join(outputDir, 'cartoon-concat.txt');
  const concatLines = clipResults
    .map((clip) => `file '${clip.path.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`)
    .join('\n');
  await writeFile(concatListPath, `${concatLines}\n`, 'utf-8');

  const renderToken = Date.now();
  const outputFileName = `story-render-${renderToken}.mp4`;
  const outputFile = path.join(outputDir, outputFileName);
  const concatArgs = [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatListPath,
    '-map', '0:v:0',
    '-map', '0:a:0?',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11,volume=1.35,aresample=48000',
    '-ar', '48000',
    '-ac', '2',
    '-b:a', '160k',
  ];
  if (premiumHD && !isLowMemoryMode) {
    concatArgs.push('-preset', 'medium');
  } else {
    concatArgs.push('-movflags', '+faststart');
  }
  concatArgs.push(outputFile);
  await runFfmpeg(concatArgs, outputDir);

  const videoUrl = `/uploads/video-studio/${safeProjectId}/${outputFileName}`;
  const totalDuration = clipResults.reduce((sum, clip) => sum + (Number(clip.duration) || 0), 0);
  const usedTts = clipResults.some((clip) => clip.usedTts);
  const usedAiImages = clipResults.some((clip) => clip.usedAiImage);

  const metadataPath = path.join(outputDir, 'project.json');
  await writeFile(metadataPath, JSON.stringify({
    ...project,
    renderedAt: new Date().toISOString(),
    videoUrl,
    renderMode: 'real-cartoon-backend',
    renderAudioMode: usedTts ? 'character-dialogue' : 'ambient-fallback',
    renderVisualMode: usedAiImages ? 'ai-cartoon-stills' : 'shape-fallback',
    totalDurationSeconds: totalDuration,
    freeMode: isFreeMode,
  }, null, 2), 'utf-8');

  return {
    videoUrl,
    projectId: safeProjectId,
    outputFile,
    renderMode: 'real-cartoon-backend',
    ttsEnabled: usedTts,
    aiImagesEnabled: usedAiImages,
  };
};

const renderVideo = async (project, premiumHD = false) => {
  if (project?.safeMode) {
    const safetyInput = [
      project?.title,
      project?.storyPrompt,
      project?.narration,
      ...(Array.isArray(project?.scenes)
        ? project.scenes.flatMap((scene) => [scene?.title, scene?.description, scene?.dialogue])
        : []),
    ]
      .map((value) => sanitizeText(value))
      .filter(Boolean)
      .join(' ');

    const assessment = await getCombinedSafetyAssessment(safetyInput);
    if (assessment.blocked) {
      throw createSafetyError('render_project', assessment);
    }
  }

  await ensureUploadsRoot();
  const safeProjectId = safeFileName(project.projectId || uuidv4());
  const outputDir = path.join(uploadsRoot, safeProjectId);
  await mkdir(outputDir, { recursive: true });

  const { sceneFiles: sceneAssets, totalDurationSeconds } = await createSceneImages(project, outputDir);
  if (!sceneAssets.length) {
    throw new Error('No scene assets were generated for rendering.');
  }
  const listPath = path.join(outputDir, 'scenes.txt');
  const listContent = sceneAssets
    .map((scene) => `file '${scene.path.replace(/\\/g, '/')}'\nduration ${scene.duration}`)
    .join('\n') + `\nfile '${sceneAssets[sceneAssets.length - 1].path.replace(/\\/g, '/')}'\n`;

  project.subtitles = buildSubtitlesFromScenes(project.scenes || []);
  await writeFile(listPath, listContent, 'utf-8');
  const subtitlePath = await buildSubtitleFile(project, outputDir);
  const subtitleFileName = path.basename(subtitlePath).replace(/\\/g, '/');
  const useHardSubtitles = !isLowMemoryMode || ['1', 'true', 'yes', 'on'].includes(String(process.env.VIDEO_STUDIO_FREE_HARDSUBS || '').toLowerCase());
  const totalDuration = Math.max(2, Number(totalDurationSeconds) || sceneAssets.length * 4);
  const dialogueAudioPath = await buildCharacterDialogueAudio(project, outputDir, totalDuration);
  const narrationAudioPath = dialogueAudioPath ? null : await buildNarrationAudio(project, outputDir);
  const audioTrackPath = dialogueAudioPath || narrationAudioPath;
  const allowSilentRender = ['1', 'true', 'yes', 'on'].includes(String(process.env.VIDEO_STUDIO_ALLOW_SILENT_RENDER || '').toLowerCase());
  if (!audioTrackPath && !allowSilentRender) {
    throw new Error(
      'Voice generation failed for this project. No spoken dialogue/narration audio track was created.'
    );
  }

  const quality = premiumHD && !isLowMemoryMode ? '24' : (isLowMemoryMode ? '28' : '23');
  const renderToken = Date.now();
  const outputFileName = `story-render-${renderToken}.mp4`;
  const outputFile = path.join(outputDir, outputFileName);
  const ambientAudioExpression = `aevalsrc=(0.016*sin(2*PI*220*t)+0.012*sin(2*PI*330*t)+0.008*sin(2*PI*440*t)):s=44100:d=${totalDuration}`;

  const ffmpegArgs = [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', listPath,
  ];

  if (audioTrackPath) {
    ffmpegArgs.push('-i', audioTrackPath);
  } else {
    ffmpegArgs.push('-f', 'lavfi', '-i', ambientAudioExpression);
  }

  ffmpegArgs.push(
    '-threads', '1',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-crf', quality,
    '-r', '24',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-shortest'
  );

  if (useHardSubtitles) {
    ffmpegArgs.push('-vf', `subtitles=${subtitleFileName}:force_style='FontName=Arial,FontSize=24,PrimaryColour=&Hffffff&'`);
  }
  ffmpegArgs.push(outputFile);

  await runFfmpeg(ffmpegArgs, outputDir);

  const videoUrl = `/uploads/video-studio/${safeProjectId}/${outputFileName}`;
  const metadataPath = path.join(outputDir, 'project.json');
  await writeFile(metadataPath, JSON.stringify({
    ...project,
    renderedAt: new Date().toISOString(),
    videoUrl,
    renderAudioMode: dialogueAudioPath ? 'character-dialogue' : (narrationAudioPath ? 'narration' : 'silent'),
    freeMode: isFreeMode,
  }, null, 2), 'utf-8');

  return { videoUrl, projectId: path.basename(outputDir), outputFile };
};

const getProjectRenderDirectory = async (projectId) => {
  await ensureUploadsRoot();
  const safeProjectId = safeFileName(projectId || uuidv4());
  const outputDir = path.join(uploadsRoot, safeProjectId);
  await mkdir(outputDir, { recursive: true });
  return { safeProjectId, outputDir };
};

const getSceneById = (project, sceneId) => {
  const normalizedId = Number(sceneId);
  if (!Number.isFinite(normalizedId)) {
    return null;
  }
  const scenes = Array.isArray(project?.scenes) ? project.scenes : [];
  return scenes.find((scene, index) => Number(scene?.id || index + 1) === normalizedId) || null;
};

const generateCharacterSheet = async (projectId, options = {}) => {
  const project = await getStudioProject(projectId);
  const { safeProjectId, outputDir } = await getProjectRenderDirectory(project.projectId);
  const characters = Array.isArray(project.characters) ? project.characters : [];
  const poses = Array.isArray(options.poses) && options.poses.length
    ? options.poses.map((entry) => sanitizeText(entry)).filter(Boolean).slice(0, 4)
    : ['front', 'side', 'action', 'sitting'];
  const emotions = Array.isArray(options.emotions) && options.emotions.length
    ? options.emotions.map((entry) => sanitizeText(entry)).filter(Boolean).slice(0, 6)
    : ['happy', 'curious', 'brave', 'surprised', 'focused', 'celebrating'];

  const sheets = [];
  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index];
    const charName = sanitizeText(character?.name || `Character ${index + 1}`);
    const entries = [];

    for (let poseIndex = 0; poseIndex < poses.length; poseIndex += 1) {
      const pose = poses[poseIndex];
      const scene = normalizeSceneForCinematicPipeline({
        id: poseIndex + 1,
        title: `${charName} ${pose} pose`,
        description: `${charName} reference art for ${pose} pose.`,
        dialogue: `${charName} ${emotions[poseIndex % emotions.length]}.`,
        emotion: emotions[poseIndex % emotions.length],
        characters: [{ name: charName, role: sanitizeText(character?.role || 'Hero') }],
        durationSeconds: 4,
        shotType: 'medium',
        cameraMotion: 'still',
      }, poseIndex);

      const fileName = `character-sheet-${safeFileName(charName)}-${safeFileName(pose)}.png`;
      const imagePath = path.join(outputDir, fileName);
      const generatedByAi = await generateRealCartoonSceneImage(scene, project, imagePath, getResolution(project.videoSize));
      if (!generatedByAi) {
        const { width, height } = getResolution(project.videoSize);
        const svg = buildSceneSvg(scene, project, width, height);
        await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(imagePath);
      }
      entries.push({
        pose,
        emotion: scene.emotion,
        imageUrl: `/uploads/video-studio/${safeProjectId}/${fileName}`,
      });
    }

    sheets.push({
      characterId: sanitizeText(character?.id || safeFileName(charName)),
      name: charName,
      appearance: sanitizeText(character?.appearance || ''),
      entries,
    });
  }

  await patchStudioProject(project.projectId, { characterSheets: sheets });
  return {
    projectId: project.projectId,
    characterSheets: sheets,
  };
};

const generateSceneImage = async (projectId, sceneId) => {
  const project = await getStudioProject(projectId);
  const scene = getSceneById(project, sceneId);
  if (!scene) {
    throw new Error('Scene not found.');
  }
  const { safeProjectId, outputDir } = await getProjectRenderDirectory(project.projectId);
  const resolution = getResolution(project.videoSize);
  const fileName = `scene-${safeFileName(String(scene.id || sceneId))}-still.png`;
  const imagePath = path.join(outputDir, fileName);
  const generatedByAi = await generateRealCartoonSceneImage(scene, project, imagePath, resolution);
  if (!generatedByAi) {
    const svg = buildSceneSvg(scene, project, resolution.width, resolution.height);
    await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(imagePath);
  }
  return {
    projectId: project.projectId,
    sceneId: Number(scene.id || sceneId),
    source: generatedByAi ? 'ai-image' : 'template-fallback',
    imageUrl: `/uploads/video-studio/${safeProjectId}/${fileName}`,
  };
};

const generateVoice = async (projectId, sceneId) => {
  const project = await getStudioProject(projectId);
  const scene = getSceneById(project, sceneId);
  if (!scene) {
    throw new Error('Scene not found.');
  }
  const { safeProjectId, outputDir } = await getProjectRenderDirectory(project.projectId);
  const outputPath = path.join(outputDir, `scene-${safeFileName(String(scene.id || sceneId))}-voice.mp3`);
  const dialogueTurns = extractSceneDialogueTurns(scene, project);
  const voiceText = dialogueTurns.map((turn) => turn.text).join(' ').slice(0, 4096);
  const synthesizedPath = await synthesizeSpeechToFile({
    text: voiceText,
    voiceCandidate: project?.voiceType || project?.voicePlan?.narrator?.voice,
    outputPath,
  });

  if (!synthesizedPath) {
    const duration = Math.max(2, Math.min(15, Number(scene.durationSeconds) || 4));
    await runFfmpeg([
      '-y',
      '-f', 'lavfi',
      '-i', `aevalsrc=(0.02*sin(2*PI*260*t)+0.01*sin(2*PI*390*t)):s=44100:d=${duration}`,
      '-c:a', 'libmp3lame',
      '-b:a', '96k',
      outputPath,
    ], outputDir);
  }

  return {
    projectId: project.projectId,
    sceneId: Number(scene.id || sceneId),
    voiceUrl: `/uploads/video-studio/${safeProjectId}/${path.basename(outputPath)}`,
    provider: synthesizedPath
      ? (ttsProviderByOutputPath.get(outputPath) || 'googleAI-tts')
      : 'procedural-fallback',
  };
};

const generateSfx = async (projectId, sceneId) => {
  const project = await getStudioProject(projectId);
  const scene = getSceneById(project, sceneId);
  if (!scene) {
    throw new Error('Scene not found.');
  }
  const { safeProjectId, outputDir } = await getProjectRenderDirectory(project.projectId);
  const duration = Math.max(2, Math.min(15, Number(scene.durationSeconds) || 4));
  const outputPath = path.join(outputDir, `scene-${safeFileName(String(scene.id || sceneId))}-sfx.mp3`);
  await runFfmpeg([
    '-y',
    '-f', 'lavfi',
    '-i', `anoisesrc=color=pink:amplitude=0.015:d=${duration}`,
    '-af', 'highpass=f=120,lowpass=f=6500',
    '-c:a', 'libmp3lame',
    '-b:a', '96k',
    outputPath,
  ], outputDir);

  return {
    projectId: project.projectId,
    sceneId: Number(scene.id || sceneId),
    sfxUrl: `/uploads/video-studio/${safeProjectId}/${path.basename(outputPath)}`,
    mood: sanitizeText(scene?.backgroundMusicMood || 'neutral'),
  };
};

const animateScene = async (projectId, sceneId) => {
  const project = await getStudioProject(projectId);
  const scene = getSceneById(project, sceneId);
  if (!scene) {
    throw new Error('Scene not found.');
  }
  const stillResult = await generateSceneImage(project.projectId, scene.id || sceneId);
  const { safeProjectId, outputDir } = await getProjectRenderDirectory(project.projectId);
  const stillPath = path.join(outputDir, path.basename(stillResult.imageUrl));
  const clipName = `scene-${safeFileName(String(scene.id || sceneId))}-animated.mp4`;
  const clipPath = path.join(outputDir, clipName);
  const resolution = getResolution(project.videoSize);
  const duration = Math.max(2, Math.min(15, Number(scene.durationSeconds) || 4));
  const fps = 24;
  const frames = Math.max(1, Math.floor(duration * fps));
  const zoomFilter = `zoompan=z='min(1.14,1+0.0014*on)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${resolution.width}x${resolution.height}:fps=${fps}`;
  const fadeOutStart = Math.max(0, duration - 0.4);

  await runFfmpeg([
    '-y',
    '-loop', '1',
    '-i', stillPath,
    '-f', 'lavfi',
    '-i', `aevalsrc=(0.012*sin(2*PI*220*t)+0.008*sin(2*PI*330*t)):s=44100:d=${duration}`,
    '-t', `${duration}`,
    '-vf', `${zoomFilter},fade=t=in:st=0:d=0.25,fade=t=out:st=${fadeOutStart}:d=0.35`,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '96k',
    '-shortest',
    clipPath,
  ], outputDir);

  return {
    projectId: project.projectId,
    sceneId: Number(scene.id || sceneId),
    animatedClipUrl: `/uploads/video-studio/${safeProjectId}/${clipName}`,
    cameraMotion: sanitizeText(scene?.cameraMotion || 'slow-zoom'),
  };
};

const lipSync = async (projectId, sceneId) => {
  const animationResult = await animateScene(projectId, sceneId);
  const voiceResult = await generateVoice(projectId, sceneId);
  return {
    projectId: animationResult.projectId,
    sceneId: animationResult.sceneId,
    animatedClipUrl: animationResult.animatedClipUrl,
    voiceUrl: voiceResult.voiceUrl,
    lipSyncStatus: 'proxy-mix',
    note: 'Dedicated lip-sync engine integration (e.g., Wav2Lip/SadTalker) can replace this stage.',
  };
};

const composeFinalVideo = async (projectId, options = {}) => {
  const project = await getStudioProject(projectId);
  const result = await renderVideo(project, Boolean(options.premiumHD));
  return {
    ...result,
    composition: 'story-to-cinematic-pipeline',
  };
};

module.exports = {
  createStudioProject,
  renderVideo,
  renderCartoonVideo,
  createAutopilotProject,
  getStudioProject,
  regenerateProjectStage,
  regenerateProjectScene,
  regenerateProjectSceneDialogue,
  patchStudioProject,
  generateCharacterSheet,
  generateSceneImage,
  animateScene,
  generateVoice,
  generateSfx,
  lipSync,
  composeFinalVideo,
  diagnoseImageGeneration,
};
