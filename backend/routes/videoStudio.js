const express = require('express');
const fs = require('fs');
const logger = require('../utils/logger');
const {
  createStudioProject,
  renderVideo,
  createAutopilotProject,
  getStudioProject,
  regenerateProjectStage,
  patchStudioProject,
} = require('../services/videoStudioService');

const router = express.Router();

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
  if (!project || typeof project !== 'object') {
    return 'A valid project payload is required.';
  }
  if (!project.projectId || !String(project.projectId).trim()) {
    return 'Project ID is required for rendering.';
  }
  if (!Array.isArray(project.scenes) || project.scenes.length === 0) {
    return 'At least one scene is required for rendering.';
  }
  if (project.scenes.length > 20) {
    return 'Too many scenes requested. Keep it at 20 scenes or fewer.';
  }
  for (let index = 0; index < project.scenes.length; index += 1) {
    const validationError = validateRenderScene(project.scenes[index], index);
    if (validationError) {
      return validationError;
    }
  }

  return '';
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
    if (normalizedStoryPrompt.length < 40) {
      return res.status(400).json({ success: false, error: 'Story prompt is too short. Provide at least 40 characters.' });
    }
    if (normalizedStoryPrompt.length > 7000) {
      return res.status(400).json({ success: false, error: 'Story prompt is too long. Keep it under 7000 characters.' });
    }
    if (normalizedStoryTitle.length > 120) {
      return res.status(400).json({ success: false, error: 'Story title is too long. Keep it under 120 characters.' });
    }

    const start = Date.now();
    const project = await createStudioProject({
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

    res.json({ success: true, project });
  } catch (error) {
    logger.error('Video studio create error:', error);
    respondVideoStudioError(res, error, 'Failed to create AI video project.');
  }
});

router.post('/render', async (req, res) => {
  try {
    const { project, projectId, premiumHD } = req.body;
    const resolvedProject = project || (projectId ? await getStudioProject(projectId) : null);
    const payloadError = validateRenderProjectPayload(resolvedProject);
    if (payloadError) {
      return res.status(400).json({ success: false, error: payloadError });
    }

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

    res.json({
      success: true,
      videoUrl: absoluteVideoUrl,
      videoPath: relativeVideoUrl,
      projectId: result.projectId,
    });
  } catch (error) {
    logger.error('Video studio render error:', error);
    respondVideoStudioError(res, error, 'Video rendering failed.');
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
      return res.status(400).json({ success: false, error: 'Please provide a subject like "Rabbit and Tortoise".' });
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

    res.json({ success: true, project });
  } catch (error) {
    logger.error('Video studio autopilot create error:', error);
    respondVideoStudioError(res, error, 'Failed to generate autonomous story project.');
  }
});

router.get('/projects/:projectId', async (req, res) => {
  try {
    const project = await getStudioProject(req.params.projectId);
    res.json({ success: true, project });
  } catch (error) {
    logger.error('Video studio get project error:', error);
    res.status(404).json({ success: false, error: error.message || 'Project not found.' });
  }
});

router.patch('/projects/:projectId', async (req, res) => {
  try {
    const project = await patchStudioProject(req.params.projectId, req.body || {});
    res.json({ success: true, project });
  } catch (error) {
    logger.error('Video studio patch project error:', error);
    respondVideoStudioError(res, error, 'Failed to update project.');
  }
});

router.post('/projects/:projectId/regenerate/:stage', async (req, res) => {
  try {
    const project = await regenerateProjectStage(req.params.projectId, req.params.stage, req.body || {});
    res.json({ success: true, project });
  } catch (error) {
    logger.error('Video studio regenerate stage error:', error);
    respondVideoStudioError(res, error, 'Failed to regenerate stage.');
  }
});

router.get('/projects/:projectId/download', async (req, res) => {
  try {
    const project = await getStudioProject(req.params.projectId);
    const rawVideoUrl = String(project?.videoUrl || '').trim();
    if (!rawVideoUrl) {
      return res.status(404).json({ success: false, error: 'No rendered video is available for this project yet.' });
    }

    const origin = buildRequestOrigin(req);
    const absoluteVideoUrl = /^https?:\/\//i.test(rawVideoUrl)
      ? rawVideoUrl
      : `${origin}${rawVideoUrl.startsWith('/') ? '' : '/'}${rawVideoUrl}`;

    res.json({
      success: true,
      projectId: project.projectId,
      videoUrl: absoluteVideoUrl,
      downloadUrl: absoluteVideoUrl,
    });
  } catch (error) {
    logger.error('Video studio download link error:', error);
    res.status(404).json({ success: false, error: error.message || 'Project not found.' });
  }
});

module.exports = router;
