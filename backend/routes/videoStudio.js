const express = require('express');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const {
  createStudioProject,
  renderVideo,
  renderCartoonVideo,
  createAutopilotProject,
  getStudioProject,
  regenerateProjectStage,
  patchStudioProject,
  generateCharacterSheet,
  generateSceneImage,
  animateScene,
  generateVoice,
  generateSfx,
  lipSync,
  composeFinalVideo,
} = require('../services/videoStudioService');

const router = express.Router();
const isFreeMode = ['1', 'true', 'yes', 'on'].includes(String(process.env.FREE_MODE || '').toLowerCase());
const allowAiInFreeMode = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.VIDEO_STUDIO_ALLOW_AI_IN_FREE || '').toLowerCase()
);
const aiProviderEnabled = Boolean(process.env.OPENAI_API_KEY) && (!isFreeMode || allowAiInFreeMode);
const realCartoonModeEnabled = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.VIDEO_STUDIO_REAL_CARTOON_MODE || (aiProviderEnabled ? '1' : '0')).toLowerCase()
);
const videoStudioUploadsRoot = path.join(__dirname, '..', 'uploads', 'video-studio');
const maxParallelRenders = Math.max(1, Number(process.env.VIDEO_STUDIO_MAX_PARALLEL_RENDERS) || 1);
let activeRenderCount = 0;

const getStudioCapabilities = () => ({
  freeMode: isFreeMode,
  aiProviderEnabled,
  realCartoonModeEnabled,
});

const toSafeProjectDirectoryName = (value = '') => String(value).replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();

const buildRequestOrigin = (req) => {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol || 'https';
  const host = req.get('host');
  return `${protocol}://${host}`;
};

const respondVideoStudioError = (res, error, fallbackMessage) => {
  if (error?.code === 'SAFETY_FAILED') {
    return res.status(error.status || 422).json({
      success: false,
      code: 'SAFETY_FAILED',
      error: error.message || fallbackMessage,
      safety: error.safety || { reasons: [] },
    });
  }

  return res.status(500).json({ success: false, error: error.message || fallbackMessage });
};

const validateRenderScene = (scene, index) => {
  const id = index + 1;
  const title = String(scene?.title || '').trim();
  const description = String(scene?.description || '').trim();
  const dialogue = String(scene?.dialogue || '').trim();
  const durationSeconds = Number(scene?.durationSeconds);

  if (!title) return `Scene ${id} is missing title.`;
  if (!description) return `Scene ${id} is missing description.`;
  if (!dialogue) return `Scene ${id} is missing dialogue.`;
  if (!Number.isFinite(durationSeconds) || durationSeconds < 2 || durationSeconds > 15) {
    return `Scene ${id} duration must be between 2 and 15 seconds.`;
  }

  return '';
};

const validateRenderProjectPayload = (project) => {
  const maxScenes = Math.max(
    3,
    Number(process.env.VIDEO_STUDIO_MAX_SCENES) || (isFreeMode ? 8 : 20)
  );
  const maxDurationSeconds = Math.max(
    30,
    Number(process.env.VIDEO_STUDIO_MAX_DURATION_SECONDS) || (isFreeMode ? 120 : 240)
  );

  if (!project || typeof project !== 'object') {
    return 'A valid project payload is required.';
  }
  if (!project.projectId || !String(project.projectId).trim()) {
    return 'Project ID is required for rendering.';
  }
  if (!Array.isArray(project.scenes) || project.scenes.length === 0) {
    return 'At least one scene is required for rendering.';
  }
  if (project.scenes.length > maxScenes) {
    return `Too many scenes requested. Keep it at ${maxScenes} scenes or fewer.`;
  }
  let totalDurationSeconds = 0;
  for (let index = 0; index < project.scenes.length; index += 1) {
    const validationError = validateRenderScene(project.scenes[index], index);
    if (validationError) {
      return validationError;
    }
    totalDurationSeconds += Number(project.scenes[index]?.durationSeconds) || 0;
  }
  if (totalDurationSeconds > maxDurationSeconds) {
    return `Total video duration is too high. Keep it at ${maxDurationSeconds} seconds or less.`;
  }

  return '';
};

const formatMemoryUsage = () => {
  const usage = process.memoryUsage();
  const toMB = (value) => Math.round((Number(value || 0) / 1024 / 1024) * 10) / 10;
  return `rss=${toMB(usage.rss)}MB heapUsed=${toMB(usage.heapUsed)}MB heapTotal=${toMB(usage.heapTotal)}MB external=${toMB(usage.external)}MB`;
};

