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
    return {
      id: index + 1,
      title: ['Opening', 'Challenge', 'Journey', 'Climax', 'Ending'][index] || `Scene ${index + 1}`,
      description: base,
      dialogue: `${leadName}: ${base}\\n${supportName}: We can do this together.`,
      emotion: index === count - 1 ? 'joyful' : (index === 2 ? 'brave' : 'wonder'),
      durationSeconds: 4,
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

const createStoryFromPrompt = (prompt = '', sceneCount = 5) => {
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

const escapeXml = (value = '') =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const buildSceneSvg = (scene, story, width, height) => {
  const sceneTitle = escapeXml(sanitizeText(scene.title || 'Scene'));
  const textSource = sanitizeText(scene.dialogue || scene.description || '');
  const descLines = wrapText(textSource, 42, 3);
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

const generateSceneImage = async ({ scene, story, outputPath, width, height }) => {
  const attempts = ['scene_svg_character_layout'];
  const svg = buildSceneSvg(scene, story, width, height);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(outputPath);
  return { generatedByAi: false, attempts };
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
    const languageCode = sanitizeText(language || 'en').split('-')[0].toLowerCase() || 'en';
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

  const zoom = [
    `zoompan=z='min(1.15,1+0.0018*on)'`,
    `x='iw/2-(iw/zoom/2)'`,
    `y='ih/2-(ih/zoom/2)'`,
    `d=${frames}:s=${width}x${height}:fps=${fps}`,
  ].join(':');

  const subtitleLines = wrapText(narrationText.replace(/\s*\n+\s*/g, ' '), 46, 3);
  const subtitleText = escapeForDrawText(subtitleLines.join('\n'));
  const subtitleBoxHeight = Math.max(110, Math.min(220, 66 + (subtitleLines.length * 30)));
  const subtitleMargin = Math.max(20, Math.round(height * 0.04));
  const subtitleY = Math.max(10, height - subtitleBoxHeight - subtitleMargin);
  const subtitleX = 40;
  const subtitleWidth = Math.max(220, width - (subtitleX * 2));
  const subtitleFontSize = Math.max(22, Math.round(height * 0.04));
  const subtitleFilter = [
    `drawbox=x=${subtitleX}:y=${subtitleY}:w=${subtitleWidth}:h=${subtitleBoxHeight}:color=black@0.48:t=fill`,
    `drawtext=text='${subtitleText}':fontcolor=white:fontsize=${subtitleFontSize}:line_spacing=8:x=(w-text_w)/2:y=${subtitleY + Math.round(subtitleBoxHeight * 0.22)}:shadowx=2:shadowy=2:shadowcolor=black@0.85`,
  ].join(',');
  const vfWithSubtitles = `${zoom},${subtitleFilter},fade=t=in:st=0:d=0.2,fade=t=out:st=${Math.max(0, duration - 0.35)}:d=0.3`;
  const vfWithoutSubtitles = `${zoom},fade=t=in:st=0:d=0.2,fade=t=out:st=${Math.max(0, duration - 0.35)}:d=0.3`;

  const baseArgs = [
    '-y',
    '-loop', '1',
    '-i', stillPath,
    '-i', audioPath,
    '-t', `${duration}`,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-r', `${fps}`,
    '-c:a', 'aac',
    '-shortest',
    clipPath,
  ];

  try {
    await runFfmpeg([
      ...baseArgs.slice(0, 8),
      '-vf', vfWithSubtitles,
      ...baseArgs.slice(8),
    ], outputDir);
  } catch (_subtitleError) {
    await runFfmpeg([
      ...baseArgs.slice(0, 8),
      '-vf', vfWithoutSubtitles,
      ...baseArgs.slice(8),
    ], outputDir);
  }

  return { clipPath, duration };
};

const generateKidsVideoFromPrompt = async ({
  prompt,
  sceneCount = 5,
  videoSize = 'youtube',
  storyMode = 'moral',
  voiceType = 'kid-female',
  language = 'en',
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
    workflowType: 'kids-video-scene-pipeline',
    aiProvider: 'scene_pipeline',
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
      language,
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
    renderMode: 'kids-video-scene-pipeline',
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
  language = 'en',
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
    '--lang', sanitizeText(language || 'en'),
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
      prompt: cleanPrompt,
      sceneCount: 5,
      videoSize,
      storyMode: 'moral',
      voiceType: 'kid-female',
    });

    return {
      ...fallbackResult,
      project: {
        ...(fallbackResult.project || {}),
        workflowType: 'kids-video-scene-fallback-no-python',
        renderEngine: 'scene_image_ffmpeg_fallback',
        fallbackReason: message || 'diffusers execution failed',
        pythonCommand: '',
      },
    };
  }

  if (!fs.existsSync(outputFile)) {
    throw new Error(`Diffusers did not produce output video. ${stdout || ''}`.trim());
  }

  const persistedProject = {
    projectId,
    createdAt: new Date().toISOString(),
    workflowType: 'kids-video-scene-prompt-video',
    aiProvider: 'scene_pipeline',
    renderEngine: 'prompt_video_python',
    prompt: cleanPrompt,
    title: 'Prompt Video Render',
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

const generateKidsVideoFromFreeSteveLikePrompt = async ({
  prompt,
  videoSize = 'youtube',
  sceneCount = 5,
  language = 'en',
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

  const scriptPath = path.join(__dirname, '..', 'scripts', 'steve_like_text_to_video.py');
  const fps = Math.max(12, Math.min(30, Number(process.env.HF_STEVE_LIKE_FPS) || 24));
  const args = [
    scriptPath,
    '--script', cleanPrompt,
    '--output', outputFile,
    '--max_scenes', `${Math.max(3, Math.min(8, Number(sceneCount) || 5))}`,
    '--width', `${width}`,
    '--height', `${height}`,
    '--fps', `${fps}`,
    '--lang', sanitizeText(language || 'en'),
  ];

  try {
    const { stdout, command: pythonCommand } = await runPythonProcess({
      args,
      cwd: path.join(__dirname, '..'),
    });

    if (!fs.existsSync(outputFile)) {
      throw new Error(`Free Steve-like generator did not produce output video. ${stdout || ''}`.trim());
    }

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
      prompt: cleanPrompt,
      title: 'Script-to-Video Render',
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
      prompt: cleanPrompt,
      sceneCount: Math.max(3, Math.min(8, Number(sceneCount) || 5)),
      videoSize,
      storyMode: 'educational',
      voiceType: 'kid-female',
    });

    return {
      ...fallbackResult,
      project: {
        ...(fallbackResult.project || {}),
        workflowType: 'kids-video-scene-script-fallback',
        renderEngine: 'scene_image_ffmpeg_fallback',
        fallbackReason: sanitizeText(error?.message || 'free steve-like generation failed'),
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

  const scriptPath = path.join(__dirname, '..', 'scripts', 'cogvideox_text_to_video.py');
  const modelId = sanitizeText(process.env.HF_COGVIDEOX_MODEL || 'THUDM/CogVideoX-2b');
  const fps = Math.max(4, Math.min(24, Number(process.env.HF_COGVIDEOX_FPS) || 8));
  const args = [
    scriptPath,
    '--prompt', cleanPrompt,
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
      prompt: cleanPrompt,
      title: 'CogVideoX Prompt Render',
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
      language: sanitizeText(language || 'en'),
      width,
      height,
      model: modelId,
      numFrames: Number(parsedScriptOutput?.num_frames || Math.max(16, Math.min(97, Number(numFrames) || 49))),
      numInferenceSteps: Number(parsedScriptOutput?.num_inference_steps || Math.max(10, Math.min(80, Number(numInferenceSteps) || 30))),
      guidanceScale: Number(parsedScriptOutput?.guidance_scale || Math.max(1, Math.min(12, Number(guidanceScale) || 6))),
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
    const strictCogVideoX = String(process.env.HF_COGVIDEOX_STRICT || 'false').toLowerCase() === 'true';
    if (strictCogVideoX) throw error;

    const fallbackResult = await generateKidsVideoFromPrompt({
      prompt: cleanPrompt,
      sceneCount: 5,
      videoSize,
      storyMode: 'moral',
      voiceType: 'kid-female',
    });

    return {
      ...fallbackResult,
      project: {
        ...(fallbackResult.project || {}),
        workflowType: 'kids-video-cogvideox-fallback',
        renderEngine: 'scene_image_ffmpeg_fallback',
        fallbackReason: sanitizeText(error?.message || 'cogvideox execution failed'),
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
  generateKidsVideoFromDiffusersPrompt,
  generateKidsVideoFromFreeSteveLikePrompt,
  generateKidsVideoFromCogVideoXPrompt,
  getKidsVideoProject,
};
