const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { promisify } = require('util');
const sharp = require('sharp');
const ffmpegPath = require('ffmpeg-static');
const { v4: uuidv4 } = require('uuid');
const { safeGoogleAI } = require('./videoStudioService');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const access = promisify(fs.access);
const mkdir = promisify(fs.mkdir);

const uploadsRoot = path.join(__dirname, '..', 'uploads', 'kids-video-hf');
const projectsRoot = path.join(uploadsRoot, 'projects');

const sanitizeText = (value = '') => String(value || '').replace(/\u0000/g, '').trim();
const safeFileName = (value = '') => sanitizeText(value).replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
const KIDS_SAFETY_RULES = [
  { code: 'self_harm', pattern: /\b(suicide|self[-\s]?harm|kill myself)\b/gi, replacement: 'help and care' },
  { code: 'graphic_violence', pattern: /\b(gore|bloodbath|behead|torture)\b/gi, replacement: 'safe challenge' },
  { code: 'violence', pattern: /\b(kill|killed|killing|murder|shoot|stab|slay)\b/gi, replacement: 'help' },
  { code: 'weaponry', pattern: /\b(gun|rifle|shotgun|bomb|grenade|knife attack)\b/gi, replacement: 'safe toy prop' },
  { code: 'abuse', pattern: /\b(abuse|bully violently|harass)\b/gi, replacement: 'kindness and respect' },
  { code: 'adult_content', pattern: /\b(sex|sexual|nude|porn|explicit adult)\b/gi, replacement: 'family-friendly moment' },
  { code: 'hate', pattern: /\b(hate crime|racist|extremist)\b/gi, replacement: 'inclusive friendship' },
];

const applySafetyRewritesToText = (value = '') => {
  let next = sanitizeText(value);
  const hits = [];
  for (const rule of KIDS_SAFETY_RULES) {
    rule.pattern.lastIndex = 0;
    if (!rule.pattern.test(next)) {
      continue;
    }
    hits.push(rule.code);
    rule.pattern.lastIndex = 0;
    next = next.replace(rule.pattern, rule.replacement);
  }
  return {
    text: sanitizeText(next),
    hits: Array.from(new Set(hits)),
  };
};

const enforceKidsSafetyPolicy = (story = {}, promptText = '') => {
  const promptResult = applySafetyRewritesToText(promptText);
  const titleResult = applySafetyRewritesToText(story?.title || '');
  const synopsisResult = applySafetyRewritesToText(story?.synopsis || '');
  const moralResult = applySafetyRewritesToText(story?.moral || '');

  const sceneSafety = [];
  const rewrittenScenes = (Array.isArray(story?.scenes) ? story.scenes : []).map((scene, index) => {
    const title = applySafetyRewritesToText(scene?.title || '');
    const description = applySafetyRewritesToText(scene?.description || '');
    const dialogue = applySafetyRewritesToText(scene?.dialogue || '');
    const hits = Array.from(new Set([...title.hits, ...description.hits, ...dialogue.hits]));
    if (hits.length > 0) {
      sceneSafety.push({
        sceneId: scene?.id || index + 1,
        index,
        hits,
      });
    }
    return {
      ...scene,
      title: title.text,
      description: description.text,
      dialogue: dialogue.text,
    };
  });

  const allHits = Array.from(
    new Set([
      ...promptResult.hits,
      ...titleResult.hits,
      ...synopsisResult.hits,
      ...moralResult.hits,
      ...sceneSafety.flatMap((entry) => entry.hits),
    ])
  );

  const safetyReport = {
    enforced: true,
    rewriteApplied: allHits.length > 0,
    violations: allHits,
    sceneRewrites: sceneSafety,
    promptRewritten: promptResult.hits.length > 0,
  };

  return {
    sanitizedPrompt: promptResult.text,
    sanitizedStory: {
      ...story,
      title: titleResult.text || sanitizeText(story?.title || ''),
      synopsis: synopsisResult.text || sanitizeText(story?.synopsis || ''),
      moral: moralResult.text || sanitizeText(story?.moral || ''),
      scenes: rewrittenScenes,
    },
    safetyReport,
  };
};
const LANGUAGE_CODE_ALIASES = {
  en: 'en',
  english: 'en',
  hi: 'hi',
  hindi: 'hi',
  ml: 'ml',
  malayalam: 'ml',
  ta: 'ta',
  tamil: 'ta',
  te: 'te',
  telugu: 'te',
  kn: 'kn',
  kannada: 'kn',
  bn: 'bn',
  bengali: 'bn',
  mr: 'mr',
  marathi: 'mr',
  gu: 'gu',
  gujarati: 'gu',
  ur: 'ur',
  urdu: 'ur',
  ar: 'ar',
  arabic: 'ar',
};

const LANGUAGE_NAME_BY_CODE = {
  en: 'English',
  hi: 'Hindi',
  ml: 'Malayalam',
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  bn: 'Bengali',
  mr: 'Marathi',
  gu: 'Gujarati',
  ur: 'Urdu',
  ar: 'Arabic',
};

const LANGUAGE_TTS_BY_CODE = {
  en: { locale: 'en-US', voice: 'en-US-Standard-F' },
  hi: { locale: 'hi-IN', voice: 'hi-IN-Standard-A' },
  ml: { locale: 'ml-IN', voice: 'ml-IN-Standard-A' },
  ta: { locale: 'ta-IN', voice: 'ta-IN-Standard-A' },
  te: { locale: 'te-IN', voice: 'te-IN-Standard-A' },
  kn: { locale: 'kn-IN', voice: 'kn-IN-Standard-A' },
  bn: { locale: 'bn-IN', voice: 'bn-IN-Standard-A' },
  mr: { locale: 'mr-IN', voice: 'mr-IN-Standard-A' },
  gu: { locale: 'gu-IN', voice: 'gu-IN-Standard-A' },
  ur: { locale: 'ur-IN', voice: 'ur-IN-Standard-A' },
  ar: { locale: 'ar-SA', voice: 'ar-XA-Standard-A' },
};

const normalizeLanguageCode = (value = 'en') => {
  const raw = sanitizeText(value).toLowerCase().replace(/_/g, '-');
  if (!raw) return 'en';
  const primary = raw.split('-')[0];
  return LANGUAGE_CODE_ALIASES[raw] || LANGUAGE_CODE_ALIASES[primary] || 'en';
};

const getKidsVideoLanguageName = (languageCode = 'en') =>
  LANGUAGE_NAME_BY_CODE[normalizeLanguageCode(languageCode)] || 'English';

const getKidsVideoTtsConfig = (languageCode = 'en') =>
  LANGUAGE_TTS_BY_CODE[normalizeLanguageCode(languageCode)] || LANGUAGE_TTS_BY_CODE.en;
const STORY_LOOKUP_TIMEOUT_MS = Math.max(
  1200,
  Math.min(9000, Number(process.env.STORY_LOOKUP_TIMEOUT_MS) || 4200)
);
const internetStoryLookupEnabled = !['0', 'false', 'no', 'off'].includes(
  String(process.env.KIDS_VIDEO_INTERNET_STORY_LOOKUP_ENABLED || 'true').toLowerCase()
);
const WIKIPEDIA_SUMMARY_BASE_URL = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const WIKIPEDIA_SEARCH_BASE_URL = 'https://en.wikipedia.org/w/api.php';

const sanitizeInternetSummaryText = (value = '') =>
  sanitizeText(value)
    .replace(/\s+/g, ' ')
    .replace(/\((?:listen|help|about this sound file)[^)]+\)/gi, '')
    .trim();

const createTranslationTelemetry = (targetLanguage = 'en') => ({
  targetLanguage: normalizeLanguageCode(targetLanguage || 'en'),
  attempted: false,
  fallbackCount: 0,
  warnings: [],
});

const noteTranslationFallback = (telemetry, reason = '', context = '') => {
  if (!telemetry || typeof telemetry !== 'object') return;
  telemetry.fallbackCount += 1;
  const reasonText = sanitizeText(reason) || 'translation error';
  const contextText = sanitizeText(context) || 'text';
  telemetry.warnings.push(`Fallback to source ${contextText}: ${reasonText}`);
};

const finalizeTranslationTelemetry = (telemetry) => {
  if (!telemetry || typeof telemetry !== 'object') return null;
  const normalizedLanguage = normalizeLanguageCode(telemetry.targetLanguage || 'en');
  if (!telemetry.attempted || normalizedLanguage === 'en') {
    return {
      targetLanguage: normalizedLanguage,
      translated: normalizedLanguage === 'en',
      fallbackCount: 0,
      warnings: [],
    };
  }
  return {
    targetLanguage: normalizedLanguage,
    translated: telemetry.fallbackCount === 0,
    fallbackCount: telemetry.fallbackCount,
    warnings: telemetry.warnings.slice(0, 6),
  };
};

const translateTextToLanguage = async (text = '', targetLanguage = 'en', options = {}) => {
  const cleanText = sanitizeText(text);
  if (!cleanText || targetLanguage === 'en') return cleanText;
  const telemetry = options?.telemetry;
  if (telemetry && typeof telemetry === 'object') {
    telemetry.attempted = true;
  }

  const languageName = LANGUAGE_NAME_BY_CODE[targetLanguage] || targetLanguage;
  try {
    const aiResponse = await safeGoogleAI([
      {
        role: 'system',
        content: `You are a friendly translation assistant. Translate the text into ${languageName} exactly and return only the translated text without adding extra commentary. Preserve names, punctuation, and story structure.`,
      },
      {
        role: 'user',
        content: cleanText,
      },
    ], 400);

    const translated = sanitizeText(String(aiResponse || cleanText));
    return translated || cleanText;
  } catch (error) {
    noteTranslationFallback(telemetry, error?.message || 'AI translation unavailable', options?.context || '');
    return cleanText;
  }
};

const translatePromptForLanguage = async (prompt = '', targetLanguage = 'en', options = {}) => {
  const cleanPrompt = sanitizeText(prompt);
  if (!cleanPrompt) return cleanPrompt;
  const normalizedLanguage = normalizeLanguageCode(targetLanguage);
  if (normalizedLanguage === 'en') return cleanPrompt;
  return translateTextToLanguage(cleanPrompt, normalizedLanguage, {
    telemetry: options?.telemetry,
    context: options?.context || 'prompt',
  });
};

const localizeStoryForLanguage = async (story = {}, targetLanguage = 'en', options = {}) => {
  if (!story || targetLanguage === 'en') return story;
  const telemetry = options?.telemetry;
  if (telemetry && typeof telemetry === 'object') {
    telemetry.attempted = true;
  }

  const localizedScenes = await Promise.all(
    (Array.isArray(story.scenes) ? story.scenes : []).map(async (scene) => ({
      ...scene,
      title: await translateTextToLanguage(scene.title, targetLanguage, { telemetry, context: 'scene title' }),
      description: await translateTextToLanguage(scene.description, targetLanguage, { telemetry, context: 'scene description' }),
      dialogue: await translateTextToLanguage(scene.dialogue, targetLanguage, { telemetry, context: 'scene dialogue' }),
    }))
  );

  return {
    ...story,
    title: await translateTextToLanguage(story.title, targetLanguage, { telemetry, context: 'story title' }),
    synopsis: await translateTextToLanguage(story.synopsis, targetLanguage, { telemetry, context: 'story synopsis' }),
    moral: await translateTextToLanguage(story.moral, targetLanguage, { telemetry, context: 'story moral' }),
    scenes: localizedScenes,
  };
};

const splitSummarySentences = (summary = '') =>
  sanitizeInternetSummaryText(summary)
    .split(/(?<=[\.\?\!])\s+/)
    .map((line) => sanitizeText(line))
    .filter(Boolean);

const fetchJsonWithTimeout = async (url, timeoutMs = STORY_LOOKUP_TIMEOUT_MS) => {
  if (typeof fetch !== 'function') {
    throw new Error('Fetch API is unavailable in this runtime.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timer);
  }
};

const toInternetStoryContext = (payload = {}) => {
  const title = sanitizeText(payload?.title || '');
  const summary = sanitizeInternetSummaryText(payload?.extract || payload?.description || '');
  if (!title || !summary) return null;

  const sourceUrl =
    sanitizeText(
      payload?.content_urls?.desktop?.page
      || payload?.content_urls?.mobile?.page
      || payload?.canonicalurl
      || ''
    ) || `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, '_'))}`;

  return {
    provider: 'wikipedia',
    title,
    summary,
    sourceUrl,
  };
};

const fetchWikipediaStoryContext = async (subject = '') => {
  const cleanSubject = sanitizeText(subject);
  if (!cleanSubject || cleanSubject.length < 3) return null;
  if (!internetStoryLookupEnabled) return null;

  const trySummary = async (title) => {
    const endpoint = `${WIKIPEDIA_SUMMARY_BASE_URL}/${encodeURIComponent(title)}`;
    const payload = await fetchJsonWithTimeout(endpoint);
    return toInternetStoryContext(payload);
  };

  try {
    const direct = await trySummary(cleanSubject);
    if (direct) return direct;
  } catch (_directError) {
    // Continue to search fallback.
  }

  try {
    const searchUrl =
      `${WIKIPEDIA_SEARCH_BASE_URL}?action=query&list=search&srsearch=${encodeURIComponent(cleanSubject)}&utf8=1&format=json&srlimit=1`;
    const searchPayload = await fetchJsonWithTimeout(searchUrl);
    const bestTitle = sanitizeText(searchPayload?.query?.search?.[0]?.title || '');
    if (!bestTitle) return null;
    return await trySummary(bestTitle);
  } catch (_searchError) {
    return null;
  }
};

const ensureDirectories = async () => {
  try {
    await access(uploadsRoot);
  } catch (_error) {
    await mkdir(uploadsRoot, { recursive: true });
  }
  try {
    await access(projectsRoot);
  } catch (_error) {
    await mkdir(projectsRoot, { recursive: true });
  }
};

const projectFilePath = (projectId) => path.join(projectsRoot, `${safeFileName(projectId)}.json`);

const getResolution = (videoSize = 'youtube') => {
  switch (sanitizeText(videoSize)) {
    case 'shorts':
      return { width: 720, height: 1280 };
    case 'whatsapp':
      return { width: 1080, height: 1080 };
    default:
      return { width: 1280, height: 720 };
  }
};

const resolveFfmpegBinary = () => {
  const configuredPath = String(process.env.FFMPEG_PATH || '').trim();
  if (configuredPath) {
    return configuredPath;
  }

  try {
    const probe = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    if (probe?.status === 0) {
      return 'ffmpeg';
    }
  } catch (_error) {
    // Ignore probe failures and continue to static fallback.
  }

  const bundledStatic = String(ffmpegPath || '').trim();
  if (bundledStatic) {
    return bundledStatic;
  }

  return 'ffmpeg';
};

const runFfmpeg = async (args, cwd) => {
  const ffmpegBinary = resolveFfmpegBinary();
  if (!ffmpegBinary) {
    throw new Error('FFmpeg is unavailable. Set FFMPEG_PATH or install ffmpeg.');
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegBinary, ['-hide_banner', '-loglevel', 'error', '-nostdin', ...args], {
      cwd,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    let spawnError = '';

    proc.stderr.on('data', (chunk) => {
      stderr += String(chunk || '');
      if (stderr.length > 200000) {
        stderr = stderr.slice(-200000);
      }
    });

    proc.on('error', (error) => {
      spawnError = sanitizeText(error?.message || 'failed to spawn ffmpeg');
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        const details = spawnError || stderr || `exit code ${code}`;
        return reject(new Error(`FFmpeg failed: ${details}`));
      }
      return resolve();
    });
  });
};

