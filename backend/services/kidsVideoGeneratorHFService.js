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

const extractPromptCharacters = (prompt = '') => {
  const lowered = sanitizeText(prompt).toLowerCase();
  const known = [
    'rabbit', 'tortoise', 'turtle', 'fox', 'squirrel', 'lion', 'bear', 'cat', 'dog',
    'elephant', 'monkey', 'deer', 'owl', 'bird', 'horse', 'goat', 'cow', 'camel',
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
  const extractedCharacters = extractPromptCharacters(cleanPrompt);

  return {
    title: 'Kids Story Adventure',
    synopsis: cleanPrompt || beats[0],
    moral: 'Kindness and consistency help us succeed.',
    characters: extractedCharacters.length
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

const escapeXml = (value = '') =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const buildSceneSvg = (scene, story, width, height) => {
  const sceneTitle = escapeXml(sanitizeText(scene.title || 'Scene'));
  const descLines = wrapText(scene.description, 42, 3);
  const characters = (story.characters || []).slice(0, 2);
  const characterSvgs = characters
    .map((char, index) => {
      const baseX = index === 0 ? Math.round(width * 0.3) : Math.round(width * 0.68);
      const headY = Math.round(height * 0.36);
      const bodyY = headY + 60;
      const accent = escapeXml(char?.colorPalette?.[1] || (index === 0 ? '#f97316' : '#0ea5e9'));
      const body = escapeXml(char?.colorPalette?.[0] || (index === 0 ? '#fb7185' : '#14b8a6'));
      const label = escapeXml(sanitizeText(char?.name || `Character ${index + 1}`));
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
    })
    .join('');
  const descSvg = descLines
    .map((line, idx) => `<text x="92" y="${Math.round(height * 0.72) + (idx * 30)}" font-size="26" fill="#0f172a">${escapeXml(line)}</text>`)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#bae6fd"/>
        <stop offset="100%" stop-color="#fef3c7"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#sky)"/>
    <rect x="0" y="${Math.round(height * 0.62)}" width="${width}" height="${Math.round(height * 0.38)}" fill="#bbf7d0"/>
    <circle cx="${Math.round(width * 0.85)}" cy="${Math.round(height * 0.16)}" r="48" fill="#fde047"/>
    <text x="72" y="88" font-size="48" font-weight="700" fill="#0f172a">${sceneTitle}</text>
    ${characterSvgs}
    <rect x="64" y="${Math.round(height * 0.66)}" width="${width - 128}" height="${Math.round(height * 0.28)}" rx="24" fill="#ffffffdd" stroke="#93c5fd" stroke-width="3"/>
    ${descSvg}
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
    const errMessage = sanitizeText(error?.message || 'unknown error');
    const causeMessage = sanitizeText(error?.cause?.message || '');
    return { buffer: null, error: causeMessage ? `${errMessage} (${causeMessage})` : errMessage };
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

const generateKidsVideoFromDiffusersPrompt = async ({
  prompt,
  videoSize = 'youtube',
  numFrames = 200,
  numInferenceSteps = 25,
}) => {
  await ensureDirectories();
  const cleanPrompt = sanitizeText(prompt);
  if (!cleanPrompt) throw new Error('Prompt is required.');
  if (cleanPrompt.length < 3) throw new Error('Prompt is too short.');

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
    '--prompt', cleanPrompt,
    '--output', outputFile,
    '--model', modelId,
    '--num_frames', `${Math.max(16, Math.min(240, Number(numFrames) || 200))}`,
    '--num_inference_steps', `${Math.max(5, Math.min(80, Number(numInferenceSteps) || 25))}`,
    '--width', `${width}`,
    '--height', `${height}`,
    '--fps', `${Math.max(8, Math.min(24, Number(process.env.HF_TEXT_TO_VIDEO_FPS) || 12))}`,
  ];

  const { stdout, command: pythonCommand } = await runPythonProcess({
    args,
    cwd: path.join(__dirname, '..'),
  });

  if (!fs.existsSync(outputFile)) {
    throw new Error(`Diffusers did not produce output video. ${stdout || ''}`.trim());
  }

  const persistedProject = {
    projectId,
    createdAt: new Date().toISOString(),
    workflowType: 'kids-video-hf-diffusers',
    aiProvider: 'huggingface',
    renderEngine: 'diffusers_t2v',
    prompt: cleanPrompt,
    title: 'HF Text-to-Video Render',
    videoSize: sanitizeText(videoSize || 'youtube'),
    outputDir,
    outputFile,
    videoUrl: `/uploads/kids-video-hf/${safeFileName(projectId)}/${outputFileName}`,
    aiImagesEnabled: true,
    renderedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    generatorLog: stdout || '',
    pythonCommand: sanitizeText(pythonCommand || ''),
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

const getKidsVideoProject = async (projectId) => {
  await ensureDirectories();
  const cleanProjectId = sanitizeText(projectId);
  if (!cleanProjectId) throw new Error('Project ID is required.');
  const raw = await readFile(projectFilePath(cleanProjectId), 'utf-8');
  return JSON.parse(raw);
};

module.exports = {
  generateKidsVideoFromPrompt,
  generateKidsVideoFromDiffusersPrompt,
  getKidsVideoProject,
};
