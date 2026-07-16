const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { generateCartoonVideo, testVideoGeneration } = require('../services/cartoonVideoComposer');
const { parseStory } = require('../services/storyParserService');
const { testImageGeneration } = require('../services/cartoonSceneGenerator');
const { getAvailableTTSEngines } = require('../services/cartoonVoiceService');

/**
 * API Routes for Cartoon Video Generator
 */

// Store active jobs
const activeJobs = new Map();

/**
 * POST /api/cartoon-video/generate
 * Generate cartoon video from story text
 */
router.post('/generate', async (req, res) => {
  try {
    const {
      storyText,
      storyTitle = 'Kids Story',
      style = 'cartoon',
      provider = 'pollinations',
      voiceEngine = 'auto',
      includeSubtitles = true,
      width = 1280,
      height = 720,
    } = req.body;

    if (!storyText || storyText.trim().length < 50) {
      return res.status(400).json({
        success: false,
        error: 'Story text is required and must be at least 50 characters',
      });
    }

    // Create unique job ID
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create output directory
    const outputDir = path.join(__dirname, '../uploads/cartoon-videos', jobId);
    await fs.mkdir(outputDir, { recursive: true });

    // Store job info
    activeJobs.set(jobId, {
      jobId,
      status: 'processing',
      progress: 0,
      startedAt: new Date().toISOString(),
      storyTitle,
    });

    // Start generation in background
    generateCartoonVideo(storyText, outputDir, {
      storyTitle,
      style,
      provider,
      voiceEngine,
      includeSubtitles,
      width,
      height,
    })
      .then(result => {
        activeJobs.set(jobId, {
          ...activeJobs.get(jobId),
          status: 'completed',
          progress: 100,
          result,
          completedAt: new Date().toISOString(),
        });
      })
      .catch(error => {
        activeJobs.set(jobId, {
          ...activeJobs.get(jobId),
          status: 'failed',
          error: error.message,
          failedAt: new Date().toISOString(),
        });
      });

    return res.json({
      success: true,
      jobId,
      message: 'Video generation started',
      estimatedTime: '2-5 minutes',
    });

  } catch (error) {
    console.error('Video generation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to start video generation',
    });
  }
});

/**
 * GET /api/cartoon-video/status/:jobId
 * Check video generation status
 */
router.get('/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  
  const job = activeJobs.get(jobId);
  
  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found',
    });
  }

  return res.json({
    success: true,
    job,
  });
});

/**
 * GET /api/cartoon-video/download/:jobId
 * Download generated video
 */
router.get('/download/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const job = activeJobs.get(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Video is not ready yet',
        status: job.status,
      });
    }

    const videoPath = job.result.videoPath;
    
    // Check if file exists
    try {
      await fs.access(videoPath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Video file not found',
      });
    }

    // Send file
    const fileName = `${job.storyTitle.replace(/[^a-z0-9]/gi, '_')}.mp4`;
    res.download(videoPath, fileName);

  } catch (error) {
    console.error('Download error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to download video',
    });
  }
});

/**
 * POST /api/cartoon-video/parse-story
 * Parse story to preview structure
 */
router.post('/parse-story', (req, res) => {
  try {
    const { storyText, storyTitle = 'Kids Story', maxScenes = 6 } = req.body;

    if (!storyText || storyText.trim().length < 20) {
      return res.status(400).json({
        success: false,
        error: 'Story text is required and must be at least 20 characters',
      });
    }

    const parsed = parseStory(storyText, { storyTitle, maxScenes });

    return res.json({
      success: true,
      parsed,
    });

  } catch (error) {
    console.error('Story parsing error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to parse story',
    });
  }
});

/**
 * GET /api/cartoon-video/capabilities
 * Get system capabilities (available TTS engines, image providers)
 */
router.get('/capabilities', async (req, res) => {
  try {
    const ttsEngines = await getAvailableTTSEngines();
    
    // Test image providers
    const pollinationsTest = await testImageGeneration('pollinations');
    const huggingfaceTest = process.env.HUGGINGFACE_API_KEY 
      ? await testImageGeneration('huggingface')
      : { success: false, error: 'No API key' };

    return res.json({
      success: true,
      capabilities: {
        tts: {
          engines: ttsEngines,
          default: ttsEngines[0]?.name || 'fallback',
        },
        imageGeneration: {
          pollinations: {
            available: pollinationsTest.success,
            free: true,
          },
          huggingface: {
            available: huggingfaceTest.success,
            free: false,
            requiresApiKey: true,
          },
        },
        video: {
          ffmpegAvailable: true,
          maxResolution: '1920x1080',
          supportedFormats: ['mp4'],
        },
      },
    });

  } catch (error) {
    console.error('Capabilities check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check system capabilities',
    });
  }
});

/**
 * POST /api/cartoon-video/test
 * Run test video generation
 */
router.post('/test', async (req, res) => {
  try {
    console.log('Starting test video generation...');
    
    const result = await testVideoGeneration();
    
    return res.json({
      success: true,
      message: 'Test video generated successfully',
      result,
    });

  } catch (error) {
    console.error('Test generation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Test failed',
    });
  }
});

/**
 * DELETE /api/cartoon-video/:jobId
 * Delete job and associated files
 */
router.delete('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const job = activeJobs.get(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    // Delete job directory
    const outputDir = path.join(__dirname, '../uploads/cartoon-videos', jobId);
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to delete job directory:', error.message);
    }

    // Remove from active jobs
    activeJobs.delete(jobId);

    return res.json({
      success: true,
      message: 'Job deleted',
    });

  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete job',
    });
  }
});

/**
 * GET /api/cartoon-video/jobs
 * List all jobs
 */
router.get('/jobs', (req, res) => {
  const jobs = Array.from(activeJobs.values()).map(job => ({
    jobId: job.jobId,
    status: job.status,
    progress: job.progress,
    storyTitle: job.storyTitle,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  }));

  return res.json({
    success: true,
    jobs,
    total: jobs.length,
  });
});

module.exports = router;
