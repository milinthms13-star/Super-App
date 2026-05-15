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
  try {
    await access(uploadsRoot);
  } catch (_) {
    await mkdir(uploadsRoot, { recursive: true });
  }
};

const getSafeColorValue = (value = '') => {
  const color = String(value || '').trim();
  if (!color) return 'black';
  if (color.startsWith('#')) return color;
  if (color.toLowerCase() === 'white') return 'white';
  if (color.toLowerCase() === 'black') return 'black';
  if (color.toLowerCase() === 'green') return 'green';
  if (color.toLowerCase() === 'blue') return 'blue';
  if (color.toLowerCase() === 'pink') return 'pink';
  return 'black';
};

const saveUploadedFile = async (buffer, filename, folder = 'inputs') => {
  await ensureUploadsRoot();
  const targetFolder = path.join(uploadsRoot, folder);
  await mkdir(targetFolder, { recursive: true });
  const outputPath = path.join(targetFolder, filename);
  await writeFile(outputPath, buffer);
  return outputPath;
};

const runFfmpegCommand = (args, cwd = process.cwd()) =>
  new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    ffmpeg.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
        return;
      }
      resolve();
    });
  });

const buildInputFilters = ({ inputIndex, label, removeBackground, chromaColor }) => {
  const sourceLabel = `[${inputIndex}:v]`;
  const chromakey = removeBackground
    ? `chromakey=${chromaColor || 'green'}:0.30:0.15,format=rgba,`
    : '';
  return `${sourceLabel}${chromakey}scale=640:720:force_original_aspect_ratio=decrease,pad=640:720:(ow-iw)/2:(oh-ih)/2,setsar=1[${label}]`;
};

const buildBackgroundFilter = ({ mode, backgroundInputLabel }) => {
  if (mode === 'side-by-side') {
    return `[bg]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2[bgout];`;
  }
  return `[bg]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2[bgout];`;
};

const mergeDanceDuet = async ({
  video1Buffer,
  video2Buffer,
  backgroundBuffer,
  mode = 'side-by-side',
  backgroundColor = 'black',
  removeBackground = false,
  beatSync = false,
}) => {
  if (!video1Buffer || !video2Buffer) {
    throw new Error('Both dance videos are required.');
  }

  await ensureUploadsRoot();
  const sessionId = uuidv4();
  const video1Path = await saveUploadedFile(video1Buffer, `${sessionId}-video1.mp4`, 'inputs');
  const video2Path = await saveUploadedFile(video2Buffer, `${sessionId}-video2.mp4`, 'inputs');
  let backgroundPath = null;

  const outputFolder = path.join(uploadsRoot, 'outputs');
  await mkdir(outputFolder, { recursive: true });
  const outputFilename = `dance-duet-${sessionId}.mp4`;
  const outputPath = path.join(outputFolder, outputFilename);

  const useBackgroundImage = Boolean(backgroundBuffer);
  if (useBackgroundImage) {
    backgroundPath = await saveUploadedFile(backgroundBuffer, `${sessionId}-background.png`, 'backgrounds');
  }

  const chromaColor = getSafeColorValue(backgroundColor);
  const removeBgColor = removeBackground && ['green', 'blue'].includes(chromaColor.toLowerCase()) ? chromaColor : null;

  const inputs = [];
  inputs.push('-i', video1Path);
  inputs.push('-i', video2Path);

  if (useBackgroundImage) {
    inputs.push('-i', backgroundPath);
  } else {
    inputs.push('-f', 'lavfi', '-i', `color=c=${getSafeColorValue(backgroundColor)}:s=1280x720:d=60`);
  }

  const videoFilters = [
    buildInputFilters({ inputIndex: 0, label: 'v0', removeBackground: Boolean(removeBgColor), chromaColor: removeBgColor }),
    buildInputFilters({ inputIndex: 1, label: 'v1', removeBackground: Boolean(removeBgColor), chromaColor: removeBgColor }),
  ];

  const backgroundIndex = useBackgroundImage ? 2 : 2;
  videoFilters.push(`[${backgroundIndex}:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2[bgout]`);

  if (mode === 'same-background') {
    videoFilters.push(
      '[bgout][v0]overlay=60:0[tmp0];' +
      '[tmp0][v1]overlay=700:0[outv]'
    );
  } else {
    videoFilters.push('[v0][v1]hstack=inputs=2[outv]');
  }

  const filterComplex = videoFilters.join('; ');

  const ffmpegArgs = [
    '-y',
    ...inputs,
    '-filter_complex', filterComplex,
    '-map', '[outv]',
    '-map', '0:a?',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    '-shortest',
    outputPath,
  ];

  await runFfmpegCommand(ffmpegArgs);

  const outputUrl = `/uploads/dance-duet/outputs/${outputFilename}`;
  return {
    outputUrl,
    outputPath,
  };
};

module.exports = {
  mergeDanceDuet,
};
