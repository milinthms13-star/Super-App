const fs = require('fs/promises');
const path = require('path');
const DanceDuetJob = require('../models/DanceDuetJob');
const { mergeDanceDuetFromSources, analyzeDanceDuetInputs } = require('./danceDuetService');

const MAX_RETRY_ATTEMPTS = 2;
const QUEUE_CONCURRENCY = process.env.NODE_ENV === 'test' ? 1 : 2;
const ENABLE_QUEUE_WORKER = process.env.DANCE_DUET_DISABLE_QUEUE_WORKER !== 'true';
const queueInputRoot = path.resolve(path.join(__dirname, '..', 'uploads', 'dance-duet', 'queue-inputs'));
const outputsBaseDir = path.resolve(path.join(__dirname, '..', 'uploads', 'dance-duet', 'outputs'));
const queueState = {
  running: 0,
  pending: [],
};
const idempotencyLocks = new Map();

const boolValue = (value) => String(value || '').toLowerCase() === 'true' || value === true;
const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};
const normalizeText = (value, maxLength = 200) =>
  String(value || '')
    .trim()
    .slice(0, maxLength);

const getIdempotencyKey = (req) =>
  normalizeText(
    req.headers['x-idempotency-key'] || req.headers['idempotency-key'] || req.body?.idempotencyKey,
    140
  );

const isTrimWindowInvalid = (startValue = 0, endValue = 0) => {
  const start = toNumber(startValue, 0);
  const end = toNumber(endValue, 0);
  return end > 0 && end <= start;
};

const isPathInsideRoot = (absolutePath = '', rootPath = '') => {
  if (!absolutePath || !rootPath) return false;
  const relative = path.relative(rootPath, absolutePath);
  if (relative === '') return true;
  return !relative.startsWith('..') && !path.isAbsolute(relative);
};

const getOutputAbsolutePath = (outputUrl = '') => {
  if (!outputUrl || typeof outputUrl !== 'string') return '';
  const normalized = String(outputUrl).replace(/^\/+/, '').replace(/\//g, path.sep);
  return path.join(__dirname, '..', normalized);
};

const resolveSafeOutputPath = (outputUrl = '') => {
  const absolute = path.resolve(getOutputAbsolutePath(outputUrl));
  if (!absolute) return '';
  if (!isPathInsideRoot(absolute, outputsBaseDir)) return '';
  return absolute;
};

const resolveSafeQueueInputPath = (inputPath = '') => {
  if (!inputPath) return '';
  const absolute = path.resolve(inputPath);
  if (!isPathInsideRoot(absolute, queueInputRoot)) return '';
  return absolute;
};

const safeDeleteFile = async (filePath = '') => {
  if (!filePath) return false;
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    return false;
  }
};

const cleanupQueuedInputFiles = async (job = {}) => {
  const inputFiles = [
    job?.queuedInput?.video1Path || '',
    job?.queuedInput?.video2Path || '',
    job?.queuedInput?.musicPath || '',
    job?.queuedInput?.backgroundPath || '',
  ];
  for (const inputFile of inputFiles) {
    const safePath = resolveSafeQueueInputPath(inputFile);
    if (safePath) {
      await safeDeleteFile(safePath);
    }
  }
};

const canAccessJob = (job, reqUser) =>
  String(job.userEmail || '').toLowerCase() === String(reqUser?.email || '').toLowerCase();

const createGrowthPack = ({ job = {}, preflight = {} }) => {
  const mode = String(job?.options?.mode || 'auto');
  const format = String(job?.options?.outputFormat || 'reel');
  const score = Number(preflight?.readinessScore || 0);
  const riskLabel = String(preflight?.riskLevel || 'medium');
  const challengeTitle =
    mode === 'spotlight-stage'
      ? 'Spotlight Stage Duet Challenge'
      : mode === 'side-by-side'
      ? 'Split-Screen Sync Challenge'
      : 'AI Dance Duet Challenge';
  const thumbnailHook = score >= 80 ? 'Perfect Sync Duet' : score >= 55 ? 'Duet Glow-Up' : 'Before/After Sync Fix';
  const hashtags = [
    '#NilaHubDanceDuet',
    '#AIDance',
    mode === 'vertical-reel' ? '#ReelReady' : '#DanceCollab',
    format === 'reel' ? '#Shorts' : '#DanceVideo',
    riskLabel === 'high' ? '#DanceRetry' : '#DuetReady',
  ];
  const shareCaption = `We turned two clips into one ${mode} performance with AI.`;
  const instagramCaption = `${challengeTitle}\n${shareCaption}\n\n${hashtags.join(' ')}`;
  const youtubeTitle = `${thumbnailHook} | ${challengeTitle}`;
  return {
    challengeTitle,
    thumbnailHook,
    shareCaption,
    instagramCaption,
    youtubeTitle,
    callToAction: 'Try your own duet and tag us with #NilaHubDanceDuet',
    hashtags,
  };
};

