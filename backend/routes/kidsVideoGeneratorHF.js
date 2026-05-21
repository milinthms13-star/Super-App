const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const {
  generateKidsVideoFromPrompt,
  generateKidsVideoFromHybridPrompt,
  generateKidsVideoFromDiffusersPrompt,
  generateKidsVideoFromFreeSteveLikePrompt,
  generateKidsVideoFromCogVideoXPrompt,
  getKidsVideoProject,
  getKidsVideoGeneratorCapabilities,
} = require('../services/kidsVideoGeneratorHFService');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 8,
  },
});

const sanitizeText = (value = '') => String(value || '').replace(/\u0000/g, '').trim();
const safeSegment = (value = '') =>
  sanitizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';

const inferExt = (file = {}) => {
  const fromName = path.extname(String(file.originalname || '')).toLowerCase();
  if (fromName) return fromName;
  const mime = String(file.mimetype || '').toLowerCase();
  if (mime.includes('png')) return '.png';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
  return '.png';
};

const buildRequestOrigin = (req) => {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol || 'https';
  const host = req.get('host');
  return `${protocol}://${host}`;
};

const toAbsoluteUrl = (req, maybeRelativeUrl = '') => {
  const raw = String(maybeRelativeUrl || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const origin = buildRequestOrigin(req);
  return `${origin}${raw.startsWith('/') ? '' : '/'}${raw}`;
};

const parseJsonObject = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (!value || typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch (_error) {
    return null;
  }
};

const LANGUAGE_CODE_ALIASES = {
  en: 'en',
  english: 'en',
  hi: 'hi',
  hindi: 'hi',
  ml: 'ml',
  malayalam: 'ml',
  ta: 'ta',
  tamil: 'ta',
  te: 'te',
  telugu: 'te',
  kn: 'kn',
  kannada: 'kn',
  bn: 'bn',
  bengali: 'bn',
  mr: 'mr',
  marathi: 'mr',
  gu: 'gu',
  gujarati: 'gu',
  ur: 'ur',
  urdu: 'ur',
  ar: 'ar',
  arabic: 'ar',
};

const resolveLanguageCode = (body = {}) => {
  const raw = String(body?.language || body?.lang || body?.languageId || '').trim().toLowerCase().replace(/_/g, '-');
  if (!raw) return 'en';
  const primary = raw.split('-')[0];
  return LANGUAGE_CODE_ALIASES[raw] || LANGUAGE_CODE_ALIASES[primary] || 'en';
};

const clampSceneCount = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 5;
  return Math.max(3, Math.min(8, Math.round(parsed)));
};

const parseBoolean = (value, defaultValue = false) => {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
};

const normalizeStructuredStoryInput = (body = {}) => {
  const bodyProject = parseJsonObject(body?.project);
  const directCharacters = Array.isArray(body?.characters) ? body.characters : parseJsonArray(body?.characters);
  const directScenes = Array.isArray(body?.scenes) ? body.scenes : parseJsonArray(body?.scenes);
  const projectCharacters = Array.isArray(bodyProject?.characters) ? bodyProject.characters : [];
  const projectScenes = Array.isArray(bodyProject?.scenes) ? bodyProject.scenes : [];

  const providedCharacters = directCharacters.length ? directCharacters : projectCharacters;
  const providedScenes = directScenes.length ? directScenes : projectScenes;

  return {
    storyTitle: sanitizeText(body?.storyTitle || bodyProject?.title || ''),
    providedCharacters,
    providedScenes,
  };
};

const saveUploadedCharacterImages = (requestTag, files = []) => {
  const normalizedFiles = Array.isArray(files) ? files : [];
  if (!normalizedFiles.length) {
    return [];
  }
  const safeTag = safeSegment(requestTag || `request-${Date.now()}`);
  const baseDir = path.join(__dirname, '..', 'uploads', 'kids-video-hf', 'character-ui', safeTag);
  fs.mkdirSync(baseDir, { recursive: true });

  return normalizedFiles.map((file, index) => {
    const ext = inferExt(file);
    const baseName = safeSegment(path.parse(String(file.originalname || `character-${index + 1}`)).name);
    const fileName = `${String(index + 1).padStart(2, '0')}-${baseName}-${Date.now()}${ext}`;
    const absolutePath = path.join(baseDir, fileName);
    fs.writeFileSync(absolutePath, file.buffer);
    return {
      fileName,
      imageUrl: `/uploads/kids-video-hf/character-ui/${safeTag}/${fileName}`,
      originalName: sanitizeText(file.originalname || `character-${index + 1}${ext}`),
    };
  });
};

