const express = require('express');
const logger = require('../utils/logger');
const { createStudioProject, renderVideo } = require('../services/videoStudioService');

const router = express.Router();

router.post('/create', async (req, res) => {
  try {
    const {
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

    if (!storyPrompt || !storyPrompt.trim()) {
      return res.status(400).json({ success: false, error: 'Please provide a story prompt.' });
    }

    const start = Date.now();
    const project = await createStudioProject({
      storyPrompt,
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
    const { project, premiumHD } = req.body;
    if (!project || !project.projectId) {
      return res.status(400).json({ success: false, error: 'A valid project is required for rendering.' });
    }

    const result = await renderVideo(project, Boolean(premiumHD));
    res.json({ success: true, videoUrl: result.videoUrl, projectId: result.projectId });
  } catch (error) {
    logger.error('Video studio render error:', error);
    res.status(500).json({ success: false, error: error.message || 'Video rendering failed.' });
  }
});

module.exports = router;
