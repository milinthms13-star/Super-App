const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { promisify } = require('util');
const { OpenAI } = require('openai');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const ffmpegPath = require('ffmpeg-static');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);
const stat = promisify(fs.stat);

const uploadsRoot = path.join(__dirname, '..', 'uploads', 'video-studio');
const projectStoreRoot = path.join(uploadsRoot, 'projects');
const isFreeMode = ['1', 'true', 'yes', 'on'].includes(String(process.env.FREE_MODE || '').toLowerCase());
const allowAiInFreeMode = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.VIDEO_STUDIO_ALLOW_AI_IN_FREE || '').toLowerCase()
);
const aiProviderEnabled = Boolean(process.env.OPENAI_API_KEY) && (!isFreeMode || allowAiInFreeMode);
const isLowMemoryMode = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.VIDEO_STUDIO_LOW_MEMORY_MODE || (isFreeMode ? '1' : '0')).toLowerCase()
);
const useRealCartoonImages = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.VIDEO_STUDIO_REAL_CARTOON_MODE || (aiProviderEnabled ? '1' : '0')).toLowerCase()
);

if (isLowMemoryMode) {
  // Keep native image processing predictable on low-memory instances.
  sharp.cache({ memory: 20, files: 0, items: 64 });
  sharp.concurrency(1);
}

let openai;
try {
  openai = aiProviderEnabled
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;
} catch (error) {
  openai = null;
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

const getModerationSafetyAssessment = async (value = '') => {
  const cleanValue = sanitizeText(value);
  if (!openai || !cleanValue) {
    return { blocked: false, reasons: [] };
  }

  try {
    const moderation = await openai.moderations.create({
      model: process.env.OPENAI_MODERATION_MODEL || 'omni-moderation-latest',
      input: cleanValue.slice(0, 12000),
    });

    const result = moderation?.results?.[0];
    if (!result?.flagged) {
      return { blocked: false, reasons: [] };
    }

    const categories = result?.categories && typeof result.categories === 'object' ? result.categories : {};
    const reasons = Object.entries(categories)
      .filter(([, flagged]) => Boolean(flagged))
      .map(([code]) => ({
        code: `model_${String(code).replace(/[^\w/.-]/g, '_')}`,
        reason: buildSafetyReasonLabel(code) || 'unsafe content',
      }));

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

const safeOpenAI = async (messages, maxTokens = 1100, timeoutMs = 8000) => {
  if (!openai) return null;

  const aiCall = (async () => {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_VIDEO_MODEL || 'gpt-4o-mini',
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    });
    return response?.choices?.[0]?.message?.content?.trim() || null;
  })();

  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));

  try {
    return await Promise.race([aiCall, timeout]);
  } catch (error) {
    return null;
  }
};