const mergeUploadedFacesIntoCharacters = ({
  providedCharacters = [],
  uploadedImages = [],
}) => {
  const baseCharacters = Array.isArray(providedCharacters) ? providedCharacters : [];
  const uploads = Array.isArray(uploadedImages) ? uploadedImages : [];
  const total = Math.max(baseCharacters.length, uploads.length);
  const merged = [];

  for (let index = 0; index < total; index += 1) {
    const base = baseCharacters[index] && typeof baseCharacters[index] === 'object' ? baseCharacters[index] : {};
    const uploadItem = uploads[index];
    const name = sanitizeText(base.name) || `Character ${index + 1}`;
    const role = sanitizeText(base.role) || (index === 0 ? 'Main Character' : 'Support Friend');
    const appearanceBase = sanitizeText(base.appearance) || `friendly ${name.toLowerCase()} character`;
    const appearance = uploadItem
      ? `${appearanceBase}. Match uploaded face reference image (${uploadItem.fileName}) and keep identity consistent in every scene.`
      : appearanceBase;

    merged.push({
      ...base,
      id: sanitizeText(base.id) || `char-${index + 1}`,
      name,
      role,
      appearance,
      referenceImageUrl: uploadItem ? uploadItem.imageUrl : sanitizeText(base.referenceImageUrl),
    });
  }

  return merged;
};