const runProcess = async ({ command, args = [], cwd }) =>
  new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let spawnError = '';

    proc.stdout.on('data', (chunk) => {
      stdout += String(chunk || '');
      if (stdout.length > 300000) stdout = stdout.slice(-300000);
    });
    proc.stderr.on('data', (chunk) => {
      stderr += String(chunk || '');
      if (stderr.length > 300000) stderr = stderr.slice(-300000);
    });
    proc.on('error', (error) => {
      spawnError = sanitizeText(error?.message || 'failed to spawn process');
    });
    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(spawnError || sanitizeText(stderr) || `exit code ${code}`));
      }
      return resolve({ stdout: sanitizeText(stdout), stderr: sanitizeText(stderr) });
    });
  });

const isLikelySpawnCommandNotFound = (error) => {
  const message = sanitizeText(error?.message || '').toLowerCase();
  return (
    message.includes('enoent')
    || message.includes('not recognized as an internal or external command')
    || message.includes('no such file or directory')
    || message.includes('cannot find the file specified')
  );
};

const getPythonCommandCandidates = () => {
  const preferred = sanitizeText(process.env.PYTHON_BIN || process.env.PYTHON_PATH || '');
  return Array.from(
    new Set(
      [preferred, 'python', 'python3', 'python.exe', 'py']
        .map((candidate) => sanitizeText(candidate))
        .filter(Boolean)
    )
  );
};

const runPythonProcess = async ({ args = [], cwd }) => {
  const candidates = getPythonCommandCandidates();
  let lastError = null;
  const tried = [];

  for (const command of candidates) {
    try {
      const result = await runProcess({ command, args, cwd });
      return { ...result, command, tried };
    } catch (error) {
      lastError = error;
      tried.push(command);
      if (!isLikelySpawnCommandNotFound(error)) {
        throw error;
      }
    }
  }

  const triedCommands = tried.join(', ');
  throw new Error(
    `Python executable not found. Tried: ${triedCommands}. Set PYTHON_BIN (or PYTHON_PATH) to a valid Python executable path.`
  );
};

const ensureRenderedVideoExists = (outputFile = '', context = 'video render') => {
  const safeOutputFile = sanitizeText(outputFile);
  if (!safeOutputFile || !fs.existsSync(safeOutputFile)) {
    throw new Error(`${context} did not produce an output MP4 file.`);
  }
  const stats = fs.statSync(safeOutputFile);
  if (!stats || !Number.isFinite(stats.size) || stats.size < 2048) {
    throw new Error(`${context} output MP4 is invalid or too small.`);
  }
};

const isCommandAvailable = (command = '', args = ['--version']) => {
  const cleanCommand = sanitizeText(command);
  if (!cleanCommand) return false;
  try {
    const probe = spawnSync(cleanCommand, args, { stdio: 'ignore' });
    return probe?.status === 0;
  } catch (_error) {
    return false;
  }
};

const summarizeHybridRenderMeta = (sceneRenderMeta = []) => {
  const items = Array.isArray(sceneRenderMeta) ? sceneRenderMeta : [];
  const phase2Count = items.filter((item) => String(item?.renderEngine || '') === 'animatediff_openpose_hybrid_scene').length;
  const cogCount = items.filter((item) => String(item?.renderEngine || '') === 'cogvideox_hybrid_scene').length;
  const fallbackCount = items.filter((item) => {
    const engine = String(item?.renderEngine || '').toLowerCase();
    return engine.includes('fallback');
  }).length;
  const warnings = items
    .map((item) => sanitizeText(item?.warning || ''))
    .filter(Boolean)
    .slice(0, 6);

  return {
    totalScenes: items.length,
    phase2SceneCount: phase2Count,
    cogSceneCount: cogCount,
    fallbackSceneCount: fallbackCount,
    warnings,
  };
};

const getKidsVideoGeneratorCapabilities = () => {
  const pythonCommands = getPythonCommandCandidates();
  const hasPython = pythonCommands.some((candidate) => isCommandAvailable(candidate, ['--version']));
  const hasFfmpeg = isCommandAvailable(resolveFfmpegBinary(), ['-version']);

  const cogScriptPath = path.join(__dirname, '..', 'scripts', 'cogvideox_text_to_video.py');
  const phase2ScriptPath = path.join(__dirname, '..', 'scripts', 'animatediff_openpose_scene_video.py');
  const hasCogScript = fs.existsSync(cogScriptPath);
  const hasPhase2Script = fs.existsSync(phase2ScriptPath);

  const hybridMotionAvailable = hasPython && hasFfmpeg && hasCogScript;
  const hybridPhase2Available = hybridMotionAvailable && hasPhase2Script;

  const reasons = [];
  if (!hasPython) reasons.push('Python runtime unavailable on server');
  if (!hasFfmpeg) reasons.push('FFmpeg unavailable on server');
  if (!hasCogScript) reasons.push('CogVideoX script missing');
  if (!hasPhase2Script) reasons.push('AnimateDiff/OpenPose phase2 script missing');

  return {
    pythonAvailable: hasPython,
    ffmpegAvailable: hasFfmpeg,
    hybridMotionAvailable,
    hybridPhase2Available,
    reasons,
  };
};

const buildRabbitTortoiseStory = () => ({
  title: 'The Rabbit and the Tortoise',
  synopsis: 'A speedy rabbit laughs at a calm tortoise, but a race teaches everyone that patience and consistency matter.',
  moral: 'Slow and steady wins the race.',
  characters: [
    {
      id: 'char-rabbit',
      name: 'Rabbit',
      role: 'Fast Challenger',
      appearance: 'white rabbit with long ears, bright red scarf, expressive eyes',
      colorPalette: ['white', 'red', 'gold'],
    },
    {
      id: 'char-tortoise',
      name: 'Tortoise',
      role: 'Steady Hero',
      appearance: 'green tortoise with patterned shell and calm smile',
      colorPalette: ['green', 'olive', 'teal'],
    },
  ],
  scenes: [
    {
      id: 1,
      title: 'Opening',
      description: 'Rabbit boasts about speed while Tortoise stays calm and kind.',
      dialogue: 'Rabbit: I am the fastest in the forest!\\nTortoise: Speed is nice, but I will keep trying.',
      emotion: 'wonder',
      durationSeconds: 4,
    },
    {
      id: 2,
      title: 'Challenge',
      description: 'The forest friends organize a race and cheer for both runners.',
      dialogue: 'Rabbit: This race will be easy for me.\\nTortoise: I will take one step at a time.',
      emotion: 'curious',
      durationSeconds: 4,
    },
    {
      id: 3,
      title: 'Journey',
      description: 'Rabbit runs far ahead and decides to rest, while Tortoise keeps moving steadily.',
      dialogue: 'Rabbit: I can rest for a minute and still win.\\nTortoise: Slow and steady, I keep going.',
      emotion: 'brave',
      durationSeconds: 4,
    },
    {
      id: 4,
      title: 'Climax',
      description: 'Rabbit wakes up and sprints, but Tortoise is already near the finish line.',
      dialogue: 'Rabbit: Oh no, I slept too long!\\nTortoise: I am almost there. Keep moving!',
      emotion: 'tense',
      durationSeconds: 4,
    },
    {
      id: 5,
      title: 'Ending',
      description: 'Tortoise wins the race, and Rabbit learns to respect patience and hard work.',
      dialogue: 'Rabbit: I learned my lesson today.\\nTortoise: Patience and effort help us succeed.',
      emotion: 'joyful',
      durationSeconds: 4,
    },
  ],
});

const buildRamaSitaSwayamvaramStory = () => ({
  title: 'Rama and Sita Swayamvaram',
  synopsis:
    "In King Janaka's court at Mithila, a sacred challenge is announced: whoever can lift and string Shiva's mighty bow will win Sita's hand.",
  moral: 'Strength with humility and dharma leads to true victory.',
  characters: [
    {
      id: 'char-rama',
      name: 'Rama',
      role: 'Prince of Ayodhya',
      appearance: 'calm prince in royal attire with a kind expression',
      colorPalette: ['#60a5fa', '#1e3a8a', '#facc15'],
    },
    {
      id: 'char-sita',
      name: 'Sita',
      role: 'Princess of Mithila',
      appearance: 'graceful princess with a flower garland and serene smile',
      colorPalette: ['#f9a8d4', '#be185d', '#fde68a'],
    },
  ],
  scenes: [
    {
      id: 1,
      title: 'Mithila Court',
      description: 'King Janaka welcomes great princes and announces the swayamvaram challenge.',
      dialogue: "Janaka: Whoever strings Shiva's bow shall wed Sita.\\nSita: I pray for a noble and righteous heart.",
      emotion: 'wonder',
      durationSeconds: 4,
    },
    {
      id: 2,
      title: 'The Challenge',
      description: 'Many warriors try to move the sacred bow, but none can lift it.',
      dialogue: 'Princes: This bow is too heavy!\\nLakshmana: Brother Rama, your time has come.',
      emotion: 'curious',
      durationSeconds: 4,
    },
    {
      id: 3,
      title: 'Rama Lifts the Bow',
      description: 'Rama bows to the sages, lifts Shiva dhanush with ease, and begins to string it.',
      dialogue: 'Rama: With blessings of guru and dharma, I shall try.\\nCrowd: Jai! Jai!',
      emotion: 'brave',
      durationSeconds: 4,
    },
    {
      id: 4,
      title: 'The Sacred Moment',
      description: 'The great bow breaks with a thunderous sound, and the hall is filled with awe.',
      dialogue: 'Janaka: Glory to Rama!\\nSita: My heart has chosen with faith and joy.',
      emotion: 'tense',
      durationSeconds: 4,
    },
    {
      id: 5,
      title: 'Garland and Blessings',
      description: 'Sita garlands Rama, and everyone celebrates their union with blessings.',
      dialogue: 'Sita: I offer this garland to Rama.\\nRama: Together we shall walk the path of dharma.',
      emotion: 'joyful',
      durationSeconds: 4,
    },
  ],
});

const extractPromptCharacters = (prompt = '') => {
  const lowered = sanitizeText(prompt).toLowerCase();
  const known = [
    'rabbit', 'tortoise', 'turtle', 'fox', 'squirrel', 'lion', 'bear', 'cat', 'dog',
    'elephant', 'monkey', 'deer', 'owl', 'bird', 'horse', 'goat', 'cow', 'camel',
    'rama', 'sita', 'lakshmana', 'janaka',
  ];
  const picked = known.filter((name) => new RegExp(`\\b${name}\\b`).test(lowered)).slice(0, 2);
  if (!picked.length) return [];
  return picked.map((name, index) => ({
    id: `char-${name}`,
    name: name.charAt(0).toUpperCase() + name.slice(1),
    role: index === 0 ? 'Main Character' : 'Support Friend',
    appearance: `friendly ${name} character with expressive eyes`,
    colorPalette: index === 0 ? ['sky blue', 'sunny yellow', 'mint'] : ['peach', 'teal', 'cream'],
  }));
};

const buildGenericStory = (prompt = '', sceneCount = 5) => {
  const cleanPrompt = sanitizeText(prompt);
  const extractedCharacters = extractPromptCharacters(cleanPrompt);
  const characters = extractedCharacters.length
    ? extractedCharacters
    : [
        {
          id: 'char-hero',
          name: 'Hero',
          role: 'Main Character',
          appearance: 'friendly child hero with colorful outfit',
          colorPalette: ['sky blue', 'sunny yellow', 'mint'],
        },
        {
          id: 'char-guide',
          name: 'Guide',
          role: 'Support Friend',
          appearance: 'wise companion with warm smile',
          colorPalette: ['peach', 'teal', 'cream'],
        },
      ];
  const leadName = sanitizeText(characters[0]?.name || 'Hero');
  const supportName = sanitizeText(characters[1]?.name || 'Guide');
  const lines = cleanPrompt
    .split(/[\.\?\!]+/)
    .map((line) => sanitizeText(line))
    .filter(Boolean);
  const beats = lines.length ? lines : ['A child begins a magical journey and learns a kind lesson.'];
  const count = Math.max(3, Math.min(8, Number(sceneCount) || 5));

  const scenes = Array.from({ length: count }).map((_, index) => {
    const base = beats[index % beats.length];
    const background = index === 1 ? 'forest clearing' : index === 2 ? 'sparkling river' : 'storybook meadow';
    const weather = index === 3 ? 'breezy' : 'sunny';
    const timeOfDay = index === count - 1 ? 'golden hour' : 'morning';
    const cameraActions = ['wide reveal', 'gentle pan', 'tracking move', 'soft zoom', 'dolly in'][index] || 'soft pan';
    const sceneContract = { cameraActions, background, weather, timeOfDay };
    return {
      id: index + 1,
      title: ['Opening', 'Challenge', 'Journey', 'Climax', 'Ending'][index] || `Scene ${index + 1}`,
      description: base,
      dialogue: `${leadName}: ${base}\\n${supportName}: We can do this together.`,
      emotion: index === count - 1 ? 'joyful' : (index === 2 ? 'brave' : 'wonder'),
      durationSeconds: 4,
      cameraActions,
      background,
      weather,
      timeOfDay,
      sceneContract,
      environmentMotifs: normalizeEnvironmentMotifs({ environmentMotifs: [background, weather, timeOfDay] }, sceneContract),
    };
  });

  return {
    title: 'Kids Story Adventure',
    synopsis: cleanPrompt || beats[0],
    moral: 'Kindness and consistency help us succeed.',
    characters,
    scenes,
  };
};

