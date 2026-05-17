const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { promisify } = require('util');
const sharp = require('sharp');
const ffmpegPath = require('ffmpeg-static');
const { v4: uuidv4 } = require('uuid');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const access = promisify(fs.access);
const mkdir = promisify(fs.mkdir);

const uploadsRoot = path.join(__dirname, '..', 'uploads', 'kids-video-hf');
const projectsRoot = path.join(uploadsRoot, 'projects');

const huggingFaceApiBaseUrl = String(process.env.HUGGINGFACE_API_BASE_URL || 'https://api-inference.huggingface.co/models')
  .replace(/\/+$/, '');
const huggingFaceApiKey = String(process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || process.env.HF_API_KEY || '').trim();
const hfImageModels = Array.from(new Set(
  [
    process.env.HUGGINGFACE_IMAGE_MODEL,
    process.env.HF_IMAGE_MODEL,
    'black-forest-labs/FLUX.1-schnell',
    'stabilityai/stable-diffusion-xl-base-1.0',
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
));

const sanitizeText = (value = '') => String(value || '').replace(/\u0000/g, '').trim();
const safeFileName = (value = '') => sanitizeText(value).replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();

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

const runFfmpeg = async (args, cwd) => {
  const ffmpegBinary = String(process.env.FFMPEG_PATH || ffmpegPath || 'ffmpeg').trim();
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

const buildGenericStory = (prompt = '', sceneCount = 5) => {
  const cleanPrompt = sanitizeText(prompt);
  const lines = cleanPrompt
    .split(/[\.\?\!]+/)
    .map((line) => sanitizeText(line))
    .filter(Boolean);
  const beats = lines.length ? lines : ['A child begins a magical journey and learns a kind lesson.'];
  const count = Math.max(3, Math.min(8, Number(sceneCount) || 5));

  const scenes = Array.from({ length: count }).map((_, index) => {
    const base = beats[index % beats.length];
    return {
      id: index + 1,
      title: ['Opening', 'Challenge', 'Journey', 'Climax', 'Ending'][index] || `Scene ${index + 1}`,
      description: base,
      dialogue: `Hero: ${base}\\nGuide: We can do this together.`,
      emotion: index === count - 1 ? 'joyful' : (index === 2 ? 'brave' : 'wonder'),
      durationSeconds: 4,
    };
  });

  return {
    title: 'Kids Story Adventure',
    synopsis: cleanPrompt || beats[0],
    moral: 'Kindness and consistency help us succeed.',
    characters: [
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
    ],
    scenes,
  };
};

const createStoryFromPrompt = (prompt = '', sceneCount = 5) => {
  const normalized = sanitizeText(prompt).toLowerCase();
  if (/\brabbit\b/.test(normalized) && /\b(tortoise|turtle)\b/.test(normalized)) {
    return buildRabbitTortoiseStory();
  }
  return buildGenericStory(prompt, sceneCount);
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

const buildSceneSvg = (scene, story, width, height) => {
  const descLines = wrapText(scene.description, 52, 5);
  const dialogLines = wrapText(scene.dialogue.replace(/\n/g, ' '), 46, 4);
  const charLabels = (story.characters || [])
    .slice(0, 3)
    .map((char) => `${char.name} (${char.role})`)
    .join('  |  ');
  const descSvg = descLines
    .map((line, idx) => `<text x="70" y="${230 + (idx * 34)}" font-size="28" fill="#1f2937">${line}</text>`)
    .join('');
  const dialogSvg = dialogLines
    .map((line, idx) => `<text x="70" y="${430 + (idx * 30)}" font-size="22" fill="#0f172a">${line}</text>`)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#e0f2fe"/>
        <stop offset="100%" stop-color="#fff7ed"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <rect x="36" y="34" width="${width - 72}" height="${height - 68}" rx="28" fill="#ffffffdd" stroke="#bae6fd" stroke-width="2"/>
    <text x="70" y="110" font-size="46" font-weight="700" fill="#0f172a">${sanitizeText(scene.title)}</text>
    <text x="70" y="155" font-size="20" fill="#334155">${sanitizeText(charLabels)}</text>
    ${descSvg}
    <rect x="58" y="360" width="${width - 116}" height="160" rx="18" fill="#f0f9ff" stroke="#cbd5e1" stroke-width="2"/>
    <text x="70" y="398" font-size="20" font-weight="700" fill="#0369a1">Dialogue</text>
    ${dialogSvg}
  </svg>`;
};

const buildSceneImagePrompt = (scene, story) => {
  const characterText = (story.characters || [])
    .map((char) => `${char.name} (${char.role}) - ${char.appearance}`)
    .join('; ');
  return [
    'Create one kid-safe 2D cartoon scene image.',
    `Scene title: ${scene.title}.`,
    `Description: ${scene.description}.`,
    `Emotion: ${scene.emotion}.`,
    `Characters: ${characterText}.`,
    'No text, no watermark, no logo, expressive faces, colorful, cinematic framing.',
  ].join(' ');
};

const fetchHfImage = async ({ prompt, width, height, model, timeoutMs = 35000 }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(3000, Number(timeoutMs) || 35000));
  try {
    const headers = {
      'content-type': 'application/json',
      accept: 'image/*',
      'x-use-cache': 'false',
    };
    if (huggingFaceApiKey) {
      headers.authorization = `Bearer ${huggingFaceApiKey}`;
    }

    const response = await fetch(`${huggingFaceApiBaseUrl}/${model}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        inputs: sanitizeText(prompt),
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
      let message = `${response.status}`;
      try {
        const payload = await response.json();
        message = sanitizeText(payload?.error || payload?.message || message);
      } catch (_error) {
        // ignore body parse errors
      }
      return { buffer: null, error: message };
    }

    const contentType = sanitizeText(response.headers.get('content-type') || '');
    if (!contentType.startsWith('image/')) {
      return { buffer: null, error: `unexpected content-type ${contentType || 'unknown'}` };
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    return { buffer: imageBuffer.length ? imageBuffer : null, error: imageBuffer.length ? '' : 'empty image bytes' };
  } catch (error) {
    return { buffer: null, error: sanitizeText(error?.message || 'unknown error') };
  } finally {
    clearTimeout(timeout);
  }
};

const generateSceneImage = async ({ scene, story, outputPath, width, height }) => {
  const prompt = buildSceneImagePrompt(scene, story);
  const attempts = [];
  for (const model of hfImageModels) {
    const { buffer, error } = await fetchHfImage({ prompt, width, height, model });
    if (buffer?.length) {
      await sharp(buffer)
        .resize(width, height, { fit: 'cover' })
        .png({ compressionLevel: 7 })
        .toFile(outputPath);
      return { generatedByAi: true, attempts };
    }
    attempts.push(`${model}: ${error || 'no image bytes'}`);
  }

  const svg = buildSceneSvg(scene, story, width, height);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(outputPath);
  return { generatedByAi: false, attempts };
};

const renderSceneClip = async ({ scene, index, outputDir, stillPath, width, height }) => {
  const fps = 24;
  const duration = Math.max(3, Math.min(8, Number(scene.durationSeconds) || 4));
  const frames = Math.max(1, Math.floor(duration * fps));
  const clipPath = path.join(outputDir, `scene-${String(index + 1).padStart(2, '0')}.mp4`);
  const audioPath = path.join(outputDir, `scene-${String(index + 1).padStart(2, '0')}-tone.mp3`);
  const baseHz = 260 + ((index * 47) % 190);
  const overHz = baseHz + 120;

  await runFfmpeg([
    '-y',
    '-f', 'lavfi',
    '-i', `aevalsrc=(0.02*sin(2*PI*${baseHz}*t)+0.01*sin(2*PI*${overHz}*t)):s=44100:d=${duration}`,
    '-c:a', 'libmp3lame',
    '-b:a', '96k',
    audioPath,
  ], outputDir);

  const zoom = [
    `zoompan=z='min(1.15,1+0.0018*on)'`,
    `x='iw/2-(iw/zoom/2)'`,
    `y='ih/2-(ih/zoom/2)'`,
    `d=${frames}:s=${width}x${height}:fps=${fps}`,
  ].join(':');

  await runFfmpeg([
    '-y',
    '-loop', '1',
    '-i', stillPath,
    '-i', audioPath,
    '-t', `${duration}`,
    '-vf', `${zoom},fade=t=in:st=0:d=0.2,fade=t=out:st=${Math.max(0, duration - 0.35)}:d=0.3`,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-r', `${fps}`,
    '-c:a', 'aac',
    '-shortest',
    clipPath,
  ], outputDir);

  return { clipPath, duration };
};

const generateKidsVideoFromPrompt = async ({
  prompt,
  sceneCount = 5,
  videoSize = 'youtube',
  storyMode = 'moral',
  voiceType = 'kid-female',
}) => {
  await ensureDirectories();

  const cleanPrompt = sanitizeText(prompt);
  if (!cleanPrompt) {
    throw new Error('Prompt is required.');
  }
  if (cleanPrompt.length < 3) {
    throw new Error('Prompt is too short.');
  }

  const baseStory = createStoryFromPrompt(cleanPrompt, sceneCount);
  const projectId = uuidv4();
  const { width, height } = getResolution(videoSize);
  const outputDir = path.join(uploadsRoot, safeFileName(projectId));
  await mkdir(outputDir, { recursive: true });

  const story = {
    projectId,
    createdAt: new Date().toISOString(),
    workflowType: 'kids-video-hf-clean-restart',
    aiProvider: 'huggingface',
    storyMode: sanitizeText(storyMode || 'moral'),
    voiceType: sanitizeText(voiceType || 'kid-female'),
    videoSize: sanitizeText(videoSize || 'youtube'),
    prompt: cleanPrompt,
    ...baseStory,
    scenes: (baseStory.scenes || []).slice(0, Math.max(3, Math.min(8, Number(sceneCount) || 5))),
  };

  const clips = [];
  const sceneRenderMeta = [];
  for (let index = 0; index < story.scenes.length; index += 1) {
    const scene = story.scenes[index];
    const stillPath = path.join(outputDir, `scene-${String(index + 1).padStart(2, '0')}-still.png`);
    const imageResult = await generateSceneImage({
      scene,
      story,
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
    });
    clips.push(clipResult);
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

  const aiImagesEnabled = sceneRenderMeta.some((sceneMeta) => sceneMeta.generatedByAi);
  const videoUrl = `/uploads/kids-video-hf/${safeFileName(projectId)}/${outputFileName}`;

  const persistedProject = {
    ...story,
    projectId,
    outputDir,
    outputFile,
    videoUrl,
    renderMode: 'kids-video-hf-clean-restart',
    aiImagesEnabled,
    scenes: story.scenes,
    sceneRenderMeta,
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

const getKidsVideoProject = async (projectId) => {
  await ensureDirectories();
  const cleanProjectId = sanitizeText(projectId);
  if (!cleanProjectId) throw new Error('Project ID is required.');
  const raw = await readFile(projectFilePath(cleanProjectId), 'utf-8');
  return JSON.parse(raw);
};

module.exports = {
  generateKidsVideoFromPrompt,
  getKidsVideoProject,
};