const executeKidsVideoGeneration = async ({ body = {}, files = [] }) => {
  const prompt = String(body?.prompt || body?.storyPrompt || '').trim();
  if (!prompt) {
    const error = new Error('Prompt is required.');
    error.statusCode = 400;
    throw error;
  }

  const languageCode = resolveLanguageCode(body || {});
  const requestedEngine = String(body?.engine || body?.renderEngine || '').trim().toLowerCase();
  const disableDiffusers = String(process.env.HF_DISABLE_DIFFUSERS || '').trim().toLowerCase() === 'true';
  const useDiffusers =
    requestedEngine === 'diffusers_t2v' ||
    requestedEngine === 'prompt_video_python' ||
    requestedEngine === 'text_to_video' ||
    requestedEngine === 'damo-text-to-video';
  const useLegacyScriptVideo =
    requestedEngine === 'free_steve_like' ||
    requestedEngine === 'steve_like' ||
    requestedEngine === 'script_to_video';
  const useCogVideoX =
    requestedEngine === 'cogvideox' ||
    requestedEngine === 'cogvideox_2b' ||
    requestedEngine === 'cogvideo' ||
    requestedEngine === 'real_motion_gpu';
  const useHybrid =
    requestedEngine === 'hybrid_motion_cogvideox' ||
    requestedEngine === 'hybrid' ||
    requestedEngine === 'hybrid_scene_cogvideox' ||
    requestedEngine === 'scene_hybrid';
  const useHybridPhase2 =
    requestedEngine === 'hybrid_phase2' ||
    requestedEngine === 'hybrid_motion_animatediff_cogvideox' ||
    requestedEngine === 'hybrid_animatediff_openpose' ||
    requestedEngine === 'phase2';
  const shouldUseDiffusers = useDiffusers && !disableDiffusers;

  const { storyTitle, providedCharacters, providedScenes } = normalizeStructuredStoryInput(body || {});
  const uploadedCharacterImages = saveUploadedCharacterImages(
    sanitizeText(body?.projectId || body?.storyTitle || `request-${Date.now()}`),
    files || []
  );
  const mergedProvidedCharacters = mergeUploadedFacesIntoCharacters({
    providedCharacters,
    uploadedImages: uploadedCharacterImages,
  });

  const hasStructuredStoryContext =
    (Array.isArray(providedScenes) && providedScenes.length > 0)
    || (Array.isArray(mergedProvidedCharacters) && mergedProvidedCharacters.length > 0);
  const requestedPromptOnlyEngine = useCogVideoX || useLegacyScriptVideo || shouldUseDiffusers;
  const shouldPreferStructuredRenderer = hasStructuredStoryContext && requestedPromptOnlyEngine;

  const forceEngine = parseBoolean(body?.forceEngine, false);
  const strictCogVideoX = parseBoolean(body?.strictCogVideoX, false);
  const strictHybrid = parseBoolean(body?.strictHybrid, strictCogVideoX);
  const effectivePrompt = String(body?.enhancedPrompt || prompt || '').trim() || prompt;
  const shouldBypassStructuredRenderer = forceEngine && (useCogVideoX || useLegacyScriptVideo || shouldUseDiffusers);

  const result = useHybridPhase2
    ? await generateKidsVideoFromHybridPrompt({
        prompt: effectivePrompt,
        sceneCount: clampSceneCount(body?.sceneCount),
        videoSize: body?.videoSize || body?.videoSizeId || 'youtube',
        storyMode: body?.storyMode || 'moral',
        voiceType: body?.voiceType || 'kid-female',
        language: languageCode,
        storyTitle,
        providedCharacters: mergedProvidedCharacters,
        providedScenes,
        strict: strictHybrid,
        phase2: true,
      })
    : useHybrid
    ? await generateKidsVideoFromHybridPrompt({
        prompt: effectivePrompt,
        sceneCount: clampSceneCount(body?.sceneCount),
        videoSize: body?.videoSize || body?.videoSizeId || 'youtube',
        storyMode: body?.storyMode || 'moral',
        voiceType: body?.voiceType || 'kid-female',
        language: languageCode,
        storyTitle,
        providedCharacters: mergedProvidedCharacters,
        providedScenes,
        strict: strictHybrid,
      })
    : (!shouldBypassStructuredRenderer && shouldPreferStructuredRenderer)
    ? await generateKidsVideoFromPrompt({
        prompt: effectivePrompt,
        sceneCount: clampSceneCount(body?.sceneCount),
        videoSize: body?.videoSize || body?.videoSizeId || 'youtube',
        storyMode: body?.storyMode || 'moral',
        voiceType: body?.voiceType || 'kid-female',
        language: languageCode,
        storyTitle,
        providedCharacters: mergedProvidedCharacters,
        providedScenes,
      })
    : useCogVideoX
    ? await generateKidsVideoFromCogVideoXPrompt({
        prompt: effectivePrompt,
        videoSize: body?.videoSize || body?.videoSizeId || 'youtube',
        numFrames: body?.numFrames,
        numInferenceSteps: body?.numInferenceSteps,
        guidanceScale: body?.guidanceScale,
        language: languageCode,
        strict: strictCogVideoX,
        storyTitle,
      })
    : useLegacyScriptVideo
    ? await generateKidsVideoFromFreeSteveLikePrompt({
        prompt: effectivePrompt,
        sceneCount: clampSceneCount(body?.sceneCount),
        videoSize: body?.videoSize || body?.videoSizeId || 'youtube',
        language: languageCode,
        storyTitle,
      })
    : shouldUseDiffusers
    ? await generateKidsVideoFromDiffusersPrompt({
        prompt: effectivePrompt,
        videoSize: body?.videoSize || body?.videoSizeId || 'youtube',
        numFrames: body?.numFrames,
        numInferenceSteps: body?.numInferenceSteps,
        language: languageCode,
        storyTitle,
      })
    : await generateKidsVideoFromPrompt({
        prompt: effectivePrompt,
        sceneCount: clampSceneCount(body?.sceneCount),
        videoSize: body?.videoSize || body?.videoSizeId || 'youtube',
        storyMode: body?.storyMode || 'moral',
        voiceType: body?.voiceType || 'kid-female',
        language: languageCode,
        storyTitle,
        providedCharacters: mergedProvidedCharacters,
        providedScenes,
      });

  return {
    result,
    uploadedCharacterImages,
  };
};

const kidsVideoJobs = new Map();
const KIDS_VIDEO_JOB_TTL_MS = 1000 * 60 * 60 * 6;
const trimKidsVideoJobs = () => {
  const now = Date.now();
  for (const [jobId, job] of kidsVideoJobs.entries()) {
    if (now - Number(job?.updatedAtMs || now) > KIDS_VIDEO_JOB_TTL_MS) {
      kidsVideoJobs.delete(jobId);
    }
  }
};

const updateKidsVideoJob = (jobId, patch = {}) => {
  const current = kidsVideoJobs.get(jobId);
  if (!current) return null;
  const next = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
    updatedAtMs: Date.now(),
  };
  kidsVideoJobs.set(jobId, next);
  return next;
};