const buildStoryFromInternetContext = (internetStory = {}, sceneCount = 5) => {
  const title = sanitizeText(internetStory?.title || 'Story Adventure');
  const summary = sanitizeInternetSummaryText(internetStory?.summary || '');
  const summarySentences = splitSummarySentences(summary);
  const extractedCharacters = extractPromptCharacters(`${title} ${summary}`);
  const characters = extractedCharacters.length
    ? extractedCharacters
    : [
        {
          id: 'char-hero',
          name: 'Hero',
          role: 'Main Character',
          appearance: 'friendly child hero with colorful outfit',
          colorPalette: ['sky blue', 'sunny yellow', 'mint'],
        },
        {
          id: 'char-guide',
          name: 'Guide',
          role: 'Support Friend',
          appearance: 'wise companion with warm smile',
          colorPalette: ['peach', 'teal', 'cream'],
        },
      ];
  const leadName = sanitizeText(characters[0]?.name || 'Hero');
  const supportName = sanitizeText(characters[1]?.name || 'Guide');
  const count = Math.max(3, Math.min(8, Number(sceneCount) || 5));
  const moral = 'Courage, kindness, and wise choices help everyone grow.';
  const sceneTitles = ['Opening', 'Challenge', 'Journey', 'Climax', 'Ending'];

  const scenes = Array.from({ length: count }).map((_, index) => {
    const sentence = sanitizeText(
      summarySentences[index]
      || summarySentences[summarySentences.length - 1]
      || `A key moment from ${title}.`
    );
    const background = index === 0 ? `${title} world` : index === 2 ? 'adventure pathway' : 'storybook landscape';
    const weather = index === 3 ? 'light wind' : 'clear';
    const timeOfDay = index === count - 1 ? 'sunset' : 'daytime';
    const cameraActions = ['wide reveal', 'gentle pan', 'tracking move', 'soft zoom', 'dolly in'][index] || 'soft pan';
    const sceneContract = { cameraActions, background, weather, timeOfDay };
    return {
      id: index + 1,
      title: sceneTitles[index] || `Scene ${index + 1}`,
      description: sentence,
      dialogue: `${leadName}: ${sentence}\n${supportName}: We can learn from this and move forward together.`,
      emotion: index === count - 1 ? 'joyful' : (index === 2 ? 'brave' : 'wonder'),
      durationSeconds: 4,
      cameraActions,
      background,
      weather,
      timeOfDay,
      sceneContract,
      environmentMotifs: normalizeEnvironmentMotifs({ environmentMotifs: [background, weather, timeOfDay] }, sceneContract),
    };
  });

  return {
    title: title || 'Story Adventure',
    synopsis: sanitizeText(summarySentences.slice(0, 2).join(' ')) || summary || title,
    moral,
    characters,
    scenes,
    source: {
      provider: sanitizeText(internetStory?.provider || 'wikipedia'),
      title: title || 'Story Adventure',
      url: sanitizeText(internetStory?.sourceUrl || ''),
    },
  };
};

const createStoryFromPrompt = async (prompt = '', sceneCount = 5) => {
  const normalized = sanitizeText(prompt).toLowerCase();
  if (
    /\brama\b/.test(normalized)
    && /\bsita\b/.test(normalized)
    && /\b(swayamvar|swayamvaram|shiv|dhanush|janaka|mithila)\b/.test(normalized)
  ) {
    return buildRamaSitaSwayamvaramStory();
  }
  if (/\brabbit\b/.test(normalized) && /\b(tortoise|turtle)\b/.test(normalized)) {
    return buildRabbitTortoiseStory();
  }
  const internetStory = await fetchWikipediaStoryContext(prompt);
  if (internetStory) {
    return buildStoryFromInternetContext(internetStory, sceneCount);
  }
  return buildGenericStory(prompt, sceneCount);
};

const normalizeCharacter = (character = {}, index = 0) => {
  const name = sanitizeText(character?.name) || `Character ${index + 1}`;
  const role = sanitizeText(character?.role) || (index === 0 ? 'Main Character' : 'Support Friend');
  const appearance = sanitizeText(character?.appearance) || `friendly ${name.toLowerCase()} cartoon character with expressive eyes`;
  const colorPalette = Array.isArray(character?.colorPalette) && character.colorPalette.length
    ? character.colorPalette.map((item) => sanitizeText(item)).filter(Boolean).slice(0, 4)
    : (index === 0 ? ['sky blue', 'sunny yellow', 'mint'] : ['peach', 'teal', 'cream']);

  return {
    id: sanitizeText(character?.id) || `char-${safeFileName(name || `character-${index + 1}`) || index + 1}`,
    name,
    role,
    appearance,
    colorPalette,
  };
};

const extractSpeakersFromDialogue = (dialogue = '') => {
  const lines = String(dialogue || '')
    .split(/\r?\n+/)
    .map((line) => sanitizeText(line))
    .filter(Boolean);
  const speakers = [];
  for (const line of lines) {
    const match = line.match(/^([^:]{1,40}):\s*(.+)$/);
    if (!match) continue;
    const speakerName = sanitizeText(match[1]);
    if (speakerName) speakers.push(speakerName);
    if (speakers.length >= 3) break;
  }
  return speakers;
};

const mergeProvidedCharacters = ({ providedCharacters = [], providedScenes = [] }) => {
  const normalized = [];
  const seen = new Set();
  const pushUnique = (character) => {
    const normalizedCharacter = normalizeCharacter(character, normalized.length);
    const key = sanitizeText(normalizedCharacter.name).toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    normalized.push(normalizedCharacter);
  };

  for (const character of Array.isArray(providedCharacters) ? providedCharacters : []) {
    if (normalized.length >= 3) break;
    pushUnique(character);
  }

  if (normalized.length < 2) {
    const sceneList = Array.isArray(providedScenes) ? providedScenes : [];
    for (const scene of sceneList) {
      if (normalized.length >= 3) break;
      const fromDialogue = extractSpeakersFromDialogue(scene?.dialogue || scene?.description || '');
      for (const speakerName of fromDialogue) {
        if (normalized.length >= 3) break;
        pushUnique({ name: speakerName, role: normalized.length === 0 ? 'Main Character' : 'Support Friend' });
      }
    }
  }

  if (normalized.length === 0) {
    pushUnique({ name: 'Hero', role: 'Main Character' });
    pushUnique({ name: 'Guide', role: 'Support Friend' });
  } else if (normalized.length === 1) {
    pushUnique({ name: 'Guide', role: 'Support Friend' });
  }

  return normalized.slice(0, 3);
};

const normalizeSceneContract = (scene = {}, fallbackText = '') => {
  const inputContract = scene?.sceneContract && typeof scene.sceneContract === 'object' ? scene.sceneContract : {};
  const background = sanitizeText(
    inputContract.background
    || scene?.background
    || fallbackText
    || 'storybook landscape'
  );
  const weather = sanitizeText(inputContract.weather || scene?.weather || 'sunny');
  const timeOfDay = sanitizeText(inputContract.timeOfDay || scene?.timeOfDay || 'Morning');
  const cameraActions = sanitizeText(inputContract.cameraActions || scene?.cameraActions || 'soft pan');
  return {
    cameraActions,
    background,
    weather,
    timeOfDay,
  };
};

const normalizeEnvironmentMotifs = (scene = {}, sceneContract = {}) => {
  const inputMotifs = Array.isArray(scene?.environmentMotifs) ? scene.environmentMotifs : [];
  const motifs = [
    ...inputMotifs.map((motif) => sanitizeText(motif)),
    sanitizeText(sceneContract.background),
    sanitizeText(sceneContract.weather),
    sanitizeText(sceneContract.timeOfDay),
  ]
    .map((motif) => motif.toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(motifs)).slice(0, 8);
};

const createStoryFromStructuredInput = ({
  prompt = '',
  sceneCount = 5,
  storyTitle = '',
  providedCharacters = [],
  providedScenes = [],
}) => {
  const characters = mergeProvidedCharacters({
    providedCharacters,
    providedScenes,
  });
  const leadName = sanitizeText(characters[0]?.name || 'Hero');
  const supportName = sanitizeText(characters[1]?.name || leadName);
  const maxScenes = Math.max(3, Math.min(8, Number(sceneCount) || 5));
  const sourceScenes = Array.isArray(providedScenes) ? providedScenes.slice(0, maxScenes) : [];

  const scenes = sourceScenes.map((scene, index) => {
    const title = sanitizeText(scene?.title || `Scene ${index + 1}`);
    const description = sanitizeText(scene?.description || scene?.summary || scene?.dialogue || prompt || title);
    const dialogue = sanitizeText(scene?.dialogue)
      || `${leadName}: ${description}\n${supportName}: We can do this together.`;
    const emotion = sanitizeText(scene?.emotion) || (index === sourceScenes.length - 1 ? 'joyful' : 'wonder');
    const durationSeconds = Math.max(3, Math.min(14, Number(scene?.durationSeconds) || 4));
    const sceneContract = normalizeSceneContract(scene, `${title} ${description}`);
    const environmentMotifs = normalizeEnvironmentMotifs(scene, sceneContract);

    return {
      id: Number(scene?.id) || index + 1,
      title,
      description,
      dialogue,
      emotion,
      durationSeconds,
      cameraActions: sceneContract.cameraActions,
      background: sceneContract.background,
      weather: sceneContract.weather,
      timeOfDay: sceneContract.timeOfDay,
      sceneContract,
      environmentMotifs,
      spokenLines: Array.isArray(scene?.spokenLines) ? scene.spokenLines.slice(0, 12) : [],
    };
  });

  return {
    title: sanitizeText(storyTitle) || 'Kids Story Adventure',
    synopsis: sanitizeText(prompt) || sanitizeText(scenes[0]?.description || ''),
    moral: 'Kindness and consistency help us succeed.',
    characters,
    scenes,
  };
};

const wrapText = (value = '', maxChars = 44, maxLines = 4) => {
  const words = sanitizeText(value).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= maxChars) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length >= maxLines - 1) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines.length ? lines : [''];
};

const escapeForDrawText = (value = '') =>
  String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/,/g, '\\,')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/%/g, '\\%')
    .replace(/\r?\n/g, '\\n');

const buildTimedSubtitleSegments = ({
  text = '',
  spokenLines = [],
  duration = 4,
  maxCharsPerLine = 46,
  maxLinesPerSegment = 3,
  minSegmentDuration = 1.2,
  readingRate = 2.2,
}) => {
  const normalizedSpokenLines = (Array.isArray(spokenLines) ? spokenLines : [])
    .map((line) => {
      if (typeof line === 'string') {
        return sanitizeText(line.replace(/^[^:]{1,40}:\s*/, ''));
      }
      if (!line || typeof line !== 'object') return '';
      const textPart = sanitizeText(line.text || line.dialogue || line.caption || '');
      const speakerPart = sanitizeText(line.speaker || '');
      return textPart || speakerPart;
    })
    .filter(Boolean);

  if (normalizedSpokenLines.length > 0) {
    const lineSegments = [];
    for (const line of normalizedSpokenLines) {
      const words = line.split(/\s+/).filter(Boolean);
      if (!words.length) continue;
      const wrapped = [];
      let activeLine = '';
      for (const word of words) {
        const next = activeLine ? `${activeLine} ${word}` : word;
        if (next.length <= maxCharsPerLine) {
          activeLine = next;
          continue;
        }
        if (activeLine) wrapped.push(activeLine);
        activeLine = word;
      }
      if (activeLine) wrapped.push(activeLine);
      for (let i = 0; i < wrapped.length; i += maxLinesPerSegment) {
        lineSegments.push(wrapped.slice(i, i + maxLinesPerSegment));
      }
    }

    if (lineSegments.length > 0) {
      const gap = 0.05;
      const segmentDurations = lineSegments.map((lines) => {
        const wordCount = lines.join(' ').split(/\s+/).filter(Boolean).length;
        return Math.max(minSegmentDuration, (wordCount / readingRate) + 0.22);
      });
      const estimatedTotal = segmentDurations.reduce((sum, value) => sum + value, 0)
        + gap * Math.max(0, lineSegments.length - 1);
      const scale = estimatedTotal > duration ? duration / estimatedTotal : 1;
      const adjusted = segmentDurations.map((value) => value * scale);
      const adjustedTotal = adjusted.reduce((sum, value) => sum + value, 0)
        + gap * Math.max(0, lineSegments.length - 1);
      if (adjustedTotal < duration && adjusted.length) {
        adjusted[adjusted.length - 1] += duration - adjustedTotal;
      }

      const timedFromSpoken = [];
      let currentStart = 0;
      for (let i = 0; i < lineSegments.length; i += 1) {
        const start = Math.min(duration, currentStart);
        const end = Math.min(duration, start + adjusted[i]);
        timedFromSpoken.push({ lines: lineSegments[i], start, end });
        currentStart = end + gap;
      }
      if (timedFromSpoken.length && timedFromSpoken[timedFromSpoken.length - 1].end < duration) {
        timedFromSpoken[timedFromSpoken.length - 1].end = duration;
      }
      return timedFromSpoken;
    }
  }

  const normalizedText = sanitizeText(String(text || '')).replace(/\s*\n+\s*/g, ' ').trim();
  const words = normalizedText.split(/\s+/).filter(Boolean);
  const rawLines = [];
  let currentLine = '';

  for (const word of words) {
    const next = currentLine ? `${currentLine} ${word}` : word;
    if (next.length <= maxCharsPerLine) {
      currentLine = next;
      continue;
    }
    if (currentLine) rawLines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) rawLines.push(currentLine);
  if (!rawLines.length) {
    return [{ lines: [''], start: 0, end: duration }];
  }

  const segments = [];
  for (let i = 0; i < rawLines.length; i += maxLinesPerSegment) {
    segments.push(rawLines.slice(i, i + maxLinesPerSegment));
  }

  const gap = 0.05;
  const segmentDurations = segments.map((lines) => {
    const wordCount = lines.join(' ').split(/\s+/).filter(Boolean).length;
    return Math.max(minSegmentDuration, (wordCount / readingRate) + 0.35);
  });

  const estimatedTotal = segmentDurations.reduce((sum, value) => sum + value, 0)
    + gap * Math.max(0, segments.length - 1);
  const scale = estimatedTotal > duration ? duration / estimatedTotal : 1;
  const adjustedDurations = segmentDurations.map((d) => d * scale);
  const finalTotal = adjustedDurations.reduce((sum, value) => sum + value, 0)
    + gap * Math.max(0, segments.length - 1);

  if (finalTotal < duration && adjustedDurations.length) {
    adjustedDurations[adjustedDurations.length - 1] += duration - finalTotal;
  }

  const timedSegments = [];
  let currentStart = 0;
  for (let i = 0; i < segments.length; i += 1) {
    const segmentDuration = adjustedDurations[i];
    const start = Math.min(duration, currentStart);
    const end = Math.min(duration, start + segmentDuration);
    timedSegments.push({ lines: segments[i], start, end });
    currentStart = end + gap;
  }

  if (timedSegments.length && timedSegments[timedSegments.length - 1].end < duration) {
    timedSegments[timedSegments.length - 1].end = duration;
  }

  return timedSegments;
};

const buildTimedSubtitleFilter = ({
  text = '',
  spokenLines = [],
  duration = 4,
  width = 1280,
  height = 720,
  maxCharsPerLine = 46,
  maxLinesPerSegment = 3,
}) => {
  const segments = buildTimedSubtitleSegments({
    text,
    spokenLines,
    duration,
    maxCharsPerLine,
    maxLinesPerSegment,
  });

  const maxSegmentLines = Math.max(...segments.map((segment) => segment.lines.length));
  const subtitleBoxHeight = Math.max(96, Math.min(230, 62 + (maxSegmentLines * 28)));
  const subtitleMargin = Math.max(20, Math.round(height * 0.04));
  const subtitleY = Math.max(10, height - subtitleBoxHeight - subtitleMargin);
  const subtitleX = Math.max(20, Math.round(width * 0.04));
  const subtitleWidth = Math.max(220, width - (subtitleX * 2));
  const subtitleFontSize = Math.max(20, Math.min(44, Math.round(Math.min(width, height) * 0.038)));
  const lineSpacing = Math.max(6, Math.round(subtitleFontSize * 0.24));

  const boxStart = segments[0].start.toFixed(2);
  const boxEnd = segments[segments.length - 1].end.toFixed(2);
  const drawBox = `drawbox=x=${subtitleX}:y=${subtitleY}:w=${subtitleWidth}:h=${subtitleBoxHeight}:color=black@0.48:t=fill:enable='between(t,${boxStart},${boxEnd})'`;

  const textFilters = segments.map((segment) => {
    const segmentText = escapeForDrawText(segment.lines.join('\n'));
    const start = segment.start.toFixed(2);
    const end = segment.end.toFixed(2);
    return `drawtext=text='${segmentText}':fontcolor=white:fontsize=${subtitleFontSize}:line_spacing=${lineSpacing}:x=(w-text_w)/2:y=${subtitleY + Math.round(subtitleBoxHeight * 0.2)}:shadowx=2:shadowy=2:shadowcolor=black@0.85:enable='between(t,${start},${end})'`;
  });

  return `${drawBox},${textFilters.join(',')}`;
};