const fallbackParseStory = ({ story, storyMode, voiceType, language, storyTitle }) => {
  const lines = story
    .split(/[\.\?\!]+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rawScenes = lines.length ? lines.slice(0, 5) : ['A child discovers a magical secret.'];
  const scenes = rawScenes.map((text, index) => ({
    id: index + 1,
    title: ['Beginning', 'Adventure', 'Challenge', 'Magic', 'Daydream'][index] || `Scene ${index + 1}`,
    description: text,
    emotion: index === 0 ? 'curious' : index === 2 ? 'brave' : index === 4 ? 'joyful' : 'wonder',
    characters: [{ name: 'Main Hero', role: 'Hero', voice: voiceType }],
    cameraActions: ['soft zoom', 'gentle pan', 'wide exposure', 'close-up', 'dolly in'][index] || 'subtle move',
    dialogue: `"${text}"`,
  }));

  const characters = [
    {
      name: 'Ari',
      role: 'Hero',
      appearance: 'curious young explorer with a bright backpack',
      voiceProfile: 'kid-friendly playful narrator',
      colorPalette: ['sky blue', 'sunny yellow', 'mint'],
    },
    {
      name: 'Milo',
      role: 'Guide',
      appearance: 'friendly sidekick with expressive eyes and a warm smile',
      voiceProfile: 'soft storytelling voice',
      colorPalette: ['peach', 'teal', 'cream'],
    },
  ];

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

const buildFallbackScript = ({ subject, languageId, storyMode, ageFilter }) => {
  const cleanSubject = sanitizeText(subject || 'Magical friendship story');
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

  const response = await safeOpenAI([
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
  const hasRabbit = /rabbit|hare/i.test(text);
  const hasTortoise = /tortoise|turtle/i.test(text);

  const baseCharacters = [];
  if (hasRabbit) {
    baseCharacters.push({
      id: 'char-rabbit',
      name: 'Rabbit',
      role: 'Fast Challenger',
      appearance: 'white rabbit, red scarf, playful eyes',
      emotionStyle: 'energetic and expressive',
      voiceProfile: voiceType || 'kid-female',
      locked: true,
    });
  }
  if (hasTortoise) {
    baseCharacters.push({
      id: 'char-tortoise',
      name: 'Tortoise',
      role: 'Steady Hero',
      appearance: 'green tortoise, gentle smile, simple cap',
      emotionStyle: 'calm and determined',
      voiceProfile: voiceType || 'warm-male',
      locked: true,
    });
  }

  if (!baseCharacters.length) {
    baseCharacters.push(
      {
        id: 'char-hero',
        name: 'Hero',
        role: 'Main Character',
        appearance: 'friendly animated hero with colorful outfit',
        emotionStyle: 'curious and brave',
        voiceProfile: voiceType || 'kid-female',
        locked: true,
      },
      {
        id: 'char-guide',
        name: 'Guide',
        role: 'Mentor',
        appearance: 'wise companion with warm smile',
        emotionStyle: 'supportive and calm',
        voiceProfile: 'soft-female',
        locked: true,
      }
    );
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
  const coreTopic = sanitizeText(script?.title || script?.synopsis || 'our mission');
  const moralLine = sanitizeText(script?.moral || 'teamwork and patience matter');
  const weatherOptions = ['sunny', 'golden evening', 'soft cloudy', 'gentle rain', 'starlit night'];
  const sceneDialogueTemplates = [
    `${primaryA}: Let's begin our ${coreTopic} adventure.\n${primaryB}: Yes, we can solve this together.`,
    `${primaryA}: This challenge is bigger than I expected.\n${primaryB}: We can break it into small steps.`,
    `${primaryA}: I found a new clue.\n${primaryB}: Great, let us keep exploring and stay brave.`,
    `${primaryA}: We are close now.\n${primaryB}: One more good decision and we can finish it.`,
    `${primaryA}: We did it and learned something important.\n${primaryB}: ${moralLine}`,
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
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content);
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

const patchStudioProject = async (projectId, patch = {}) => {
  const project = await getStudioProject(projectId);
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

const createStudioProject = async ({ storyTitle, storyPrompt, languageId, styleId, voiceType, videoSizeId, storyMode, safeMode, ageFilter, storySource }) => {
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
    const aiResponse = await safeOpenAI([
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
  if (!openai) return fallback;

  try {
    const systemPrompt = `You are a warm bedtime storyteller for kids. Create a gentle narration script in ${project.language} using the scenes and emotions provided.`;
    const userPrompt = `Story title: ${project.title}
Scenes:
${project.scenes.map((scene) => `- ${scene.title}: ${scene.description} [${scene.emotion}]`).join('\n')}
Generate a single narration text for the entire video with kid-safe phrasing.`;
    const response = await safeOpenAI([
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

const getOpenAIImageSize = (width, height) => {
  if (width === height) return '1024x1024';
  return width > height ? '1536x1024' : '1024x1536';
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

const getImageBufferFromOpenAIResult = async (item) => {
  if (!item) return null;
  if (item.b64_json) {
    return Buffer.from(item.b64_json, 'base64');
  }
  if (item.url) {
    const response = await fetch(item.url);
    if (!response.ok) {
      return null;
    }
    const arr = await response.arrayBuffer();
    return Buffer.from(arr);
  }
  return null;
};

const generateRealCartoonSceneImage = async (scene, project, imagePath, resolution) => {
  if (!openai || !useRealCartoonImages) {
    return false;
  }

  try {
    const response = await openai.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
      prompt: buildRealCartoonPrompt(scene, project),
      size: getOpenAIImageSize(resolution.width, resolution.height),
    });
    const firstImage = response?.data?.[0];
    const imageBuffer = await getImageBufferFromOpenAIResult(firstImage);
    if (!imageBuffer?.length) {
      return false;
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
    return true;
  } catch (_error) {
    return false;
  }
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
    'kid-female': 'nova',
    'kid-male': 'echo',
    'female-soft': 'nova',
    'female-warm': 'shimmer',
    'male-calm': 'alloy',
    'warm-male': 'alloy',
    'soft-female': 'nova',
  };

  if (map[normalized]) {
    return map[normalized];
  }
  if (['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(normalized)) {
    return normalized;
  }
  return 'nova';
};

const voiceCatalog = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

const normalizeOpenAIAudioBuffer = async (response) => {
  if (Buffer.isBuffer(response)) {
    return response;
  }
  if (response instanceof ArrayBuffer) {
    return Buffer.from(response);
  }
  if (typeof response?.arrayBuffer === 'function') {
    return Buffer.from(await response.arrayBuffer());
  }
  return null;
};

const buildTtsModelFallbackList = () => {
  const preferred = sanitizeText(process.env.OPENAI_VIDEO_TTS_MODEL || 'gpt-4o-mini-tts');
  return Array.from(new Set([preferred, 'gpt-4o-mini-tts', 'tts-1', 'tts-1-hd']));
};

const synthesizeSpeechToFile = async ({ text, voiceCandidate, outputPath }) => {
  if (!openai) {
    return null;
  }

  const content = sanitizeText(text).slice(0, 4096);
  if (!content) {
    return null;
  }

  const voice = resolveNarrationVoice(voiceCandidate);
  const modelsToTry = buildTtsModelFallbackList();

  for (const model of modelsToTry) {
    try {
      const response = await openai.audio.speech.create({
        model,
        voice,
        input: content,
        format: 'mp3',
      });

      const audioBuffer = await normalizeOpenAIAudioBuffer(response);
      if (audioBuffer?.length) {
        await writeFile(outputPath, audioBuffer);
        return outputPath;
      }
    } catch (_error) {
      // Try next model.
    }
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
  return voiceCatalog.includes(mapped) ? mapped : 'nova';
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
  if (!openai || !Array.isArray(project?.scenes) || !project.scenes.length) {
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
  if (!openai) {
    return null;
  }
  return synthesizeSpeechToFile({
    text: narrationText,
    voiceCandidate: project?.voicePlan?.narrator?.voice || project?.voiceType,
    outputPath: path.join(outputDir, 'narration.mp3'),
  });
};

const runFfmpeg = async (args, cwd) => {
  if (!ffmpegPath) {
    throw new Error('FFmpeg binary is not available in this environment. Install ffmpeg-static or configure a local ffmpeg binary.');
  }

  return new Promise((resolve, reject) => {
    const ffmpegArgs = ['-hide_banner', '-loglevel', 'error', '-nostdin', ...args];
    const ffmpeg = spawn(ffmpegPath, ffmpegArgs, { cwd, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    const stderrLimit = 200000;

    ffmpeg.stderr.on('data', (chunk) => {
      if (stderr.length >= stderrLimit) {
        return;
      }
      const next = chunk.toString();
      stderr = `${stderr}${next}`.slice(-stderrLimit);
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
      }
      resolve();
    });
  });
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

  const quality = premiumHD && !isLowMemoryMode ? '24' : (isLowMemoryMode ? '28' : '23');
  const outputFile = path.join(outputDir, 'story-render.mp4');
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

  const videoUrl = `/uploads/video-studio/${safeProjectId}/story-render.mp4`;
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
    provider: synthesizedPath ? 'openai-tts' : 'procedural-fallback',
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
  createAutopilotProject,
  getStudioProject,
  regenerateProjectStage,
  patchStudioProject,
  generateCharacterSheet,
  generateSceneImage,
  animateScene,
  generateVoice,
  generateSfx,
  lipSync,
  composeFinalVideo,
};
