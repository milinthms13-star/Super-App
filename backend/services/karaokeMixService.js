const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const ffmpegPath = require('ffmpeg-static');

const MIX_OUTPUT_DIR = path.join(__dirname, '..', 'uploads', 'karaoke-duet', 'mixes');
const MIX_TEMP_DIR = path.join(__dirname, '..', 'uploads', 'karaoke-duet', 'temp');

const ensureDirectory = async (targetPath) => {
  await fs.promises.mkdir(targetPath, { recursive: true });
};

const publicUrlForAbsolutePath = (absolutePath) => {
  const uploadRoot = path.join(__dirname, '..', 'uploads');
  const normalizedRoot = path.normalize(uploadRoot);
  const normalizedAbsolute = path.normalize(absolutePath);

  if (!normalizedAbsolute.startsWith(normalizedRoot)) {
    return '';
  }

  const relative = path.relative(normalizedRoot, normalizedAbsolute).split(path.sep).join('/');
  return `/uploads/${relative}`;
};

const localPathFromAssetUrl = (assetUrl = '') => {
  const normalized = String(assetUrl || '').trim();
  if (!normalized.startsWith('/uploads/')) {
    return '';
  }
  const relative = normalized.replace(/^\/uploads\//, '');
  return path.join(__dirname, '..', 'uploads', relative);
};

const downloadRemoteAsset = async (assetUrl, extension = '.bin') => {
  await ensureDirectory(MIX_TEMP_DIR);
  const tempName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${extension}`;
  const tempPath = path.join(MIX_TEMP_DIR, tempName);

  const response = await axios.get(assetUrl, {
    responseType: 'arraybuffer',
    timeout: 60000,
  });

  await fs.promises.writeFile(tempPath, Buffer.from(response.data));
  return tempPath;
};

const resolveInputPath = async (assetUrl, fallbackExtension = '.bin') => {
  const localPath = localPathFromAssetUrl(assetUrl);
  if (localPath && fs.existsSync(localPath)) {
    return localPath;
  }

  if (/^https?:\/\//i.test(String(assetUrl || ''))) {
    return downloadRemoteAsset(assetUrl, fallbackExtension);
  }

  throw new Error(`Unsupported or missing asset source: ${assetUrl}`);
};

const runFfmpeg = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk || '');
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `FFmpeg exited with code ${code}`));
        return;
      }
      resolve();
    });
  });

const getTakeDelayMs = (roomStartedAtMs, take = {}) => {
  const takeStartMs = Number(take.localStartedAtMs);
  const offsetMs = Number(take.trackOffsetMs || 0);

  if (!Number.isFinite(roomStartedAtMs) || !Number.isFinite(takeStartMs)) {
    return Math.max(0, offsetMs);
  }

  return Math.max(0, takeStartMs - roomStartedAtMs + offsetMs);
};

const statSize = async (targetPath) => {
  const stat = await fs.promises.stat(targetPath);
  return stat.size;
};

const mixDuetRoom = async ({ room, outputFormats = ['mp3', 'wav'] }) => {
  if (!room) {
    throw new Error('Room context is required for mixing.');
  }

  const hostTake = (room.takes || []).find((take) => take.singerRole === 'host');
  const guestTake = (room.takes || []).find((take) => take.singerRole === 'guest');

  if (!hostTake || !guestTake) {
    throw new Error('Both host and guest local recordings are required before final mix.');
  }

  const mixTrackUrl = String(room.karaokeTrackUrl || '').trim();
  if (!mixTrackUrl) {
    throw new Error('karaokeTrackUrl is required to build final mix.');
  }

  await ensureDirectory(MIX_OUTPUT_DIR);
  await ensureDirectory(MIX_TEMP_DIR);

  const timestamp = Date.now();
  const seed = crypto.randomBytes(3).toString('hex');
  const baseName = `room-${String(room.roomCode || 'DUET').toLowerCase()}-${timestamp}-${seed}`;

  const trackPath = await resolveInputPath(mixTrackUrl, '.mp3');
  const hostTakePath = await resolveInputPath(hostTake.fileUrl, '.webm');
  const guestTakePath = await resolveInputPath(guestTake.fileUrl, '.webm');

  const roomStartedAtMs = Number(room.startedAtMs);
  const hostDelayMs = getTakeDelayMs(roomStartedAtMs, hostTake);
  const guestDelayMs = getTakeDelayMs(roomStartedAtMs, guestTake);

  const wavOutputPath = path.join(MIX_OUTPUT_DIR, `${baseName}.wav`);
  const filterComplex = [
    `[1:a]adelay=${hostDelayMs}|${hostDelayMs},volume=1.1[host]`,
    `[2:a]adelay=${guestDelayMs}|${guestDelayMs},volume=1.1[guest]`,
    `[0:a][host][guest]amix=inputs=3:duration=longest:dropout_transition=2[mixout]`,
  ].join(';');

  await runFfmpeg([
    '-y',
    '-i',
    trackPath,
    '-i',
    hostTakePath,
    '-i',
    guestTakePath,
    '-filter_complex',
    filterComplex,
    '-map',
    '[mixout]',
    '-ac',
    '2',
    '-ar',
    '44100',
    wavOutputPath,
  ]);

  const outputs = [];

  if (outputFormats.includes('wav')) {
    outputs.push({
      format: 'wav',
      outputUrl: publicUrlForAbsolutePath(wavOutputPath),
      fileSizeBytes: await statSize(wavOutputPath),
    });
  }

  if (outputFormats.includes('mp3')) {
    const mp3OutputPath = path.join(MIX_OUTPUT_DIR, `${baseName}.mp3`);
    await runFfmpeg([
      '-y',
      '-i',
      wavOutputPath,
      '-codec:a',
      'libmp3lame',
      '-qscale:a',
      '2',
      mp3OutputPath,
    ]);

    outputs.push({
      format: 'mp3',
      outputUrl: publicUrlForAbsolutePath(mp3OutputPath),
      fileSizeBytes: await statSize(mp3OutputPath),
    });
  }

  return {
    hostDelayMs,
    guestDelayMs,
    outputs,
  };
};

module.exports = {
  mixDuetRoom,
};
