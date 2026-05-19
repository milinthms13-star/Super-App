const express = require('express');
const {
  generateKidsVideoFromPrompt,
  generateKidsVideoFromHybridPrompt,
  generateKidsVideoFromDiffusersPrompt,
  generateKidsVideoFromFreeSteveLikePrompt,
  generateKidsVideoFromCogVideoXPrompt,
  getKidsVideoProject,
} = require('../services/kidsVideoGeneratorHFService');

const router = express.Router();

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
  const bodyProject = body?.project && typeof body.project === 'object' ? body.project : null;
  const directCharacters = Array.isArray(body?.characters) ? body.characters : parseJsonArray(body?.characters);
  const directScenes = Array.isArray(body?.scenes) ? body.scenes : parseJsonArray(body?.scenes);
  const projectCharacters = Array.isArray(bodyProject?.characters) ? bodyProject.characters : [];
  const projectScenes = Array.isArray(bodyProject?.scenes) ? bodyProject.scenes : [];

  const providedCharacters = directCharacters.length ? directCharacters : projectCharacters;
  const providedScenes = directScenes.length ? directScenes : projectScenes;

  return {
    storyTitle:
      String(body?.storyTitle || '').trim()
      || String(bodyProject?.title || '').trim()
      || '',
    providedCharacters,
    providedScenes,
  };
};

router.post('/generate', async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || req.body?.storyPrompt || '').trim();
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required.',
      });
    }

    const languageCode = resolveLanguageCode(req.body || {});
    const requestedEngine = String(req.body?.engine || req.body?.renderEngine || '').trim().toLowerCase();
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

    const { storyTitle, providedCharacters, providedScenes } = normalizeStructuredStoryInput(req.body || {});

    const hasStructuredStoryContext =
      (Array.isArray(providedScenes) && providedScenes.length > 0)
      || (Array.isArray(providedCharacters) && providedCharacters.length > 0);
    const requestedPromptOnlyEngine = useCogVideoX || useLegacyScriptVideo || shouldUseDiffusers;
    const shouldPreferStructuredRenderer = hasStructuredStoryContext && requestedPromptOnlyEngine;

    const forceEngine = parseBoolean(req.body?.forceEngine, false);
    const strictCogVideoX = parseBoolean(req.body?.strictCogVideoX, false);
    const strictHybrid = parseBoolean(req.body?.strictHybrid, strictCogVideoX);
    const effectivePrompt = String(req.body?.enhancedPrompt || prompt || '').trim() || prompt;
    const shouldBypassStructuredRenderer = forceEngine && (useCogVideoX || useLegacyScriptVideo || shouldUseDiffusers);

    const result = useHybridPhase2
      ? await generateKidsVideoFromHybridPrompt({
          prompt: effectivePrompt,
          sceneCount: clampSceneCount(req.body?.sceneCount),
          videoSize: req.body?.videoSize || req.body?.videoSizeId || 'youtube',
          storyMode: req.body?.storyMode || 'moral',
          voiceType: req.body?.voiceType || 'kid-female',
          language: languageCode,
          storyTitle,
          providedCharacters,
          providedScenes,
          strict: strictHybrid,
          phase2: true,
        })
      : useHybrid
      ? await generateKidsVideoFromHybridPrompt({
          prompt: effectivePrompt,
          sceneCount: clampSceneCount(req.body?.sceneCount),
          videoSize: req.body?.videoSize || req.body?.videoSizeId || 'youtube',
          storyMode: req.body?.storyMode || 'moral',
          voiceType: req.body?.voiceType || 'kid-female',
          language: languageCode,
          storyTitle,
          providedCharacters,
          providedScenes,
          strict: strictHybrid,
        })
      : (!shouldBypassStructuredRenderer && shouldPreferStructuredRenderer)
      ? await generateKidsVideoFromPrompt({
          prompt: effectivePrompt,
          sceneCount: clampSceneCount(req.body?.sceneCount),
          videoSize: req.body?.videoSize || req.body?.videoSizeId || 'youtube',
          storyMode: req.body?.storyMode || 'moral',
          voiceType: req.body?.voiceType || 'kid-female',
          language: languageCode,
          storyTitle,
          providedCharacters,
          providedScenes,
        })
      : useCogVideoX
      ? await generateKidsVideoFromCogVideoXPrompt({
          prompt: effectivePrompt,
          videoSize: req.body?.videoSize || req.body?.videoSizeId || 'youtube',
          numFrames: req.body?.numFrames,
          numInferenceSteps: req.body?.numInferenceSteps,
          guidanceScale: req.body?.guidanceScale,
          language: languageCode,
          strict: strictCogVideoX,
          storyTitle,
        })
      : useLegacyScriptVideo
      ? await generateKidsVideoFromFreeSteveLikePrompt({
          prompt: effectivePrompt,
          sceneCount: clampSceneCount(req.body?.sceneCount),
          videoSize: req.body?.videoSize || req.body?.videoSizeId || 'youtube',
          language: languageCode,
          storyTitle,
        })
      : shouldUseDiffusers
      ? await generateKidsVideoFromDiffusersPrompt({
          prompt: effectivePrompt,
          videoSize: req.body?.videoSize || req.body?.videoSizeId || 'youtube',
          numFrames: req.body?.numFrames,
          numInferenceSteps: req.body?.numInferenceSteps,
          language: languageCode,
          storyTitle,
        })
      : await generateKidsVideoFromPrompt({
          prompt: effectivePrompt,
          sceneCount: clampSceneCount(req.body?.sceneCount),
          videoSize: req.body?.videoSize || req.body?.videoSizeId || 'youtube',
          storyMode: req.body?.storyMode || 'moral',
          voiceType: req.body?.voiceType || 'kid-female',
          language: languageCode,
          storyTitle,
          providedCharacters,
          providedScenes,
        });

    return res.status(200).json({
      success: true,
      projectId: result.projectId,
      project: result.project,
      videoUrl: result.videoUrl,
      aiProvider: 'scene_pipeline',
      aiImagesEnabled: Boolean(result.aiImagesEnabled),
      workflowType: result?.project?.workflowType || 'kids-video-scene-pipeline',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Unable to generate video.',
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
