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

let openai;
try {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} catch (error) {
  openai = null;
}

const MAX_STORY_LENGTH = 7000;
const UNSAFE_THEME_PATTERNS = [
  /suicide/i,
  /self[-\s]?harm/i,
  /weapon/i,
  /gore/i,
  /kill/i,
  /terror/i,
  /abuse/i,
  /explicit/i,
  /adult content/i,
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

const containsUnsafeTheme = (value = '') =>
  UNSAFE_THEME_PATTERNS.some((pattern) => pattern.test(value));

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
      name: 'Minku Rabbit',
      role: 'Hero',
      appearance: 'white rabbit with a purple vest and glowing eyes',
      voiceProfile: 'kid-friendly playful narrator',
      colorPalette: ['lavender', 'peach', 'sky blue'],
    },
    {
      name: 'Luna Fairy',
      role: 'Guide',
      appearance: 'sparkling fairy with pastel wings and a lantern',
      voiceProfile: 'soft storytelling voice',
      colorPalette: ['rose gold', 'mint', 'cream'],
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
  const classicRabbit = /rabbit|hare/i.test(cleanSubject);
  const classicTortoise = /tortoise|turtle/i.test(cleanSubject);

  const title = classicRabbit && classicTortoise
    ? 'The Rabbit and the Tortoise'
    : `Story of ${cleanSubject}`;

  const synopsis = classicRabbit && classicTortoise
    ? 'A speedy rabbit laughs at a calm tortoise, but the race teaches everyone that steady effort wins.'
    : `A child-safe ${storyMode} story about ${cleanSubject}, with teamwork, courage, and kindness.`;

  const moral = classicRabbit && classicTortoise
    ? 'Slow and steady wins the race.'
    : 'Kindness, patience, and smart effort help us succeed.';

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
  const weatherOptions = ['sunny', 'golden evening', 'soft cloudy', 'gentle rain', 'starlit night'];

  return Array.from({ length: targetCount }).map((_, index) => {
    const beat = beats[index % beats.length];
    return {
      id: index + 1,
      title: beat.beat || `Scene ${index + 1}`,
      description: beat.summary || 'Story progression scene',
      dialogue: `"${beat.summary || 'Let us continue the story.'}"`,
      emotion: index === targetCount - 1 ? 'joyful' : index === 2 ? 'brave' : 'wonder',
      background: `${storyMode || 'bedtime'} world with child-safe ${styleId || 'cartoon'} art`,
      weather: weatherOptions[index % weatherOptions.length],
      timeOfDay: index < 2 ? 'Morning' : index < targetCount - 1 ? 'Afternoon' : 'Evening',
      cameraActions: ['wide shot', 'medium shot', 'close-up', 'tracking shot', 'crane reveal'][index % 5],
      animationPrompt: `Animate ${primaryNames} with smooth family-friendly motion, lip sync, and expressive faces.`,
      characters: (characters || []).map((char) => ({ name: char.name, role: char.role })),
      durationSeconds: 4,
    };
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

const buildSubtitlesFromScenes = (scenes = []) =>
  scenes.map((scene, index) => ({
    start: index * (scene.durationSeconds || 4),
    end: index * (scene.durationSeconds || 4) + (scene.durationSeconds || 4),
    text: `${scene.title}: ${scene.description}`,
  }));

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
  if (safeMode && containsUnsafeTheme(cleanSubject)) {
    throw new Error('Safe mode blocked this subject due to unsafe themes.');
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
  };

  return saveStudioProject(project);
};

const regenerateProjectStage = async (projectId, stage, options = {}) => {
  const project = await getStudioProject(projectId);
  const normalizedStage = sanitizeText(stage).toLowerCase();

  if (normalizedStage === 'script') {
    const script = await buildScriptFromSubject({
      subject: options.subject || project.subject || project.storyTitle,
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
    const normalizedScenes = patch.scenes.map((scene, index) => ({
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
    }));
    updatedProject.scenes = normalizedScenes;
    updatedProject.subtitles = buildSubtitlesFromScenes(normalizedScenes);
    updatedProject.animationPlan = buildAnimationPlan({ scenes: normalizedScenes });
  }

  updatedProject.storyTitle = sanitizeText(updatedProject.storyTitle || updatedProject.script?.title || project.storyTitle);
  updatedProject.storyPrompt = sanitizeText(updatedProject.storyPrompt || updatedProject.script?.synopsis || project.storyPrompt);
  updatedProject.narration = sanitizeText(updatedProject.narration || updatedProject.script?.narration || project.narration);

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
  if (safeMode && containsUnsafeTheme(normalizedStoryPrompt)) {
    throw new Error('Safe mode blocked this prompt due to unsafe themes.');
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

  projectBody.promptHints = projectBody.promptHints || projectBody.scenes.map((scene) => ({
    imagePrompt: `A child-safe ${projectBody.style} scene of ${scene.description}`,
    animationPrompt: `Slow zoom, slight pan, blink, gentle movement`,
    backgroundPrompt: `Soft pastel ${projectBody.mode} background with props and warm lighting`,
  }));

  if (!Array.isArray(projectBody.subtitles) || !projectBody.subtitles.length) {
    projectBody.subtitles = projectBody.scenes.map((scene, index) => ({
      start: index * 4,
      end: index * 4 + 4,
      text: `${scene.title || `Scene ${index + 1}`}: ${scene.description || ''}`.trim(),
    }));
  }

  const narrationScript = await buildNarration(projectBody);
  projectBody.narration = narrationScript;

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
  switch (videoSize) {
    case 'shorts':
      return { width: 720, height: 1280 };
    case 'whatsapp':
      return { width: 1080, height: 1080 };
    default:
      return { width: 1280, height: 720 };
  }
};

const safeFileName = (value) => value.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();

const buildSceneSvg = (scene, project, width, height) => {
  const background = scene.emotion === 'joyful' ? '#FFF0F7' : scene.emotion === 'brave' ? '#E5F8FF' : '#F7F3FF';
  const title = scene.title || `Scene ${scene.id}`;
  const description = scene.description || '';
  const characters = scene.characters?.map((char) => char.name).join(', ') || 'Friendly characters';

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${background}" />
      <stop offset="100%" stop-color="#ffffff" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#g)" rx="40" />
  <rect x="40" y="40" width="${width - 80}" height="${height - 200}" fill="rgba(255,255,255,0.92)" rx="32" />
  <text x="70" y="110" font-family="Inter, sans-serif" font-size="48" font-weight="700" fill="#3c2e8f">${title}</text>
  <text x="70" y="180" font-family="Inter, sans-serif" font-size="24" fill="#5f4f92">${characters}</text>
  <foreignObject x="70" y="220" width="${width - 160}" height="260">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Inter, sans-serif; color: #2c234c; font-size: 18px; line-height: 1.6;">${description}</div>
  </foreignObject>
  <circle cx="${width - 120}" cy="120" r="60" fill="#f9e6ff" />
  <text x="${width - 120}" y="135" text-anchor="middle" font-family="Inter, sans-serif" font-size="24" fill="#6a3b99">${scene.emotion}</text>
</svg>`;
};

const createSceneImages = async (project, directory) => {
  const resolution = getResolution(project.videoSize);
  const sceneFiles = [];

  for (const scene of project.scenes) {
    const svg = buildSceneSvg(scene, project, resolution.width, resolution.height);
    const imagePath = path.join(directory, `scene-${scene.id}.png`);
    await sharp(Buffer.from(svg)).png().toFile(imagePath);
    const sceneDuration = Math.max(2, Math.min(15, Number(scene.durationSeconds) || 4));
    sceneFiles.push({ path: imagePath, duration: sceneDuration });
  }

  return sceneFiles;
};

const buildSubtitleFile = async (project, directory) => {
  const srtPath = path.join(directory, 'story-subtitles.srt');
  const lines = project.subtitles.map((subtitle, index) => {
    const start = new Date(subtitle.start * 1000).toISOString().substr(11, 12).replace('.', ',');
    const end = new Date(subtitle.end * 1000).toISOString().substr(11, 12).replace('.', ',');
    return `${index + 1}\n${start} --> ${end}\n${subtitle.text}\n`;
  });
  await writeFile(srtPath, lines.join('\n'), 'utf-8');
  return srtPath;
};

const runFfmpeg = async (args, cwd) => {
  if (!ffmpegPath) {
    throw new Error('FFmpeg binary is not available in this environment. Install ffmpeg-static or configure a local ffmpeg binary.');
  }

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    ffmpeg.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
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
  await ensureUploadsRoot();
  const outputDir = path.join(uploadsRoot, project.projectId || uuidv4());
  await mkdir(outputDir, { recursive: true });

  const resolution = getResolution(project.videoSize);
  const sceneAssets = await createSceneImages(project, outputDir);
  if (!sceneAssets.length) {
    throw new Error('No scene assets were generated for rendering.');
  }
  const listPath = path.join(outputDir, 'scenes.txt');
  const listContent = sceneAssets
    .map((scene) => `file '${scene.path.replace(/\\/g, '/')}\nduration ${scene.duration}`)
    .join('\n') + `\nfile '${sceneAssets[sceneAssets.length - 1].path.replace(/\\/g, '/')}'\n`;

  await writeFile(listPath, listContent, 'utf-8');
  const subtitlePath = await buildSubtitleFile(project, outputDir);
  const subtitleFileName = path.basename(subtitlePath).replace(/\\/g, '/');

  const quality = premiumHD ? '24' : '23';
  const outputFile = path.join(outputDir, 'story-render.mp4');

  const ffmpegArgs = [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', listPath,
    '-f', 'lavfi',
    '-i', `aevalsrc=0:d=${sceneAssets.length * 4}`,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-crf', quality,
    '-r', '24',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-shortest',
    '-vf', `subtitles=${subtitleFileName}:force_style='FontName=Arial,FontSize=24,PrimaryColour=&Hffffff&'`,
    outputFile,
  ];

  await runFfmpeg(ffmpegArgs, outputDir);

  const videoUrl = `/uploads/video-studio/${path.basename(outputDir)}/story-render.mp4`;
  const metadataPath = path.join(outputDir, 'project.json');
  await writeFile(metadataPath, JSON.stringify({ ...project, renderedAt: new Date().toISOString(), videoUrl }, null, 2), 'utf-8');

  return { videoUrl, projectId: path.basename(outputDir), outputFile };
};

module.exports = {
  createStudioProject,
  renderVideo,
  createAutopilotProject,
  getStudioProject,
  regenerateProjectStage,
  patchStudioProject,
};
