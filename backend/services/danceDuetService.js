const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const ffmpegPath = require('ffmpeg-static');

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);
const unlink = promisify(fs.unlink);
const uploadsRoot = path.join(__dirname, '..', 'uploads', 'dance-duet');

const ensureUploadsRoot = async () => {
  try {
    await access(uploadsRoot);
  } catch (_) {
    await mkdir(uploadsRoot, { recursive: true });
  }
};

const boolValue = (value) => String(value || '').toLowerCase() === 'true';
const safeColor = (value = 'black') => {
  const allowed = ['black', 'white', 'green', 'blue', 'pink'];
  return allowed.includes(String(value).toLowerCase()) ? String(value).toLowerCase() : 'black';
};
const safeMode = (value = 'auto') => {
  const allowed = ['auto', 'side-by-side', 'same-background', 'spotlight-stage', 'vertical-reel'];
  return allowed.includes(String(value)) ? String(value) : 'auto';
};
const safeFormat = (value = 'reel') => (String(value) === 'landscape' ? 'landscape' : 'reel');
const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};
const safeSeconds = (value, min = 0, max = 60) => Math.max(min, Math.min(max, toNumber(value, 0)));

const saveUploadedFile = async (buffer, filename, folder = 'inputs') => {
  await ensureUploadsRoot();
  const targetFolder = path.join(uploadsRoot, folder);
  await mkdir(targetFolder, { recursive: true });
  const outputPath = path.join(targetFolder, filename);
  await writeFile(outputPath, buffer);
  return outputPath;
};

const runCommandCaptureStderr = (binary, args, cwd = process.cwd(), allowNonZero = false) =>
  new Promise((resolve, reject) => {
    const proc = spawn(binary, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('close', (code) => {
      if (code === 0 || allowNonZero) {
        resolve({ code, stderr });
      } else {
        reject(new Error(`Command failed (${code}): ${stderr}`));
      }
    });
  });

const runFfmpegCommand = async (args, cwd = process.cwd()) => {
  const { code, stderr } = await runCommandCaptureStderr(ffmpegPath, args, cwd, false);
  if (code !== 0) {
    throw new Error(`FFmpeg failed: ${stderr}`);
  }
};

const parseDurationToSeconds = (hh = '0', mm = '0', ss = '0') =>
  Number(hh) * 3600 + Number(mm) * 60 + Number(ss);

const parseProbeOutput = (stderr = '') => {
  const durationMatch = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/i);
  const fpsMatch = stderr.match(/(\d+(?:\.\d+)?)\s*fps/i);
  const resolutionMatch = stderr.match(/,\s*(\d{2,5})x(\d{2,5})(?:[,\s]|$)/i);

  return {
    durationSeconds: durationMatch
      ? parseDurationToSeconds(durationMatch[1], durationMatch[2], durationMatch[3])
      : 0,
    fps: fpsMatch ? Number(fpsMatch[1]) : 0,
    width: resolutionMatch ? Number(resolutionMatch[1]) : 0,
    height: resolutionMatch ? Number(resolutionMatch[2]) : 0,
  };
};

const probeVideoFile = async (videoPath) => {
  const { stderr } = await runCommandCaptureStderr(
    ffmpegPath,
    ['-hide_banner', '-i', videoPath],
    process.cwd(),
    true
  );
  const parsed = parseProbeOutput(stderr);
  return {
    path: videoPath,
    durationSeconds: parsed.durationSeconds,
    fps: parsed.fps,
    width: parsed.width,
    height: parsed.height,
  };
};

const buildPreflightSummary = ({ v1 = {}, v2 = {} }) => {
  const durationDelta = Math.abs(Number(v1.durationSeconds || 0) - Number(v2.durationSeconds || 0));
  const fpsDelta = Math.abs(Number(v1.fps || 0) - Number(v2.fps || 0));
  const orientation1 = Number(v1.height || 0) >= Number(v1.width || 0) ? 'vertical' : 'landscape';
  const orientation2 = Number(v2.height || 0) >= Number(v2.width || 0) ? 'vertical' : 'landscape';

  let readinessScore = 100;
  const checks = [];
  const suggestions = [];

  if (durationDelta > 5) {
    readinessScore -= 22;
    checks.push(`Duration mismatch ${durationDelta.toFixed(1)}s`);
    suggestions.push('Trim clips to a similar duration for smoother duet sync.');
  } else if (durationDelta > 2) {
    readinessScore -= 10;
    checks.push(`Duration slightly off (${durationDelta.toFixed(1)}s)`);
  } else {
    checks.push('Duration alignment looks good.');
  }

  if (fpsDelta > 12) {
    readinessScore -= 20;
    checks.push(`FPS mismatch ${fpsDelta.toFixed(1)}`);
    suggestions.push('Use source clips with similar frame rate (for example 30fps + 30fps).');
  } else if (fpsDelta > 5) {
    readinessScore -= 10;
    checks.push(`FPS slightly mismatched (${fpsDelta.toFixed(1)})`);
  } else {
    checks.push('Frame rate pairing looks compatible.');
  }

  if (orientation1 !== orientation2) {
    readinessScore -= 12;
    checks.push(`Orientation mismatch (${orientation1} vs ${orientation2})`);
    suggestions.push('Use same orientation for both videos to avoid heavy crop/pad.');
  } else {
    checks.push(`Both videos are ${orientation1}.`);
  }

  if (!v1.durationSeconds || !v2.durationSeconds) {
    readinessScore -= 15;
    checks.push('Some media metadata could not be read.');
    suggestions.push('Re-export clips with standard MP4 (H.264 + AAC).');
  }

  const score = Math.max(0, Math.min(100, Math.round(readinessScore)));
  const riskLevel = score >= 80 ? 'low' : score >= 55 ? 'medium' : 'high';
  const summary =
    riskLevel === 'low'
      ? 'Inputs are duet-ready.'
      : riskLevel === 'medium'
      ? 'Inputs are usable with minor risks.'
      : 'High risk of sync/cropping quality issues.';

  return {
    readinessScore: score,
    riskLevel,
    summary,
    checks,
    suggestions,
    diagnostics: {
      video1: v1,
      video2: v2,
      durationDeltaSeconds: Number(durationDelta.toFixed(2)),
      fpsDelta: Number(fpsDelta.toFixed(2)),
      orientation1,
      orientation2,
    },
  };
};