const escapeXml = (value = '') =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const buildSceneCharacterSvg = ({ character = {}, index = 0, width = 1280, height = 720 }) => {
  const baseX = index === 0 ? Math.round(width * 0.3) : Math.round(width * 0.68);
  const headY = Math.round(height * 0.36);
  const bodyY = headY + 60;
  const accent = escapeXml(character?.colorPalette?.[1] || (index === 0 ? '#f97316' : '#0ea5e9'));
  const body = escapeXml(character?.colorPalette?.[0] || (index === 0 ? '#fb7185' : '#14b8a6'));
  const label = escapeXml(sanitizeText(character?.name || `Character ${index + 1}`));
  const animalHint = `${sanitizeText(character?.name)} ${sanitizeText(character?.appearance)}`.toLowerCase();

  if (animalHint.includes('lion')) {
    return `
      <g transform="translate(${baseX},0)">
        <ellipse cx="0" cy="${headY + 138}" rx="72" ry="24" fill="#00000022"/>
        <circle cx="0" cy="${headY}" r="52" fill="#b45309"/>
        <circle cx="0" cy="${headY}" r="40" fill="#f59e0b" stroke="#78350f" stroke-width="3"/>
        <circle cx="-14" cy="${headY - 8}" r="5" fill="#111827"/>
        <circle cx="14" cy="${headY - 8}" r="5" fill="#111827"/>
        <path d="M -16 ${headY + 14} Q 0 ${headY + 24} 16 ${headY + 14}" fill="none" stroke="#7c2d12" stroke-width="4" stroke-linecap="round"/>
        <rect x="-34" y="${bodyY}" width="68" height="92" rx="24" fill="${body}" stroke="#78350f" stroke-width="3"/>
        <circle cx="-34" cy="${bodyY + 26}" r="12" fill="${accent}" />
        <circle cx="34" cy="${bodyY + 26}" r="12" fill="${accent}" />
        <rect x="-24" y="${bodyY + 90}" width="18" height="42" rx="9" fill="#92400e"/>
        <rect x="6" y="${bodyY + 90}" width="18" height="42" rx="9" fill="#92400e"/>
        <text x="0" y="${bodyY + 154}" font-size="22" text-anchor="middle" fill="#0f172a">${label}</text>
      </g>`;
  }

  if (animalHint.includes('cat')) {
    return `
      <g transform="translate(${baseX},0)">
        <ellipse cx="0" cy="${headY + 138}" rx="72" ry="24" fill="#00000022"/>
        <polygon points="-22,${headY - 40} -8,${headY - 70} -2,${headY - 38}" fill="#d97706"/>
        <polygon points="22,${headY - 40} 8,${headY - 70} 2,${headY - 38}" fill="#d97706"/>
        <circle cx="0" cy="${headY}" r="42" fill="#fbbf24" stroke="#78350f" stroke-width="3"/>
        <circle cx="-14" cy="${headY - 8}" r="5" fill="#111827"/>
        <circle cx="14" cy="${headY - 8}" r="5" fill="#111827"/>
        <path d="M -14 ${headY + 16} Q 0 ${headY + 24} 14 ${headY + 16}" fill="none" stroke="#7c2d12" stroke-width="3" stroke-linecap="round"/>
        <line x1="-44" y1="${headY + 6}" x2="-20" y2="${headY + 10}" stroke="#7c2d12" stroke-width="2"/>
        <line x1="44" y1="${headY + 6}" x2="20" y2="${headY + 10}" stroke="#7c2d12" stroke-width="2"/>
        <rect x="-30" y="${bodyY}" width="60" height="88" rx="22" fill="${body}" stroke="#78350f" stroke-width="3"/>
        <path d="M 32 ${bodyY + 54} Q 66 ${bodyY + 30} 58 ${bodyY + 6}" fill="none" stroke="#92400e" stroke-width="7" stroke-linecap="round"/>
        <rect x="-22" y="${bodyY + 86}" width="16" height="40" rx="8" fill="#92400e"/>
        <rect x="6" y="${bodyY + 86}" width="16" height="40" rx="8" fill="#92400e"/>
        <text x="0" y="${bodyY + 150}" font-size="22" text-anchor="middle" fill="#0f172a">${label}</text>
      </g>`;
  }

  return `
      <g transform="translate(${baseX},0)">
        <ellipse cx="0" cy="${headY + 138}" rx="72" ry="24" fill="#00000022"/>
        <circle cx="0" cy="${headY}" r="46" fill="#fef3c7" stroke="#1f2937" stroke-width="3"/>
        <circle cx="-14" cy="${headY - 8}" r="5" fill="#111827"/>
        <circle cx="14" cy="${headY - 8}" r="5" fill="#111827"/>
        <path d="M -16 ${headY + 14} Q 0 ${headY + 27} 16 ${headY + 14}" fill="none" stroke="#7c2d12" stroke-width="4" stroke-linecap="round"/>
        <rect x="-34" y="${bodyY}" width="68" height="92" rx="24" fill="${body}" stroke="#0f172a" stroke-width="3"/>
        <circle cx="-34" cy="${bodyY + 26}" r="12" fill="${accent}" />
        <circle cx="34" cy="${bodyY + 26}" r="12" fill="${accent}" />
        <rect x="-24" y="${bodyY + 90}" width="18" height="42" rx="9" fill="#334155"/>
        <rect x="6" y="${bodyY + 90}" width="18" height="42" rx="9" fill="#334155"/>
        <text x="0" y="${bodyY + 154}" font-size="22" text-anchor="middle" fill="#0f172a">${label}</text>
      </g>`;
};

const buildSceneSvg = (scene, story, width, height) => {
  const sceneTitle = escapeXml(sanitizeText(scene.title || 'Scene'));
  const textSource = sanitizeText(scene.dialogue || scene.description || '');
  const descLines = wrapText(textSource, 42, 3);
  const sceneCharacters = Array.isArray(scene?.characters) ? scene.characters : [];
  const storyCharacters = Array.isArray(story?.characters) ? story.characters : [];
  const characters = (sceneCharacters.length ? sceneCharacters : storyCharacters).slice(0, 2);
  const characterSvgs = characters
    .map((char, index) => buildSceneCharacterSvg({ character: char, index, width, height }))
    .join('');
  const contractInput = scene?.sceneContract && typeof scene.sceneContract === 'object' ? scene.sceneContract : {};
  const sceneContract = {
    cameraActions: sanitizeText(contractInput.cameraActions || scene.cameraActions || 'soft pan'),
    background: sanitizeText(contractInput.background || scene.background || scene.title || scene.description || 'storybook landscape'),
    weather: sanitizeText(contractInput.weather || scene.weather || 'sunny'),
    timeOfDay: sanitizeText(contractInput.timeOfDay || scene.timeOfDay || 'Morning'),
  };
  const environmentMotifs = Array.from(
    new Set(
      [
        ...(Array.isArray(scene?.environmentMotifs) ? scene.environmentMotifs : []),
        sceneContract.background,
        sceneContract.weather,
        sceneContract.timeOfDay,
      ]
        .map((item) => sanitizeText(item))
        .filter(Boolean)
    )
  );
  const palette = getSceneBackgroundPalette(sceneContract);
  const environmentDecor = buildSceneEnvironmentDecor({
    background: sceneContract.background,
    weather: sceneContract.weather,
    timeOfDay: sceneContract.timeOfDay,
    width,
    height,
  });
  const descSvg = descLines
    .map((line, idx) => `<text x="92" y="${Math.round(height * 0.72) + (idx * 32)}" font-size="28" fill="#0f172a">${escapeXml(line)}</text>`)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${palette.sky[0]}"/>
        <stop offset="100%" stop-color="${palette.sky[1]}"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#sky)"/>
    ${environmentDecor}
    <rect x="0" y="${Math.round(height * 0.62)}" width="${width}" height="${Math.round(height * 0.38)}" fill="${palette.ground}" opacity="0.98"/>
    <text x="72" y="88" font-size="52" font-weight="800" fill="${palette.accent}">${sceneTitle}</text>
    <text x="74" y="128" font-size="22" fill="#f8fafc">Camera: ${escapeXml(sceneContract.cameraActions)}</text>
    <text x="74" y="158" font-size="20" fill="#f8fafc">Motifs: ${escapeXml(environmentMotifs.join(', '))}</text>
    ${characterSvgs}
    <rect x="64" y="${Math.round(height * 0.66)}" width="${width - 128}" height="${Math.round(height * 0.28)}" rx="26" fill="#ffffffdd" stroke="#475569" stroke-width="3"/>
    ${descSvg}
  </svg>`;
};

const generateSceneImage = async ({ scene, story, outputPath, width, height }) => {
  const attempts = ['scene_svg_character_layout'];
  const svg = buildSceneSvg(scene, story, width, height);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(outputPath);
  return { generatedByAi: false, attempts };
};

const getSceneBackgroundPalette = ({ background = '', weather = '', timeOfDay = '' }) => {
  const normalized = String(`${background} ${weather} ${timeOfDay}`).toLowerCase();
  const sky = /dusk|evening/.test(normalized)
    ? ['#fbbf24', '#7c3aed']
    : /dawn|morning/.test(normalized)
      ? ['#cffafe', '#bfdbfe']
      : /night/.test(normalized)
        ? ['#0f172a', '#312e81']
        : ['#7dd3fc', '#bae6fd'];
  const ground = /snow/.test(normalized)
    ? '#e2e8f0'
    : /rain|storm/.test(normalized)
      ? '#64748b'
      : /forest|jungle|tree/.test(normalized)
        ? '#4d7c0f'
        : /river|beach|ocean/.test(normalized)
          ? '#60a5fa'
          : '#86efac';
  const accent = /sunset|golden/.test(normalized)
    ? '#f97316'
    : /mystic|magic/.test(normalized)
      ? '#8b5cf6'
      : '#facc15';
  return { sky, ground, accent };
};

const buildSceneEnvironmentDecor = ({ background = '', weather = '', timeOfDay = '', width = 1280, height = 720 }) => {
  const normalized = String(`${background} ${weather} ${timeOfDay}`).toLowerCase();
  const elements = [];
  const baseY = Math.round(height * 0.62);

  if (/forest|trees|jungle/.test(normalized)) {
    const treeX = Math.round(width * 0.16);
    elements.push(`
      <path d="M ${treeX} ${baseY} l -16 0 l 10 -58 l -14 0 l 20 -40 l 20 40 l -14 0 l 10 58 z" fill="#166534"/>`);
    elements.push(`
      <path d="M ${treeX + 220} ${baseY} l -16 0 l 10 -52 l -14 0 l 20 -36 l 20 36 l -14 0 l 10 52 z" fill="#15803d"/>`);
  }

  if (/river|ocean|beach|water/.test(normalized)) {
    elements.push(`
      <path d="M 0 ${baseY + 40} C ${Math.round(width * 0.25)} ${baseY + 10}, ${Math.round(width * 0.5)} ${baseY + 80}, ${Math.round(width * 0.75)} ${baseY + 20} S ${width} ${baseY + 90}, ${width} ${baseY + 40} L ${width} ${height} L 0 ${height} Z" fill="#38bdf8" opacity="0.85"/>`);
  }

  if (/castle|tower|castle/.test(normalized)) {
    elements.push(`
      <rect x="${Math.round(width * 0.7)}" y="${baseY - 180}" width="76" height="132" rx="12" fill="#c7d2fe" stroke="#4338ca" stroke-width="4"/>`);
    elements.push(`
      <polygon points="${Math.round(width * 0.7)} ${baseY - 180} ${Math.round(width * 0.75)} ${baseY - 240} ${Math.round(width * 0.81)} ${baseY - 180}" fill="#4338ca"/>`);
  }

  if (/cloud|overcast|storm|rain/.test(normalized)) {
    elements.push(`
      <ellipse cx="${Math.round(width * 0.22)}" cy="${Math.round(height * 0.18)}" rx="72" ry="32" fill="#ffffffcc"/>`);
    elements.push(`
      <ellipse cx="${Math.round(width * 0.36)}" cy="${Math.round(height * 0.16)}" rx="94" ry="38" fill="#e2e8f0cc"/>`);
  }

  if (/rain/.test(normalized)) {
    for (let i = 0; i < 8; i += 1) {
      const x = 80 + i * 120;
      elements.push(`<line x1="${x}" y1="${Math.round(height * 0.22)}" x2="${x + 12}" y2="${Math.round(height * 0.32)}" stroke="#93c5fd" stroke-width="3" opacity="0.72"/>`);
    }
  }

  if (/snow/.test(normalized)) {
    for (let i = 0; i < 6; i += 1) {
      const x = 120 + i * 180;
      elements.push(`<circle cx="${x}" cy="${Math.round(height * 0.14)}" r="8" fill="#ffffffdd"/>`);
    }
  }

  if (/night/.test(normalized)) {
    elements.push(`
      <circle cx="${Math.round(width * 0.82)}" cy="${Math.round(height * 0.18)}" r="28" fill="#f8fafc" opacity="0.95"/>`);
  } else {
    elements.push(`
      <circle cx="${Math.round(width * 0.12)}" cy="${Math.round(height * 0.16)}" r="40" fill="#fde047" opacity="0.95"/>`);
  }

  return elements.join('');
};

const buildTransitionSvg = ({ fromScene = {}, toScene = {}, width = 1280, height = 720 }) => {
  const fromTitle = escapeXml(sanitizeText(fromScene.title || 'Previous Scene'));
  const toTitle = escapeXml(sanitizeText(toScene.title || 'Next Scene'));
  const previewText = escapeXml(sanitizeText(toScene.description || toScene.dialogue || toScene.title || 'A new scene unfolds.'));
  const contract = toScene.sceneContract || {
    background: toScene.background || 'storybook landscape',
    weather: toScene.weather || 'clear',
    timeOfDay: toScene.timeOfDay || 'Day',
  };
  const { sky, ground } = getSceneBackgroundPalette(contract);
  const environmentDecor = buildSceneEnvironmentDecor({
    background: contract.background,
    weather: contract.weather,
    timeOfDay: contract.timeOfDay,
    width,
    height,
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="transitionSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${sky[0]}"/>
        <stop offset="100%" stop-color="${sky[1]}"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#transitionSky)"/>
    ${environmentDecor}
    <rect x="${Math.round(width * 0.06)}" y="${Math.round(height * 0.58)}" width="${Math.round(width * 0.88)}" height="${Math.round(height * 0.28)}" rx="28" fill="#000000cc"/>
    <text x="${Math.round(width * 0.08)}" y="${Math.round(height * 0.66)}" font-size="42" font-weight="700" fill="#fbf8ff">${fromTitle}</text>
    <text x="${Math.round(width * 0.08)}" y="${Math.round(height * 0.74)}" font-size="54" font-weight="800" fill="#fde047">→ ${toTitle}</text>
    <text x="${Math.round(width * 0.08)}" y="${Math.round(height * 0.82)}" font-size="28" fill="#e2e8f0" opacity="0.95">${previewText}</text>
  </svg>`;
};

