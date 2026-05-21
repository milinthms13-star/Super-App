const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const authenticate = require('../middleware/auth');
const {
  mergeDanceDuetFromSources,
  analyzeDanceDuetInputs,
} = require('../services/danceDuetService');
const DanceDuetJob = require('../models/DanceDuetJob');

const router = express.Router();
const isTestEnv = process.env.NODE_ENV === 'test';
const MAX_SINGLE_VIDEO_BYTES = 180 * 1024 * 1024;
const MAX_TOTAL_UPLOAD_BYTES = 320 * 1024 * 1024;
const MAX_MUSIC_BYTES = 35 * 1024 * 1024;
const MAX_BACKGROUND_BYTES = 20 * 1024 * 1024;
const MAX_RETRY_ATTEMPTS = 2;
const RETRY_BACKOFF_MS = 15000;
const QUEUE_CONCURRENCY = isTestEnv ? 1 : 2;
const DEFAULT_POLL_SECONDS = 3;
const ENABLE_QUEUE_WORKER = process.env.DANCE_DUET_DISABLE_QUEUE_WORKER !== 'true';
const queueInputRoot = path.resolve(path.join(__dirname, '..', 'uploads', 'dance-duet', 'queue-inputs'));
const outputsBaseDir = path.resolve(path.join(__dirname, '..', 'uploads', 'dance-duet', 'outputs'));

const defaultLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTestEnv ? 200 : 40,
  standardHeaders: true,
  legacyHeaders: false,
});
const mergeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTestEnv ? 120 : 12,
  standardHeaders: true,
  legacyHeaders: false,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_SINGLE_VIDEO_BYTES } });
const supportedVideoMime = /^(video\/(mp4|webm|mov|quicktime|x-matroska)|application\/octet-stream)$/i;
const supportedImageMime = /^(image\/(png|jpeg|jpg))$/i;
const supportedAudioMime = /^(audio\/(mpeg|mp3|wav|x-wav|aac|mp4|ogg)|application\/octet-stream)$/i;

const mergeOptionsSchema = Joi.object({
  mode: Joi.string()
    .trim()
    .valid('auto', 'side-by-side', 'same-background', 'spotlight-stage', 'vertical-reel')
    .default('auto'),
  outputFormat: Joi.string().trim().valid('reel', 'landscape').default('reel'),
  backgroundColor: Joi.string().trim().valid('black', 'white', 'green', 'blue', 'pink').default('black'),
  removeBackground: Joi.boolean().truthy('true').falsy('false').default(false),
  syncAudio: Joi.boolean().truthy('true').falsy('false').default(true),
  mirrorSecondVideo: Joi.boolean().truthy('true').falsy('false').default(false),
  secondVideoDelaySeconds: Joi.number().min(0).max(10).default(0),
  delayB: Joi.number().min(0).max(10).default(0),
  trimStart1: Joi.number().min(0).max(120).default(0),
  trimEnd1: Joi.number().min(0).max(120).default(0),
  trimStart2: Joi.number().min(0).max(120).default(0),
  trimEnd2: Joi.number().min(0).max(120).default(0),
});

const jobsListQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  page: Joi.number().integer().min(1).default(1),
  status: Joi.string().trim().valid('queued', 'processing', 'completed', 'failed', 'deleted').allow('').default(''),
});

const purgeJobsQuerySchema = Joi.object({
  status: Joi.string().trim().valid('failed', 'completed', 'deleted').default('failed'),
  olderThanDays: Joi.number().integer().min(0).max(3650).default(30),
  includeFiles: Joi.boolean().truthy('true').falsy('false').default(true),
});

const queueState = {
  running: 0,
  pending: [],
};

const validateFileType = (file, regex, label) => {
  if (!file || !regex.test(String(file.mimetype || ''))) {
    throw new Error(`Invalid ${label}. Please upload MP4/WebM/MOV video or PNG/JPG background.`);
  }
};

const boolValue = (value) => String(value || '').toLowerCase() === 'true' || value === true;
const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};
const normalizeText = (value, maxLength = 200) =>
  String(value || '')
    .trim()
    .slice(0, maxLength);