const analyzeDanceDuetInputs = async ({ video1Path, video2Path }) => {
  const [v1, v2] = await Promise.all([probeVideoFile(video1Path), probeVideoFile(video2Path)]);
  return buildPreflightSummary({ v1, v2 });
};

const canvasByFormat = (format) =>
  format === 'landscape'
    ? { width: 1280, height: 720, dancerWidth: 560, dancerHeight: 680 }
    : { width: 720, height: 1280, dancerWidth: 620, dancerHeight: 580 };

const buildDancerFilter = ({
  inputIndex,
  label,
  width,
  height,
  removeBackground,
  chromaColor,
  mirror,
  trimStart = 0,
  trimEnd = 0,
  delaySeconds = 0,
}) => {
  const trimDuration =
    trimEnd > trimStart ? `trim=start=${trimStart}:end=${trimEnd},setpts=PTS-STARTPTS,` : '';
  const delayPad = delaySeconds > 0 ? `tpad=start_duration=${delaySeconds},` : '';
  const chroma = removeBackground ? `chromakey=${chromaColor}:0.28:0.12,format=rgba,` : '';
  const flip = mirror ? 'hflip,' : '';
  return `[${inputIndex}:v]${trimDuration}${delayPad}${flip}${chroma}scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black@0,setsar=1[${label}]`;
};

const buildStageFilter = ({
  mode,
  format,
  removeBackground,
  chromaColor,
  mirrorSecondVideo,
  secondVideoDelaySeconds = 0,
  trimStart1 = 0,
  trimEnd1 = 0,
  trimStart2 = 0,
  trimEnd2 = 0,
}) => {
  const canvas = canvasByFormat(format);
  const { width, height, dancerWidth, dancerHeight } = canvas;
  const filters = [
    buildDancerFilter({
      inputIndex: 0,
      label: 'v0',
      width: dancerWidth,
      height: dancerHeight,
      removeBackground,
      chromaColor,
      mirror: false,
      trimStart: trimStart1,
      trimEnd: trimEnd1,
      delaySeconds: 0,
    }),
    buildDancerFilter({
      inputIndex: 1,
      label: 'v1',
      width: dancerWidth,
      height: dancerHeight,
      removeBackground,
      chromaColor,
      mirror: mirrorSecondVideo,
      trimStart: trimStart2,
      trimEnd: trimEnd2,
      delaySeconds: secondVideoDelaySeconds,
    }),
    `[2:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1[bgout]`,
  ];

  const finalMode = mode === 'auto' ? (removeBackground ? 'same-background' : 'side-by-side') : mode;

  if (finalMode === 'side-by-side') {
    if (format === 'reel') {
      filters.push(`[bgout][v0]overlay=(W-w)/2:80[tmp0];[tmp0][v1]overlay=(W-w)/2:680[outv]`);
    } else {
      filters.push(
        `[v0][v1]hstack=inputs=2,scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2[outv]`
      );
    }
  } else if (finalMode === 'spotlight-stage') {
    const x1 = format === 'reel' ? 40 : 80;
    const x2 = format === 'reel' ? 80 : 640;
    const y1 = format === 'reel' ? 250 : 30;
    const y2 = format === 'reel' ? 560 : 30;
    filters.push(`[bgout][v0]overlay=${x1}:${y1}[tmp0];[tmp0][v1]overlay=${x2}:${y2}[outv]`);
  } else {
    const x1 = format === 'reel' ? -60 : 60;
    const x2 = format === 'reel' ? 160 : 680;
    const y = format === 'reel' ? 430 : 30;
    filters.push(`[bgout][v0]overlay=${x1}:${y}[tmp0];[tmp0][v1]overlay=${x2}:${y}[outv]`);
  }
  return filters.join('; ');
};