const getRssMemoryMb = () => {
  const usage = process.memoryUsage();
  return Number((Number(usage.rss || 0) / 1024 / 1024).toFixed(1));
};

router.post('/create', async (req, res) => {
  try {
    const {
      storyTitle,
      storyPrompt,
      languageId,
      styleId,
      voiceType,
      videoSizeId,
      storyMode,
      safeMode,
      ageFilter,
      storySource,
    } = req.body;

    const normalizedStoryPrompt = String(storyPrompt || '').trim();
    const normalizedStoryTitle = String(storyTitle || '').trim();

    if (!normalizedStoryPrompt) {
      return res.status(400).json({ success: false, error: 'Please provide a story prompt.' });
    }
    if (normalizedStoryPrompt.length < 3) {
      return res.status(400).json({ success: false, error: 'Story prompt is too short. Provide at least 3 characters.' });
    }
    if (normalizedStoryPrompt.length > 7000) {
      return res.status(400).json({ success: false, error: 'Story prompt is too long. Keep it under 7000 characters.' });
    }
    if (normalizedStoryTitle.length > 120) {
      return res.status(400).json({ success: false, error: 'Story title is too long. Keep it under 120 characters.' });
    }

    const start = Date.now();
    const looksLikeTopicOnlyInput = normalizedStoryPrompt.length < 40;
    const project = looksLikeTopicOnlyInput
      ? await createAutopilotProject({
        subject: normalizedStoryPrompt,
        languageId,
        styleId,
        voiceType,
        videoSizeId,
        storyMode,
        safeMode,
        ageFilter,
        sceneCount: 5,
      })
      : await createStudioProject({
        storyTitle: normalizedStoryTitle,
        storyPrompt: normalizedStoryPrompt,
        languageId,
        styleId,
        voiceType,
        videoSizeId,
        storyMode,
        safeMode,
        ageFilter,
        storySource,
      });

    const elapsed = Date.now() - start;
    logger.info(`Video studio create completed in ${elapsed}ms`);
    if (!project) {
      logger.warn('Video studio create returned no project body');
      return res.status(500).json({ success: false, error: 'AI pipeline returned no project.' });
    }

    res.json({ success: true, project, ...getStudioCapabilities() });
  } catch (error) {
    logger.error('Video studio create error:', error);
    respondVideoStudioError(res, error, 'Failed to create AI video project.');
  }
});

router.post('/render', async (req, res) => {
  try {
    const maxRssMb = Math.max(
      256,
      Number(process.env.VIDEO_STUDIO_MAX_RSS_MB) || (isFreeMode ? 420 : 1024)
    );
    const currentRssMb = getRssMemoryMb();
    if (currentRssMb >= maxRssMb) {
      logger.warn(
        `Video studio render skipped due to high memory rss=${currentRssMb}MB threshold=${maxRssMb}MB`
      );
      return res.status(503).json({
        success: false,
        error: 'Renderer is temporarily busy due to memory pressure. Please retry in 30-60 seconds.',
      });
    }

    if (activeRenderCount >= maxParallelRenders) {
      return res.status(429).json({
        success: false,
        error: 'Video renderer is busy. Please retry in a moment.',
      });
    }

    const { project, projectId, premiumHD } = req.body;
    const requestedProject = project || (projectId ? await getStudioProject(projectId) : null);
    const resolvedProject = requestedProject
      ? {
        ...requestedProject,
        renderMode: 'real-cartoon',
        requireCharacters: true,
        requireDialogueVoice: true,
        requireLipSync: true,
        requireSceneImages: true,
      }
      : requestedProject;
    const payloadError = validateRenderProjectPayload(resolvedProject);
    if (payloadError) {
      return res.status(400).json({ success: false, error: payloadError });
    }

    activeRenderCount += 1;
    logger.info(
      `Video studio render started (active=${activeRenderCount}/${maxParallelRenders}) project=${resolvedProject.projectId} ${formatMemoryUsage()}`
    );
    const renderStart = Date.now();

    try {
      const result = await renderVideo(resolvedProject, Boolean(premiumHD));
      if (!result?.outputFile || !fs.existsSync(result.outputFile)) {
        logger.error(`Video studio render produced missing output file for project ${resolvedProject.projectId}`);
        return res.status(500).json({ success: false, error: 'Render completed but output video was not found.' });
      }

      const relativeVideoUrl = String(result.videoUrl || '');
      const origin = buildRequestOrigin(req);
      const absoluteVideoUrl = /^https?:\/\//i.test(relativeVideoUrl)
        ? relativeVideoUrl
        : `${origin}${relativeVideoUrl.startsWith('/') ? '' : '/'}${relativeVideoUrl}`;

      await patchStudioProject(resolvedProject.projectId, {
        videoUrl: relativeVideoUrl,
        renderedAt: new Date().toISOString(),
        premiumExport: Boolean(premiumHD),
        scenes: resolvedProject.scenes,
      });

      logger.info(
        `Video studio render completed in ${Date.now() - renderStart}ms project=${resolvedProject.projectId} ${formatMemoryUsage()}`
      );

      res.json({
        success: true,
        videoUrl: absoluteVideoUrl,
        videoPath: relativeVideoUrl,
        projectId: result.projectId,
        ...getStudioCapabilities(),
      });
    } finally {
      activeRenderCount = Math.max(0, activeRenderCount - 1);
    }
  } catch (error) {
    logger.error('Video studio render error:', error);
    respondVideoStudioError(res, error, 'Video rendering failed.');
  }
});

