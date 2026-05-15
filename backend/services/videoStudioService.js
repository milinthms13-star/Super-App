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
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);
const stat = promisify(fs.stat);

const uploadsRoot = path.join(__dirname, '..', 'uploads', 'video-studio');

let openai;
try {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} catch (error) {
  openai = null;
}

const ensureUploadsRoot = async () => {
  try {
    await access(uploadsRoot);
  } catch (_) {
    await mkdir(uploadsRoot, { recursive: true });
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

const fallbackParseStory = ({ story, storyMode, voiceType, language }) => {
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
    title: `AI Kids Animation Studio: ${storiesToTitle(story)}`,
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

const createStudioProject = async ({ storyPrompt, languageId, styleId, voiceType, videoSizeId, storyMode, safeMode, ageFilter, storySource }) => {
  const project = {
    projectId: uuidv4(),
    createdAt: new Date().toISOString(),
    storyPrompt,
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
${storyPrompt}

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
      promptHints: parsed.promptHints || [],
    };
  } else {
    projectBody = { ...project, ...fallbackParseStory({ story: storyPrompt, storyMode, voiceType, language: languageId }) };
  }

  projectBody.promptHints = projectBody.promptHints || projectBody.scenes.map((scene) => ({
    imagePrompt: `A child-safe ${projectBody.style} scene of ${scene.description}`,
    animationPrompt: `Slow zoom, slight pan, blink, gentle movement`,
    backgroundPrompt: `Soft pastel ${projectBody.mode} background with props and warm lighting`,
  }));

  const narrationScript = await buildNarration(projectBody);
  projectBody.narration = narrationScript;

  return projectBody;
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
    sceneFiles.push({ path: imagePath, duration: 4 });
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
  const listPath = path.join(outputDir, 'scenes.txt');
  const listContent = sceneAssets
    .map((scene) => `file '${scene.path.replace(/\\/g, '/')}\nduration ${scene.duration}`)
    .join('\n') + `\nfile '${sceneAssets[sceneAssets.length - 1].path.replace(/\\/g, '/')}'\n`;

  await writeFile(listPath, listContent, 'utf-8');
  const subtitlePath = await buildSubtitleFile(project, outputDir);

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
    '-vf', `subtitles=${subtitlePath.replace(/\\/g, '/')}:force_style='FontName=Arial,FontSize=24,PrimaryColour=&Hffffff&'`,
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
};