const buildFallbackMotionFilter = ({ duration = 4, width = 1280, height = 720, frames = 96 }) => {
  const zoomStrength = 0.14;
  const swayX = Math.max(8, Math.round(width * 0.012));
  const swayY = Math.max(4, Math.round(height * 0.008));
  const zoomExpr = `1+${zoomStrength}*pow(t/${Math.max(1, duration)},0.85)`;
  const xExpr = `iw/2-(iw/zoom/2)+${swayX}*sin(2*PI*t/${Math.max(3, duration)})`;
  const yExpr = `ih/2-(ih/zoom/2)+${swayY}*cos(2*PI*t/${Math.max(4, duration)})`;
  return `zoompan=z='${zoomExpr}':x='${xExpr}':y='${yExpr}':d=${frames}:s=${width}x${height}:fps=24`;
};

const renderTransitionClip = async ({ fromScene, toScene, index, outputDir, width, height, duration = 1.1, fps = 24 }) => {
  const clipBase = `scene-${String(index + 1).padStart(2, '0')}-transition`;
  const transitionStillPath = path.join(outputDir, `${clipBase}.png`);
  const clipPath = path.join(outputDir, `${clipBase}.mp4`);
  const svg = buildTransitionSvg({ fromScene, toScene, width, height });
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(transitionStillPath);

  const frames = Math.max(1, Math.floor(duration * fps));
  const motionFilter = buildFallbackMotionFilter({ duration, width, height, frames });
  const vf = `${motionFilter},fade=t=in:st=0:d=0.18,fade=t=out:st=${Math.max(0, duration - 0.22)}:d=0.22`;

  await runFfmpeg([
    '-y',
    '-loop', '1',
    '-i', transitionStillPath,
    '-f', 'lavfi',
    '-i', `anullsrc=cl=stereo:r=44100`,
    '-t', `${duration}`,
    '-vf', vf,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-r', `${fps}`,
    '-c:a', 'aac',
    '-shortest',
    clipPath,
  ], outputDir);

  return { clipPath, duration };
};

const renderSceneClip = async ({ scene, index, outputDir, stillPath, width, height, language = 'en' }) => {
  const fps = 24;
  const narrationText = sanitizeText(scene.dialogue || scene.description || scene.title || 'Story scene');
  const wordCount = narrationText ? narrationText.split(/\s+/).filter(Boolean).length : 0;
  const estimatedNarrationSeconds = wordCount > 0 ? (wordCount / 2.2) : 0;
  const duration = Math.max(3, Math.min(14, Math.max(Number(scene.durationSeconds) || 4, estimatedNarrationSeconds)));
  const frames = Math.max(1, Math.floor(duration * fps));
  const clipPath = path.join(outputDir, `scene-${String(index + 1).padStart(2, '0')}.mp4`);
  const speechPath = path.join(outputDir, `scene-${String(index + 1).padStart(2, '0')}-speech.mp3`);
  const tonePath = path.join(outputDir, `scene-${String(index + 1).padStart(2, '0')}-tone.mp3`);
  let audioPath = '';
  let ttsErrorMessage = '';

  try {
    const ttsScriptPath = path.join(__dirname, '..', 'scripts', 'scene_tts.py');
    const languageCode = normalizeLanguageCode(language || 'en');
    await runPythonProcess({
      args: [
        ttsScriptPath,
        '--text', narrationText,
        '--output', speechPath,
        '--lang', languageCode,
      ],
      cwd: path.join(__dirname, '..'),
    });

    if (fs.existsSync(speechPath) && fs.statSync(speechPath).size > 2048) {
      audioPath = speechPath;
    } else {
      ttsErrorMessage = 'scene_tts.py did not produce valid speech audio';
    }
  } catch (error) {
    ttsErrorMessage = sanitizeText(error?.message || 'scene_tts.py failed');
  }

  const allowToneFallback = String(process.env.ALLOW_TONE_FALLBACK || 'false').toLowerCase() === 'true';
  if (!audioPath && allowToneFallback) {
    const baseHz = 260 + ((index * 47) % 190);
    const overHz = baseHz + 120;
    await runFfmpeg([
      '-y',
      '-f', 'lavfi',
      '-i', `aevalsrc=(0.02*sin(2*PI*${baseHz}*t)+0.01*sin(2*PI*${overHz}*t)):s=44100:d=${duration}`,
      '-c:a', 'libmp3lame',
      '-b:a', '96k',
      tonePath,
    ], outputDir);
    audioPath = tonePath;
  }

  if (!audioPath) {
    throw new Error(
      `Voice generation failed for scene ${index + 1}. ${ttsErrorMessage || 'No speech audio created.'}`
    );
  }

  const motionFilter = buildFallbackMotionFilter({
    duration,
    width,
    height,
    frames,
  });

  const subtitleFilter = buildTimedSubtitleFilter({
    text: narrationText,
    spokenLines: Array.isArray(scene?.spokenLines) ? scene.spokenLines : [],
    duration,
    width,
    height,
  });
  const vfWithSubtitles = `${motionFilter},${subtitleFilter},fade=t=in:st=0:d=0.2,fade=t=out:st=${Math.max(0, duration - 0.35)}:d=0.3`;
  const vfWithoutSubtitles = `${motionFilter},fade=t=in:st=0:d=0.2,fade=t=out:st=${Math.max(0, duration - 0.35)}:d=0.3`;

  try {
    await runFfmpeg([
      '-y',
      '-loop', '1',
      '-i', stillPath,
      '-i', audioPath,
      '-t', `${duration}`,
      '-vf', vfWithSubtitles,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-r', `${fps}`,
      '-c:a', 'aac',
      '-shortest',
      clipPath,
    ], outputDir);
  } catch (_subtitleError) {
    await runFfmpeg([
      '-y',
      '-loop', '1',
      '-i', stillPath,
      '-i', audioPath,
      '-t', `${duration}`,
      '-vf', vfWithoutSubtitles,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-r', `${fps}`,
      '-c:a', 'aac',
      '-shortest',
      clipPath,
    ], outputDir);
  }

  return { clipPath, duration };
};

const buildCharacterConsistencyInstruction = (characters = []) => {
  const cleanCharacters = Array.isArray(characters) ? characters : [];
  const characterLines = cleanCharacters
    .map((character, index) => {
      const name = sanitizeText(character?.name || `Character ${index + 1}`);
      const appearance = sanitizeText(character?.appearance || 'friendly cartoon child-safe design');
      const role = sanitizeText(character?.role || 'story character');
      return `${index + 1}. ${name}: ${role}. Appearance: ${appearance}.`;
    })
    .join(' ');

  return [
    'Character consistency rules:',
    'Keep the same character face, body shape, dress, color, age and style in every scene.',
    'Do not change character species, costume, skin/fur color, hairstyle or accessories between scenes.',
    'Use the same character names in narration, subtitles and scene prompts.',
    characterLines ? `Locked character reference: ${characterLines}` : '',
  ]
    .filter(Boolean)
    .join(' ');
};

const buildHybridScenePrompt = ({ scene = {}, story = {}, storyMode = 'moral' }) => {
  const title = sanitizeText(story?.title || story?.storyTitle || 'Kids story');
  const sceneTitle = sanitizeText(scene?.title || 'Story scene');
  const sceneDescription = sanitizeText(scene?.description || scene?.dialogue || '');
  const dialogue = sanitizeText(scene?.dialogue || '');
  const mode = sanitizeText(storyMode || story?.storyMode || 'moral');
  const characters = (Array.isArray(story?.characters) ? story.characters : [])
    .slice(0, 3)
    .map((character) => {
      const name = sanitizeText(character?.name || '');
      const appearance = sanitizeText(character?.appearance || '');
      return `${name}${appearance ? ` (${appearance})` : ''}`;
    })
    .filter(Boolean);
  const languageName = getKidsVideoLanguageName(story?.language || 'en');
  const consistencyInstruction = buildCharacterConsistencyInstruction(story?.characters || []);
  const sceneContract = scene?.sceneContract || {};
  const locationContext = sanitizeText(sceneContract.background || scene?.background || sceneDescription || 'consistent story location');
  const weatherContext = sanitizeText(sceneContract.weather || scene?.weather || 'sunny');
  const timeOfDayContext = sanitizeText(sceneContract.timeOfDay || scene?.timeOfDay || 'daytime');
  const cameraContext = sanitizeText(sceneContract.cameraActions || scene?.cameraActions || 'gentle pan and zoom');
  const environmentMotifs = Array.from(
    new Set(
      [
        ...(Array.isArray(scene?.environmentMotifs) ? scene.environmentMotifs : []),
        locationContext,
        weatherContext,
        timeOfDayContext,
      ]
        .map((item) => sanitizeText(item).toLowerCase())
        .filter(Boolean)
    )
  );

  return [
    `Child-safe animated ${mode} story video scene.`,
    `Language for narration/subtitles: ${languageName}.`,
    `Story title: ${title}.`,
    `Scene title: ${sceneTitle}.`,
    sceneDescription ? `Scene description: ${sceneDescription}.` : '',
    dialogue ? `Dialogue cues: ${dialogue}.` : '',
    characters.length ? `Keep visual consistency for characters: ${characters.join(', ')}.` : '',
    consistencyInstruction,
    `Location identity: ${locationContext}.`,
    `Weather and lighting: ${weatherContext}, ${timeOfDayContext}.`,
    `Camera actions: ${cameraContext}.`,
    environmentMotifs.length ? `Environment motifs lock: ${environmentMotifs.join(', ')}.` : '',
    'Character identity lock: keep each character face, outfit, hairstyle and colors the same across every scene.',
    'Outfit continuity: preserve costume, accessories and color scheme across shots.',
    'Lighting continuity: keep lighting natural and consistent for the time of day.',
    `Environment motifs: ${environmentMotifs.join(', ')}.`,
    'Show clear character movement and emotional body language.',
    'No text overlays, no logos, no watermarks, no violence.',
    'Cinematic camera motion with stable framing and soft lighting.',
  ]
    .filter(Boolean)
    .join(' ');
};

const getSceneHybridMotionIntentScore = (scene = {}) => {
  const sceneContract = scene?.sceneContract || {};
  const cameraActions = sanitizeText(sceneContract.cameraActions || scene?.cameraActions || '');
  const background = sanitizeText(sceneContract.background || scene?.background || '');
  const weather = sanitizeText(sceneContract.weather || scene?.weather || '');
  const timeOfDay = sanitizeText(sceneContract.timeOfDay || scene?.timeOfDay || '');
  const title = sanitizeText(scene?.title || '');
  const description = sanitizeText(scene?.description || scene?.dialogue || '');
  const dialogue = sanitizeText(scene?.dialogue || '');
  const fullText = `${title} ${description} ${dialogue}`.toLowerCase();
  const cameraMotionKeywords = [
    'pan', 'zoom', 'dolly', 'tracking', 'follow', 'orbit', 'tilt', 'slide', 'sweep', 'rotate', 'move', 'push', 'pull', 'crane', 'truck',
  ];
  const cameraStaticKeywords = ['static', 'still', 'locked shot', 'no motion', 'tripod'];
  const motionKeywords = [
    'run', 'running', 'chase', 'jump', 'dance', 'fly', 'swim', 'race', 'sprint', 'walk',
    'climb', 'spin', 'twirl', 'wave', 'hug', 'fight', 'escape', 'roll', 'ride', 'drive', 'sail', 'float', 'travel',
    'explore', 'adventure', 'battle', 'race', 'jumped', 'glide', 'skate', 'slide', 'tumble', 'bounce', 'dash', 'charge',
  ];
  const dynamicLocationKeywords = [
    'river', 'ocean', 'sea', 'beach', 'forest', 'jungle', 'market', 'street', 'city', 'village',
    'train', 'bus', 'road', 'highway', 'mountain', 'desert', 'cave', 'sky', 'space', 'clouds', 'storm',
    'rain', 'snow', 'waterfall', 'bridge', 'garden', 'park', 'field', 'lake', 'train', 'ship', 'castle', 'school',
  ];

  let score = 0;
  const contractCompleteness =
    [cameraActions, background, weather, timeOfDay].filter((item) => sanitizeText(item)).length;
  score += contractCompleteness * 0.2;

  if (cameraActions && cameraMotionKeywords.some((keyword) => cameraActions.toLowerCase().includes(keyword))) {
    score += 3.2;
  }
  if (cameraActions && cameraStaticKeywords.some((keyword) => cameraActions.toLowerCase().includes(keyword))) {
    score -= 1.2;
  }
  if (background && dynamicLocationKeywords.some((keyword) => background.toLowerCase().includes(keyword))) {
    score += 1.4;
  }
  if (dynamicLocationKeywords.some((keyword) => fullText.includes(keyword))) {
    score += 1.4;
  }
  if (weather && /rain|storm|snow|wind|thunder|blizzard|sleet|fog|mist/i.test(weather.toLowerCase())) {
    score += 0.8;
  }
  if (timeOfDay && /dawn|dusk|sunset|sunrise|night|midnight|evening/i.test(timeOfDay.toLowerCase())) {
    score += 0.4;
  }
  if (motionKeywords.some((keyword) => fullText.includes(keyword))) {
    score += 1.6;
  }
  if (background && /ride|race|battle|journey|travel|explore|adventure/.test(background.toLowerCase())) {
    score += 1.2;
  }
  if (/\b(quiet|sit|reading|rest|sleep|calm)\b|talk softly|listen quietly/.test(fullText)) {
    score -= 0.9;
  }
  if (fullText.includes('camera')) {
    score += 0.4;
  }

  return Math.max(0, score);
};

const shouldUseHybridCogScene = (scene = {}) => {
  const score = getSceneHybridMotionIntentScore(scene);
  return score >= 2.7;
};

