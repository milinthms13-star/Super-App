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
    res.status(500).json({ success: false, error: 'Failed to create AI video project.' });
  }
});

router.post('/render', async (req, res) => {
  try {
    const { project, projectId, premiumHD } = req.body;
    const resolvedProject = project || (projectId ? await getStudioProject(projectId) : null);
    if (!resolvedProject || !resolvedProject.projectId) {
      return res.status(400).json({ success: false, error: 'A valid project is required for rendering.' });
    }
    if (!Array.isArray(resolvedProject.scenes) || resolvedProject.scenes.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one scene is required for rendering.' });
    }
    if (resolvedProject.scenes.length > 20) {
      return res.status(400).json({ success: false, error: 'Too many scenes requested. Keep it at 20 scenes or fewer.' });
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

    res.json({
      success: true,
      videoUrl: absoluteVideoUrl,
      videoPath: relativeVideoUrl,
      projectId: result.projectId,
    });
  } catch (error) {
    logger.error('Video studio render error:', error);
    res.status(500).json({ success: false, error: error.message || 'Video rendering failed.' });
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
    res.status(500).json({ success: false, error: error.message || 'Failed to generate autonomous story project.' });
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
    res.status(500).json({ success: false, error: error.message || 'Failed to update project.' });
  }
});

router.post('/projects/:projectId/regenerate/:stage', async (req, res) => {
  try {
    const project = await regenerateProjectStage(req.params.projectId, req.params.stage, req.body || {});
    res.json({ success: true, project });
  } catch (error) {
    logger.error('Video studio regenerate stage error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to regenerate stage.' });
  }
});

module.exports = router;