const buildRequestId = () => `danceduet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

const getOutputAbsolutePath = (outputUrl = '') => {
  if (!outputUrl || typeof outputUrl !== 'string') return '';
  const normalized = String(outputUrl).replace(/^\/+/, '').replace(/\//g, path.sep);
  return path.join(__dirname, '..', normalized);
};

const resolveSafeOutputPath = (outputUrl = '') => {
  const absolute = path.resolve(getOutputAbsolutePath(outputUrl));
  if (!absolute) return '';
  if (!absolute.startsWith(outputsBaseDir)) return '';
  return absolute;
};

const resolveSafeQueueInputPath = (inputPath = '') => {
  if (!inputPath) return '';
  const absolute = path.resolve(inputPath);
  if (!absolute.startsWith(queueInputRoot)) return '';
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
  }
};

const processQueuedJob = async (jobId) => {
  const job = await DanceDuetJob.findById(jobId);
  if (!job || job.status === 'deleted') return;
  if (!['queued', 'processing'].includes(job.status)) return;

  const now = new Date();
  const nextRetryAt = job?.processing?.nextRetryAt;
  if (nextRetryAt && new Date(nextRetryAt).getTime() > now.getTime()) {
    const waitMs = Math.max(0, new Date(nextRetryAt).getTime() - now.getTime());
    enqueueJob(String(job._id), waitMs);
    return;
  }

  job.status = 'processing';
  if (!job.startedAt) {
    job.startedAt = now;
  }
  if (!job.processing) {
    job.processing = {};
  }
  job.processing.attempts = Number(job.processing.attempts || 0) + 1;
  job.processing.lastAttemptAt = now;
  job.processing.worker = `pid-${process.pid}`;
  job.processing.nextRetryAt = null;
  await job.save();

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
    const maxAttempts = Number(job?.processing?.maxAttempts || MAX_RETRY_ATTEMPTS);
    if (retryable && attempts < maxAttempts) {
      const retryAt = new Date(Date.now() + RETRY_BACKOFF_MS * attempts);
      job.status = 'queued';
      job.processing.nextRetryAt = retryAt;
      job.output = {
        outputUrl: '',
        warning: '',
        errorMessage: String(error?.message || 'Merge failed'),
        processingMs: 0,
      };
      await job.save();
      enqueueJob(String(job._id), RETRY_BACKOFF_MS * attempts);
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

const saveQueueInputFile = async (jobId, file, tag, fallbackExt) => {
  await fs.mkdir(queueInputRoot, { recursive: true });
  const ext = path.extname(String(file?.originalname || '')).slice(0, 8).toLowerCase() || fallbackExt;
  const safeExt = ext.startsWith('.') ? ext : `.${ext}`;
  const filename = `${String(jobId)}-${tag}${safeExt}`;
  const targetPath = path.join(queueInputRoot, filename);
  await fs.writeFile(targetPath, file.buffer);
  return targetPath;
};

router.use((req, res, next) => {
  const requestId = normalizeText(req.headers['x-request-id'], 120) || buildRequestId();
  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
});

router.get('/meta', authenticate, defaultLimiter, async (_req, res) => {
  res.json({
    success: true,
    module: 'AI Dance Duet',
    description: 'Queue-based dance duet rendering with preflight checks, retries, and creator growth pack.',
    limits: { maxVideoMb: 180, recommendedSeconds: '10-30' },
    modes: ['auto', 'side-by-side', 'same-background', 'spotlight-stage', 'vertical-reel'],
    capabilities: [
      'merge',
      'history',
      'analytics',
      'download',
      'idempotency',
      'request-tracking',
      'async-queue',
      'preflight',
      'retries',
      'growth-pack',
    ],
  });
});

const uploadFields = upload.fields([
  { name: 'video1', maxCount: 1 },
  { name: 'video2', maxCount: 1 },
  { name: 'videoA', maxCount: 1 },
  { name: 'videoB', maxCount: 1 },
  { name: 'music', maxCount: 1 },
  { name: 'backgroundImage', maxCount: 1 },
]);

const uploadFieldsWithErrorHandling = (req, res, next) => {
  uploadFields(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? 'Upload exceeds file size limit. Please use smaller files.'
          : 'Unable to process uploaded files.';
      const statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(statusCode).json({
        success: false,
        message,
        requestId: res.locals?.requestId || '',
      });
    }
    return res.status(400).json({
      success: false,
      message: 'Upload validation failed.',
      requestId: res.locals?.requestId || '',
    });
  });
};

const mergeHandler = async (req, res) => {
  let duetJob = null;
  const userEmail = String(req.user?.email || '').toLowerCase();
  const idempotencyKey = getIdempotencyKey(req);
  try {
    if (idempotencyKey) {
      const existingJob = await DanceDuetJob.findOne({
        userEmail,
        'requestMetadata.idempotencyKey': idempotencyKey,
        status: { $in: ['queued', 'processing', 'completed'] },
      })
        .sort({ createdAt: -1 })
        .lean();

      if (existingJob?.status === 'completed') {
        return res.status(200).json({
          success: true,
          reused: true,
          message: 'Reused existing dance duet result for this idempotency key.',
          requestId: res.locals?.requestId || '',
          outputUrl: existingJob?.output?.outputUrl || '',
          warning: existingJob?.output?.warning || '',
          jobId: existingJob._id,
          data: { job: statusSummary(existingJob), outputUrl: existingJob?.output?.outputUrl || '' },
        });
      }

      if (existingJob?.status === 'queued' || existingJob?.status === 'processing') {
        return res.status(202).json({
          success: true,
          reused: true,
          message: 'This idempotency key is already being processed.',
          requestId: res.locals?.requestId || '',
          jobId: existingJob._id,
          pollAfterSeconds: DEFAULT_POLL_SECONDS,
          data: { job: statusSummary(existingJob) },
        });
      }
    }

    const video1 = req.files.video1?.[0] || req.files.videoA?.[0];
    const video2 = req.files.video2?.[0] || req.files.videoB?.[0];
    const backgroundImage = req.files.backgroundImage?.[0];
    const music = req.files.music?.[0];

    if (!video1 || !video2) {
      return res.status(400).json({ success: false, message: 'Please upload both dancer videos.' });
    }

    validateFileType(video1, supportedVideoMime, 'first dancer video');
    validateFileType(video2, supportedVideoMime, 'second dancer video');
    if (backgroundImage) validateFileType(backgroundImage, supportedImageMime, 'background image');
    if (music) validateFileType(music, supportedAudioMime, 'music track');

    const { error: optionsError, value: validatedOptions } = mergeOptionsSchema.validate(req.body, {
      stripUnknown: true,
    });
    if (optionsError) {
      return res.status(400).json({ success: false, message: optionsError.details[0].message });
    }

    if (
      isTrimWindowInvalid(validatedOptions.trimStart1, validatedOptions.trimEnd1) ||
      isTrimWindowInvalid(validatedOptions.trimStart2, validatedOptions.trimEnd2)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Trim end must be greater than trim start when trim end is provided.',
        requestId: res.locals?.requestId || '',
      });
    }

    const video1Size = Number(video1.size || 0);
    const video2Size = Number(video2.size || 0);
    const musicSize = Number(music?.size || 0);
    const backgroundSize = Number(backgroundImage?.size || 0);
    const totalUploadSize = video1Size + video2Size + musicSize + backgroundSize;
    if (
      video1Size > MAX_SINGLE_VIDEO_BYTES ||
      video2Size > MAX_SINGLE_VIDEO_BYTES ||
      musicSize > MAX_MUSIC_BYTES ||
      backgroundSize > MAX_BACKGROUND_BYTES ||
      totalUploadSize > MAX_TOTAL_UPLOAD_BYTES
    ) {
      return res.status(413).json({
        success: false,
        message: 'Uploaded files are too large. Reduce video/music/background sizes and try again.',
        requestId: res.locals?.requestId || '',
      });
    }

    duetJob = await DanceDuetJob.create({
      userEmail,
      userName: String(req.user?.name || ''),
      status: 'queued',
      startedAt: null,
      finishedAt: null,
      sourceFiles: {
        video1Name: video1.originalname || '',
        video2Name: video2.originalname || '',
        musicName: music?.originalname || '',
        backgroundName: backgroundImage?.originalname || '',
        video1Size,
        video2Size,
        musicSize,
        backgroundSize,
      },
      options: {
        mode: validatedOptions.mode,
        outputFormat: validatedOptions.outputFormat,
        backgroundColor: validatedOptions.backgroundColor,
        removeBackground: boolValue(validatedOptions.removeBackground),
        syncAudio: boolValue(validatedOptions.syncAudio),
        mirrorSecondVideo: boolValue(validatedOptions.mirrorSecondVideo),
        secondVideoDelaySeconds: toNumber(
          validatedOptions.delayB ?? validatedOptions.secondVideoDelaySeconds,
          0
        ),
        trimStart1: toNumber(validatedOptions.trimStart1, 0),
        trimEnd1: toNumber(validatedOptions.trimEnd1, 0),
        trimStart2: toNumber(validatedOptions.trimStart2, 0),
        trimEnd2: toNumber(validatedOptions.trimEnd2, 0),
      },
      processing: {
        attempts: 0,
        maxAttempts: MAX_RETRY_ATTEMPTS,
        queuedAt: new Date(),
        lastAttemptAt: null,
        nextRetryAt: null,
        deadLetteredAt: null,
        deadLetterReason: '',
        worker: '',
      },
      requestMetadata: {
        requestId: res.locals?.requestId || '',
        idempotencyKey,
        route: String(req.path || ''),
        userAgent: normalizeText(req.headers['user-agent'], 300),
      },
    });

    const queuedInput = {
      video1Path: await saveQueueInputFile(duetJob._id, video1, 'video1', '.mp4'),
      video2Path: await saveQueueInputFile(duetJob._id, video2, 'video2', '.mp4'),
      musicPath: music ? await saveQueueInputFile(duetJob._id, music, 'music', '.mp3') : '',
      backgroundPath: backgroundImage
        ? await saveQueueInputFile(duetJob._id, backgroundImage, 'background', '.png')
        : '',
    };
    duetJob.queuedInput = queuedInput;

    try {
      const preflight = await analyzeDanceDuetInputs({
        video1Path: queuedInput.video1Path,
        video2Path: queuedInput.video2Path,
      });
      duetJob.preflight = preflight;
      duetJob.growthPack = createGrowthPack({ job: duetJob, preflight });
    } catch (analysisError) {
      duetJob.preflight = {
        readinessScore: 0,
        riskLevel: 'high',
        summary: 'Unable to run preflight checks for uploaded clips.',
        suggestions: ['Try MP4/H.264 clips with stable frame rates.'],
        checks: ['Preflight parsing failed'],
        diagnostics: { error: String(analysisError?.message || 'analysis_failed') },
      };
      duetJob.growthPack = createGrowthPack({ job: duetJob, preflight: duetJob.preflight });
    }

    await duetJob.save();
    enqueueJob(String(duetJob._id));

    return res.status(202).json({
      success: true,
      message: 'Dance duet accepted and queued for processing.',
      requestId: res.locals?.requestId || '',
      jobId: duetJob._id,
      pollAfterSeconds: DEFAULT_POLL_SECONDS,
      data: {
        job: statusSummary(duetJob),
        preflight: duetJob.preflight,
        growthPack: duetJob.growthPack,
      },
    });
  } catch (error) {
    if (duetJob) {
      duetJob.status = 'failed';
      duetJob.finishedAt = new Date();
      duetJob.output = {
        outputUrl: '',
        warning: '',
        errorMessage: String(error.message || 'Merge queueing failed'),
        processingMs: 0,
      };
      await cleanupQueuedInputFiles(duetJob);
      duetJob.queuedInput = {
        video1Path: '',
        video2Path: '',
        musicPath: '',
        backgroundPath: '',
      };
      await duetJob.save();
    }
    return res.status(500).json({
      success: false,
      message: 'Dance duet queueing failed. Please retry.',
      error: error.message,
      requestId: res.locals?.requestId || '',
      jobId: duetJob?._id || '',
    });
  }
};

router.post('/merge', authenticate, mergeLimiter, uploadFieldsWithErrorHandling, mergeHandler);

router.post('/export', authenticate, mergeLimiter, uploadFieldsWithErrorHandling, async (req, res) => {
  req.body.mode =
    req.body.mode ||
    (req.body.layout === 'vertical'
      ? 'vertical-reel'
      : req.body.layout === 'overlay'
      ? 'spotlight-stage'
      : 'side-by-side');
  req.body.outputFormat = req.body.outputFormat || (req.body.layout === 'vertical' ? 'reel' : 'landscape');
  return mergeHandler(req, res);
});

router.get('/jobs/:jobId/status', authenticate, defaultLimiter, async (req, res) => {
  try {
    const job = await DanceDuetJob.findById(req.params.jobId).lean();
    if (!job || job.status === 'deleted') {
      return res.status(404).json({ success: false, message: 'Dance duet job not found.' });
    }
    if (!canAccessJob(job, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this job status.' });
    }
    return res.json({
      success: true,
      pollAfterSeconds: DEFAULT_POLL_SECONDS,
      data: { job: statusSummary(job) },
    });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch dance duet job status.' });
  }
});

router.get('/jobs/me', authenticate, defaultLimiter, async (req, res) => {
  try {
    const { error, value } = jobsListQuerySchema.validate(req.query || {}, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const filter = {
      userEmail: String(req.user?.email || '').toLowerCase(),
      status: { $ne: 'deleted' },
    };
    if (value.status) {
      filter.status = value.status;
    }

    const skip = (value.page - 1) * value.limit;

    const [jobs, total] = await Promise.all([
      DanceDuetJob.find(filter).sort({ createdAt: -1 }).skip(skip).limit(value.limit).lean(),
      DanceDuetJob.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page: value.page,
          limit: value.limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / value.limit)),
        },
      },
    });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch your dance duet jobs.' });
  }
});

router.get('/jobs/me/counts', authenticate, defaultLimiter, async (req, res) => {
  try {
    const userEmail = String(req.user?.email || '').toLowerCase();
    const grouped = await DanceDuetJob.aggregate([
      { $match: { userEmail, status: { $ne: 'deleted' } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const counts = grouped.reduce(
      (acc, row) => ({ ...acc, [row._id]: Number(row.count || 0) }),
      { queued: 0, processing: 0, completed: 0, failed: 0 }
    );
    const deadLettered = await DanceDuetJob.countDocuments({
      userEmail,
      status: 'failed',
      'processing.deadLetteredAt': { $ne: null },
    });
    return res.json({ success: true, data: { counts: { ...counts, deadLettered } } });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch dance duet job counts.' });
  }
});

router.get('/jobs/:jobId', authenticate, defaultLimiter, async (req, res) => {
  try {
    const job = await DanceDuetJob.findById(req.params.jobId).lean();
    if (!job || job.status === 'deleted') {
      return res.status(404).json({ success: false, message: 'Dance duet job not found.' });
    }
    if (!canAccessJob(job, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this job.' });
    }
    return res.json({ success: true, data: { job } });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch dance duet job.' });
  }
});

router.get('/jobs/:jobId/download', authenticate, defaultLimiter, async (req, res) => {
  try {
    const job = await DanceDuetJob.findById(req.params.jobId).lean();
    if (!job || job.status === 'deleted') {
      return res.status(404).json({ success: false, message: 'Dance duet job not found.' });
    }
    if (!canAccessJob(job, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized to download this output.' });
    }
    if (job.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Output is available only for completed jobs.' });
    }
    const outputUrl = String(job?.output?.outputUrl || '');
    if (!outputUrl) {
      return res.status(404).json({ success: false, message: 'Output file not available.' });
    }

    const absolutePath = resolveSafeOutputPath(outputUrl);
    if (!absolutePath) {
      return res.status(400).json({ success: false, message: 'Invalid output path.' });
    }

    try {
      await fs.access(absolutePath);
    } catch (_error) {
      return res.status(404).json({ success: false, message: 'Output file no longer exists.' });
    }

    const fileName = path.basename(absolutePath) || `dance-duet-${job._id}.mp4`;
    return res.download(absolutePath, fileName);
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to download dance duet output.' });
  }
});

router.get('/analytics/me', authenticate, defaultLimiter, async (req, res) => {
  try {
    const userEmail = String(req.user?.email || '').toLowerCase();
    const [totalJobs, completedJobs, failedJobs, deadLetteredJobs] = await Promise.all([
      DanceDuetJob.countDocuments({ userEmail, status: { $ne: 'deleted' } }),
      DanceDuetJob.countDocuments({ userEmail, status: 'completed' }),
      DanceDuetJob.countDocuments({ userEmail, status: 'failed' }),
      DanceDuetJob.countDocuments({
        userEmail,
        status: 'failed',
        'processing.deadLetteredAt': { $ne: null },
      }),
    ]);

    const [processingAverages, attemptsAvg, modesBreakdown, risksBreakdown] = await Promise.all([
      DanceDuetJob.aggregate([
        { $match: { userEmail, status: 'completed' } },
        { $group: { _id: null, avgProcessingMs: { $avg: '$output.processingMs' } } },
      ]),
      DanceDuetJob.aggregate([
        { $match: { userEmail, status: { $in: ['completed', 'failed'] } } },
        { $group: { _id: null, avgAttempts: { $avg: '$processing.attempts' } } },
      ]),
      DanceDuetJob.aggregate([
        { $match: { userEmail, status: { $in: ['completed', 'failed'] } } },
        { $group: { _id: '$options.mode', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      DanceDuetJob.aggregate([
        { $match: { userEmail, status: { $in: ['completed', 'failed'] } } },
        { $group: { _id: '$preflight.riskLevel', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const avgProcessingMs = Number(processingAverages?.[0]?.avgProcessingMs || 0);
    const averageAttempts = Number(attemptsAvg?.[0]?.avgAttempts || 0);

    return res.json({
      success: true,
      data: {
        summary: {
          totalJobs,
          completedJobs,
          failedJobs,
          deadLetteredJobs,
          completionRatePct: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0,
          averageProcessingMs: Math.round(avgProcessingMs),
          averageAttempts: Number(averageAttempts.toFixed(2)),
        },
        modes: modesBreakdown.map((row) => ({
          mode: String(row?._id || 'unknown'),
          count: Number(row?.count || 0),
        })),
        risks: risksBreakdown.map((row) => ({
          riskLevel: String(row?._id || 'unknown'),
          count: Number(row?.count || 0),
        })),
      },
    });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch dance duet analytics.' });
  }
});

router.delete('/jobs/:jobId', authenticate, defaultLimiter, async (req, res) => {
  try {
    const job = await DanceDuetJob.findById(req.params.jobId);
    if (!job || job.status === 'deleted') {
      return res.status(404).json({ success: false, message: 'Dance duet job not found.' });
    }
    if (!canAccessJob(job, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this job.' });
    }

    const outputUrl = String(job?.output?.outputUrl || '');
    if (outputUrl) {
      const absolutePath = resolveSafeOutputPath(outputUrl);
      if (absolutePath) {
        try {
          await fs.unlink(absolutePath);
        } catch (error) {
          if (error?.code !== 'ENOENT') {
            return res.status(500).json({
              success: false,
              message: 'Unable to delete dance duet output file.',
            });
          }
        }
      }
    }

    await cleanupQueuedInputFiles(job);

    job.status = 'deleted';
    job.output.outputUrl = '';
    job.queuedInput = {
      video1Path: '',
      video2Path: '',
      musicPath: '',
      backgroundPath: '',
    };
    await job.save();
    return res.json({ success: true, message: 'Dance duet job deleted.' });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to delete dance duet job.' });
  }
});

router.delete('/jobs/me/purge', authenticate, defaultLimiter, async (req, res) => {
  try {
    const { error, value } = purgeJobsQuerySchema.validate(req.query || {}, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const cutoff = new Date(Date.now() - value.olderThanDays * 24 * 60 * 60 * 1000);
    const userEmail = String(req.user?.email || '').toLowerCase();

    const jobs = await DanceDuetJob.find({
      userEmail,
      status: value.status,
      createdAt: { $lte: cutoff },
    });

    let filesDeleted = 0;
    let filesMissing = 0;
    let fileDeleteErrors = 0;
    if (value.includeFiles) {
      for (const job of jobs) {
        const outputUrl = String(job?.output?.outputUrl || '');
        if (outputUrl) {
          const absolutePath = resolveSafeOutputPath(outputUrl);
          if (absolutePath) {
            try {
              await fs.unlink(absolutePath);
              filesDeleted += 1;
            } catch (unlinkError) {
              if (unlinkError?.code === 'ENOENT') {
                filesMissing += 1;
              } else {
                fileDeleteErrors += 1;
              }
            }
          }
        }

        const queuedInputPaths = [
          job?.queuedInput?.video1Path || '',
          job?.queuedInput?.video2Path || '',
          job?.queuedInput?.musicPath || '',
          job?.queuedInput?.backgroundPath || '',
        ];
        for (const queuedInputPath of queuedInputPaths) {
          if (!queuedInputPath) continue;
          const safePath = resolveSafeQueueInputPath(queuedInputPath);
          if (!safePath) continue;
          try {
            await fs.unlink(safePath);
            filesDeleted += 1;
          } catch (unlinkError) {
            if (unlinkError?.code === 'ENOENT') {
              filesMissing += 1;
            } else {
              fileDeleteErrors += 1;
            }
          }
        }
      }
    }

    const jobIds = jobs.map((job) => job._id);
    const deleteResult = await DanceDuetJob.deleteMany({ _id: { $in: jobIds } });

    return res.json({
      success: true,
      data: {
        purgedJobs: Number(deleteResult?.deletedCount || 0),
        filters: {
          status: value.status,
          olderThanDays: value.olderThanDays,
        },
        files: {
          deleted: filesDeleted,
          missing: filesMissing,
          errors: fileDeleteErrors,
        },
      },
    });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to purge dance duet jobs.' });
  }
});

module.exports = router;

setTimeout(() => {
  void bootstrapQueuedJobs();
}, 200);
