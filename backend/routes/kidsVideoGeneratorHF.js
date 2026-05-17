const express = require('express');
const {
  generateKidsVideoFromPrompt,
  generateKidsVideoFromDiffusersPrompt,
  getKidsVideoProject,
} = require('../services/kidsVideoGeneratorHFService');

const router = express.Router();

const clampSceneCount = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 5;
  return Math.max(3, Math.min(8, Math.round(parsed)));
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

    const requestedEngine = String(req.body?.engine || req.body?.renderEngine || '').trim().toLowerCase();
    const useDiffusers =
      requestedEngine === 'diffusers_t2v' ||
      requestedEngine === 'text_to_video' ||
      requestedEngine === 'damo-text-to-video';

    const result = useDiffusers
      ? await generateKidsVideoFromDiffusersPrompt({
          prompt,
          videoSize: req.body?.videoSize || req.body?.videoSizeId || 'youtube',
          numFrames: req.body?.numFrames,
          numInferenceSteps: req.body?.numInferenceSteps,
        })
      : await generateKidsVideoFromPrompt({
          prompt,
          sceneCount: clampSceneCount(req.body?.sceneCount),
          videoSize: req.body?.videoSize || req.body?.videoSizeId || 'youtube',
          storyMode: req.body?.storyMode || 'moral',
          voiceType: req.body?.voiceType || 'kid-female',
        });

    return res.status(200).json({
      success: true,
      projectId: result.projectId,
      project: result.project,
      videoUrl: result.videoUrl,
      aiProvider: 'huggingface',
      aiImagesEnabled: Boolean(result.aiImagesEnabled),
      workflowType: result?.project?.workflowType || 'kids-video-hf-clean-restart',
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