const renderHybridAnimateDiffSceneClip = async ({
  scene,
  story,
  storyMode = 'moral',
  index,
  outputDir,
  stillPath,
  width,
  height,
  language = 'en',
  strict = false,
}) => {
  const fps = 24;
  const narrationText = sanitizeText(scene?.dialogue || scene?.description || scene?.title || 'Story scene');
  const wordCount = narrationText ? narrationText.split(/\s+/).filter(Boolean).length : 0;
  const estimatedNarrationSeconds = wordCount > 0 ? (wordCount / 2.2) : 0;
  const duration = Math.max(3, Math.min(14, Math.max(Number(scene?.durationSeconds) || 4, estimatedNarrationSeconds)));
  const clipBase = `scene-${String(index + 1).padStart(2, '0')}`;
  const rawClipPath = path.join(outputDir, `${clipBase}-ad-raw.mp4`);
  const clipPath = path.join(outputDir, `${clipBase}.mp4`);
  const speechPath = path.join(outputDir, `${clipBase}-speech.mp3`);
  const tonePath = path.join(outputDir, `${clipBase}-tone.mp3`);
  let audioPath = '';
  let ttsErrorMessage = '';

  const targetFrames = Math.max(16, Math.min(48, Math.round(duration * Math.max(4, Math.min(12, Number(process.env.HF_HYBRID_ANIMATEDIFF_FPS) || 8)))));
  const prompt = `${buildHybridScenePrompt({ scene, story, storyMode })} Dynamic motion emphasis with smooth character animation and stable identity.`;
  const scriptPath = path.join(__dirname, '..', 'scripts', 'animatediff_openpose_scene_video.py');
  const modelId = sanitizeText(process.env.HF_ANIMATEDIFF_MODEL || 'emilianJR/epiCRealism');
  const motionAdapter = sanitizeText(process.env.HF_ANIMATEDIFF_MOTION_ADAPTER || 'guoyww/animatediff-motion-adapter-v1-5-2');
  const controlNet = sanitizeText(process.env.HF_ANIMATEDIFF_CONTROLNET || 'lllyasviel/sd-controlnet-openpose');
  const animSteps = Math.max(8, Math.min(60, Number(process.env.HF_HYBRID_ANIMATEDIFF_STEPS) || 20));
  const animGuidance = Math.max(1, Math.min(15, Number(process.env.HF_HYBRID_ANIMATEDIFF_GUIDANCE) || 7));
  const animWidth = Math.max(384, Math.min(1024, Math.round(width / 2) * 2));
  const animHeight = Math.max(256, Math.min(768, Math.round(height / 2) * 2));
  const animFps = Math.max(4, Math.min(24, Number(process.env.HF_HYBRID_ANIMATEDIFF_FPS) || 8));

  let pythonLog = '';
  try {
    const pythonRun = await runPythonProcess({
      args: [
        scriptPath,
        '--prompt', prompt,
        '--output', rawClipPath,
        '--model', modelId,
        '--motion_adapter', motionAdapter,
        '--controlnet', controlNet,
        '--reference_image', stillPath,
        '--num_frames', `${targetFrames}`,
        '--num_inference_steps', `${animSteps}`,
        '--guidance_scale', `${animGuidance}`,
        '--width', `${animWidth}`,
        '--height', `${animHeight}`,
        '--fps', `${animFps}`,
      ],
      cwd: path.join(__dirname, '..'),
    });
    pythonLog = sanitizeText(pythonRun.stdout || '');
    if (!fs.existsSync(rawClipPath) || fs.statSync(rawClipPath).size < 3000) {
      throw new Error('AnimateDiff phase-2 scene output missing.');
    }
  } catch (error) {
    if (strict) {
      throw error;
    }
    const fallbackClip = await renderSceneClip({
      scene,
      index,
      outputDir,
      stillPath,
      width,
      height,
      language,
    });
    return {
      ...fallbackClip,
      engineUsed: 'scene_image_ffmpeg_fallback',
      generatedByAi: false,
      attempts: ['hybrid_phase2_animatediff_failed_fallback'],
      warning: sanitizeText(error?.message || 'hybrid phase2 animatediff failed'),
      pythonLog,
    };
  }

  try {
    const ttsScriptPath = path.join(__dirname, '..', 'scripts', 'scene_tts.py');
    const languageCode = normalizeLanguageCode(language || 'en');
    await runPythonProcess({
      args: [
        ttsScriptPath,
        '--text', narrationText,
        '--output', speechPath,
        '--lang', languageCode,
      ],
      cwd: path.join(__dirname, '..'),
    });
    if (fs.existsSync(speechPath) && fs.statSync(speechPath).size > 2048) {
      audioPath = speechPath;
    } else {
      ttsErrorMessage = 'scene_tts.py did not produce valid speech audio';
    }
  } catch (error) {
    ttsErrorMessage = sanitizeText(error?.message || 'scene_tts.py failed');
  }

  const allowToneFallback = String(process.env.ALLOW_TONE_FALLBACK || 'false').toLowerCase() === 'true';
  if (!audioPath && allowToneFallback) {
    const baseHz = 260 + ((index * 47) % 190);
    const overHz = baseHz + 120;
    await runFfmpeg([
      '-y',
      '-f', 'lavfi',
      '-i', `aevalsrc=(0.02*sin(2*PI*${baseHz}*t)+0.01*sin(2*PI*${overHz}*t)):s=44100:d=${duration}`,
      '-c:a', 'libmp3lame',
      '-b:a', '96k',
      tonePath,
    ], outputDir);
    audioPath = tonePath;
  }

  if (!audioPath) {
    if (strict) {
      throw new Error(`Voice generation failed for hybrid phase-2 scene ${index + 1}. ${ttsErrorMessage || 'No speech audio created.'}`);
    }
    const fallbackClip = await renderSceneClip({
      scene,
      index,
      outputDir,
      stillPath,
      width,
      height,
      language,
    });
    return {
      ...fallbackClip,
      engineUsed: 'scene_image_ffmpeg_fallback',
      generatedByAi: false,
      attempts: ['hybrid_phase2_tts_failed_fallback'],
      warning: ttsErrorMessage || 'hybrid phase2 tts failed',
      pythonLog,
    };
  }

  const subtitleFilter = buildTimedSubtitleFilter({
    text: narrationText,
    spokenLines: Array.isArray(scene?.spokenLines) ? scene.spokenLines : [],
    duration,
    width,
    height,
  });
  const videoExtendFilter = `tpad=stop_mode=clone:stop_duration=${Math.max(1, Math.ceil(duration))}`;
  const vfWithSubtitles = `${videoExtendFilter},${subtitleFilter},fade=t=in:st=0:d=0.2,fade=t=out:st=${Math.max(0, duration - 0.35)}:d=0.3`;
  const vfWithoutSubtitles = `${videoExtendFilter},fade=t=in:st=0:d=0.2,fade=t=out:st=${Math.max(0, duration - 0.35)}:d=0.3`;

  try {
    await runFfmpeg([
      '-y',
      '-i', rawClipPath,
      '-i', audioPath,
      '-t', `${duration}`,
      '-vf', vfWithSubtitles,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-r', `${fps}`,
      '-c:a', 'aac',
      '-shortest',
      clipPath,
    ], outputDir);
  } catch (_subtitleError) {
    await runFfmpeg([
      '-y',
      '-i', rawClipPath,
      '-i', audioPath,
      '-t', `${duration}`,
      '-vf', vfWithoutSubtitles,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-r', `${fps}`,
      '-c:a', 'aac',
      '-shortest',
      clipPath,
    ], outputDir);
  }

  return {
    clipPath,
    duration,
    engineUsed: 'animatediff_openpose_hybrid_scene',
    generatedByAi: true,
    attempts: ['hybrid_phase2_animatediff_openpose_scene'],
    pythonLog,
  };
};

const renderHybridCogSceneClip = async ({
  scene,
  story,
  storyMode = 'moral',
  index,
  outputDir,
  stillPath,
  width,
  height,
  language = 'en',
  strict = false,
}) => {
  const fps = 24;
  const narrationText = sanitizeText(scene?.dialogue || scene?.description || scene?.title || 'Story scene');
  const wordCount = narrationText ? narrationText.split(/\s+/).filter(Boolean).length : 0;
  const estimatedNarrationSeconds = wordCount > 0 ? (wordCount / 2.2) : 0;
  const duration = Math.max(3, Math.min(14, Math.max(Number(scene?.durationSeconds) || 4, estimatedNarrationSeconds)));
  const clipBase = `scene-${String(index + 1).padStart(2, '0')}`;
  const rawClipPath = path.join(outputDir, `${clipBase}-cog-raw.mp4`);
  const clipPath = path.join(outputDir, `${clipBase}.mp4`);
  const speechPath = path.join(outputDir, `${clipBase}-speech.mp3`);
  const tonePath = path.join(outputDir, `${clipBase}-tone.mp3`);
  let audioPath = '';
  let ttsErrorMessage = '';

  const modelId = sanitizeText(process.env.HF_COGVIDEOX_MODEL || 'THUDM/CogVideoX-2b');
  const hybridFps = Math.max(4, Math.min(24, Number(process.env.HF_HYBRID_COGVIDEOX_FPS) || 8));
  const hybridNumSteps = Math.max(10, Math.min(80, Number(process.env.HF_HYBRID_COGVIDEOX_STEPS) || 24));
  const hybridGuidance = Math.max(1, Math.min(12, Number(process.env.HF_HYBRID_COGVIDEOX_GUIDANCE) || 6));
  const targetFrames = Math.max(16, Math.min(97, Math.round(duration * hybridFps)));
  const prompt = buildHybridScenePrompt({ scene, story, storyMode });
  const scriptPath = path.join(__dirname, '..', 'scripts', 'cogvideox_text_to_video.py');

  let pythonLog = '';
  try {
    const pythonRun = await runPythonProcess({
      args: [
        scriptPath,
        '--prompt', prompt,
        '--output', rawClipPath,
        '--model', modelId,
        '--num_frames', `${targetFrames}`,
        '--num_inference_steps', `${hybridNumSteps}`,
        '--guidance_scale', `${hybridGuidance}`,
        '--fps', `${hybridFps}`,
      ],
      cwd: path.join(__dirname, '..'),
    });
    pythonLog = sanitizeText(pythonRun.stdout || '');
    if (!fs.existsSync(rawClipPath) || fs.statSync(rawClipPath).size < 3000) {
      throw new Error('CogVideoX hybrid scene output missing.');
    }
  } catch (error) {
    if (strict) {
      throw error;
    }
    const fallbackClip = await renderSceneClip({
      scene,
      index,
      outputDir,
      stillPath,
      width,
      height,
      language,
    });
    return {
      ...fallbackClip,
      engineUsed: 'scene_image_ffmpeg_fallback',
      generatedByAi: false,
      attempts: ['hybrid_cogvideox_failed_fallback'],
      warning: sanitizeText(error?.message || 'hybrid cogvideox failed'),
      pythonLog,
    };
  }

  try {
    const ttsScriptPath = path.join(__dirname, '..', 'scripts', 'scene_tts.py');
    const languageCode = normalizeLanguageCode(language || 'en');
    await runPythonProcess({
      args: [
        ttsScriptPath,
        '--text', narrationText,
        '--output', speechPath,
        '--lang', languageCode,
      ],
      cwd: path.join(__dirname, '..'),
    });
    if (fs.existsSync(speechPath) && fs.statSync(speechPath).size > 2048) {
      audioPath = speechPath;
    } else {
      ttsErrorMessage = 'scene_tts.py did not produce valid speech audio';
    }
  } catch (error) {
    ttsErrorMessage = sanitizeText(error?.message || 'scene_tts.py failed');
  }

  const allowToneFallback = String(process.env.ALLOW_TONE_FALLBACK || 'false').toLowerCase() === 'true';
  if (!audioPath && allowToneFallback) {
    const baseHz = 260 + ((index * 47) % 190);
    const overHz = baseHz + 120;
    await runFfmpeg([
      '-y',
      '-f', 'lavfi',
      '-i', `aevalsrc=(0.02*sin(2*PI*${baseHz}*t)+0.01*sin(2*PI*${overHz}*t)):s=44100:d=${duration}`,
      '-c:a', 'libmp3lame',
      '-b:a', '96k',
      tonePath,
    ], outputDir);
    audioPath = tonePath;
  }

  if (!audioPath) {
    if (strict) {
      throw new Error(`Voice generation failed for hybrid scene ${index + 1}. ${ttsErrorMessage || 'No speech audio created.'}`);
    }
    const fallbackClip = await renderSceneClip({
      scene,
      index,
      outputDir,
      stillPath,
      width,
      height,
      language,
    });
    return {
      ...fallbackClip,
      engineUsed: 'scene_image_ffmpeg_fallback',
      generatedByAi: false,
      attempts: ['hybrid_tts_failed_fallback'],
      warning: ttsErrorMessage || 'hybrid tts failed',
      pythonLog,
    };
  }

  const subtitleFilter = buildTimedSubtitleFilter({
    text: narrationText,
    spokenLines: Array.isArray(scene?.spokenLines) ? scene.spokenLines : [],
    duration,
    width,
    height,
  });
  const videoExtendFilter = `tpad=stop_mode=clone:stop_duration=${Math.max(1, Math.ceil(duration))}`;
  const vfWithSubtitles = `${videoExtendFilter},${subtitleFilter},fade=t=in:st=0:d=0.2,fade=t=out:st=${Math.max(0, duration - 0.35)}:d=0.3`;
  const vfWithoutSubtitles = `${videoExtendFilter},fade=t=in:st=0:d=0.2,fade=t=out:st=${Math.max(0, duration - 0.35)}:d=0.3`;

  try {
    await runFfmpeg([
      '-y',
      '-i', rawClipPath,
      '-i', audioPath,
      '-t', `${duration}`,
      '-vf', vfWithSubtitles,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-r', `${fps}`,
      '-c:a', 'aac',
      '-shortest',
      clipPath,
    ], outputDir);
  } catch (_subtitleError) {
    await runFfmpeg([
      '-y',
      '-i', rawClipPath,
      '-i', audioPath,
      '-t', `${duration}`,
      '-vf', vfWithoutSubtitles,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-r', `${fps}`,
      '-c:a', 'aac',
      '-shortest',
      clipPath,
    ], outputDir);
  }

  return {
    clipPath,
    duration,
    engineUsed: 'cogvideox_hybrid_scene',
    generatedByAi: true,
    attempts: ['hybrid_cogvideox_scene'],
    pythonLog,
  };
};

