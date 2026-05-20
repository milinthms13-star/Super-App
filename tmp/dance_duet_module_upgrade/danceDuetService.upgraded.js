const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const ffmpegPath = require('ffmpeg-static');

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);
const uploadsRoot = path.join(__dirname, '..', 'uploads', 'dance-duet');

const ensureUploadsRoot = async () => {
  try { await access(uploadsRoot); } catch (_) { await mkdir(uploadsRoot, { recursive: true }); }
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

const saveUploadedFile = async (buffer, filename, folder = 'inputs') => {
  await ensureUploadsRoot();
  const targetFolder = path.join(uploadsRoot, folder);
  await mkdir(targetFolder, { recursive: true });
  const outputPath = path.join(targetFolder, filename);
  await writeFile(outputPath, buffer);
  return outputPath;
};

const runFfmpegCommand = (args, cwd = process.cwd()) => new Promise((resolve, reject) => {
  const ffmpeg = spawn(ffmpegPath, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  ffmpeg.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  ffmpeg.on('close', (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg failed: ${stderr}`)));
});

const canvasByFormat = (format) => format === 'landscape'
  ? { width: 1280, height: 720, dancerWidth: 560, dancerHeight: 680 }
  : { width: 720, height: 1280, dancerWidth: 620, dancerHeight: 580 };

const buildDancerFilter = ({ inputIndex, label, width, height, removeBackground, chromaColor, mirror }) => {
  const chroma = removeBackground ? `chromakey=${chromaColor}:0.28:0.12,format=rgba,` : '';
  const flip = mirror ? 'hflip,' : '';
  return `[${inputIndex}:v]${flip}${chroma}scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black@0,setsar=1[${label}]`;
};

const buildStageFilter = ({ mode, format, removeBackground, chromaColor, mirrorSecondVideo }) => {
  const canvas = canvasByFormat(format);
  const { width, height, dancerWidth, dancerHeight } = canvas;
  const filters = [
    buildDancerFilter({ inputIndex: 0, label: 'v0', width: dancerWidth, height: dancerHeight, removeBackground, chromaColor, mirror: false }),
    buildDancerFilter({ inputIndex: 1, label: 'v1', width: dancerWidth, height: dancerHeight, removeBackground, chromaColor, mirror: mirrorSecondVideo }),
    `[2:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1[bgout]`,
  ];

  const finalMode = mode === 'auto' ? (removeBackground ? 'same-background' : 'side-by-side') : mode;

  if (finalMode === 'side-by-side') {
    if (format === 'reel') {
      filters.push(`[bgout][v0]overlay=(W-w)/2:80[tmp0];[tmp0][v1]overlay=(W-w)/2:680[outv]`);
    } else {
      filters.push(`[v0][v1]hstack=inputs=2,scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2[outv]`);
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

const mergeDanceDuet = async ({
  video1Buffer,
  video2Buffer,
  backgroundBuffer,
  mode = 'auto',
  outputFormat = 'reel',
  backgroundColor = 'black',
  removeBackground = false,
  syncAudio = true,
  mirrorSecondVideo = false,
}) => {
  if (!video1Buffer || !video2Buffer) throw new Error('Both dance videos are required.');

  const sessionId = uuidv4();
  await ensureUploadsRoot();
  const video1Path = await saveUploadedFile(video1Buffer, `${sessionId}-video1.mp4`, 'inputs');
  const video2Path = await saveUploadedFile(video2Buffer, `${sessionId}-video2.mp4`, 'inputs');
  const outputFolder = path.join(uploadsRoot, 'outputs');
  await mkdir(outputFolder, { recursive: true });
  const outputFilename = `dance-duet-${sessionId}.mp4`;
  const outputPath = path.join(outputFolder, outputFilename);

  let backgroundPath = null;
  if (backgroundBuffer) {
    backgroundPath = await saveUploadedFile(backgroundBuffer, `${sessionId}-background.png`, 'backgrounds');
  }

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
  });

  const ffmpegArgs = [
    '-y',
    '-i', video1Path,
    '-i', video2Path,
    ...bgInput,
    '-filter_complex', filterComplex,
    '-map', '[outv]',
    ...(boolValue(syncAudio) ? ['-map', '0:a?'] : ['-an']),
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '22',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    '-shortest',
    outputPath,
  ];

  await runFfmpegCommand(ffmpegArgs);
  const warning = boolValue(removeBackground)
    ? 'Background removal works best only when both videos are shot on clean green/blue screen. For normal videos, use side-by-side mode.'
    : '';

  return { outputUrl: `/uploads/dance-duet/outputs/${outputFilename}`, outputPath, warning };
};

module.exports = { mergeDanceDuet };