router.post('/render-cartoon', async (req, res) => {
  try {
    const maxRssMb = Math.max(
      256,
      Number(process.env.VIDEO_STUDIO_MAX_RSS_MB) || (isFreeMode ? 420 : 1024)
    );
    const currentRssMb = getRssMemoryMb();
    if (currentRssMb >= maxRssMb) {
      logger.warn(
        `Video studio render-cartoon skipped due to high memory rss=${currentRssMb}MB threshold=${maxRssMb}MB`
      );
      return res.status(503).json({
        success: false,
        error: 'Renderer is temporarily busy due to memory pressure. Please retry in 30-60 seconds.',
      });
    }

    if (activeRenderCount >= maxParallelRenders) {
      return res.status(429).json({
        success: false,
        error: 'Video renderer is busy. Please retry in a moment.',
      });
    }

    const { project, projectId, premiumHD } = req.body || {};
    const requestedProject = project || (projectId ? await getStudioProject(projectId) : null);
    const resolvedProject = requestedProject
      ? {
        ...requestedProject,
        renderMode: 'real-cartoon',
        requireCharacters: true,
        requireDialogueVoice: true,
        requireLipSync: true,
        requireSceneImages: true,
      }
      : requestedProject;
    const payloadError = validateRenderProjectPayload(resolvedProject);
    if (payloadError) {
      return res.status(400).json({ success: false, error: payloadError });
    }

    activeRenderCount += 1;
    logger.info(
      `Video studio render-cartoon started (active=${activeRenderCount}/${maxParallelRenders}) project=${resolvedProject.projectId} ${formatMemoryUsage()}`
    );
    const renderStart = Date.now();

    try {
      const result = await renderCartoonVideo(resolvedProject, Boolean(premiumHD));
      if (!result?.outputFile || !fs.existsSync(result.outputFile)) {
        logger.error(`Video studio render-cartoon produced missing output file for project ${resolvedProject.projectId}`);
        return res.status(500).json({ success: false, error: 'Render completed but output video was not found.' });
      }

      const relativeVideoUrl = String(result.videoUrl || '');
      const origin = buildRequestOrigin(req);
      const absoluteVideoUrl = /^https?:\/\//i.test(relativeVideoUrl)
        ? relativeVideoUrl
        : `${origin}${relativeVideoUrl.startsWith('/') ? '' : '/'}${relativeVideoUrl}`;

      await patchStudioProject(resolvedProject.projectId, {
        videoUrl: relativeVideoUrl,
        renderedAt: new Date().toISOString(),
        premiumExport: Boolean(premiumHD),
        scenes: resolvedProject.scenes,
        renderMode: 'real-cartoon-backend',
      });

      logger.info(
        `Video studio render-cartoon completed in ${Date.now() - renderStart}ms project=${resolvedProject.projectId} ${formatMemoryUsage()}`
      );

      res.json({
        success: true,
        videoUrl: absoluteVideoUrl,
        videoPath: relativeVideoUrl,
        projectId: result.projectId,
        renderMode: result.renderMode || 'real-cartoon-backend',
        ttsEnabled: Boolean(result.ttsEnabled),
        ...getStudioCapabilities(),
      });
    } finally {
      activeRenderCount = Math.max(0, activeRenderCount - 1);
    }
  } catch (error) {
    logger.error('Video studio render-cartoon error:', error);
    respondVideoStudioError(res, error, 'Cartoon video rendering failed.');
  }
});