const generateKidsVideoFromHybridPrompt = async ({
  prompt,
  sceneCount = 5,
  videoSize = 'youtube',
  storyMode = 'moral',
  voiceType = 'kid-female',
  language = 'en',
  storyTitle = '',
  providedCharacters = [],
  providedScenes = [],
  strict = false,
  phase2 = false,
}) => {
  await ensureDirectories();

  const cleanPrompt = sanitizeText(prompt);
  if (!cleanPrompt) {
    throw new Error('Prompt is required.');
  }
  if (cleanPrompt.length < 3) {
    throw new Error('Prompt is too short.');
  }

  const normalizedLanguage = normalizeLanguageCode(language);
  const hasStructuredScenes = Array.isArray(providedScenes) && providedScenes.length > 0;
  const hasStructuredCharacters = Array.isArray(providedCharacters) && providedCharacters.length > 0;
  const baseStory = hasStructuredScenes || hasStructuredCharacters
    ? createStoryFromStructuredInput({
      prompt: cleanPrompt,
      sceneCount,
      storyTitle,
      providedCharacters,
      providedScenes,
    })
    : await createStoryFromPrompt(cleanPrompt, sceneCount);
  const safetyOutcome = enforceKidsSafetyPolicy(baseStory, cleanPrompt);
  const safePrompt = sanitizeText(safetyOutcome?.sanitizedPrompt || cleanPrompt);
  const safeBaseStory = safetyOutcome?.sanitizedStory || baseStory;

  const projectId = uuidv4();
  const { width, height } = getResolution(videoSize);
  const outputDir = path.join(uploadsRoot, safeFileName(projectId));
  await mkdir(outputDir, { recursive: true });

  const story = {
    projectId,
    createdAt: new Date().toISOString(),
    workflowType: phase2 ? 'kids-video-hybrid-phase2-animatediff-openpose-cogvideox' : 'kids-video-hybrid-motion-cogvideox',
    aiProvider: 'scene_pipeline',
    renderEngine: phase2 ? 'hybrid_phase2' : 'hybrid_motion_cogvideox',
    storyMode: sanitizeText(storyMode || 'moral'),
    voiceType: sanitizeText(voiceType || 'kid-female'),
    language: normalizedLanguage,
    videoSize: sanitizeText(videoSize || 'youtube'),
    prompt: safePrompt,
    ...safeBaseStory,
    scenes: (safeBaseStory.scenes || []).slice(0, Math.max(3, Math.min(8, Number(sceneCount) || 5))),
  };

  const translationTelemetry = createTranslationTelemetry(normalizedLanguage);
  const localizedStory = await localizeStoryForLanguage(story, normalizedLanguage, {
    telemetry: translationTelemetry,
  });
  const translation = finalizeTranslationTelemetry(translationTelemetry);

  const maxCogScenes = Math.max(1, Math.min(4, Number(process.env.HF_HYBRID_MAX_COG_SCENES) || 2));
  const maxPhase2Scenes = Math.max(1, Math.min(5, Number(process.env.HF_HYBRID_PHASE2_MAX_ANIMATEDIFF_SCENES) || 3));
  const scenes = Array.isArray(localizedStory.scenes) ? localizedStory.scenes : [];
  const motionCandidateIndexes = scenes
    .map((scene, index) => ({ index, scene, dynamic: shouldUseHybridCogScene(scene) }))
    .filter((entry) => entry.dynamic)
    .map((entry) => entry.index);
  const selectedCogIndexes = new Set(motionCandidateIndexes.slice(0, maxCogScenes));
  const selectedPhase2Indexes = new Set();
  if (phase2) {
    for (const motionIndex of motionCandidateIndexes) {
      if (selectedCogIndexes.has(motionIndex)) {
        continue;
      }
      selectedPhase2Indexes.add(motionIndex);
      if (selectedPhase2Indexes.size >= maxPhase2Scenes) {
        break;
      }
    }
  }

  if (selectedCogIndexes.size === 0 && scenes.length > 0) {
    selectedCogIndexes.add(0);
  }

  const clips = [];
  const sceneRenderMeta = [];
  for (let index = 0; index < scenes.length; index += 1) {
    const scene = scenes[index];
    const stillPath = path.join(outputDir, `scene-${String(index + 1).padStart(2, '0')}-still.png`);
    await generateSceneImage({
      scene,
      story: localizedStory,
      outputPath: stillPath,
      width,
      height,
    });

    let clipResult;
    if (selectedCogIndexes.has(index)) {
      clipResult = await renderHybridCogSceneClip({
        scene,
        story: localizedStory,
        storyMode,
        index,
        outputDir,
        stillPath,
        width,
        height,
        language: normalizedLanguage,
        strict,
      });
    } else if (phase2 && selectedPhase2Indexes.has(index)) {
      clipResult = await renderHybridAnimateDiffSceneClip({
        scene,
        story: localizedStory,
        storyMode,
        index,
        outputDir,
        stillPath,
        width,
        height,
        language: normalizedLanguage,
        strict,
      });
    } else {
      clipResult = await renderSceneClip({
        scene,
        index,
        outputDir,
        stillPath,
        width,
        height,
        language: normalizedLanguage,
      });
      clipResult = {
        ...clipResult,
        engineUsed: 'scene_image_ffmpeg',
        generatedByAi: false,
        attempts: ['scene_svg_character_layout'],
      };
    }

    clips.push(clipResult);
    if (index < scenes.length - 1) {
      const transitionResult = await renderTransitionClip({
        fromScene: scene,
        toScene: scenes[index + 1],
        index,
        outputDir,
        width,
        height,
      });
      clips.push(transitionResult);
    }

    sceneRenderMeta.push({
      sceneId: scene.id,
      title: scene.title,
      stillPath,
      clipPath: clipResult.clipPath,
      durationSeconds: clipResult.duration,
      renderEngine: clipResult.engineUsed || 'scene_image_ffmpeg',
      generatedByAi: Boolean(clipResult.generatedByAi),
      attempts: Array.isArray(clipResult.attempts) ? clipResult.attempts : [],
      warning: sanitizeText(clipResult.warning || ''),
    });
  }

  const concatPath = path.join(outputDir, 'concat.txt');
  const concatContent = clips
    .map((clip) => `file '${clip.clipPath.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`)
    .join('\n');
  await writeFile(concatPath, `${concatContent}\n`, 'utf-8');

  const outputFileName = `story-render-${Date.now()}.mp4`;
  const outputFile = path.join(outputDir, outputFileName);
  await runFfmpeg([
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatPath,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-movflags', '+faststart',
    outputFile,
  ], outputDir);
  ensureRenderedVideoExists(outputFile, 'Hybrid kids video render');

  const aiImagesEnabled = sceneRenderMeta.some((sceneMeta) => sceneMeta.generatedByAi);
  const hybridSummary = summarizeHybridRenderMeta(sceneRenderMeta);
  const fullyFallback =
    hybridSummary.totalScenes > 0 &&
    hybridSummary.phase2SceneCount === 0 &&
    hybridSummary.cogSceneCount === 0 &&
    hybridSummary.fallbackSceneCount === hybridSummary.totalScenes;
  const effectiveWorkflowType = phase2
    ? (fullyFallback ? 'kids-video-hybrid-phase2-fallback' : 'kids-video-hybrid-phase2-animatediff-openpose-cogvideox')
    : (fullyFallback ? 'kids-video-hybrid-motion-fallback' : 'kids-video-hybrid-motion-cogvideox');
  const effectiveRenderMode = phase2
    ? (fullyFallback ? 'kids-video-hybrid-phase2-fallback' : 'kids-video-hybrid-phase2')
    : (fullyFallback ? 'kids-video-hybrid-motion-fallback' : 'kids-video-hybrid-motion-cogvideox');
  const effectiveRenderEngine = fullyFallback
    ? 'scene_image_ffmpeg_fallback'
    : (phase2 ? 'hybrid_phase2' : 'hybrid_motion_cogvideox');
  const videoUrl = `/uploads/kids-video-hf/${safeFileName(projectId)}/${outputFileName}`;

  const persistedProject = {
    ...localizedStory,
    projectId,
    outputDir,
    outputFile,
    videoUrl,
    workflowType: effectiveWorkflowType,
    renderMode: effectiveRenderMode,
    renderEngine: effectiveRenderEngine,
    aiImagesEnabled,
    scenes: localizedStory.scenes,
    sceneRenderMeta,
    hybrid: {
      selectedCogSceneIndexes: Array.from(selectedCogIndexes),
      selectedPhase2SceneIndexes: Array.from(selectedPhase2Indexes),
      maxCogScenes,
      maxPhase2Scenes,
      phase2Enabled: Boolean(phase2),
      strict: Boolean(strict),
      summary: hybridSummary,
    },
    fallbackUsed: Boolean(fullyFallback || hybridSummary.fallbackSceneCount > 0),
    fallbackWarning: fullyFallback
      ? 'Real motion engine unavailable. Generated slideshow backup video instead.'
      : hybridSummary.fallbackSceneCount > 0
        ? `Partial fallback used for ${hybridSummary.fallbackSceneCount} scene(s).`
        : '',
    safety: safetyOutcome?.safetyReport || { enforced: true, rewriteApplied: false, violations: [] },
    languageTts: getKidsVideoTtsConfig(normalizedLanguage),
    translation,
    renderedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await writeFile(projectFilePath(projectId), JSON.stringify(persistedProject, null, 2), 'utf-8');
  await writeFile(path.join(outputDir, 'project.json'), JSON.stringify(persistedProject, null, 2), 'utf-8');

  return {
    success: true,
    project: persistedProject,
    projectId,
    videoUrl,
    outputFile,
    aiImagesEnabled,
  };
};

const generateKidsVideoFromPrompt = async ({
  prompt,
  sceneCount = 5,
  videoSize = 'youtube',
  storyMode = 'moral',
  voiceType = 'kid-female',
  language = 'en',
  storyTitle = '',
  providedCharacters = [],
  providedScenes = [],
}) => {
  await ensureDirectories();

  const cleanPrompt = sanitizeText(prompt);
  if (!cleanPrompt) {
    throw new Error('Prompt is required.');
  }
  if (cleanPrompt.length < 3) {
    throw new Error('Prompt is too short.');
  }

  const normalizedLanguage = normalizeLanguageCode(language);
  const hasStructuredScenes = Array.isArray(providedScenes) && providedScenes.length > 0;
  const hasStructuredCharacters = Array.isArray(providedCharacters) && providedCharacters.length > 0;
  const baseStory = hasStructuredScenes || hasStructuredCharacters
    ? createStoryFromStructuredInput({
      prompt: cleanPrompt,
      sceneCount,
      storyTitle,
      providedCharacters,
      providedScenes,
    })
    : await createStoryFromPrompt(cleanPrompt, sceneCount);
  const safetyOutcome = enforceKidsSafetyPolicy(baseStory, cleanPrompt);
  const safePrompt = sanitizeText(safetyOutcome?.sanitizedPrompt || cleanPrompt);
  const safeBaseStory = safetyOutcome?.sanitizedStory || baseStory;
  const projectId = uuidv4();
  const { width, height } = getResolution(videoSize);
  const outputDir = path.join(uploadsRoot, safeFileName(projectId));
  await mkdir(outputDir, { recursive: true });

  const story = {
    projectId,
    createdAt: new Date().toISOString(),
    workflowType: 'kids-video-scene-pipeline',
    aiProvider: 'scene_pipeline',
    storyMode: sanitizeText(storyMode || 'moral'),
    voiceType: sanitizeText(voiceType || 'kid-female'),
    language: normalizedLanguage,
    videoSize: sanitizeText(videoSize || 'youtube'),
    prompt: safePrompt,
    ...safeBaseStory,
    scenes: (safeBaseStory.scenes || []).slice(0, Math.max(3, Math.min(8, Number(sceneCount) || 5))),
  };

  const translationTelemetry = createTranslationTelemetry(normalizedLanguage);
  const localizedStory = await localizeStoryForLanguage(story, normalizedLanguage, {
    telemetry: translationTelemetry,
  });
  const translation = finalizeTranslationTelemetry(translationTelemetry);

  const clips = [];
  const sceneRenderMeta = [];
  for (let index = 0; index < localizedStory.scenes.length; index += 1) {
    const scene = localizedStory.scenes[index];
    const stillPath = path.join(outputDir, `scene-${String(index + 1).padStart(2, '0')}-still.png`);
    const imageResult = await generateSceneImage({
      scene,
      story: localizedStory,
      outputPath: stillPath,
      width,
      height,
    });
    const clipResult = await renderSceneClip({
      scene,
      index,
      outputDir,
      stillPath,
      width,
      height,
      language: normalizedLanguage,
    });
    clips.push(clipResult);
    if (index < localizedStory.scenes.length - 1) {
      const transitionResult = await renderTransitionClip({
        fromScene: scene,
        toScene: localizedStory.scenes[index + 1],
        index,
        outputDir,
        width,
        height,
      });
      clips.push(transitionResult);
    }
    sceneRenderMeta.push({
      sceneId: scene.id,
      title: scene.title,
      stillPath,
      generatedByAi: imageResult.generatedByAi,
      imageAttempts: imageResult.attempts,
      clipPath: clipResult.clipPath,
      durationSeconds: clipResult.duration,
    });
  }

  const concatPath = path.join(outputDir, 'concat.txt');
  const concatContent = clips
    .map((clip) => `file '${clip.clipPath.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`)
    .join('\n');
  await writeFile(concatPath, `${concatContent}\n`, 'utf-8');

  const outputFileName = `story-render-${Date.now()}.mp4`;
  const outputFile = path.join(outputDir, outputFileName);
  await runFfmpeg([
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatPath,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-movflags', '+faststart',
    outputFile,
  ], outputDir);
  ensureRenderedVideoExists(outputFile, 'Scene pipeline kids video render');

  const aiImagesEnabled = sceneRenderMeta.some((sceneMeta) => sceneMeta.generatedByAi);
  const videoUrl = `/uploads/kids-video-hf/${safeFileName(projectId)}/${outputFileName}`;

  const persistedProject = {
    ...localizedStory,
    projectId,
    outputDir,
    outputFile,
    videoUrl,
    renderMode: 'kids-video-scene-pipeline',
    aiImagesEnabled,
    scenes: localizedStory.scenes,
    sceneRenderMeta,
    fallbackUsed: false,
    fallbackWarning: '',
    safety: safetyOutcome?.safetyReport || { enforced: true, rewriteApplied: false, violations: [] },
    languageTts: getKidsVideoTtsConfig(normalizedLanguage),
    translation,
    renderedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await writeFile(projectFilePath(projectId), JSON.stringify(persistedProject, null, 2), 'utf-8');
  await writeFile(path.join(outputDir, 'project.json'), JSON.stringify(persistedProject, null, 2), 'utf-8');

  return {
    success: true,
    project: persistedProject,
    projectId,
    videoUrl,
    outputFile,
    aiImagesEnabled,
  };
};

const generateKidsVideoFromDiffusersPrompt = async ({
  prompt,
  videoSize = 'youtube',
  numFrames = 200,
  numInferenceSteps = 25,
  language = 'en',
  storyTitle = '',
}) => {
  await ensureDirectories();
  const normalizedLanguage = normalizeLanguageCode(language);
  const cleanPrompt = sanitizeText(prompt);
  if (!cleanPrompt) throw new Error('Prompt is required.');
  if (cleanPrompt.length < 3) throw new Error('Prompt is too short.');
  const safetyOutcome = enforceKidsSafetyPolicy(
    { title: storyTitle, synopsis: cleanPrompt, scenes: [] },
    cleanPrompt
  );
  const safePrompt = sanitizeText(safetyOutcome?.sanitizedPrompt || cleanPrompt);

  const translationTelemetry = createTranslationTelemetry(normalizedLanguage);
  const localizedPrompt = await translatePromptForLanguage(safePrompt, normalizedLanguage, {
    telemetry: translationTelemetry,
    context: 'video prompt',
  });
  const translation = finalizeTranslationTelemetry(translationTelemetry);
  const localizedStoryTitle = sanitizeText(storyTitle);
  const projectId = uuidv4();
  const outputDir = path.join(uploadsRoot, safeFileName(projectId));
  await mkdir(outputDir, { recursive: true });
  const outputFileName = `story-render-${Date.now()}.mp4`;
  const outputFile = path.join(outputDir, outputFileName);
  const { width, height } = getResolution(videoSize);

  const scriptPath = path.join(__dirname, '..', 'scripts', 'hf_text_to_video.py');
  const modelId = sanitizeText(process.env.HF_TEXT_TO_VIDEO_MODEL || 'damo-vilab/text-to-video-ms-1.7b');

  const args = [
    scriptPath,
    '--prompt', localizedPrompt,
    '--output', outputFile,
    '--model', modelId,
    '--num_frames', `${Math.max(16, Math.min(240, Number(numFrames) || 200))}`,
    '--num_inference_steps', `${Math.max(5, Math.min(80, Number(numInferenceSteps) || 25))}`,
    '--width', `${width}`,
    '--height', `${height}`,
    '--fps', `${Math.max(8, Math.min(24, Number(process.env.HF_TEXT_TO_VIDEO_FPS) || 12))}`,
    '--lang', normalizedLanguage,
  ];

  let stdout = '';
  let pythonCommand = '';
  try {
    const pythonRun = await runPythonProcess({
      args,
      cwd: path.join(__dirname, '..'),
    });
    stdout = pythonRun.stdout;
    pythonCommand = pythonRun.command;
  } catch (error) {
    const message = sanitizeText(error?.message || '');
    const strictDiffusers = String(process.env.HF_DIFFUSERS_STRICT || 'false').toLowerCase() === 'true';
    if (strictDiffusers) throw error;

    // Graceful degradation: keep render working even when python runtime
    // or diffusers execution fails in the deployment environment.
    const fallbackResult = await generateKidsVideoFromPrompt({
      prompt: safePrompt,
      sceneCount: 5,
      videoSize,
      storyMode: 'moral',
      voiceType: 'kid-female',
      language: normalizedLanguage,
      storyTitle: localizedStoryTitle,
    });

    return {
      ...fallbackResult,
      project: {
        ...(fallbackResult.project || {}),
        workflowType: 'kids-video-scene-fallback-no-python',
        renderEngine: 'scene_image_ffmpeg_fallback',
        fallbackReason: message || 'diffusers execution failed',
        fallbackUsed: true,
        fallbackWarning: 'Real motion engine unavailable. Generated slideshow backup video instead.',
        languageTts: getKidsVideoTtsConfig(normalizedLanguage),
        pythonCommand: '',
      },
    };
  }

  if (!fs.existsSync(outputFile)) {
    throw new Error(`Diffusers did not produce output video. ${stdout || ''}`.trim());
  }
  ensureRenderedVideoExists(outputFile, 'Diffusers prompt video render');

  const persistedProject = {
    projectId,
    createdAt: new Date().toISOString(),
    workflowType: 'kids-video-scene-prompt-video',
    aiProvider: 'scene_pipeline',
    renderEngine: 'prompt_video_python',
    prompt: localizedPrompt,
    title: localizedStoryTitle || 'Prompt Video Render',
    storyTitle: localizedStoryTitle,
    language: normalizedLanguage,
    videoSize: sanitizeText(videoSize || 'youtube'),
    outputDir,
    outputFile,
    videoUrl: `/uploads/kids-video-hf/${safeFileName(projectId)}/${outputFileName}`,
    aiImagesEnabled: true,
    renderedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    generatorLog: stdout || '',
    pythonCommand: sanitizeText(pythonCommand || ''),
    fallbackUsed: false,
    fallbackWarning: '',
    safety: safetyOutcome?.safetyReport || { enforced: true, rewriteApplied: false, violations: [] },
    languageTts: getKidsVideoTtsConfig(normalizedLanguage),
    translation,
  };

  await writeFile(projectFilePath(projectId), JSON.stringify(persistedProject, null, 2), 'utf-8');
  await writeFile(path.join(outputDir, 'project.json'), JSON.stringify(persistedProject, null, 2), 'utf-8');

  return {
    success: true,
    projectId,
    project: persistedProject,
    videoUrl: persistedProject.videoUrl,
    outputFile,
    aiImagesEnabled: true,
  };
};

const generateKidsVideoFromFreeSteveLikePrompt = async ({
  prompt,
  videoSize = 'youtube',
  sceneCount = 5,
  language = 'en',
  storyTitle = '',
}) => {
  await ensureDirectories();
  const normalizedLanguage = normalizeLanguageCode(language);
  const cleanPrompt = sanitizeText(prompt);
  if (!cleanPrompt) throw new Error('Prompt is required.');
  if (cleanPrompt.length < 3) throw new Error('Prompt is too short.');
  const safetyOutcome = enforceKidsSafetyPolicy(
    { title: storyTitle, synopsis: cleanPrompt, scenes: [] },
    cleanPrompt
  );
  const safePrompt = sanitizeText(safetyOutcome?.sanitizedPrompt || cleanPrompt);

  const translationTelemetry = createTranslationTelemetry(normalizedLanguage);
  const localizedPrompt = await translatePromptForLanguage(safePrompt, normalizedLanguage, {
    telemetry: translationTelemetry,
    context: 'video prompt',
  });
  const translation = finalizeTranslationTelemetry(translationTelemetry);
  const localizedStoryTitle = sanitizeText(storyTitle);
  const projectId = uuidv4();
  const outputDir = path.join(uploadsRoot, safeFileName(projectId));
  await mkdir(outputDir, { recursive: true });
  const outputFileName = `story-render-${Date.now()}.mp4`;
  const outputFile = path.join(outputDir, outputFileName);
  const { width, height } = getResolution(videoSize);

  const scriptPath = path.join(__dirname, '..', 'scripts', 'steve_like_text_to_video.py');
  const fps = Math.max(12, Math.min(30, Number(process.env.HF_STEVE_LIKE_FPS) || 24));
  const args = [
    scriptPath,
    '--script', localizedPrompt,
    '--output', outputFile,
    '--max_scenes', `${Math.max(3, Math.min(8, Number(sceneCount) || 5))}`,
    '--width', `${width}`,
    '--height', `${height}`,
    '--fps', `${fps}`,
    '--lang', normalizedLanguage,
  ];

  try {
    const { stdout, command: pythonCommand } = await runPythonProcess({
      args,
      cwd: path.join(__dirname, '..'),
    });

    if (!fs.existsSync(outputFile)) {
      throw new Error(`Free Steve-like generator did not produce output video. ${stdout || ''}`.trim());
    }
    ensureRenderedVideoExists(outputFile, 'Free Steve-like story render');

    let parsedScriptOutput = null;
    try {
      parsedScriptOutput = JSON.parse(stdout || '{}');
    } catch (_error) {
      parsedScriptOutput = null;
    }

    const persistedProject = {
      projectId,
      createdAt: new Date().toISOString(),
      workflowType: 'kids-video-scene-script',
      aiProvider: 'scene_pipeline',
      renderEngine: 'scene_script_video',
      prompt: localizedPrompt,
      title: localizedStoryTitle || 'Script-to-Video Render',
      storyTitle: localizedStoryTitle,
      language: normalizedLanguage,
      videoSize: sanitizeText(videoSize || 'youtube'),
      outputDir,
      outputFile,
      videoUrl: `/uploads/kids-video-hf/${safeFileName(projectId)}/${outputFileName}`,
      aiImagesEnabled: true,
      renderedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      generatorLog: stdout || '',
      pythonCommand: sanitizeText(pythonCommand || ''),
      sceneCount: Number(parsedScriptOutput?.scene_count || Math.max(3, Math.min(8, Number(sceneCount) || 5))),
      fallbackUsed: false,
      fallbackWarning: '',
      safety: safetyOutcome?.safetyReport || { enforced: true, rewriteApplied: false, violations: [] },
      languageTts: getKidsVideoTtsConfig(normalizedLanguage),
      translation,
    };

    await writeFile(projectFilePath(projectId), JSON.stringify(persistedProject, null, 2), 'utf-8');
    await writeFile(path.join(outputDir, 'project.json'), JSON.stringify(persistedProject, null, 2), 'utf-8');

    return {
      success: true,
      projectId,
      project: persistedProject,
      videoUrl: persistedProject.videoUrl,
      outputFile,
      aiImagesEnabled: true,
    };
  } catch (error) {
    // Resilient fallback to existing non-python-pipeline so render still succeeds.
    const fallbackResult = await generateKidsVideoFromPrompt({
      prompt: safePrompt,
      sceneCount: Math.max(3, Math.min(8, Number(sceneCount) || 5)),
      videoSize,
      storyMode: 'educational',
      voiceType: 'kid-female',
      language: normalizedLanguage,
      storyTitle: localizedStoryTitle,
    });

    return {
      ...fallbackResult,
      project: {
        ...(fallbackResult.project || {}),
        workflowType: 'kids-video-scene-script-fallback',
        renderEngine: 'scene_image_ffmpeg_fallback',
        fallbackReason: sanitizeText(error?.message || 'free steve-like generation failed'),
        fallbackUsed: true,
        fallbackWarning: 'Real motion engine unavailable. Generated slideshow backup video instead.',
        languageTts: getKidsVideoTtsConfig(normalizedLanguage),
      },
    };
  }
};

const generateKidsVideoFromCogVideoXPrompt = async ({
  prompt,
  videoSize = 'youtube',
  numFrames = 49,
  numInferenceSteps = 30,
  guidanceScale = 6,
  language = 'en',
  strict = false,
  storyTitle = '',
}) => {
  const normalizedLanguage = normalizeLanguageCode(language);
  await ensureDirectories();
  const cleanPrompt = sanitizeText(prompt);
  if (!cleanPrompt) throw new Error('Prompt is required.');
  if (cleanPrompt.length < 3) throw new Error('Prompt is too short.');
  const safetyOutcome = enforceKidsSafetyPolicy(
    { title: storyTitle, synopsis: cleanPrompt, scenes: [] },
    cleanPrompt
  );
  const safePrompt = sanitizeText(safetyOutcome?.sanitizedPrompt || cleanPrompt);

  const translationTelemetry = createTranslationTelemetry(normalizedLanguage);
  const localizedPrompt = await translatePromptForLanguage(safePrompt, normalizedLanguage, {
    telemetry: translationTelemetry,
    context: 'video prompt',
  });
  const translation = finalizeTranslationTelemetry(translationTelemetry);
  const localizedStoryTitle = sanitizeText(storyTitle);
  const projectId = uuidv4();
  const outputDir = path.join(uploadsRoot, safeFileName(projectId));
  await mkdir(outputDir, { recursive: true });
  const outputFileName = `story-render-${Date.now()}.mp4`;
  const outputFile = path.join(outputDir, outputFileName);
  const { width, height } = getResolution(videoSize);

  const scriptPath = path.join(__dirname, '..', 'scripts', 'cogvideox_text_to_video.py');
  const modelId = sanitizeText(process.env.HF_COGVIDEOX_MODEL || 'THUDM/CogVideoX-2b');
  const fps = Math.max(4, Math.min(24, Number(process.env.HF_COGVIDEOX_FPS) || 8));
  const args = [
    scriptPath,
    '--prompt', localizedPrompt,
    '--output', outputFile,
    '--model', modelId,
    '--num_frames', `${Math.max(16, Math.min(97, Number(numFrames) || 49))}`,
    '--num_inference_steps', `${Math.max(10, Math.min(80, Number(numInferenceSteps) || 30))}`,
    '--guidance_scale', `${Math.max(1, Math.min(12, Number(guidanceScale) || 6))}`,
    '--fps', `${fps}`,
  ];

  try {
    const { stdout, command: pythonCommand } = await runPythonProcess({
      args,
      cwd: path.join(__dirname, '..'),
    });

    if (!fs.existsSync(outputFile)) {
      throw new Error(`CogVideoX generator did not produce output video. ${stdout || ''}`.trim());
    }
    ensureRenderedVideoExists(outputFile, 'CogVideoX prompt video render');

    let parsedScriptOutput = null;
    try {
      parsedScriptOutput = JSON.parse(stdout || '{}');
    } catch (_error) {
      parsedScriptOutput = null;
    }

    const persistedProject = {
      projectId,
      createdAt: new Date().toISOString(),
      workflowType: 'kids-video-cogvideox-text-to-video',
      aiProvider: 'scene_pipeline',
      renderEngine: 'cogvideox_text_to_video',
      prompt: localizedPrompt,
      title: localizedStoryTitle || 'CogVideoX Prompt Render',
      storyTitle: localizedStoryTitle,
      language: normalizedLanguage,
      videoSize: sanitizeText(videoSize || 'youtube'),
      outputDir,
      outputFile,
      videoUrl: `/uploads/kids-video-hf/${safeFileName(projectId)}/${outputFileName}`,
      aiImagesEnabled: true,
      renderedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      generatorLog: stdout || '',
      pythonCommand: sanitizeText(pythonCommand || ''),
      sceneCount: 1,
      width,
      height,
      model: modelId,
      numFrames: Number(parsedScriptOutput?.num_frames || Math.max(16, Math.min(97, Number(numFrames) || 49))),
      numInferenceSteps: Number(parsedScriptOutput?.num_inference_steps || Math.max(10, Math.min(80, Number(numInferenceSteps) || 30))),
      guidanceScale: Number(parsedScriptOutput?.guidance_scale || Math.max(1, Math.min(12, Number(guidanceScale) || 6))),
      fallbackUsed: false,
      fallbackWarning: '',
      safety: safetyOutcome?.safetyReport || { enforced: true, rewriteApplied: false, violations: [] },
      languageTts: getKidsVideoTtsConfig(normalizedLanguage),
      translation,
    };

    await writeFile(projectFilePath(projectId), JSON.stringify(persistedProject, null, 2), 'utf-8');
    await writeFile(path.join(outputDir, 'project.json'), JSON.stringify(persistedProject, null, 2), 'utf-8');

    return {
      success: true,
      projectId,
      project: persistedProject,
      videoUrl: persistedProject.videoUrl,
      outputFile,
      aiImagesEnabled: true,
    };
  } catch (error) {
    const strictCogVideoX = strict || String(process.env.HF_COGVIDEOX_STRICT || 'false').toLowerCase() === 'true';
    if (strictCogVideoX) throw error;

    const fallbackResult = await generateKidsVideoFromPrompt({
      prompt: safePrompt,
      sceneCount: 5,
      videoSize,
      storyMode: 'moral',
      voiceType: 'kid-female',
      language: normalizedLanguage,
      storyTitle: localizedStoryTitle,
    });

    return {
      ...fallbackResult,
      project: {
        ...(fallbackResult.project || {}),
        workflowType: 'kids-video-cogvideox-fallback',
        renderEngine: 'scene_image_ffmpeg_fallback',
        fallbackReason: sanitizeText(error?.message || 'cogvideox execution failed'),
        fallbackUsed: true,
        fallbackWarning: 'Real motion engine unavailable. Generated slideshow backup video instead.',
        languageTts: getKidsVideoTtsConfig(normalizedLanguage),
      },
    };
  }
};

const getKidsVideoProject = async (projectId) => {
  await ensureDirectories();
  const cleanProjectId = sanitizeText(projectId);
  if (!cleanProjectId) throw new Error('Project ID is required.');
  const raw = await readFile(projectFilePath(cleanProjectId), 'utf-8');
  return JSON.parse(raw);
};

module.exports = {
  generateKidsVideoFromPrompt,
  generateKidsVideoFromHybridPrompt,
  generateKidsVideoFromDiffusersPrompt,
  generateKidsVideoFromFreeSteveLikePrompt,
  generateKidsVideoFromCogVideoXPrompt,
  getKidsVideoProject,
  translateTextToLanguage,
  localizeStoryForLanguage,
  shouldUseHybridCogScene,
  summarizeHybridRenderMeta,
  getKidsVideoGeneratorCapabilities,
  enforceKidsSafetyPolicy,
  buildTimedSubtitleSegments,
};
