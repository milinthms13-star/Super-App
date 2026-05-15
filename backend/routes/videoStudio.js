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