const statusSummary = (job = {}) => ({
  id: job._id,
  status: job.status,
  attempts: Number(job?.processing?.attempts || 0),
  maxAttempts: Number(job?.processing?.maxAttempts || MAX_RETRY_ATTEMPTS),
  nextRetryAt: job?.processing?.nextRetryAt || null,
  deadLetterReason: job?.processing?.deadLetterReason || '',
  outputUrl: job?.output?.outputUrl || '',
  errorMessage: job?.output?.errorMessage || '',
  processingMs: Number(job?.output?.processingMs || 0),
  preflight: job?.preflight || {},
  growthPack: job?.growthPack || {},
});

const isRetryableFailure = (error = null) => {
  const message = String(error?.message || '').toLowerCase();
  if (!message) return true;
  if (message.includes('invalid') || message.includes('not authorized') || message.includes('required')) {
    return false;
  }
  return true;
};

const withIdempotencyLock = async (lockKey, task) => {
  if (!lockKey) {
    return task();
  }

  const previous = idempotencyLocks.get(lockKey) || Promise.resolve();
  let releaseCurrent = null;
  const current = new Promise((resolve) => {
    releaseCurrent = resolve;
  });
  idempotencyLocks.set(lockKey, current);

  await previous;
  try {
    return await task();
  } finally {
    if (typeof releaseCurrent === 'function') {
      releaseCurrent();
    }
    if (idempotencyLocks.get(lockKey) === current) {
      idempotencyLocks.delete(lockKey);
    }
  }
};

const processQueuedJob = async (jobId) => {
  const now = new Date();
  const scheduled = await DanceDuetJob.findById(jobId).select('status processing.nextRetryAt').lean();
  if (!scheduled || scheduled.status === 'deleted') return;
  if (!['queued', 'processing'].includes(scheduled.status)) return;
  if (scheduled.status === 'processing' && !scheduled?.processing?.nextRetryAt) return;
  const pendingRetryAt = scheduled?.processing?.nextRetryAt;
  if (pendingRetryAt && new Date(pendingRetryAt).getTime() > now.getTime()) {
    const waitMs = Math.max(0, new Date(pendingRetryAt).getTime() - now.getTime());
    enqueueJob(String(jobId), waitMs);
    return;
  }

  const job = await DanceDuetJob.findOneAndUpdate(
    {
      _id: jobId,
      $or: [
        { status: 'queued' },
        {
          status: 'processing',
          'processing.nextRetryAt': { $ne: null, $lte: now },
        },
      ],
    },
    {
      $set: {
        status: 'processing',
        'processing.lastAttemptAt': now,
        'processing.worker': `pid-${process.pid}`,
        'processing.nextRetryAt': null,
      },
      $inc: { 'processing.attempts': 1 },
    },
    { new: true }
  );
  if (!job) return;

  if (!job.startedAt) {
    job.startedAt = now;
    await job.save();
  }

  try {
    const result = await mergeDanceDuetFromSources({
      video1Path: job?.queuedInput?.video1Path || '',
      video2Path: job?.queuedInput?.video2Path || '',
      backgroundPath: job?.queuedInput?.backgroundPath || '',
      musicPath: job?.queuedInput?.musicPath || '',
      mode: job?.options?.mode || 'auto',
      outputFormat: job?.options?.outputFormat || 'reel',
      backgroundColor: job?.options?.backgroundColor || 'black',
      removeBackground: boolValue(job?.options?.removeBackground),
      syncAudio: boolValue(job?.options?.syncAudio),
      mirrorSecondVideo: boolValue(job?.options?.mirrorSecondVideo),
      secondVideoDelaySeconds: toNumber(job?.options?.secondVideoDelaySeconds, 0),
      trimStart1: toNumber(job?.options?.trimStart1, 0),
      trimEnd1: toNumber(job?.options?.trimEnd1, 0),
      trimStart2: toNumber(job?.options?.trimStart2, 0),
      trimEnd2: toNumber(job?.options?.trimEnd2, 0),
    });

    const completedAt = new Date();
    job.status = 'completed';
    job.finishedAt = completedAt;
    job.output = {
      outputUrl: result.outputUrl,
      warning: result.warning || '',
      errorMessage: '',
      processingMs: Math.max(0, completedAt.getTime() - new Date(job.startedAt || completedAt).getTime()),
    };
    job.processing.nextRetryAt = null;
    job.processing.deadLetterReason = '';
    job.processing.deadLetteredAt = null;
    job.growthPack = createGrowthPack({ job, preflight: job.preflight });
    await cleanupQueuedInputFiles(job);
    job.queuedInput = {
      video1Path: '',
      video2Path: '',
      musicPath: '',
      backgroundPath: '',
    };
    await job.save();
  } catch (error) {
    const attempts = Number(job?.processing?.attempts || 1);
    const retryable = isRetryableFailure(error);
    if (retryable && attempts < MAX_RETRY_ATTEMPTS) {
      const retryAt = new Date(Date.now() + 15000 * attempts);
      job.status = 'queued';
      job.processing.nextRetryAt = retryAt;
      job.output = {
        outputUrl: '',
        warning: '',
        errorMessage: String(error?.message || 'Merge failed'),
        processingMs: 0,
      };
      await job.save();
      enqueueJob(String(job._id), 15000 * attempts);
    } else {
      job.status = 'failed';
      job.finishedAt = new Date();
      job.processing.deadLetteredAt = new Date();
      job.processing.deadLetterReason = String(error?.message || 'Dead-lettered after retries.');
      job.output = {
        outputUrl: '',
        warning: '',
        errorMessage: String(error?.message || 'Merge failed'),
        processingMs: 0,
      };
      await cleanupQueuedInputFiles(job);
      job.queuedInput = {
        video1Path: '',
        video2Path: '',
        musicPath: '',
        backgroundPath: '',
      };
      await job.save();
    }
  }
};