const mergeDanceDuetFromSources = async ({
  video1Path,
  video2Path,
  backgroundPath = '',
  musicPath = '',
  mode = 'auto',
  outputFormat = 'reel',
  backgroundColor = 'black',
  removeBackground = false,
  syncAudio = true,
  mirrorSecondVideo = false,
  secondVideoDelaySeconds = 0,
  trimStart1 = 0,
  trimEnd1 = 0,
  trimStart2 = 0,
  trimEnd2 = 0,
}) => {
  if (!video1Path || !video2Path) throw new Error('Both dance videos are required.');

  const sessionId = uuidv4();
  await ensureUploadsRoot();
  const outputFolder = path.join(uploadsRoot, 'outputs');
  await mkdir(outputFolder, { recursive: true });
  const outputFilename = `dance-duet-${sessionId}.mp4`;
  const outputPath = path.join(outputFolder, outputFilename);

  const color = safeColor(backgroundColor);
  const bgInput = backgroundPath
    ? ['-loop', '1', '-i', backgroundPath]
    : ['-f', 'lavfi', '-i', `color=c=${color}:s=1280x1280:d=60`];

  const chromaColor = ['green', 'blue'].includes(color) ? color : 'green';
  const filterComplex = buildStageFilter({
    mode: safeMode(mode),
    format: safeFormat(outputFormat),
    removeBackground: boolValue(removeBackground),
    chromaColor,
    mirrorSecondVideo: boolValue(mirrorSecondVideo),
    secondVideoDelaySeconds: safeSeconds(secondVideoDelaySeconds, 0, 10),
    trimStart1: safeSeconds(trimStart1, 0, 120),
    trimEnd1: safeSeconds(trimEnd1, 0, 120),
    trimStart2: safeSeconds(trimStart2, 0, 120),
    trimEnd2: safeSeconds(trimEnd2, 0, 120),
  });

  const hasMusicPath = Boolean(musicPath);
  const ffmpegArgs = [
    '-y',
    '-i',
    video1Path,
    '-i',
    video2Path,
    ...bgInput,
    ...(hasMusicPath ? ['-i', musicPath] : []),
    '-filter_complex',
    filterComplex,
    '-map',
    '[outv]',
    ...(hasMusicPath ? ['-map', '3:a'] : boolValue(syncAudio) ? ['-map', '0:a?'] : ['-an']),
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '22',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
    '-shortest',
    outputPath,
  ];

  await runFfmpegCommand(ffmpegArgs);
  const warning = boolValue(removeBackground)
    ? 'Background removal works best only when both videos are shot on clean green/blue screen. For normal videos, use side-by-side mode.'
    : '';

  return { outputUrl: `/uploads/dance-duet/outputs/${outputFilename}`, outputPath, warning };
};

const mergeDanceDuet = async ({
  video1Buffer,
  video2Buffer,
  backgroundBuffer,
  musicBuffer,
  mode = 'auto',
  outputFormat = 'reel',
  backgroundColor = 'black',
  removeBackground = false,
  syncAudio = true,
  mirrorSecondVideo = false,
  secondVideoDelaySeconds = 0,
  trimStart1 = 0,
  trimEnd1 = 0,
  trimStart2 = 0,
  trimEnd2 = 0,
}) => {
  if (!video1Buffer || !video2Buffer) throw new Error('Both dance videos are required.');

  const sessionId = uuidv4();
  const tempPaths = [];
  try {
    const video1Path = await saveUploadedFile(video1Buffer, `${sessionId}-video1.mp4`, 'inputs');
    tempPaths.push(video1Path);
    const video2Path = await saveUploadedFile(video2Buffer, `${sessionId}-video2.mp4`, 'inputs');
    tempPaths.push(video2Path);
    const musicPath = musicBuffer
      ? await saveUploadedFile(musicBuffer, `${sessionId}-music.mp3`, 'music')
      : '';
    if (musicPath) tempPaths.push(musicPath);
    const backgroundPath = backgroundBuffer
      ? await saveUploadedFile(backgroundBuffer, `${sessionId}-background.png`, 'backgrounds')
      : '';
    if (backgroundPath) tempPaths.push(backgroundPath);

    return await mergeDanceDuetFromSources({
      video1Path,
      video2Path,
      backgroundPath,
      musicPath,
      mode,
      outputFormat,
      backgroundColor,
      removeBackground,
      syncAudio,
      mirrorSecondVideo,
      secondVideoDelaySeconds,
      trimStart1,
      trimEnd1,
      trimStart2,
      trimEnd2,
    });
  } finally {
    for (const tempPath of tempPaths) {
      try {
        await unlink(tempPath);
      } catch (_error) {
      }
    }
  }
};

module.exports = {
  mergeDanceDuet,
  mergeDanceDuetFromSources,
  analyzeDanceDuetInputs,
};