router.post('/autopilot/create', async (req, res) => {
  try {
    const {
      subject,
      languageId = 'english',
      styleId = 'cartoon',
      voiceType = 'kid-female',
      videoSizeId = 'youtube',
      storyMode = 'bedtime',
      safeMode = true,
      ageFilter = '5-8',
      sceneCount = 5,
    } = req.body || {};

    const normalizedSubject = String(subject || '').trim();
    if (!normalizedSubject) {
      return res.status(400).json({ success: false, error: 'Please provide any story subject, like "space adventure" or "jungle mystery".' });
    }

    const project = await createAutopilotProject({
      subject: normalizedSubject,
      languageId,
      styleId,
      voiceType,
      videoSizeId,
      storyMode,
      safeMode,
      ageFilter,
      sceneCount,
    });

    res.json({ success: true, project, ...getStudioCapabilities() });
  } catch (error) {
    logger.error('Video studio autopilot create error:', error);
    respondVideoStudioError(res, error, 'Failed to generate autonomous story project.');
  }
});

router.get('/projects/:projectId', async (req, res) => {
  try {
    const project = await getStudioProject(req.params.projectId);
    res.json({ success: true, project, ...getStudioCapabilities() });
  } catch (error) {
    logger.error('Video studio get project error:', error);
    res.status(404).json({ success: false, error: error.message || 'Project not found.' });
  }
});

router.patch('/projects/:projectId', async (req, res) => {
  try {
    const project = await patchStudioProject(req.params.projectId, req.body || {});
    res.json({ success: true, project, ...getStudioCapabilities() });
  } catch (error) {
    logger.error('Video studio patch project error:', error);
    respondVideoStudioError(res, error, 'Failed to update project.');
  }
});

router.post('/projects/:projectId/regenerate/:stage', async (req, res) => {
  try {
    const project = await regenerateProjectStage(req.params.projectId, req.params.stage, req.body || {});
    res.json({ success: true, project, ...getStudioCapabilities() });
  } catch (error) {
    logger.error('Video studio regenerate stage error:', error);
    respondVideoStudioError(res, error, 'Failed to regenerate stage.');
  }
});

router.post('/projects/:projectId/generate-character-sheet', async (req, res) => {
  try {
    const result = await generateCharacterSheet(req.params.projectId, req.body || {});
    res.json({ success: true, ...result, ...getStudioCapabilities() });
  } catch (error) {
    logger.error('Video studio generate-character-sheet error:', error);
    respondVideoStudioError(res, error, 'Failed to generate character sheet.');
  }
});

router.post('/projects/:projectId/scenes/:sceneId/generate-image', async (req, res) => {
  try {
    const result = await generateSceneImage(req.params.projectId, req.params.sceneId);
    res.json({ success: true, ...result, ...getStudioCapabilities() });
  } catch (error) {
    logger.error('Video studio generate-scene-image error:', error);
    respondVideoStudioError(res, error, 'Failed to generate scene image.');
  }
});

router.post('/projects/:projectId/scenes/:sceneId/animate', async (req, res) => {
  try {
    const result = await animateScene(req.params.projectId, req.params.sceneId);
    res.json({ success: true, ...result, ...getStudioCapabilities() });
  } catch (error) {
    logger.error('Video studio animate-scene error:', error);
    respondVideoStudioError(res, error, 'Failed to animate scene.');
  }
});

router.post('/projects/:projectId/scenes/:sceneId/generate-voice', async (req, res) => {
  try {
    const result = await generateVoice(req.params.projectId, req.params.sceneId);
    res.json({ success: true, ...result, ...getStudioCapabilities() });
  } catch (error) {
    logger.error('Video studio generate-voice error:', error);
    respondVideoStudioError(res, error, 'Failed to generate voice track.');
  }
});

router.post('/projects/:projectId/scenes/:sceneId/generate-sfx', async (req, res) => {
  try {
    const result = await generateSfx(req.params.projectId, req.params.sceneId);
    res.json({ success: true, ...result, ...getStudioCapabilities() });
  } catch (error) {
    logger.error('Video studio generate-sfx error:', error);
    respondVideoStudioError(res, error, 'Failed to generate scene SFX.');
  }
});

router.post('/projects/:projectId/scenes/:sceneId/lip-sync', async (req, res) => {
  try {
    const result = await lipSync(req.params.projectId, req.params.sceneId);
    res.json({ success: true, ...result, ...getStudioCapabilities() });
  } catch (error) {
    logger.error('Video studio lip-sync error:', error);
    respondVideoStudioError(res, error, 'Failed to lip-sync scene.');
  }
});