router.post('/generate', upload.array('characterImages', 8), async (req, res) => {
  try {
    const { result, uploadedCharacterImages } = await executeKidsVideoGeneration({
      body: req.body || {},
      files: req.files || [],
    });

    return res.status(200).json({
      success: true,
      projectId: result.projectId,
      project: result.project,
      videoUrl: result.videoUrl,
      aiProvider: 'scene_pipeline',
      aiImagesEnabled: Boolean(result.aiImagesEnabled),
      workflowType: result?.project?.workflowType || 'kids-video-scene-pipeline',
      capabilities: getKidsVideoGeneratorCapabilities(),
      uploadedCharacterImages: uploadedCharacterImages.map((item) => ({
        imageUrl: toAbsoluteUrl(req, item.imageUrl),
        originalName: item.originalName,
      })),
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    return res.status(statusCode).json({
      success: false,
      error: error?.message || 'Unable to generate video.',
    });
  }
});

router.post('/jobs', upload.array('characterImages', 8), async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || req.body?.storyPrompt || '').trim();
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required.',
      });
    }

    trimKidsVideoJobs();
    const jobId = uuidv4();
    const initialJob = {
      jobId,
      status: 'queued',
      progress: 5,
      message: 'Job queued. Waiting for worker.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
      result: null,
      error: '',
      capabilities: getKidsVideoGeneratorCapabilities(),
    };
    kidsVideoJobs.set(jobId, initialJob);

    const requestBody = { ...(req.body || {}) };
    const requestFiles = Array.isArray(req.files) ? req.files.slice() : [];

    setImmediate(async () => {
      let progressTimer = null;
      try {
        updateKidsVideoJob(jobId, {
          status: 'processing',
          progress: 18,
          message: 'Generating storyboard, scenes, and narration...',
        });
        progressTimer = setInterval(() => {
          const current = kidsVideoJobs.get(jobId);
          if (!current || current.status !== 'processing') return;
          const nextProgress = Math.min(84, Number(current.progress || 18) + 6);
          updateKidsVideoJob(jobId, {
            progress: nextProgress,
            message: nextProgress >= 66
              ? 'Rendering scene clips and transitions...'
              : 'Preparing story assets and subtitles...',
          });
        }, 4000);

        const { result, uploadedCharacterImages } = await executeKidsVideoGeneration({
          body: requestBody,
          files: requestFiles,
        });

        updateKidsVideoJob(jobId, {
          status: 'completed',
          progress: 100,
          message: 'Render complete.',
          result: {
            success: true,
            projectId: result.projectId,
            project: result.project,
            videoUrl: result.videoUrl,
            aiProvider: 'scene_pipeline',
            aiImagesEnabled: Boolean(result.aiImagesEnabled),
            workflowType: result?.project?.workflowType || 'kids-video-scene-pipeline',
            capabilities: getKidsVideoGeneratorCapabilities(),
            uploadedCharacterImages: uploadedCharacterImages.map((item) => ({
              imageUrl: item.imageUrl,
              originalName: item.originalName,
            })),
          },
          error: '',
        });
      } catch (error) {
        updateKidsVideoJob(jobId, {
          status: 'failed',
          progress: 100,
          message: 'Render failed.',
          error: sanitizeText(error?.message || 'Unable to generate video.'),
        });
      } finally {
        if (progressTimer) {
          clearInterval(progressTimer);
        }
      }
    });

    return res.status(202).json({
      success: true,
      jobId,
      status: 'queued',
      progress: 5,
      pollUrl: `/api/kids-video-hf/jobs/${jobId}`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Unable to create render job.',
    });
  }
});

router.get('/jobs/:jobId', async (req, res) => {
  const jobId = sanitizeText(req.params?.jobId || '');
  const job = kidsVideoJobs.get(jobId);
  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found.',
      status: 'not_found',
    });
  }

  const responsePayload = {
    success: true,
    jobId,
    status: job.status,
    progress: Number(job.progress || 0),
    message: sanitizeText(job.message || ''),
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };

  if (job.status === 'completed' && job.result) {
    responsePayload.result = {
      ...job.result,
      uploadedCharacterImages: (job.result.uploadedCharacterImages || []).map((item) => ({
        ...item,
        imageUrl: toAbsoluteUrl(req, item.imageUrl),
      })),
    };
  }
  if (job.status === 'failed') {
    responsePayload.error = sanitizeText(job.error || 'Render failed.');
  }

  return res.status(200).json(responsePayload);
});

router.get('/capabilities', async (_req, res) => {
  try {
    return res.status(200).json({
      success: true,
      capabilities: getKidsVideoGeneratorCapabilities(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Unable to read kids video capabilities.',
    });
  }
});

router.get('/projects/:projectId', async (req, res) => {
  try {
    const project = await getKidsVideoProject(req.params.projectId);
    return res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    const message = String(error?.message || '');
    const notFound =
      message.includes('ENOENT') || message.toLowerCase().includes('no such file');
    return res.status(notFound ? 404 : 500).json({
      success: false,
      error: notFound ? 'Project not found.' : (error?.message || 'Unable to load project.'),
    });
  }
});

module.exports = router;