const enqueueJob = (jobId, delayMs = 0) => {
  if (!jobId) return;
  if (delayMs > 0) {
    setTimeout(() => enqueueJob(jobId), delayMs);
    return;
  }
  if (!queueState.pending.includes(String(jobId))) {
    queueState.pending.push(String(jobId));
  }
  void runQueueWorker();
};

const runQueueWorker = async () => {
  if (!ENABLE_QUEUE_WORKER) return;
  while (queueState.running < QUEUE_CONCURRENCY && queueState.pending.length > 0) {
    const nextJobId = queueState.pending.shift();
    if (!nextJobId) return;
    queueState.running += 1;
    void processQueuedJob(nextJobId).finally(() => {
      queueState.running = Math.max(0, queueState.running - 1);
      setImmediate(() => {
        void runQueueWorker();
      });
    });
  }
};

const bootstrapQueuedJobs = async () => {
  if (!ENABLE_QUEUE_WORKER) return;
  try {
    const queuedJobs = await DanceDuetJob.find({
      status: { $in: ['queued', 'processing'] },
    })
      .sort({ createdAt: 1 })
      .select('_id')
      .lean();
    for (const job of queuedJobs) {
      enqueueJob(String(job._id));
    }
  } catch (_error) {
    // ignore bootstrap errors
  }
};

const saveQueueInputFile = async (jobId, file, tag, fallbackExt) => {
  await fs.mkdir(queueInputRoot, { recursive: true });
  const ext = path.extname(String(file?.originalname || '')).slice(0, 8).toLowerCase() || fallbackExt;
  const safeExt = ext.startsWith('.') ? ext : `.${ext}`;
  const filename = `${String(jobId)}-${tag}${safeExt}`;
  const targetPath = path.join(queueInputRoot, filename);
  await fs.writeFile(targetPath, file.buffer);
  return targetPath;
};

module.exports = {
  MAX_RETRY_ATTEMPTS,
  boolValue,
  toNumber,
  normalizeText,
  getIdempotencyKey,
  isTrimWindowInvalid,
  canAccessJob,
  createGrowthPack,
  statusSummary,
  withIdempotencyLock,
  enqueueJob,
  bootstrapQueuedJobs,
  saveQueueInputFile,
  cleanupQueuedInputFiles,
  resolveSafeOutputPath,
  resolveSafeQueueInputPath,
};