router.post('/projects/:projectId/compose-final-video', async (req, res) => {
  try {
    const result = await composeFinalVideo(req.params.projectId, req.body || {});
    const relativeVideoUrl = String(result.videoUrl || '');
    const origin = buildRequestOrigin(req);
    const absoluteVideoUrl = /^https?:\/\//i.test(relativeVideoUrl)
      ? relativeVideoUrl
      : `${origin}${relativeVideoUrl.startsWith('/') ? '' : '/'}${relativeVideoUrl}`;
    res.json({
      success: true,
      ...result,
      videoUrl: absoluteVideoUrl,
      ...getStudioCapabilities(),
    });
  } catch (error) {
    logger.error('Video studio compose-final-video error:', error);
    respondVideoStudioError(res, error, 'Failed to compose final video.');
  }
});

router.get('/projects/:projectId/status', async (req, res) => {
  try {
    const requestedProjectId = String(req.params.projectId || '').trim();
    if (!requestedProjectId) {
      return res.status(400).json({ success: false, error: 'Project ID is required.' });
    }

    let project = null;
    try {
      project = await getStudioProject(requestedProjectId);
    } catch (projectError) {
      if (projectError?.code !== 'ENOENT') {
        throw projectError;
      }
    }

    const safeProjectId = toSafeProjectDirectoryName(project?.projectId || requestedProjectId);
    const fallbackOutputPath = path.join(videoStudioUploadsRoot, safeProjectId, 'story-render.mp4');
    const hasOutputFile = fs.existsSync(fallbackOutputPath);
    const rawVideoUrl = String(project?.videoUrl || '').trim();
    const hasVideo = Boolean(rawVideoUrl) || hasOutputFile;
    const origin = buildRequestOrigin(req);
    const relativeVideoUrl = rawVideoUrl || (hasOutputFile ? `/uploads/video-studio/${safeProjectId}/story-render.mp4` : '');
    const absoluteVideoUrl = relativeVideoUrl
      ? (/^https?:\/\//i.test(relativeVideoUrl)
        ? relativeVideoUrl
        : `${origin}${relativeVideoUrl.startsWith('/') ? '' : '/'}${relativeVideoUrl}`)
      : '';

    const status = hasVideo
      ? 'ready'
      : project
        ? 'rendering'
        : 'not_found';

    res.json({
      success: true,
      projectId: project?.projectId || requestedProjectId,
      status,
      progress: hasVideo ? 100 : status === 'rendering' ? 70 : 0,
      videoUrl: absoluteVideoUrl,
      downloadUrl: absoluteVideoUrl,
      ...getStudioCapabilities(),
    });
  } catch (error) {
    logger.error('Video studio status error:', error);
    respondVideoStudioError(res, error, 'Failed to read render status.');
  }
});

router.get('/projects/:projectId/download', async (req, res) => {
  try {
    const requestedProjectId = String(req.params.projectId || '').trim();
    if (!requestedProjectId) {
      return res.status(400).json({ success: false, error: 'Project ID is required.' });
    }

    let project = null;
    try {
      project = await getStudioProject(requestedProjectId);
    } catch (projectError) {
      if (projectError?.code !== 'ENOENT') {
        throw projectError;
      }
    }

    let rawVideoUrl = String(project?.videoUrl || '').trim();
    if (!rawVideoUrl) {
      const safeProjectId = toSafeProjectDirectoryName(project?.projectId || requestedProjectId);
      const fallbackOutputPath = path.join(videoStudioUploadsRoot, safeProjectId, 'story-render.mp4');
      if (fs.existsSync(fallbackOutputPath)) {
        rawVideoUrl = `/uploads/video-studio/${safeProjectId}/story-render.mp4`;
      }
    }

    if (!rawVideoUrl) {
      return res.status(404).json({ success: false, error: 'No rendered video is available for this project yet.' });
    }

    const origin = buildRequestOrigin(req);
    const absoluteVideoUrl = /^https?:\/\//i.test(rawVideoUrl)
      ? rawVideoUrl
      : `${origin}${rawVideoUrl.startsWith('/') ? '' : '/'}${rawVideoUrl}`;

    res.json({
      success: true,
      projectId: project?.projectId || requestedProjectId,
      videoUrl: absoluteVideoUrl,
      downloadUrl: absoluteVideoUrl,
    });
  } catch (error) {
    logger.error('Video studio download link error:', error);
    res.status(404).json({ success: false, error: error.message || 'Project not found.' });
  }
});

module.exports = router;
